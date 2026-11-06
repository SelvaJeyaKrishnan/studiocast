"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  LogOut,
  Sparkles,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  Mic,
  Camera,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { leaveGuestSessionAction, getGuestSessionAction } from "@/app/join/actions/guest-actions";

interface GuestWaitingRoomClientProps {
  guestId: string;
  initialStudioName?: string;
  initialDisplayName?: string;
  initialStatus?: string;
}

export function GuestWaitingRoomClient({
  guestId,
  initialStudioName,
  initialDisplayName,
  initialStatus = "waiting",
}: GuestWaitingRoomClientProps) {
  const router = useRouter();
  const [sessionSecret, setSessionSecret] = React.useState<string | null>(null);
  const [studioName, setStudioName] = React.useState<string>(initialStudioName || "Studio Room");
  const [displayName, setDisplayName] = React.useState<string>(initialDisplayName || "Guest");
  const [status, setStatus] = React.useState(initialStatus);
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Authenticate session from secure client storage
  React.useEffect(() => {
    let ignore = false;

    async function verify() {
      let secret = "";
      let storedName = "";
      if (typeof window !== "undefined") {
        secret = sessionStorage.getItem("studiocast_guest_secret") || "";
        storedName = sessionStorage.getItem("studiocast_guest_name") || "";
      }

      if (!secret) {
        if (!ignore) {
          setIsVerifying(false);
          setAuthError("Unauthorized guest session. Missing cryptographic session token.");
        }
        return;
      }

      if (!ignore) {
        setSessionSecret(secret);
        if (storedName) setDisplayName(storedName);
      }

      try {
        const res = await getGuestSessionAction(guestId, secret);
        if (ignore) return;
        if (!res.success || !res.session) {
          setAuthError(res.error || "Guest session is invalid or expired.");
        } else {
          setStatus(res.session.status);
          setStudioName(res.session.studio_name);
          setDisplayName(res.session.display_name);
        }
      } catch {
        if (!ignore) {
          setAuthError("Could not connect to guest waiting room.");
        }
      } finally {
        if (!ignore) {
          setIsVerifying(false);
        }
      }
    }

    void verify();

    return () => {
      ignore = true;
    };
  }, [guestId]);

  // Periodic heartbeat / status poll
  React.useEffect(() => {
    if (!sessionSecret || authError) return;

    const interval = setInterval(async () => {
      try {
        const res = await getGuestSessionAction(guestId, sessionSecret);
        if (res.success && res.session) {
          setStatus(res.session.status);
        }
      } catch {
        // Silent poll error catch
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [guestId, sessionSecret, authError]);

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      if (sessionSecret) {
        await leaveGuestSessionAction(guestId, sessionSecret);
      }
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("studiocast_guest_id");
        sessionStorage.removeItem("studiocast_guest_secret");
        sessionStorage.removeItem("studiocast_guest_name");
      }
      router.push("/");
    } catch {
      router.push("/");
    }
  };

  const guestInitials = (displayName || "G")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Verifying secure guest session credentials...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-rose-500/30 bg-[#0e1118] text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-white">Access Denied</h2>
          <p className="text-xs text-slate-400">{authError}</p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={() => router.push("/")}>
              Return Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="h-16 border-b border-[#1a1e2b] bg-[#0e1118]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4">
        <Logo />

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <Wifi className="w-3.5 h-3.5" />
            <span>Connected to Waiting Room</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLeave}
            disabled={isLeaving}
            className="text-xs text-rose-400 hover:text-rose-300 hover:border-rose-500/40"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            <span>Leave Studio</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        <div className="rounded-2xl border border-[#1a1e2b] bg-[#0e1118] p-6 sm:p-10 shadow-2xl text-center space-y-6">
          {/* Avatar & Pulse Indicator */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-3xl bg-violet-600/20 animate-ping opacity-30" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 border-2 border-violet-400/40 flex items-center justify-center text-white text-3xl font-bold shadow-xl">
              {guestInitials}
            </div>
          </div>

          {/* Guest Identity & Room Information */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Hello, {displayName}!
            </h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You are in the waiting room for{" "}
              <strong className="text-violet-300 font-semibold">{studioName}</strong>.
            </p>
          </div>

          {/* Status Alert Banner */}
          <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-950/20 text-xs text-slate-300 flex items-center justify-center gap-2.5 max-w-md mx-auto">
            {status === "admitted" ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-medium">You have been admitted by the host!</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <span>Waiting for the studio host to begin the recording session...</span>
              </>
            )}
          </div>

          {/* Hardware & Feature Preview Card */}
          <div className="p-5 rounded-2xl border border-[#1a1e2b] bg-[#131722] text-left space-y-3.5 max-w-md mx-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Next Generation AV Engine</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When the host starts, you will be prompted for camera and microphone access. High-resolution local multi-track recording will automatically initialize.
            </p>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-[#1a1e2b]/80">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-slate-500" /> 48 kHz Studio Audio
              </span>
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-500" /> 1080p Local Video
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure anonymous guest token session active</span>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-600 py-4 border-t border-[#1a1e2b]/60">
        StudioCast Studio Recording Protocol
      </footer>
    </div>
  );
}
