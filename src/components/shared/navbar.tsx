"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

interface NavbarProps {
  onActionClick?: (actionName: string) => void;
}

export function Navbar({ onActionClick }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleAction = (label: string) => {
    if (onActionClick) {
      onActionClick(label);
    } else {
      const banner = document.getElementById("about");
      if (banner) {
        banner.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1a1e2b]/80 bg-[#090a0f]/90 backdrop-blur-md transition-all">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Logo />

          {/* Center Links */}
          <nav
            className="hidden md:flex items-center gap-9"
            aria-label="Main Navigation"
          >
            {siteConfig.navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm text-slate-400 hover:text-white transition-colors duration-150"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction("Sign In")}
              className="text-slate-400 hover:text-white"
            >
              Sign In
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAction("Get Started")}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1a1e2b] py-4 space-y-3">
            <div className="flex flex-col space-y-1">
              {siteConfig.navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="pt-3 border-t border-[#1a1e2b] flex flex-col gap-2">
              <Button
                variant="outline"
                size="md"
                className="w-full justify-center"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleAction("Sign In");
                }}
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleAction("Get Started");
                }}
              >
                Get Started
              </Button>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
