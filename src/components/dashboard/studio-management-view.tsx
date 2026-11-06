"use client";

import * as React from "react";
import {
  Radio,
  Plus,
  Trash2,
  Calendar,
  Search,
  AlertCircle,
  X,
  Loader2,
  FolderKanban,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getPublicSiteUrl } from "@/lib/utils/site-url";
import type { StudioRow } from "@/types/database";
import { CreateStudioModal } from "./create-studio-modal";

interface StudioManagementViewProps {
  userId: string;
  isRealUser: boolean;
  searchQuery?: string;
  onOpenCreateStudio?: () => void;
}

export function StudioManagementView({
  userId,
  isRealUser,
  searchQuery = "",
}: StudioManagementViewProps) {
  const [studios, setStudios] = React.useState<StudioRow[]>([]);
  const [projectNames, setProjectNames] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [internalSearch, setInternalSearch] = React.useState("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [deletingStudio, setDeletingStudio] = React.useState<StudioRow | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [copiedStudioId, setCopiedStudioId] = React.useState<string | null>(null);

  const effectiveSearch = searchQuery || internalSearch;

  // Load Studios and Associated Projects
  React.useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);

      const supabase = createClient();

      try {
        if (!isRealUser) {
          if (!ignore) {
            setStudios([]);
            setIsLoading(false);
          }
          return;
        }

        // 1. Fetch Studios
        const { data: studiosData, error: studiosErr } = await supabase
          .from("studios")
          .select("*")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false });

        if (ignore) return;

        if (studiosErr) {
          if (studiosErr.message.includes("relation") || studiosErr.message.includes("does not exist")) {
            setErrorMessage(
              "The 'studios' database table is not created yet. Please execute 'supabase/migrations/20261106_create_studios.sql' in your Supabase SQL Editor."
            );
          } else {
            setErrorMessage(studiosErr.message);
          }
          setStudios([]);
        } else {
          const studioList = (studiosData as StudioRow[]) || [];
          setStudios(studioList);

          // 2. Fetch project names for associated project_ids
          const projectIds = Array.from(
            new Set(studioList.map((s) => s.project_id).filter(Boolean) as string[])
          );

          if (projectIds.length > 0) {
            const { data: projData } = await supabase
              .from("projects")
              .select("id, name")
              .in("id", projectIds);

            if (!ignore && projData) {
              const map: Record<string, string> = {};
              for (const p of projData) {
                map[p.id] = p.name;
              }
              setProjectNames(map);
            }
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load studios.";
          setErrorMessage(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [isRealUser, userId]);

  const getStudioRoomUrl = (studioId: string) => {
    return `${getPublicSiteUrl()}/studio/${studioId}`;
  };

  const handleCopyInvitationLink = async (studioId: string) => {
    try {
      const url = getStudioRoomUrl(studioId);
      await navigator.clipboard.writeText(url);
      setCopiedStudioId(studioId);
      setTimeout(() => setCopiedStudioId(null), 2500);
    } catch {
      // Fallback
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStudio) return;
    setIsDeleting(true);

    const supabase = createClient();
    try {
      if (isRealUser) {
        const { error } = await supabase
          .from("studios")
          .delete()
          .eq("id", deletingStudio.id)
          .eq("owner_id", userId);

        if (error) {
          setErrorMessage(error.message);
          setIsDeleting(false);
          return;
        }
      }

      setStudios((prev) => prev.filter((s) => s.id !== deletingStudio.id));
      setDeletingStudio(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete studio.";
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStudios = studios.filter((studio) => {
    const q = effectiveSearch.toLowerCase();
    const projectName = studio.project_id ? projectNames[studio.project_id] || "" : "";
    return (
      studio.name.toLowerCase().includes(q) ||
      (studio.description && studio.description.toLowerCase().includes(q)) ||
      projectName.toLowerCase().includes(q)
    );
  });

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#1a1e2b]">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-violet-400" />
            <span>Recording Studios</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create, manage, and launch private high-definition studio rooms.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          className="self-start sm:self-auto shrink-0 shadow-lg shadow-violet-600/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Studio
        </Button>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold">Notice</p>
            <p className="mt-0.5 text-slate-300">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar if more than 3 studios */}
      {studios.length > 2 && (
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search studios or projects..."
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            className="w-full rounded-xl border border-[#1a1e2b] bg-[#0e1118] pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      )}

      {/* Content States */}
      {isLoading ? (
        /* Loading State */
        <div className="p-16 text-center rounded-2xl border border-[#1a1e2b] bg-[#0e1118] space-y-3">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading your studios from Supabase...</p>
        </div>
      ) : filteredStudios.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-2xl border border-dashed border-[#1a1e2b] bg-[#0e1118]/70 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto shadow-inner">
            <Radio className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-white">
              {effectiveSearch ? "No studios match your search" : "No studios created yet"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {effectiveSearch
                ? `No studios found matching "${effectiveSearch}". Try adjusting your keywords.`
                : "Create your first dedicated studio room to generate a unique room link and host high-fidelity remote recording sessions."}
            </p>
          </div>
          <div className="pt-2">
            {effectiveSearch ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInternalSearch("")}
              >
                Clear Search
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Studio
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Studios Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudios.map((studio) => {
            const projectName = studio.project_id ? projectNames[studio.project_id] : null;
            const isCopied = copiedStudioId === studio.id;

            return (
              <div
                key={studio.id}
                className="p-5 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] hover:border-[#242a3b] transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDeletingStudio(studio)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition"
                        title="Delete studio"
                        aria-label="Delete studio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-semibold text-white tracking-tight group-hover:text-violet-300 transition-colors line-clamp-1">
                    {studio.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[2rem]">
                    {studio.description || "No description provided."}
                  </p>

                  {/* Metadata tags */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#1a1e2b]/80">
                    {projectName && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 font-medium px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 truncate max-w-[180px]">
                        <FolderKanban className="w-3 h-3 shrink-0" />
                        <span className="truncate">{projectName}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(studio.created_at)}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3.5 border-t border-[#1a1e2b] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyInvitationLink(studio.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition py-1"
                    title="Copy unique room link"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`/studio/${studio.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
                  >
                    <span>Open Studio</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Studio Modal */}
      <CreateStudioModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        userId={userId}
        isRealUser={isRealUser}
        onStudioCreated={(newStudio) => {
          setStudios((prev) => [newStudio, ...prev]);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingStudio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[#1a1e2b] bg-[#0e1118] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Delete Studio</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-white font-medium">&ldquo;{deletingStudio.name}&rdquo;</strong>?
              The room link will be deactivated immediately.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#1a1e2b]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingStudio(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Studio"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
