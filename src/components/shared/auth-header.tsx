import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Container } from "@/components/ui/container";

interface AuthHeaderProps {
  backHref?: string;
  backLabel?: string;
}

export function AuthHeader({
  backHref = "/",
  backLabel = "Back to Home",
}: AuthHeaderProps) {
  return (
    <header className="w-full border-b border-[#1a1e2b]/80 bg-[#090a0f]/90 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* StudioCast Logo */}
          <Logo />

          {/* Minimal Back to Home Link */}
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors group px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{backLabel}</span>
          </Link>
        </div>
      </Container>
    </header>
  );
}
