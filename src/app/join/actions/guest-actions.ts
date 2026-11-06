"use server";

import { createClient } from "@/lib/supabase/server";
import {
  hashInvitationToken,
  generateGuestSessionSecret,
  hashGuestSessionSecret,
} from "@/lib/crypto/tokens";

export interface GuestVerificationResult {
  isValid: boolean;
  studioName?: string;
  studioId?: string;
  invitationId?: string;
  error?: "invalid_token" | "not_found" | "revoked" | "expired" | "studio_deleted" | "system_error";
  message?: string;
}

export interface RegisterGuestResult {
  success: boolean;
  guestId?: string;
  sessionSecret?: string;
  studioId?: string;
  studioName?: string;
  displayName?: string;
  error?: string;
}

/**
 * Public Server Action: Verify an invitation token for a guest.
 * Executes the secure PostgreSQL RPC `verify_guest_invitation`.
 */
export async function verifyGuestInvitationAction(rawToken: string): Promise<GuestVerificationResult> {
  if (!rawToken || rawToken.trim().length === 0) {
    return { isValid: false, error: "invalid_token", message: "Missing invitation token." };
  }

  try {
    const supabase = await createClient();
    const tokenHash = hashInvitationToken(rawToken);

    const { data, error } = await supabase.rpc("verify_guest_invitation", {
      p_token_hash: tokenHash,
    });

    if (error || !data || data.length === 0) {
      return {
        isValid: false,
        error: "not_found",
        message: "This invitation link is invalid or does not exist.",
      };
    }

    const res = data[0];
    if (!res.is_valid) {
      let msg = "This invitation is no longer valid.";
      if (res.error_code === "expired") {
        msg = "This invitation has expired. Please ask the host for a new link.";
      } else if (res.error_code === "revoked") {
        msg = "This invitation was revoked by the studio host.";
      } else if (res.error_code === "not_found") {
        msg = "Invitation token not found.";
      }
      return {
        isValid: false,
        error: (res.error_code as GuestVerificationResult["error"]) || "invalid_token",
        message: msg,
      };
    }

    return {
      isValid: true,
      studioName: res.studio_name,
      studioId: res.studio_id,
      invitationId: res.invitation_id,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "System error validating invitation.";
    return { isValid: false, error: "system_error", message: msg };
  }
}

/**
 * Public Server Action: Register guest display name into guest_participants table.
 * Generates an unguessable guest session secret, hashes it with SHA-256 for database storage,
 * and returns the raw secret strictly to the guest client.
 */
export async function registerGuestParticipantAction(
  rawToken: string,
  displayName: string
): Promise<RegisterGuestResult> {
  const cleanName = displayName.trim();
  if (cleanName.length < 2 || cleanName.length > 50) {
    return { success: false, error: "Display name must be between 2 and 50 characters." };
  }

  try {
    const supabase = await createClient();
    const tokenHash = hashInvitationToken(rawToken);

    // Generate cryptographic guest session secret & SHA-256 hash
    const sessionSecret = generateGuestSessionSecret();
    const sessionSecretHash = hashGuestSessionSecret(sessionSecret);

    const { data, error } = await supabase.rpc("register_guest_participant", {
      p_token_hash: tokenHash,
      p_session_secret_hash: sessionSecretHash,
      p_display_name: cleanName,
    });

    if (error || !data || data.length === 0) {
      return { success: false, error: error?.message || "Failed to register guest session." };
    }

    const reg = data[0];
    return {
      success: true,
      guestId: reg.guest_id,
      sessionSecret,
      studioId: reg.studio_id,
      studioName: reg.studio_name,
      displayName: reg.display_name,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not complete guest registration.";
    return { success: false, error: msg };
  }
}

/**
 * Public Server Action: Get guest waiting room session details.
 * Requires both guestId and the cryptographically secure sessionSecret.
 */
export async function getGuestSessionAction(guestId: string, sessionSecret: string) {
  if (!guestId || !sessionSecret) {
    return { success: false, error: "Unauthorized session request." };
  }

  try {
    const supabase = await createClient();
    const secretHash = hashGuestSessionSecret(sessionSecret);

    const { data, error } = await supabase.rpc("get_guest_session", {
      p_guest_id: guestId,
      p_session_secret_hash: secretHash,
    });

    if (error || !data || data.length === 0) {
      return { success: false, error: "Guest session not found or credentials invalid." };
    }

    return { success: true, session: data[0] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error loading session.";
    return { success: false, error: msg };
  }
}

/**
 * Public Server Action: Leave guest waiting room.
 * Requires both guestId and the cryptographically secure sessionSecret.
 */
export async function leaveGuestSessionAction(guestId: string, sessionSecret: string) {
  if (!guestId || !sessionSecret) {
    return { success: false };
  }

  try {
    const supabase = await createClient();
    const secretHash = hashGuestSessionSecret(sessionSecret);

    const { data: success } = await supabase.rpc("leave_guest_session", {
      p_guest_id: guestId,
      p_session_secret_hash: secretHash,
    });
    return { success: Boolean(success) };
  } catch {
    return { success: false };
  }
}
