import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "outline" | "success";
}

export function Badge({
  className,
  variant = "primary",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    primary:
      "bg-violet-500/10 text-violet-400 border border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.15)]",
    secondary:
      "bg-slate-800/60 text-slate-300 border border-slate-700/60",
    outline:
      "bg-transparent text-slate-300 border border-slate-700/80",
    success:
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide uppercase",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
