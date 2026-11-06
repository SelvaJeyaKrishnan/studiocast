"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Radio,
  ArrowLeft,
  Copy,
  Check,
  Camera,
  Mic,
  Sliders,
  ShieldCheck,
  VideoOff,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicSiteUrl } from "@/lib/utils/site-url";
import { HostGuestManager } from "./host-guest-manager";
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
  const [micMuted, setMicMuted] = React.useState(false);
  const [cameraOff, setCameraOff] = React.useState(false);

  const roomUrl = typeof window !== "undefined" && window.location.href
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

  const hostInitials = (host.name || "SH")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

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
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-medium text-amber-300">Preparing Studio</span>
          </div>
        </div>

        {/* Studio Room Link Quick Copy */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                <span className="text-emerald-400 font-medium">Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                <span>Copy Room Link</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Studio Waiting Room */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: AV Stage Viewport Placeholder */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-video w-full rounded-2xl border border-[#1a1e2b] bg-[#0e1118] overflow-hidden flex flex-col items-center justify-center p-6 shadow-2xl">
              {/* Host Avatar Center */}
              <div className="relative w-24 h-24 rounded-3xl overflow-hidden border-2 border-violet-500/40 bg-[#131722] flex items-center justify-center shadow-lg">
                {host.avatarUrl ? (
                  <Image
                    src={host.avatarUrl}
                    alt={host.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-3xl font-bold text-violet-400">{hostInitials}</span>
                )}
              </div>

              {/* Host Name Label */}
              <div className="mt-4 text-center">
                <p className="text-sm font-semibold text-white">{host.name}</p>
                <p className="text-xs text-violet-400 flex items-center justify-center gap-1 mt-0.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Studio Host
                </p>
              </div>

              {/* Status Overlay */}
              <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-slate-300">
                <Radio className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                <span>{studio.name}</span>
              </div>

              {/* Controls bar placeholder */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setMicMuted((prev) => !prev)}
                  className={`p-3 rounded-xl border transition ${
                    micMuted
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                      : "bg-[#131722]/90 border-[#1a1e2b] text-slate-200 hover:text-white hover:bg-white/10"
                  }`}
                  title={micMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setCameraOff((prev) => !prev)}
                  className={`p-3 rounded-xl border transition ${
                    cameraOff
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                      : "bg-[#131722]/90 border-[#1a1e2b] text-slate-200 hover:text-white hover:bg-white/10"
                  }`}
                  title={cameraOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {cameraOff ? <VideoOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  className="p-3 rounded-xl border border-[#1a1e2b] bg-[#131722]/90 text-slate-200 hover:text-white hover:bg-white/10 transition"
                  title="Audio & Video Settings"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500">
              Camera and microphone setup hardware engine will initialize here in Phase 2.
            </p>
          </div>

          {/* Right Column: Studio Information & Readiness Checklist */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 px-2 py-0.5 rounded-md bg-violet-600/10 border border-violet-500/20">
                Phase 1 Preview
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {studio.name}
              </h1>
              {studio.description ? (
                <p className="text-xs text-slate-400 leading-relaxed">{studio.description}</p>
              ) : (
                <p className="text-xs text-slate-500 italic">No description provided for this studio.</p>
              )}
            </div>

            {/* Unique Room URL Box */}
            <div className="p-4 rounded-xl border border-[#1a1e2b] bg-[#0e1118] space-y-2">
              <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                <span>Studio Host Direct Link</span>
                <span className="text-violet-400 font-mono text-[10px]">Owner Session</span>
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
                  className="shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                This direct room link is only accessible to you as the authenticated studio owner. For guests, use the Guest Invitation generator below.
              </p>
            </div>

            {/* Host Guest Manager (Secure Invitations & Real-Time Waiting Room) */}
            <HostGuestManager studioId={studio.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
