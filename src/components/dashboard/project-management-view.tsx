"use client";

import * as React from "react";
import {
  FolderKanban,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { ProjectRow } from "@/types/database";

interface ProjectManagementViewProps {
  userId: string;
  isRealUser: boolean;
  searchQuery?: string;
  onProjectsCountChange?: (count: number) => void;
}

export function ProjectManagementView({
  userId,
  isRealUser,
  searchQuery: externalSearchQuery = "",
  onProjectsCountChange,
}: ProjectManagementViewProps) {
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [internalSearch, setInternalSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<ProjectRow | null>(null);
  const [deletingProject, setDeletingProject] = React.useState<ProjectRow | null>(null);

  // Form states
  const [projectName, setProjectName] = React.useState("");
  const [projectDescription, setProjectDescription] = React.useState("");
  const [formLoading, setFormLoading] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const effectiveSearch = externalSearchQuery || internalSearch;

  React.useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);

      const supabase = createClient();

      try {
        if (!isRealUser) {
          if (!ignore) {
            setProjects([]);
            if (onProjectsCountChange) onProjectsCountChange(0);
            setIsLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (ignore) return;

        if (error) {
          if (error.message.includes("relation") || error.message.includes("does not exist")) {
            setErrorMessage(
              "The 'projects' table is not created yet. Please execute 'supabase/migrations/20261106_create_projects.sql' in your Supabase SQL Editor."
            );
          } else {
            setErrorMessage(error.message);
          }
          setProjects([]);
        } else {
          const projectList = (data as ProjectRow[]) || [];
          setProjects(projectList);
          if (onProjectsCountChange) onProjectsCountChange(projectList.length);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load projects.";
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
  }, [isRealUser, userId, onProjectsCountChange]);

  // Open Create Modal
  const openCreateModal = () => {
    setProjectName("");
    setProjectDescription("");
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (project: ProjectRow) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || "");
    setFormError(null);
  };

  // Handle Create or Update
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!projectName.trim()) {
      setFormError("Project name is required.");
      return;
    }

    setFormLoading(true);
    const supabase = createClient();

    try {
      if (editingProject) {
        // UPDATE existing project
        const { data, error } = await supabase
          .from("projects")
          .update({
            name: projectName.trim(),
            description: projectDescription.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingProject.id)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;

        setProjects((prev) =>
          prev.map((p) => (p.id === editingProject.id ? (data as ProjectRow) : p))
        );
        setEditingProject(null);
        setSuccessMessage(`Project "${projectName}" updated successfully.`);
      } else {
        // INSERT new project
        const { data, error } = await supabase
          .from("projects")
          .insert({
            user_id: userId,
            name: projectName.trim(),
            description: projectDescription.trim(),
          })
          .select()
          .single();

        if (error) throw error;

        const newProject = data as ProjectRow;
        setProjects((prev) => [newProject, ...prev]);
        if (onProjectsCountChange) onProjectsCountChange(projects.length + 1);
        setIsCreateModalOpen(false);
        setSuccessMessage(`Project "${projectName}" created successfully.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save project.";
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Delete Project
  const handleDeleteProject = async () => {
    if (!deletingProject) return;

    setFormLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", deletingProject.id)
        .eq("user_id", userId);

      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
      if (onProjectsCountChange) onProjectsCountChange(Math.max(0, projects.length - 1));
      setSuccessMessage(`Project "${deletingProject.name}" deleted.`);
      setDeletingProject(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete project.";
      setErrorMessage(msg);
    } finally {
      setFormLoading(false);
    }
  };

  // Filter projects by search query
  const filteredProjects = projects.filter((project) => {
    const q = effectiveSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      project.name.toLowerCase().includes(q) ||
      (project.description && project.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Studio Projects
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize podcasts, interviews, and episodes into dedicated workspaces.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={openCreateModal} className="self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Internal Search bar if no external query */}
      {!externalSearchQuery && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter projects by title or description..."
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            className="w-full rounded-xl border border-[#1a1e2b] bg-[#0e1118] pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-300 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
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

      {/* Loading State */}
      {isLoading ? (
        <div className="p-16 text-center rounded-2xl border border-[#1a1e2b] bg-[#0e1118] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading your studio projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        /* Empty State */
        <div className="p-16 text-center rounded-2xl border border-dashed border-[#1a1e2b] bg-[#0e1118]/60 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {effectiveSearch ? "No matching projects" : "No projects yet"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {effectiveSearch
                ? `No projects matching "${effectiveSearch}". Try adjusting your keywords.`
                : "Create your first project to organize episodes, guests, and multi-track recordings."}
            </p>
          </div>
          <div className="pt-2">
            {effectiveSearch ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInternalSearch("")}
              >
                Clear filter
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={openCreateModal}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create First Project
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const formattedDate = new Date(project.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const updatedDate = new Date(project.updated_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={project.id}
                className="p-5 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] hover:border-[#242a3b] transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar with Icon & Actions */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <FolderKanban className="w-4 h-4" />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(project)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                        title="Edit project details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingProject(project)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors mb-1.5">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    {project.description || "No description provided."}
                  </p>
                </div>

                {/* Footer Metadata */}
                <div className="pt-3 border-t border-[#1a1e2b] flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-600" />
                    Created: {formattedDate}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-600" />
                    Updated: {updatedDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT MODAL */}
      {(isCreateModalOpen || editingProject) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[#1a1e2b] bg-[#0e1118] p-6 sm:p-7 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingProject ? "Edit Project" : "Create New Project"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingProject(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProject} className="space-y-4">
              <Input
                label="Project Name"
                placeholder="e.g. Founders Podcast Season 2"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={formLoading}
                required
                autoFocus
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-300">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of topics, format, or episodes in this project..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  disabled={formLoading}
                  className="w-full rounded-xl border border-[#1a1e2b] bg-[#131722] px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingProject(null);
                  }}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={formLoading}>
                  {editingProject ? "Save Changes" : "Create Project"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[#1a1e2b] bg-[#0e1118] p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">Delete Project</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-200">
                  &quot;{deletingProject.name}&quot;
                </span>
                ? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeletingProject(null)}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDeleteProject}
                isLoading={formLoading}
              >
                Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
