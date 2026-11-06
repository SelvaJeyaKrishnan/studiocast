import type { Metadata } from "next";
import { AuthHeader } from "@/components/shared/auth-header";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create Account | StudioCast",
  description: "Create your StudioCast account to start recording.",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#090a0f]">
      <AuthHeader />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <SignupForm />
      </main>
      <footer className="py-6 border-t border-[#1a1e2b]/50 text-center text-xs text-slate-500">
        <p>© 2026 StudioCast, Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
