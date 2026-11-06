"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Mic2,
  FolderKanban,
  Settings,
  User,
  LogOut,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

export type DashboardTab =
  | "overview"
  | "recordings"
  | "projects"
  | "settings"
  | "profile";

interface DashboardSidebarProps {
  currentTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLogoutClick: () => void;
  onProfileMenuClick?: (action: string) => void;
}

export function DashboardSidebar({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onLogoutClick,
  onProfileMenuClick,
}: DashboardSidebarProps) {
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "recordings", label: "My Recordings", icon: Mic2 },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "profile", label: "Profile", icon: User },
  ] as const;

  const handleProfileOption = (action: string) => {
    setProfileDropdownOpen(false);
    if (onProfileMenuClick) {
      onProfileMenuClick(action);
    }
    if (action === "Profile Settings") {
      onSelectTab("profile");
      onCloseMobile();
    } else if (action === "Preferences") {
      onSelectTab("settings");
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0e1118] border-r border-[#1a1e2b] px-4 py-6 justify-between">
      {/* Top Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-2">
          <Logo />
          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1" aria-label="Dashboard Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  isActive
                    ? "bg-violet-600/15 text-violet-300 border border-violet-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-violet-400" : "text-slate-400")} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom section with Profile Dropdown Menu & Logout */}
      <div className="pt-6 border-t border-[#1a1e2b] space-y-2 relative">
        {/* Profile Dropdown Menu Card */}
        {profileDropdownOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-xl border border-[#1a1e2b] bg-[#131722] shadow-xl space-y-1 animate-in fade-in duration-150 z-20">
            <div className="px-2.5 py-1.5 border-b border-[#1a1e2b]/80 mb-1">
              <p className="text-xs font-semibold text-white">Alex Rivera</p>
              <p className="text-[10px] text-slate-400 font-mono">alex@domain.com (Demo)</p>
            </div>
            <button
              type="button"
              onClick={() => handleProfileOption("Profile Settings")}
              className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition"
            >
              Profile Settings
            </button>
            <button
              type="button"
              onClick={() => handleProfileOption("Preferences")}
              className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition"
            >
              Preferences
            </button>
            <button
              type="button"
              onClick={() => {
                setProfileDropdownOpen(false);
                onLogoutClick();
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
            >
              Log out
            </button>
          </div>
        )}

        {/* Profile User Trigger */}
        <button
          type="button"
          onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-[#131722] border border-[#1a1e2b] hover:border-[#242a3b] transition text-left"
          aria-expanded={profileDropdownOpen}
          aria-label="User Profile Menu"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              AR
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-medium text-white truncate">
                Alex Rivera
              </span>
              <span className="text-[10px] text-slate-400 truncate font-mono">
                alex@domain.com
              </span>
            </div>
          </div>
          {profileDropdownOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          )}
        </button>

        {/* Dedicated Logout Trigger */}
        <button
          type="button"
          onClick={onLogoutClick}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer backdrop and panel */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
