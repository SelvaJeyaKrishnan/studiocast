"use server";

import { createClient } from "@/lib/supabase/server";
import { generateInvitationToken, hashInvitationToken } from "@/lib/crypto/tokens";
import { getPublicSiteUrl } from "@/lib/utils/site-url";
import type { StudioInvitationRow } from "@/types/database";

export interface CreateInvitationResult {
  success: boolean;
  rawToken?: string;
  invitationUrl?: string;
  invitation?: StudioInvitationRow;
  error?: string;
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
 * Server action: Revoke an existing invitation.
 */
export async function revokeStudioInvitationAction(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized." };
    }

    const { error: updateErr } = await supabase
      .from("studio_invitations")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .eq("created_by", user.id);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to revoke invitation.";
    return { success: false, error: message };
  }
}
