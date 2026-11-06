import * as React from "react";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/shared/logo";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-[#1a1e2b] bg-[#090a0f] py-12 text-slate-400 text-sm">
      <Container>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#1a1e2b]/60">
          <Logo />

          <nav className="flex items-center gap-8 text-sm">
            {siteConfig.navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 {siteConfig.name}, Inc. All rights reserved.</p>
          <a
            href="#overview"
            className="hover:text-slate-300 transition-colors"
          >
            Back to Top
          </a>
        </div>
      </Container>
    </footer>
  );
}
