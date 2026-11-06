export function sanitizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  let trimmed = rawUrl.trim();
  // Strip any accidental newline or clipboard artifacts like "\n Copy URL"
  if (trimmed.includes("\n")) {
    trimmed = trimmed.split("\n")[0].trim();
  }
  // Strip trailing whitespace or carriage returns
  return trimmed.split(/\s+/)[0].trim();
}

export function sanitizeSupabaseKey(rawKey?: string): string {
  if (!rawKey) return "";
  let trimmed = rawKey.trim();
  if (trimmed.includes("\n")) {
    trimmed = trimmed.split("\n")[0].trim();
  }
  return trimmed.split(/\s+/)[0].trim();
}

/**
 * Helper to validate and retrieve Supabase environment variables safely.
 * Throws explicit warnings if placeholders or unconfigured values are present.
 */
export function getSupabaseEnv() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const url = sanitizeSupabaseUrl(rawUrl);
  const publishableKey = sanitizeSupabaseKey(rawKey);

  let isValidUrl = false;
  try {
    if (url && (url.startsWith("https://") || url.startsWith("http://"))) {
      new URL(url);
      isValidUrl = true;
    }
  } catch {
    isValidUrl = false;
  }

  const isConfigured = Boolean(
    isValidUrl &&
    !url.includes("your-project-id") &&
    !url.includes("placeholder") &&
    publishableKey &&
    !publishableKey.includes("placeholder") &&
    publishableKey.length > 10
  );

  return {
    url,
    publishableKey,
    isConfigured,
  };
}
