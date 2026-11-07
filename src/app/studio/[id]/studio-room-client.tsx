"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Video,
  AlertCircle,
  Loader2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicSiteUrl } from "@/lib/utils/site-url";
import { HostGuestManager } from "./host-guest-manager";
import { LiveMediaRoom } from "@/components/studio/live-media-room";
import { getHostLiveKitTokenAction } from "@/app/studio/actions/livekit-actions";
import { removeGuestParticipantAction } from "@/app/studio/actions/guest-management-actions";
import type { StudioRow } from "@/types/database";

interface StudioRoomClientProps {
  studio: StudioRow;
  host: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export function StudioRoomClient({ studio, host }: StudioRoomClientProps) {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [isLiveActive, setIsLiveActive] = React.useState(false);
  const [isTokenLoading, setIsTokenLoading] = React.useState(false);
  const [liveKitToken, setLiveKitToken] = React.useState<string | null>(null);
  const [liveKitUrl, setLiveKitUrl] = React.useState<string | null>(null);
  const [tokenError, setTokenError] = React.useState<string | null>(null);
  const [isGuestDrawerOpen, setIsGuestDrawerOpen] = React.useState(false);

  const roomUrl =
    typeof window !== "undefined" && window.location.href
      ? window.location.href
      : `${getPublicSiteUrl()}/studio/${studio.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleEnterLiveRoom = async () => {
    setIsTokenLoading(true);
    setTokenError(null);

    const res = await getHostLiveKitTokenAction(studio.id);

    if (!res.success || !res.token || !res.url) {
      setTokenError(res.error || "Failed to initialize live media session.");
      setIsTokenLoading(false);
      return;
    }

    setLiveKitToken(res.token);
    setLiveKitUrl(res.url);
    setIsLiveActive(true);
    setIsTokenLoading(false);
  };

  const handleLeaveLiveRoom = () => {
    setIsLiveActive(false);
    setLiveKitToken(null);
    setLiveKitUrl(null);
  };

  // If host has entered the live media session
  if (isLiveActive && liveKitToken && liveKitUrl) {
    return (
      <div className="relative min-h-screen">
        <LiveMediaRoom
          token={liveKitToken}
          liveKitUrl={liveKitUrl}
          displayName={host.name}
          isHost={true}
          roomTitle={studio.name}
          onLeave={handleLeaveLiveRoom}
          onRemoveGuest={async (guestId) => {
            await removeGuestParticipantAction(studio.id, guestId);
          }}
          headerSlot={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGuestDrawerOpen(true)}
                className="text-xs"
              >
                <Users className="w-3.5 h-3.5 text-violet-400 mr-1.5" />
                <span>Guests & Waiting Room</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    <span>Room Link</span>
                  </>
                )}
              </Button>
            </div>
          }
        />

        {/* In-Call Host Guest Manager Modal / Drawer */}
        {isGuestDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-[#1a1e2b] bg-[#0e1118] p-6 sm:p-8 shadow-2xl relative space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#1a1e2b]">
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-violet-400" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Studio Guest Management
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGuestDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <HostGuestManager studioId={studio.id} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pre-join Studio Host Lobby & Management View
  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="h-16 border-b border-[#1a1e2b] bg-[#0e1118]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-[#1a1e2b]" />
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">Studio Ready</span>
          </div>
        </div>

        {/* Studio Room Link Quick Copy */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs"
            title="Copy Host direct link (owner only)"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                <span className="text-emerald-400 font-medium">Host Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                <span>Copy Host Link</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Studio Lobby */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Live Entrance Card */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] space-y-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#1a1e2b]">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-violet-400">
                    Real-Time Media Studio
                  </span>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {studio.name}
                  </h2>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Video className="w-6 h-6" />
                </div>
              </div>

              {tokenError && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{tokenError}</span>
                </div>
              )}

              <p className="text-sm text-slate-300 leading-relaxed">
                Connect directly with your guests in crystal-clear real-time video and audio powered by LiveKit WebRTC.
              </p>

              <div className="pt-2">
                <Button
                  size="lg"
                  variant="primary"
                  onClick={handleEnterLiveRoom}
                  disabled={isTokenLoading}
                  className="w-full justify-center text-sm font-semibold rounded-xl h-12 shadow-lg shadow-violet-600/25"
                >
                  {isTokenLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Connecting Media Room...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      <span>Start Real-Time Session</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Direct Host Room URL Box */}
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 space-y-2">
              <label className="text-[11px] font-medium text-amber-200/90 flex items-center justify-between">
                <span>Studio Host Direct Link (Host Only)</span>
                <span className="text-amber-400 font-mono text-[10px]">Private Owner Access</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={roomUrl}
                  className="flex-1 rounded-xl border border-[#1a1e2b] bg-[#131722] px-3 py-2 text-xs font-mono text-slate-300 select-all"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0 text-xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                ⚠️ <strong>Do not send this link to guests.</strong> This direct URL is protected and only opens for your authenticated host account. To invite guests without accounts, use <strong>Create Guest Link</strong> in the panel on the right.
              </p>
            </div>
          </div>

          {/* Right Column: Host Guest Manager */}
          <div className="lg:col-span-5 space-y-6">
            <HostGuestManager studioId={studio.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
