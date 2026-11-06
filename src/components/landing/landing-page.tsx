"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Mic2, Sliders, Users, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export function LandingPage() {
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
            <Link href="/signup">
              <Button
                size="lg"
                variant="primary"
              >
                Get Started
              </Button>
            </Link>
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
                  <h3 className="text-lg font-semibold text-white">
                    Local Track Isolation
                  </h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    Planned
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Record pristine audio and video locally in each participant&apos;s browser. Zero compression artifacts from weak internet connections.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] hover:border-[#242a3b] transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">
                    Guest Waiting Rooms
                  </h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Invite co-hosts and guests with a single click. Cryptographically secure invitation links without requiring guest account setup.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] hover:border-[#242a3b] transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6">
                  <Sliders className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">
                    Studio Control Room
                  </h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    Planned
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Live session management, individual volume meters, and separate track downloads ready for professional post-production.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ========================================================
          3. HOW IT WORKS (3 Simple Steps)
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
              Three simple steps to studio quality
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118]">
              <span className="text-xs font-mono text-violet-400 block mb-4">
                01
              </span>
              <h3 className="text-lg font-medium text-white mb-2">
                Create a Studio
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Set up a secure studio session in seconds with dedicated workspace organization and cloud project management.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118]">
              <span className="text-xs font-mono text-violet-400 block mb-4">
                02
              </span>
              <h3 className="text-lg font-medium text-white mb-2">
                Invite Guests
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Send a secure invitation link to your guests. They join directly from their browser without creating an account.
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
              StudioCast is live in active production
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
              Supabase authentication, studio management, and guest waiting room architecture are live. WebRTC audio/video capture engine is scheduled for upcoming release.
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
            Sign up now and start setting up your custom podcast recording studios.
          </p>

          <div className="mt-8">
            <Link href="/signup">
              <Button
                size="lg"
                variant="primary"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
