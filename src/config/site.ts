export const siteConfig = {
  name: "StudioCast",
  description: "Studio-quality remote podcast and video recording in your browser.",
  navLinks: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "About", href: "#about" },
  ],
  links: {
    github: "https://github.com",
    twitter: "https://twitter.com",
  },
} as const;

export type SiteConfig = typeof siteConfig;
