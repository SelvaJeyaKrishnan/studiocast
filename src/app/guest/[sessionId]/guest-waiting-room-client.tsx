"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Sparkles,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  Mic,
  Video,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { leaveGuestSessionAction, getGuestSessionAction } from "@/app/join/actions/guest-actions";
import { getGuestLiveKitTokenAction } from "@/app/studio/actions/livekit-actions";
import { LiveMediaRoom } from "@/components/studio/live-media-room";

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
  const [status, setStatus] = React.useState<string>(initialStatus);
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Live Media Room State
  const [isLiveActive, setIsLiveActive] = React.useState(false);
  const [isTokenLoading, setIsTokenLoading] = React.useState(false);
  const [liveKitToken, setLiveKitToken] = React.useState<string | null>(null);
  const [liveKitUrl, setLiveKitUrl] = React.useState<string | null>(null);
  const [tokenError, setTokenError] = React.useState<string | null>(null);

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
    if (!sessionSecret || authError || isLiveActive) return;

    const interval = setInterval(async () => {
      try {
        const res = await getGuestSessionAction(guestId, sessionSecret);
        if (res.success && res.session) {
          setStatus(res.session.status);
          if (res.session.status === "left") {
            setAuthError("Your session has ended or you were removed from the studio.");
          }
        } else if (!res.success) {
          setAuthError(res.error || "Guest session is no longer active or was revoked.");
        }
      } catch {
        // Silent poll error catch
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [guestId, sessionSecret, authError, isLiveActive]);

  const handleJoinLive = async () => {
    if (!sessionSecret) return;

    if (status !== "admitted") {
      setTokenError("You cannot enter yet. Please wait for the host to admit you.");
      return;
    }

    setIsTokenLoading(true);
    setTokenError(null);

    const res = await getGuestLiveKitTokenAction(guestId, sessionSecret);

    if (!res.success || !res.token || !res.url) {
      setTokenError(res.error || "Failed to join live studio media.");
      setIsTokenLoading(false);
      return;
    }

    setLiveKitToken(res.token);
    setLiveKitUrl(res.url);
    setIsLiveActive(true);
    setIsTokenLoading(false);
  };

  const handleLeaveLiveRoom = async () => {
    setIsLiveActive(false);
    setLiveKitToken(null);
    setLiveKitUrl(null);
    await handleLeave();
  };

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

  // If Guest is in the Live Room
  if (isLiveActive && liveKitToken && liveKitUrl) {
    return (
      <LiveMediaRoom
        token={liveKitToken}
        liveKitUrl={liveKitUrl}
        displayName={displayName}
        isHost={false}
        roomTitle={studioName}
        onLeave={handleLeaveLiveRoom}
      />
    );
  }

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
        <div className="w-full max-w-md p-8 rounded-2xl border border-rose-500/30 bg-[#0e1118] text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-white">Guest Session Expired or Revoked</h1>
            <p className="text-xs text-slate-400 leading-relaxed">{authError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/")} className="w-full justify-center">
            Return to StudioCast Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between pb-6">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
            Session Verified
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md w-full mx-auto space-y-6">
        <div className="p-8 rounded-3xl border border-[#1a1e2b] bg-[#0e1118] text-center space-y-6 shadow-2xl">
          {/* Guest Avatar */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-[#131722] border-2 border-violet-500/40 flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-violet-400">{guestInitials}</span>
            <div className="absolute -bottom-1.5 -right-1.5 p-1 rounded-lg bg-emerald-500 text-white shadow">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-white tracking-tight">{displayName}</h1>
            <p className="text-xs text-violet-400 font-medium">Guest in {studioName}</p>
          </div>

          {/* Admission Status Feedback Banner */}
          {status === "waiting" && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-xs text-amber-300 flex items-center gap-2.5 text-left">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
              <span>
                You are in the waiting room. The host has been notified and will admit you to the live room shortly.
              </span>
            </div>
          )}

          {status === "admitted" && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-300 flex items-center gap-2.5 text-left">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                You have been admitted by the host! Click below to enter the live studio room.
              </span>
            </div>
          )}

          {tokenError && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{tokenError}</span>
            </div>
          )}

          {/* Join Studio Action */}
          <div className="space-y-3 pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={handleJoinLive}
              disabled={isTokenLoading || status !== "admitted"}
              className="w-full justify-center rounded-xl h-12 shadow-lg shadow-violet-600/25 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTokenLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Connecting to Studio...</span>
                </>
              ) : status === "waiting" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2 text-slate-400" />
                  <span>Waiting for Host Admission...</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  <span>Enter Live Studio Room</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLeave}
              disabled={isLeaving}
              className="w-full justify-center text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              <span>{isLeaving ? "Leaving..." : "Leave Studio"}</span>
            </Button>
          </div>
        </div>

        {/* Device Status Tips */}
        <div className="p-4 rounded-2xl border border-[#1a1e2b] bg-[#0e1118]/60 space-y-2">
          <p className="text-xs font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Ready for recording</span>
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li className="flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-slate-500" />
              <span>Microphone and camera permissions requested on entrance.</span>
            </li>
            <li className="flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-slate-500" />
              <span>Encrypted WebRTC peer audio/video via LiveKit SFU.</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="text-center text-xs text-slate-600 pt-6">
        <span>StudioCast Secure Real-Time Media</span>
      </footer>
    </div>
  );
}
