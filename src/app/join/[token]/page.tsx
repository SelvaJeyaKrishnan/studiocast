import * as React from "react";
import { verifyGuestInvitationAction } from "../actions/guest-actions";
import { GuestJoinForm } from "./guest-join-form";
import { AlertCircle, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

interface JoinPageProps {
  params: Promise<{
    token: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;
  const verification = await verifyGuestInvitationAction(token);

  if (!verification.isValid) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] text-center space-y-5 shadow-2xl">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
            {verification.error === "revoked" ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              {verification.error === "expired"
                ? "Invitation Expired"
                : verification.error === "revoked"
                ? "Invitation Revoked"
                : "Invalid Invitation Link"}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {verification.message ||
                "This guest invitation link is not active or could not be found. Please check with the studio host for a new link."}
            </p>
          </div>

          <div className="pt-2 border-t border-[#1a1e2b]">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-medium transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to StudioCast Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header Branding */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-6">
        <Logo />
        <span className="text-[11px] font-mono uppercase tracking-wider text-violet-400 px-2.5 py-1 rounded-lg bg-violet-600/10 border border-violet-500/20">
          Guest Access
        </span>
      </header>

      {/* Main Join Container */}
      <main className="max-w-md w-full mx-auto my-auto">
        <GuestJoinForm
          token={token}
          studioName={verification.studioName || "Studio Room"}
        />
      </main>

      {/* Minimal Footer */}
      <footer className="text-center text-[11px] text-slate-600 py-4">
        Protected by StudioCast Secure Invitation Protocol. No account required.
      </footer>
    </div>
  );
}
