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

export interface RetryPendingEvictionsResult {
  success: boolean;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  error?: string;
  results?: Array<{
    identity: string;
    success: boolean;
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

    // 4. Update database: Mark invitation revoked immediately
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

    // 5. Query active guests for this invitation AND any previously pending/failed evictions
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

    // Check for durable pending evictions from previous failed attempts or server restarts
    let existingPendingEvictions: Array<{
      id: string;
      participant_identity: string;
      guest_id: string | null;
      attempts: number;
    }> = [];

    try {
      const { data: queueData } = await supabase
        .from("pending_livekit_evictions")
        .select("id, participant_identity, guest_id, attempts")
        .eq("invitation_id", invitationId)
        .neq("status", "completed");

      if (queueData) {
        existingPendingEvictions = queueData;
      }
    } catch {
      // Graceful fallback if migration not yet applied
    }

    // Update newly discovered active guests to 'left'
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

    // Build consolidated list of participant identities needing LiveKit eviction
    const roomName = `studio_${invitation.studio_id}`;
    const revokeTokenTs = Math.floor(Date.now() / 1000) + 10;
    const identityMap = new Map<string, { guestId?: string }>();

    // Add newly transitioned guests
    for (const g of activeGuests || []) {
      identityMap.set(`guest_${g.id}`, { guestId: g.id });
    }

    // Add previously pending/failed evictions
    for (const p of existingPendingEvictions) {
      identityMap.set(p.participant_identity, { guestId: p.guest_id ?? undefined });
    }

    const identitiesToEvict = Array.from(identityMap.keys());

    // Record new pending evictions persistently before executing network calls
    if (identitiesToEvict.length > 0) {
      try {
        const recordsToQueue = identitiesToEvict.map((identity) => ({
          studio_id: invitation.studio_id,
          invitation_id: invitationId,
          guest_id: identityMap.get(identity)?.guestId ?? null,
          room_name: roomName,
          participant_identity: identity,
          revoke_token_ts: revokeTokenTs,
          status: "pending" as const,
          attempts: 0,
          updated_at: nowIso,
        }));

        await supabase
          .from("pending_livekit_evictions")
          .upsert(recordsToQueue, { onConflict: "room_name,participant_identity" });
      } catch {
        // Graceful fallback if table is unavailable
      }
    }

    // If no participants need eviction, return success (idempotent retry)
    if (identitiesToEvict.length === 0) {
      return {
        success: true,
        revokedGuestCount: 0,
      };
    }

    // 6. Evict participants from LiveKit room
    const evictionResult = await evictAllFn(
      roomName,
      identitiesToEvict,
      revokeTokenTs
    );

    // 7. Update eviction queue records persistently based on LiveKit response
    for (const res of evictionResult.results) {
      try {
        if (res.success) {
          await supabase
            .from("pending_livekit_evictions")
            .update({
              status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("room_name", roomName)
            .eq("participant_identity", res.identity);
        } else {
          await supabase
            .from("pending_livekit_evictions")
            .update({
              status: "failed",
              last_error: res.error || "Eviction failed",
              updated_at: new Date().toISOString(),
            })
            .eq("room_name", roomName)
            .eq("participant_identity", res.identity);
        }
      } catch {
        // Table may be absent
      }
    }

    // 8. Handle partial failure
    if (!evictionResult.allSuccessful) {
      return {
        success: false,
        partialFailure: true,
        revokedGuestCount: identitiesToEvict.length,
        error: `Invitation revoked in database, but LiveKit room eviction failed for ${evictionResult.failedCount} participant(s). Please retry to force eviction.`,
        evictionResults: evictionResult.results,
      };
    }

    return {
      success: true,
      revokedGuestCount: identitiesToEvict.length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to revoke invitation.";
    return { success: false, error: message };
  }
}

/**
 * Server action: Retries all pending or failed LiveKit evictions for a studio.
 * Safe and idempotent. Retries eviction without altering guest authorization or status.
 */
export async function retryPendingEvictionsAction(
  studioId: string,
  supabaseClient?: SupabaseClient<Database>,
  liveKitService?: { evictLiveKitParticipants: typeof evictLiveKitParticipants }
): Promise<RetryPendingEvictionsResult> {
  try {
    const supabase = supabaseClient ?? (await createClient());
    const evictAllFn = liveKitService?.evictLiveKitParticipants ?? evictLiveKitParticipants;

    // 1. Authenticate host
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, pendingCount: 0, completedCount: 0, failedCount: 0, error: "Unauthorized." };
    }

    // 2. Verify studio ownership (L1)
    const { data: studio, error: studioErr } = await supabase
      .from("studios")
      .select("id, owner_id")
      .eq("id", studioId)
      .eq("owner_id", user.id)
      .single();

    if (studioErr || !studio) {
      return { success: false, pendingCount: 0, completedCount: 0, failedCount: 0, error: "Studio not found or access denied." };
    }

    // 3. Query pending or failed evictions
    const { data: pendingRows, error: fetchErr } = await supabase
      .from("pending_livekit_evictions")
      .select("id, room_name, participant_identity, attempts")
      .eq("studio_id", studioId)
      .in("status", ["pending", "failed"]);

    if (fetchErr) {
      return {
        success: false,
        pendingCount: 0,
        completedCount: 0,
        failedCount: 0,
        error: `Failed to query pending evictions: ${fetchErr.message}`,
      };
    }

    if (!pendingRows || pendingRows.length === 0) {
      return {
        success: true,
        pendingCount: 0,
        completedCount: 0,
        failedCount: 0,
      };
    }

    const roomName = `studio_${studioId}`;
    const identities = pendingRows.map((r) => r.participant_identity);
    const revokeTokenTs = Math.floor(Date.now() / 1000) + 10;

    const evictionResult = await evictAllFn(roomName, identities, revokeTokenTs);

    const nowIso = new Date().toISOString();
    for (const res of evictionResult.results) {
      if (res.success) {
        await supabase
          .from("pending_livekit_evictions")
          .update({
            status: "completed",
            updated_at: nowIso,
          })
          .eq("room_name", roomName)
          .eq("participant_identity", res.identity);
      } else {
        await supabase
          .from("pending_livekit_evictions")
          .update({
            status: "failed",
            last_error: res.error || "Eviction retry failed",
            updated_at: nowIso,
          })
          .eq("room_name", roomName)
          .eq("participant_identity", res.identity);
      }
    }

    return {
      success: evictionResult.allSuccessful,
      pendingCount: evictionResult.failedCount,
      completedCount: evictionResult.successfulCount,
      failedCount: evictionResult.failedCount,
      results: evictionResult.results,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retry pending evictions.";
    return {
      success: false,
      pendingCount: 0,
      completedCount: 0,
      failedCount: 0,
      error: message,
    };
  }
}
