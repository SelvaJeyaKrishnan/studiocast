"use client";

import * as React from "react";
import {
  X,
  Loader2,
  FolderKanban,
  Radio,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { getPublicSiteUrl } from "@/lib/utils/site-url";
import type { ProjectRow, StudioRow } from "@/types/database";

interface CreateStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  isRealUser: boolean;
  onStudioCreated: (studio: StudioRow) => void;
}

export function CreateStudioModal({
  isOpen,
  onClose,
  userId,
  isRealUser,
  onStudioCreated,
}: CreateStudioModalProps) {
  const [studioName, setStudioName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [loadingProjects, setLoadingProjects] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Success view state
  const [createdStudio, setCreatedStudio] = React.useState<StudioRow | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Load user's projects for association dropdown
  React.useEffect(() => {
    if (!isOpen || !isRealUser) return;

    let ignore = false;
    async function loadProjects() {
      setLoadingProjects(true);
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", userId)
          .order("name", { ascending: true });

        if (!ignore && !error && data) {
          setProjects(data as ProjectRow[]);
        }
      } catch {
        // Ignored fallback
      } finally {
        if (!ignore) {
          setLoadingProjects(false);
        }
      }
    }

    void loadProjects();

    return () => {
      ignore = true;
    };
  }, [isOpen, isRealUser, userId]);

  // Close and reset helper
  const handleClose = () => {
    setStudioName("");
    setDescription("");
    setSelectedProjectId("");
    setErrorMessage(null);
    setCreatedStudio(null);
    setCopiedLink(false);
    onClose();
  };

  if (!isOpen) return null;

  const getStudioRoomUrl = (studioId: string) => {
    return `${getPublicSiteUrl()}/studio/${studioId}`;
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = studioName.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter a studio name.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const supabase = createClient();

    try {
      if (!isRealUser) {
        // Fallback demo creation
        const demoStudio: StudioRow = {
          id: crypto.randomUUID(),
          owner_id: userId,
          project_id: selectedProjectId || null,
          name: trimmedName,
          description: description.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCreatedStudio(demoStudio);
        onStudioCreated(demoStudio);
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from("studios")
        .insert({
          name: trimmedName,
          description: description.trim(),
          owner_id: userId,
          project_id: selectedProjectId ? selectedProjectId : null,
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes("relation") || error.message.includes("does not exist")) {
          setErrorMessage(
            "The 'studios' database table has not been created yet. Please run migration 'supabase/migrations/20261106_create_studios.sql' in your Supabase SQL Editor."
          );
        } else {
          setErrorMessage(error.message);
        }
      } else if (data) {
        const studio = data as StudioRow;
        setCreatedStudio(studio);
        onStudioCreated(studio);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create studio.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-[#1a1e2b] bg-[#0e1118] p-6 sm:p-7 shadow-2xl relative text-slate-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-5 top-5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* View 1: Studio Creation Form */}
        {!createdStudio ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/30 text-violet-400 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white tracking-tight">Create Studio</h3>
                <p className="text-xs text-slate-400">Launch a private recording studio room</p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              {/* Studio Name */}
              <div className="space-y-1.5">
                <label htmlFor="studio-name" className="text-xs font-medium text-slate-300">
                  Studio Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  id="studio-name"
                  placeholder="e.g. Design Systems Weekly, Ep. 12"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="studio-desc" className="text-xs font-medium text-slate-300">
                  Description <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="studio-desc"
                  placeholder="Topic outline, co-host notes, or episode agenda..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={300}
                  className="w-full rounded-xl border border-[#1a1e2b] bg-[#131722] p-3 text-xs text-slate-200 placeholder:text-slate-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                />
              </div>

              {/* Associated Project Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="studio-project" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                    <span>Associate with Project</span>
                    <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  {loadingProjects && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading projects...
                    </span>
                  )}
                </div>
                <select
                  id="studio-project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-xl border border-[#1a1e2b] bg-[#131722] px-3 py-2 text-xs text-slate-200 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">No Project (Standalone Studio)</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Associating a studio groups recordings and media under your project workspace.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#1a1e2b]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !studioName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Creating Studio...
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5 mr-1.5" />
                    Create Studio
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* View 2: Studio Created Success & Room Link Access */
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white tracking-tight">Studio Created!</h3>
                <p className="text-xs text-slate-400">Your unique recording room is ready</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#1a1e2b] bg-[#131722] space-y-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Studio Room</span>
                <h4 className="text-sm font-semibold text-white">{createdStudio.name}</h4>
                {createdStudio.description && (
                  <p className="text-xs text-slate-400 mt-0.5">{createdStudio.description}</p>
                )}
              </div>

              {/* Unique Room URL */}
              <div className="space-y-1.5 pt-2 border-t border-[#1a1e2b]">
                <label className="text-[11px] font-medium text-slate-300">
                  Unique Room Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getStudioRoomUrl(createdStudio.id)}
                    className="flex-1 rounded-xl border border-[#1a1e2b] bg-[#0e1118] px-3 py-2 text-xs font-mono text-violet-300 select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(getStudioRoomUrl(createdStudio.id))}
                    className="shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#1a1e2b]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
              >
                Close
              </Button>
              <a
                href={`/studio/${createdStudio.id}`}
                className="inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-600/25 transition focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <span>Enter Studio</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
