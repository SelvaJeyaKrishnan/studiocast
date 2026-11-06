import { randomBytes, createHash } from "crypto";

/**
 * Generate a cryptographically secure random token (URL-safe string).
 */
export function generateInvitationToken(length: number = 32): string {
  return randomBytes(length).toString("base64url");
}

/**
 * Compute SHA-256 hash of an invitation token or session secret.
 * Only the hash is ever stored or compared in PostgreSQL.
 */
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Generate a cryptographically secure random session credential for a guest.
 */
export function generateGuestSessionSecret(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Compute SHA-256 hash of a guest session secret.
 */
export function hashGuestSessionSecret(secret: string): string {
  return createHash("sha256").update(secret.trim()).digest("hex");
}
