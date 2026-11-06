"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Plus,
  Mic2,
  FolderKanban,
  HardDrive,
  Clock,
  Calendar,
  Users,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardSidebar,
  type DashboardTab,
  type DashboardUserProps,
} from "@/components/dashboard/dashboard-sidebar";
import { ProfileSettingsView } from "@/components/dashboard/profile-settings-view";
import { ProjectManagementView } from "@/components/dashboard/project-management-view";
import { StudioManagementView } from "@/components/dashboard/studio-management-view";
import { CreateStudioModal } from "@/components/dashboard/create-studio-modal";
import { sampleRecordings } from "@/config/dashboard-data";
import { createClient } from "@/lib/supabase/client";

interface DashboardViewProps {
  currentUser: DashboardUserProps;
}

export function DashboardView({ currentUser: initialUser }: DashboardViewProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = React.useState<DashboardUserProps>(initialUser);
  const [currentTab, setCurrentTab] = React.useState<DashboardTab>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusNotice, setStatusNotice] = React.useState<string | null>(null);
  const [createStudioModalOpen, setCreateStudioModalOpen] = React.useState(false);

  const handleProfileUpdated = (updated: Partial<DashboardUserProps>) => {
    setCurrentUser((prev) => ({ ...prev, ...updated }));
  };

  const handleCreateStudio = () => {
    setCreateStudioModalOpen(true);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignored if offline/unconfigured
    }
    router.push("/");
    router.refresh();
  };

  const handleProfileMenuAction = (action: string) => {
    if (action === "Profile Settings") {
      setCurrentTab("profile");
    } else if (action === "Preferences") {
      setCurrentTab("settings");
    } else {
      setStatusNotice(`${action} view is a demo preview.`);
    }
  };

  const filteredRecordings = sampleRecordings.filter((rec) =>
    rec.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const initials = (currentUser.fullName || "SC")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100">
      {/* Sidebar Navigation */}
      <DashboardSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogoutClick={handleLogout}
        onProfileMenuClick={handleProfileMenuAction}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-[#1a1e2b] bg-[#090a0f]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Input UI */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search recordings, projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#1a1e2b] bg-[#0e1118] pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Right Header Action & Avatar Quick Trigger */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateStudio}
              className="shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Create New Studio</span>
              <span className="sm:hidden">New Studio</span>
            </Button>

            <button
              type="button"
              onClick={() => setCurrentTab("profile")}
              className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#1a1e2b] hover:border-violet-500/50 bg-violet-600 flex items-center justify-center text-white text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-violet-500"
              title="Open Profile Settings"
              aria-label="Open Profile Settings"
            >
              {currentUser.avatarUrl ? (
                <Image
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span>{initials}</span>
              )}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-8">
          {/* Notification banner for planned functionality */}
          {statusNotice && (
            <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-950/20 text-xs text-slate-300 flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <span>{statusNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* SECTION: Profile & Settings Tab View */}
          {(currentTab === "profile" || currentTab === "settings") && (
            <ProfileSettingsView
              currentUser={currentUser}
              onProfileUpdated={handleProfileUpdated}
            />
          )}

          {/* SECTION: Studios Tab View (Real Supabase PostgreSQL Studios) */}
          {currentTab === "studios" && (
            <StudioManagementView
              userId={currentUser.id}
              isRealUser={currentUser.isRealUser}
              searchQuery={searchQuery}
              onOpenCreateStudio={handleCreateStudio}
            />
          )}

          {/* SECTION: Projects Tab View (Real Supabase PostgreSQL Project Management) */}
          {currentTab === "projects" && (
            <ProjectManagementView
              userId={currentUser.id}
              isRealUser={currentUser.isRealUser}
              searchQuery={searchQuery}
            />
          )}

          {/* SECTION: Overview or My Recordings */}
          {(currentTab === "overview" || currentTab === "recordings") && (
            <>
              {/* 1. Welcome Section */}
              <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                <div className="flex items-center gap-4">
                  {/* Real Profile Avatar in Welcome Section */}
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-[#242a3b] bg-[#131722] flex items-center justify-center shrink-0 shadow-md">
                    {currentUser.avatarUrl ? (
                      <Image
                        src={currentUser.avatarUrl}
                        alt={currentUser.fullName}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xl font-bold text-violet-400">{initials}</span>
                    )}
                  </div>

                  <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                      Welcome back, {currentUser.fullName.split(" ")[0]}!
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                      {currentTab === "overview" && "Manage your creative workspace."}
                      {currentTab === "recordings" && "Review and export recorded sessions."}
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCreateStudio}
                  className="self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Studio
                </Button>
              </section>

              {/* 2. Quick Statistics (Demo Data) - Shown on Overview */}
              {currentTab === "overview" && (
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {/* Stat 1 */}
                  <div className="p-5 rounded-2xl border border-[#1a1e2b] bg-[#0e1118]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-slate-400">Total Recordings</span>
                      <div className="w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center text-violet-400">
                        <Mic2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-white">24</span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-[#131722] border border-[#1a1e2b]">
                        Demo Data
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Across all active studio rooms</p>
                  </div>

                  {/* Stat 2 */}
                  <div className="p-5 rounded-2xl border border-[#1a1e2b] bg-[#0e1118]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-slate-400">Total Projects</span>
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-white">3</span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-[#131722] border border-[#1a1e2b]">
                        Demo Data
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Active production workspaces</p>
                  </div>

                  {/* Stat 3 */}
                  <div className="p-5 rounded-2xl border border-[#1a1e2b] bg-[#0e1118]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-slate-400">Storage Used</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-400">
                        <HardDrive className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-white">4.2 GB</span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-[#131722] border border-[#1a1e2b]">
                        Demo Data
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Of 20 GB allocated storage</p>
                  </div>
                </section>
              )}

              {/* 3. Recordings Section (Shown on Overview and My Recordings tabs) */}
              {(currentTab === "overview" || currentTab === "recordings") && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {currentTab === "overview" ? "Recent Recordings" : "All Recordings"}
                      </h2>
                      <p className="text-xs text-slate-400">Latest media captured across your studios (Demo)</p>
                    </div>
                    {currentTab === "overview" && (
                      <button
                        type="button"
                        onClick={() => setCurrentTab("recordings")}
                        className="text-xs text-violet-400 hover:text-violet-300 font-medium transition flex items-center gap-1"
                      >
                        <span>View all</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {filteredRecordings.length === 0 ? (
                    /* Recordings Empty state */
                    <div className="p-12 text-center rounded-2xl border border-dashed border-[#1a1e2b] bg-[#0e1118]/60 space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto">
                        <Mic2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-medium text-white">No recordings found</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {searchQuery
                          ? `No recordings matching "${searchQuery}". Try a different keyword.`
                          : "Start your first studio session to record pristine uncompressed multi-track audio and video."}
                      </p>
                      <div className="pt-2">
                        {searchQuery ? (
                          <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                            Clear search
                          </Button>
                        ) : (
                          <Button variant="primary" size="sm" onClick={handleCreateStudio}>
                            Create New Studio
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Recordings List */
                    <div className="space-y-3">
                      {filteredRecordings.map((rec) => (
                        <div
                          key={rec.id}
                          className="p-4 rounded-xl border border-[#1a1e2b] bg-[#0e1118] hover:border-[#242a3b] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Recording Thumbnail icon placeholder */}
                            <div className="w-12 h-12 rounded-xl bg-[#131722] border border-[#1a1e2b] flex items-center justify-center text-violet-400 shrink-0">
                              <Mic2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-white hover:text-violet-300 transition-colors">
                                {rec.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-500" />
                                  {rec.date}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {rec.duration}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-slate-500" />
                                  {rec.participants} guests
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {rec.status}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setStatusNotice(`Details for "${rec.title}" is a demo preview.`)
                              }
                            >
                              Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* 4. Projects Preview Section (Shown on Overview tab) */}
              {currentTab === "overview" && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Projects Workspace</h2>
                      <p className="text-xs text-slate-400">Organized workspaces and podcast series</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentTab("projects")}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium transition flex items-center gap-1"
                    >
                      <span>Manage projects</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-6 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                        <FolderKanban className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white">Supabase PostgreSQL Project Management Active</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Create, edit, search, and manage your isolated cloud projects with secure Row Level Security.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setCurrentTab("projects")}
                      className="shrink-0"
                    >
                      Open Projects
                    </Button>
                  </div>
                </section>
              )}
            </>
          )}
        </main>

        {/* Global Create Studio Modal */}
        <CreateStudioModal
          isOpen={createStudioModalOpen}
          onClose={() => setCreateStudioModalOpen(false)}
          userId={currentUser.id}
          isRealUser={currentUser.isRealUser}
          onStudioCreated={() => {
            setCurrentTab("studios");
          }}
        />
      </div>
    </div>
  );
}
