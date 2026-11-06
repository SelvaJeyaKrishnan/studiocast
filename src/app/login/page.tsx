import type { Metadata } from "next";
import { AuthHeader } from "@/components/shared/auth-header";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign In | StudioCast",
  description: "Sign in to your StudioCast account.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#090a0f]">
      <AuthHeader />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <LoginForm />
      </main>
      <footer className="py-6 border-t border-[#1a1e2b]/50 text-center text-xs text-slate-500">
        <p>© 2026 StudioCast, Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
