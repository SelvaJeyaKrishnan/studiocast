"use server";

import { createClient } from "@/lib/supabase/server";
import { generateInvitationToken, hashInvitationToken } from "@/lib/crypto/tokens";
import { getPublicSiteUrl } from "@/lib/utils/site-url";
import { evictLiveKitParticipants } from "@/lib/livekit/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, StudioInvitationRow } from "@/types/database";

export interface CreateInvitationResult {
  success: boolean;
  rawToken?: string;
  invitationUrl?: string;
  invitation?: StudioInvitationRow;
  error?: string;
}

export interface RevokeInvitationResult {
  success: boolean;
  partialFailure?: boolean;
  error?: string;
  revokedGuestCount?: number;
  evictionResults?: Array<{
    success: boolean;
    identity: string;
    error?: string;
  }>;
}

/**
 * Server action: Creates a secure, cryptographically random guest invitation token.
 * Only the SHA-256 hash is saved to the database.
 * The raw token is returned to the authenticated owner once to construct the invite link.
 */
export async function createStudioInvitationAction(
  studioId: string,
  expirationHours: number = 24
): Promise<CreateInvitationResult> {
  try {
    const supabase = await createClient();

    // 1. Verify authenticated user
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized: Please sign in to create an invitation." };
    }

    // 2. Verify studio ownership
    const { data: studio, error: studioErr } = await supabase
      .from("studios")
      .select("id, name, owner_id")
      .eq("id", studioId)
      .eq("owner_id", user.id)
      .single();

    if (studioErr || !studio) {
      return { success: false, error: "Studio not found or access denied." };
    }

    // 3. Generate token & SHA-256 hash
    const rawToken = generateInvitationToken(32);
    const tokenHash = hashInvitationToken(rawToken);

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString();

    // 4. Save invitation record
    const { data: invitation, error: insertErr } = await supabase
      .from("studio_invitations")
      .insert({
        studio_id: studioId,
        created_by: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (insertErr || !invitation) {
      return { success: false, error: insertErr?.message || "Failed to create invitation record." };
    }

    // 5. Construct invite URL
    const baseUrl = getPublicSiteUrl();
    const invitationUrl = `${baseUrl}/join/${rawToken}`;

    return {
      success: true,
      rawToken,
      invitationUrl,
      invitation: invitation as StudioInvitationRow,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

/**
 * Server action: Revoke an existing invitation and evict all connected guests from LiveKit.
 * Strictly verifies caller authentication and studio ownership, marks invitation and
 * all active guest participants as revoked in PostgreSQL, and issues LiveKit token
 * revocations with participant removal.
 */
export async function revokeStudioInvitationAction(
  invitationId: string,
  supabaseClient?: SupabaseClient<Database>,
  liveKitService?: { evictLiveKitParticipants: typeof evictLiveKitParticipants }
): Promise<RevokeInvitationResult> {
  try {
    const supabase = supabaseClient ?? (await createClient());
    const evictAllFn = liveKitService?.evictLiveKitParticipants ?? evictLiveKitParticipants;

    // 1. Authenticate caller (Host)
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized." };
    }

    // 2. Fetch invitation and verify caller is the creator
    const { data: invitation, error: invErr } = await supabase
      .from("studio_invitations")
      .select("id, studio_id, created_by, is_active, revoked_at")
      .eq("id", invitationId)
      .eq("created_by", user.id)
      .single();

    if (invErr || !invitation) {
      return { success: false, error: "Invitation not found or access denied." };
    }

    // 3. Verify studio ownership (L1 in lock order)
    const { data: studio, error: studioErr } = await supabase
      .from("studios")
      .select("id, owner_id")
      .eq("id", invitation.studio_id)
      .eq("owner_id", user.id)
      .single();

    if (studioErr || !studio) {
      return { success: false, error: "Studio ownership verification failed." };
    }

    // 4. Query all guest participants associated with this invitation who are not left
    const { data: activeGuests, error: guestFetchErr } = await supabase
      .from("guest_participants")
      .select("id, status")
      .eq("invitation_id", invitationId)
      .neq("status", "left");

    if (guestFetchErr) {
      return {
        success: false,
        error: `Failed to query guest sessions: ${guestFetchErr.message}`,
      };
    }

    // 5. Update database: Mark invitation revoked and all guest sessions as 'left'
    const nowIso = new Date().toISOString();

    const { error: invUpdateErr } = await supabase
      .from("studio_invitations")
      .update({
        is_active: false,
        revoked_at: nowIso,
      })
      .eq("id", invitationId)
      .eq("created_by", user.id);

    if (invUpdateErr) {
      return { success: false, error: `Failed to revoke invitation: ${invUpdateErr.message}` };
    }

    if (activeGuests && activeGuests.length > 0) {
      const { error: guestUpdateErr } = await supabase
        .from("guest_participants")
        .update({
          status: "left",
          last_seen_at: nowIso,
        })
        .eq("invitation_id", invitationId)
        .neq("status", "left");

      if (guestUpdateErr) {
        return {
          success: false,
          error: `Failed to update guest participant status: ${guestUpdateErr.message}`,
        };
      }
    }

    // 6. Evict all connected / active guests from the LiveKit room
    const guestsToEvict = activeGuests || [];
    let evictionResult: {
      allSuccessful: boolean;
      successfulCount: number;
      failedCount: number;
      results: Array<{ success: boolean; identity: string; error?: string }>;
    } = {
      allSuccessful: true,
      successfulCount: 0,
      failedCount: 0,
      results: [],
    };

    if (guestsToEvict.length > 0) {
      const roomName = `studio_${invitation.studio_id}`;
      const identities = guestsToEvict.map((g: { id: string }) => `guest_${g.id}`);
      const revokeTokenTs = Math.floor(Date.now() / 1000) + 10;

      evictionResult = await evictAllFn(
        roomName,
        identities,
        revokeTokenTs
      );
    }

    // 7. Handle partial failure between database and LiveKit
    if (!evictionResult.allSuccessful) {
      return {
        success: false,
        partialFailure: true,
        revokedGuestCount: guestsToEvict.length,
        error: `Invitation revoked in database, but LiveKit room eviction failed for ${evictionResult.failedCount} participant(s). Please retry to force eviction.`,
        evictionResults: evictionResult.results,
      };
    }

    return {
      success: true,
      revokedGuestCount: guestsToEvict.length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to revoke invitation.";
    return { success: false, error: message };
  }
}
