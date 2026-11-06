/**
 * Helper to get the canonical public base URL of the deployed application.
 * In the browser, it uses window.location.origin dynamically.
 * On the server, it prioritizes NEXT_PUBLIC_SITE_URL, VERCEL_URL, or falls back to localhost in development.
 */
export function getPublicSiteUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const url = process.env.NEXT_PUBLIC_SITE_URL.trim();
    return url.startsWith("http") ? url : `https://${url}`;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
