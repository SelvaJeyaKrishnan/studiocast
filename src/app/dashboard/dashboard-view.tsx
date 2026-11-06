"use client";

import * as React from "react";
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
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardSidebar,
  type DashboardTab,
} from "@/components/dashboard/dashboard-sidebar";
import { sampleRecordings, sampleProjects } from "@/config/dashboard-data";

export function DashboardView() {
  const [currentTab, setCurrentTab] = React.useState<DashboardTab>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusNotice, setStatusNotice] = React.useState<string | null>(null);

  const handleCreateStudio = () => {
    setStatusNotice("Create New Studio functionality is coming soon. Studio Engine integration is in progress.");
  };

  const handleLogout = () => {
    setStatusNotice("Authentication & session management are scheduled for upcoming release. (Session logged out)");
  };

  const handleProfileMenuAction = (action: string) => {
    setStatusNotice(`${action} view is a demo preview. Settings integration is in progress.`);
  };

  const filteredRecordings = sampleRecordings.filter((rec) =>
    rec.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = sampleProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

          {/* Right Header Action */}
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

          {/* SECTION: Settings Tab View */}
          {currentTab === "settings" && (
            <section className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Studio Settings</h1>
                <p className="text-xs text-slate-400 mt-1">Configure audio capture parameters and cloud storage allocations</p>
              </div>
              <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] space-y-4">
                <div className="flex items-center gap-3 text-violet-400">
                  <Sliders className="w-5 h-5" />
                  <h2 className="text-sm font-semibold text-white">Default Recording Standards</h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
                  Settings controls will allow configuring target 48kHz audio buffer rates, camera resolutions, and automated Supabase bucket sync policies in subsequent phases.
                </p>
                <div className="pt-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-800/40">
                    Planned Settings Engine
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* SECTION: Profile Tab View */}
          {currentTab === "profile" && (
            <section className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Creator Profile</h1>
                <p className="text-xs text-slate-400 mt-1">Manage personal account details and studio identity</p>
              </div>
              <div className="p-8 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold text-sm">
                    AR
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Alex Rivera</h2>
                    <p className="text-xs text-slate-400 font-mono">alex@domain.com (Demo)</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 max-w-lg">
                  Profile editing and custom studio branding customization will be enabled upon authentication integration.
                </p>
                <div className="pt-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#131722] text-slate-400 border border-[#1a1e2b]">
                    Demo Profile
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* SECTION: Overview, My Recordings, or Projects */}
          {(currentTab === "overview" || currentTab === "recordings" || currentTab === "projects") && (
            <>
              {/* 1. Welcome Section */}
              <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                    {currentTab === "overview" && "Welcome back!"}
                    {currentTab === "recordings" && "My Recordings"}
                    {currentTab === "projects" && "Studio Projects"}
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    {currentTab === "overview" && "Manage your creative workspace."}
                    {currentTab === "recordings" && "Review and export recorded sessions."}
                    {currentTab === "projects" && "Organize studio sessions and series."}
                  </p>
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

              {/* 4. Projects Section (Shown on Overview and Projects tabs) */}
              {(currentTab === "overview" || currentTab === "projects") && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {currentTab === "overview" ? "Recent Projects" : "All Projects"}
                      </h2>
                      <p className="text-xs text-slate-400">Organized workspaces and podcast series (Demo)</p>
                    </div>
                    {currentTab === "overview" && (
                      <button
                        type="button"
                        onClick={() => setCurrentTab("projects")}
                        className="text-xs text-violet-400 hover:text-violet-300 font-medium transition flex items-center gap-1"
                      >
                        <span>View all</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {filteredProjects.length === 0 ? (
                    /* Projects Empty State */
                    <div className="p-12 text-center rounded-2xl border border-dashed border-[#1a1e2b] bg-[#0e1118]/60 space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                        <FolderKanban className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-medium text-white">No projects found</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {searchQuery
                          ? `No projects matching "${searchQuery}". Try a different keyword.`
                          : "Create a project workspace to organize multiple episodes and guest recordings."}
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
                    /* Projects Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {filteredProjects.map((project) => (
                        <div
                          key={project.id}
                          className="p-5 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] hover:border-[#242a3b] transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400">
                                <FolderKanban className="w-4 h-4" />
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {project.lastModified}
                              </span>
                            </div>

                            <h3 className="text-sm font-semibold text-white mb-1.5">
                              {project.name}
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                              {project.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-[#1a1e2b] flex items-center justify-between text-xs text-slate-400">
                            <span>{project.recordingsCount} recordings</span>
                            <button
                              type="button"
                              onClick={() =>
                                setStatusNotice(`Project "${project.name}" view is a demo preview.`)
                              }
                              className="text-violet-400 hover:text-violet-300 font-medium"
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
