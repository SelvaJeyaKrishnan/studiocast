/**
 * Helper to validate and retrieve Supabase environment variables safely.
 * Throws explicit warnings if placeholders or unconfigured values are present.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Supports both NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and legacy NEXT_PUBLIC_SUPABASE_ANON_KEY
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isConfigured = Boolean(
    url &&
    !url.includes("your-project-id") &&
    !url.includes("placeholder") &&
    publishableKey &&
    !publishableKey.includes("placeholder") &&
    publishableKey.trim().length > 0
  );

  return {
    url: url || "",
    publishableKey: publishableKey || "",
    isConfigured,
  };
}
