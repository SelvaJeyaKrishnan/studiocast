"use client";

import * as React from "react";
import Image from "next/image";
import { Mic2, Sliders, Users, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  const [activeNotice, setActiveNotice] = React.useState<string | null>(null);

  const handleAction = (label: string) => {
    setActiveNotice(label);
    const target = document.getElementById("about");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* ========================================================
          1. HERO SECTION
          ======================================================== */}
      <section
        id="overview"
        className="pt-20 pb-16 md:pt-32 md:pb-24 relative overflow-hidden"
      >
        <Container className="text-center flex flex-col items-center">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-white max-w-4xl leading-[1.12]">
            Every Conversation Deserves{" "}
            <span className="text-violet-400">Studio Quality.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed font-normal">
            Record professional podcasts, interviews and conversations remotely.
            Bring your guests together and create content worth sharing.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              variant="primary"
              onClick={() => handleAction("Get Started")}
            >
              Get Started
            </Button>
            <a href="#features">
              <Button size="lg" variant="secondary">
                Explore Features
              </Button>
            </a>
          </div>

          {/* Clean Hero Visual with the actual StudioCast image */}
          <div className="mt-14 w-full max-w-5xl">
            <div className="rounded-2xl overflow-hidden border border-[#1a1e2b] bg-[#0e1118]">
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src="/studiocast-hero.jpg"
                  alt="StudioCast Remote Recording Studio Interface"
                  fill
                  priority
                  className="object-cover object-center"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              * Product preview. Recording engine scheduled for upcoming release.
            </p>
          </div>
        </Container>
      </section>

      {/* ========================================================
          2. THREE CORE FEATURES
          ======================================================== */}
      <section
        id="features"
        className="py-24 border-t border-[#1a1e2b] bg-[#090a0f] scroll-mt-16"
      >
        <Container>
          <div className="max-w-2xl mb-16">
            <p className="text-xs font-medium uppercase tracking-wider text-violet-400 mb-2">
              Planned Capabilities
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Built for pristine remote recording
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] hover:border-[#242a3b] transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6">
                  <Mic2 className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-white">
                    High-Quality Recording
                  </h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-800/40">
                    Planned
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Capture uncompressed, studio-grade audio and crisp video directly on each participant&apos;s device, completely independent of internet connection stability.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] hover:border-[#242a3b] transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6">
                  <Sliders className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-white">
                    Separate Participant Tracks
                  </h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-800/40">
                    Planned
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Every speaker is recorded as an isolated audio and video track. Mix, level, and edit each voice independently in your favorite editing software.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] hover:border-[#242a3b] transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-white">
                    Remote Guest Collaboration
                  </h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-800/40">
                    Planned
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Invite co-hosts and guests with a single shareable link. No software downloads or account signups needed for your guests to join.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================
          3. HOW IT WORKS
          ======================================================== */}
      <section
        id="how-it-works"
        className="py-24 border-t border-[#1a1e2b] bg-[#090a0f] scroll-mt-16"
      >
        <Container>
          <div className="max-w-2xl mb-16">
            <p className="text-xs font-medium uppercase tracking-wider text-violet-400 mb-2">
              Workflow
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Three simple steps to record
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118]">
              <span className="text-xs font-mono text-violet-400 block mb-4">
                01
              </span>
              <h3 className="text-lg font-medium text-white mb-2">
                Create Your Studio
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Launch a recording room directly in your browser. Configure your microphone and camera with a live preview.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118]">
              <span className="text-xs font-mono text-violet-400 block mb-4">
                02
              </span>
              <h3 className="text-lg font-medium text-white mb-2">
                Invite Your Guests
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Send a secure invite link to your guests. They join instantly from any modern web browser without installing anything.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118]">
              <span className="text-xs font-mono text-violet-400 block mb-4">
                03
              </span>
              <h3 className="text-lg font-medium text-white mb-2">
                Record Together
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Record your conversation with peace of mind. Download clean, synchronized separate tracks ready for post-production.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================
          4. ABOUT / STATUS PANEL
          ======================================================== */}
      <section
        id="about"
        className="py-16 border-t border-[#1a1e2b] bg-[#090a0f] scroll-mt-16"
      >
        <Container>
          <div className="max-w-2xl mx-auto text-center space-y-3 p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118]">
            <p className="text-xs font-mono uppercase tracking-wider text-violet-400">
              Platform Status
            </p>
            <h3 className="text-xl font-semibold text-white">
              StudioCast is in active development
            </h3>
            {activeNotice && (
              <p className="text-xs text-violet-300 font-mono">
                Requested: {activeNotice}
              </p>
            )}
            <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
              We are currently finalizing our local recording engine and guest connection architecture. Full recording functionality will be available in an upcoming release.
            </p>
          </div>
        </Container>
      </section>

      {/* ========================================================
          5. FINAL CTA
          ======================================================== */}
      <section className="py-24 md:py-32 border-t border-[#1a1e2b] bg-[#090a0f] text-center">
        <Container className="flex flex-col items-center">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white max-w-2xl leading-tight">
            Ready to Create Something Amazing?
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-md">
            Join the waitlist to be among the first to experience StudioCast.
          </p>

          <div className="mt-8">
            <Button
              size="lg"
              variant="primary"
              onClick={() => handleAction("Waitlist Signup")}
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
