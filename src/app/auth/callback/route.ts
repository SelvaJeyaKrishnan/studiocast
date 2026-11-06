import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";

  // Security: Prevent open redirect vulnerabilities by strictly verifying local path
  const sanitizedNext = nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${sanitizedNext}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${sanitizedNext}`);
      } else {
        return NextResponse.redirect(`${origin}${sanitizedNext}`);
      }
    }
  }

  // Return the user to login with an explicit error parameter
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
