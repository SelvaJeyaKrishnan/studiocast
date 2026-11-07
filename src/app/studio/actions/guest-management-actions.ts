"use server";

import { createClient } from "@/lib/supabase/server";
import { evictLiveKitParticipant } from "@/lib/livekit/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AdmitGuestResult {
  success: boolean;
  guestId?: string;
  status?: string;
  error?: string;
  message?: string;
}

export interface RemoveGuestResult {
  success: boolean;
  guestId?: string;
  status?: string;
  partialFailure?: boolean;
  error?: string;
  message?: string;
}

/**
 * Server action: Host admits a waiting guest participant into the studio.
 * Strictly verifies host authentication, studio ownership, invitation validity,
 * and current guest status before transitioning from 'waiting' to 'admitted'.
 */
export async function admitGuestParticipantAction(
  studioId: string,
  guestId: string,
  supabaseClient?: SupabaseClient<Database>
): Promise<AdmitGuestResult> {
  if (!studioId || !UUID_REGEX.test(studioId)) {
    return { success: false, error: "Invalid studio identifier." };
  }
  if (!guestId || !UUID_REGEX.test(guestId)) {
    return { success: false, error: "Invalid guest identifier." };
  }

  try {
    const supabase = supabaseClient ?? (await createClient());

    // 1. Authenticate caller (Host)
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized: Please sign in." };
    }

    // 2. Verify caller owns the studio (L1 in lock hierarchy)
    const { data: studio, error: studioErr } = await supabase
      .from("studios")
      .select("id, owner_id")
      .eq("id", studioId)
      .eq("owner_id", user.id)
      .single();

    if (studioErr || !studio) {
      return { success: false, error: "Studio not found or access denied." };
    }

    // 3. Fetch guest participant record (scoped to studioId)
    const { data: guest, error: guestErr } = await supabase
      .from("guest_participants")
      .select("id, studio_id, invitation_id, status, display_name")
      .eq("id", guestId)
      .eq("studio_id", studioId)
      .single();

    if (guestErr || !guest) {
      return { success: false, error: "Guest participant not found in this studio." };
    }

    // 4. Validate current status transitions (prevent duplicate / illegal transitions)
    if (guest.status === "admitted") {
      return {
        success: true,
        guestId: guest.id,
        status: "admitted",
        message: "Guest is already admitted.",
      };
    }

    if (guest.status === "left") {
      return {
        success: false,
        error: "Cannot admit a guest who has already left or been removed from the studio.",
      };
    }

    // 5. Verify the guest's invitation is still active and valid (L3 in lock hierarchy)
    const { data: invitation, error: invErr } = await supabase
      .from("studio_invitations")
      .select("id, is_active, revoked_at, expires_at")
      .eq("id", guest.invitation_id)
      .single();

    if (invErr || !invitation) {
      return { success: false, error: "Associated guest invitation not found." };
    }

    if (!invitation.is_active || invitation.revoked_at !== null) {
      return { success: false, error: "Cannot admit guest: invitation has been revoked." };
    }

    if (new Date(invitation.expires_at) <= new Date()) {
      return { success: false, error: "Cannot admit guest: invitation has expired." };
    }

    // 6. Transition guest status to 'admitted' (L4 in lock hierarchy)
    const { error: updateErr } = await supabase
      .from("guest_participants")
      .update({
        status: "admitted",
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", guestId)
      .eq("studio_id", studioId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return {
      success: true,
      guestId: guest.id,
      status: "admitted",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to admit guest.";
    return { success: false, error: msg };
  }
}

/**
 * Server action: Host removes / kicks a guest participant from the studio.
 * Strictly verifies host authentication and studio ownership, updates database status to 'left',
 * and evicts the participant from the LiveKit media room with token revocation.
 */
export async function removeGuestParticipantAction(
  studioId: string,
  guestId: string,
  supabaseClient?: SupabaseClient<Database>,
  liveKitService?: { evictLiveKitParticipant: typeof evictLiveKitParticipant }
): Promise<RemoveGuestResult> {
  if (!studioId || !UUID_REGEX.test(studioId)) {
    return { success: false, error: "Invalid studio identifier." };
  }
  if (!guestId || !UUID_REGEX.test(guestId)) {
    return { success: false, error: "Invalid guest identifier." };
  }

  try {
    const supabase = supabaseClient ?? (await createClient());
    const evictFn = liveKitService?.evictLiveKitParticipant ?? evictLiveKitParticipant;

    // 1. Authenticate caller (Host)
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized: Please sign in." };
    }

    // 2. Verify caller owns the studio
    const { data: studio, error: studioErr } = await supabase
      .from("studios")
      .select("id, owner_id")
      .eq("id", studioId)
      .eq("owner_id", user.id)
      .single();

    if (studioErr || !studio) {
      return { success: false, error: "Studio not found or access denied." };
    }

    // 3. Fetch guest participant record
    const { data: guest, error: guestErr } = await supabase
      .from("guest_participants")
      .select("id, studio_id, status, display_name")
      .eq("id", guestId)
      .eq("studio_id", studioId)
      .single();

    if (guestErr || !guest) {
      return { success: false, error: "Guest participant not found in this studio." };
    }

    // 4. Update database status to 'left'
    const { error: updateErr } = await supabase
      .from("guest_participants")
      .update({
        status: "left",
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", guestId)
      .eq("studio_id", studioId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 5. Evict participant from LiveKit Room
    const roomName = `studio_${studioId}`;
    const identity = `guest_${guestId}`;
    const revokeTokenTs = Math.floor(Date.now() / 1000) + 10;

    const evictRes = await evictFn({
      roomName,
      identity,
      revokeTokenTs,
    });

    if (!evictRes.success) {
      // Partial failure: database updated to 'left', but LiveKit eviction failed
      return {
        success: false,
        guestId: guest.id,
        status: "left",
        partialFailure: true,
        error: `Guest status set to 'left' in database, but LiveKit room eviction failed: ${evictRes.error}. Please retry removal to disconnect the user.`,
      };
    }

    return {
      success: true,
      guestId: guest.id,
      status: "left",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove guest.";
    return { success: false, error: msg };
  }
}
