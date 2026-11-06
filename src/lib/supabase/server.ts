import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey, isConfigured } = getSupabaseEnv();

  return createServerClient<Database>(
    isConfigured ? url : "https://unconfigured.supabase.co",
    isConfigured ? publishableKey : "unconfigured-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handled in server components
          }
        },
      },
    }
  );
}
