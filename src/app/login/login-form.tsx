"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff, Info, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [forgotPasswordNotice, setForgotPasswordNotice] = React.useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setForgotPasswordNotice(false);

    if (!validate()) return;

    setIsLoading(true);

    // Simulate standard client-side request latency, then display clearly that auth is planned
    setTimeout(() => {
      setIsLoading(false);
      setStatusMessage(
        "Authentication coming soon. Backend integration (Supabase Auth) is scheduled for an upcoming release."
      );
    }, 700);
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-[#1a1e2b] bg-[#0e1118] p-8 sm:p-10 shadow-xl">
        <div className="flex flex-col items-center text-center mb-8">
          <Logo />
          <h1 className="text-2xl font-semibold text-white tracking-tight mt-6">
            Welcome back
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Sign in to access your StudioCast workspace
          </p>
        </div>

        {/* Coming soon notice modal / banner */}
        {statusMessage && (
          <div className="mb-6 p-4 rounded-xl border border-violet-500/30 bg-violet-950/20 text-xs text-slate-300 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white mb-0.5">Form Validated</p>
              <p>{statusMessage}</p>
            </div>
          </div>
        )}

        {forgotPasswordNotice && (
          <div className="mb-6 p-3.5 rounded-xl border border-[#1a1e2b] bg-[#131722] text-xs text-slate-300 flex items-center gap-2.5">
            <Info className="w-4 h-4 text-violet-400 shrink-0" />
            <span>Password reset functionality is coming soon.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="Email address"
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            disabled={isLoading}
            autoComplete="email"
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#1a1e2b] bg-[#131722] text-violet-600 focus:ring-0 focus:ring-offset-0"
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setStatusMessage(null);
                setForgotPasswordNotice(true);
              }}
              className="text-slate-400 hover:text-violet-400 transition-colors focus:outline-none"
            >
              Forgot password?
            </button>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-[#1a1e2b] text-center text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
