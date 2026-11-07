"use server";

import { createClient } from "@/lib/supabase/server";
import { hashGuestSessionSecret } from "@/lib/crypto/tokens";
import { createLiveKitAccessToken } from "@/lib/livekit/token";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface HostLiveKitTokenResult {
  success: boolean;
  token?: string;
  url?: string;
  roomName?: string;
  error?: string;
}

export interface GuestLiveKitTokenResult {
  success: boolean;
  token?: string;
  url?: string;
  roomName?: string;
  error?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Server Action: Generates a signed LiveKit access token for an authenticated studio host.
 * Strictly verifies user authentication and studio ownership via Supabase RLS.
 */
export async function getHostLiveKitTokenAction(
  studioId: string
): Promise<HostLiveKitTokenResult> {
  if (!studioId || !UUID_REGEX.test(studioId)) {
    return { success: false, error: "Invalid studio identifier provided." };
  }

  try {
    const supabase = await createClient();

    // 1. Authenticate user session
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized: Please sign in to access this studio." };
    }

    // 2. Verify studio ownership (strictly protected by RLS)
    const { data: studio, error: studioErr } = await supabase
      .from("studios")
      .select("id, name, owner_id")
      .eq("id", studioId)
      .eq("owner_id", user.id)
      .single();

    if (studioErr || !studio) {
      return { success: false, error: "Studio not found or access denied." };
    }

    // 3. Fetch user display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const hostName =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Studio Host";

    // 4. Generate LiveKit host token
    const roomName = `studio_${studioId}`;
    const identity = `host_${user.id}`;

    const { token, url } = await createLiveKitAccessToken({
      roomName,
      identity,
      name: hostName,
      isHost: true,
      metadata: {
        role: "host",
        userId: user.id,
        studioId,
      },
    });

    return {
      success: true,
      token,
      url,
      roomName,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate host media token.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Generates a signed LiveKit access token for a validated guest participant.
 * Strictly verifies the guest UUID and cryptographic session secret hash via database RPC.
 */
export async function getGuestLiveKitTokenAction(
  guestId: string,
  sessionSecret: string,
  supabaseClient?: SupabaseClient<Database>
): Promise<GuestLiveKitTokenResult> {
  if (!guestId || !UUID_REGEX.test(guestId)) {
    return { success: false, error: "Invalid guest session identifier." };
  }

  if (!sessionSecret || sessionSecret.trim().length < 32) {
    return { success: false, error: "Invalid guest session credentials provided." };
  }

  try {
    const supabase = supabaseClient ?? (await createClient());
    const sessionSecretHash = hashGuestSessionSecret(sessionSecret);

    // 1. Verify guest session ownership via hardened SECURITY DEFINER RPC
    const { data, error: rpcErr } = await supabase.rpc("get_guest_session", {
      p_guest_id: guestId,
      p_session_secret_hash: sessionSecretHash,
    });

    if (rpcErr || !data || data.length === 0) {
      return {
        success: false,
        error: "Unauthorized: Guest session not found or credentials invalid.",
      };
    }

    const guestSession = data[0];

    // 2. Verify guest status - MUST BE EXACTLY "admitted" to receive media token
    if (guestSession.status !== "admitted") {
      if (guestSession.status === "waiting") {
        return {
          success: false,
          error:
            "Unauthorized: Guest is in the waiting room and has not been admitted by the host.",
        };
      }
      return {
        success: false,
        error: "Unauthorized: Guest session has ended or is not authorized.",
      };
    }

    // 3. Generate LiveKit guest token strictly scoped to this studio
    const roomName = `studio_${guestSession.studio_id}`;
    const identity = `guest_${guestId}`;

    const { token, url } = await createLiveKitAccessToken({
      roomName,
      identity,
      name: guestSession.display_name || "Guest",
      isHost: false, // Guests NEVER receive roomAdmin permissions
      metadata: {
        role: "guest",
        guestId,
        studioId: guestSession.studio_id,
        studioName: guestSession.studio_name,
      },
    });

    return {
      success: true,
      token,
      url,
      roomName,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate guest media token.";
    return { success: false, error: msg };
  }
}
