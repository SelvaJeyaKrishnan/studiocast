import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (client) return client;

  const { url, publishableKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    // Return mock-safe inert client during prerender / unconfigured state
    client = createBrowserClient<Database>(
      url || "https://unconfigured.supabase.co",
      publishableKey || "unconfigured-key"
    );
    return client;
  }

  client = createBrowserClient<Database>(url, publishableKey);
  return client;
}
