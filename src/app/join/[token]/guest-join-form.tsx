"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Radio, Loader2, ArrowRight, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerGuestParticipantAction } from "../actions/guest-actions";

interface GuestJoinFormProps {
  token: string;
  studioName: string;
}

export function GuestJoinForm({ token, studioName }: GuestJoinFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = displayName.trim();

    if (!clean) {
      setError("Please enter your name or alias to enter the studio.");
      return;
    }

    if (clean.length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }

    if (clean.length > 50) {
      setError("Display name cannot exceed 50 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await registerGuestParticipantAction(token, clean);

      if (!res.success || !res.guestId) {
        setError(res.error || "Failed to join studio. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Save guest session ID and cryptographic session secret in secure sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.setItem("studiocast_guest_id", res.guestId);
        if (res.sessionSecret) {
          sessionStorage.setItem("studiocast_guest_secret", res.sessionSecret);
        }
        sessionStorage.setItem("studiocast_guest_name", res.displayName || clean);
      }

      // Route into guest waiting room
      router.push(`/guest/${res.guestId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error registering guest.";
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#1a1e2b] bg-[#0e1118] p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Studio Header Card */}
      <div className="flex items-center gap-3.5 pb-4 border-b border-[#1a1e2b]">
        <div className="w-12 h-12 rounded-xl bg-violet-600/15 border border-violet-500/30 text-violet-400 flex items-center justify-center shrink-0">
          <Radio className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
            Invited to Join
          </span>
          <h2 className="text-lg font-semibold text-white tracking-tight leading-tight">
            {studioName}
          </h2>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 animate-in fade-in">
          {error}
        </div>
      )}

      {/* Guest Name Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="guest-name" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Your Display Name</span>
            <span className="text-rose-400">*</span>
          </label>
          <Input
            id="guest-name"
            placeholder="e.g. Sarah Jenkins (Guest Co-host)"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (error) setError(null);
            }}
            maxLength={50}
            disabled={isSubmitting}
            autoFocus
            required
          />
          <p className="text-[11px] text-slate-500">
            This name will be visible to the host and fellow participants in the studio.
          </p>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full justify-center shadow-lg shadow-violet-600/25"
            disabled={isSubmitting || !displayName.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Entering Waiting Room...</span>
              </>
            ) : (
              <>
                <span>Join Waiting Room</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Security badge */}
      <div className="pt-4 border-t border-[#1a1e2b] flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>End-to-end token validated. No account or password required.</span>
      </div>
    </div>
  );
}
