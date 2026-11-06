import * as React from "react";
import Link from "next/link";
import { Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showBadge?: boolean;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg",
        className
      )}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 text-white">
        <Mic2 className="w-4 h-4 text-white" />
      </div>

      <span className="text-lg font-semibold tracking-tight text-white">
        Studio<span className="text-violet-400">Cast</span>
      </span>
    </Link>
  );
}
