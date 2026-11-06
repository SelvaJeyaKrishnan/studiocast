"use client";

import * as React from "react";
import Image from "next/image";
import {
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  User,
  Shield,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { DashboardUserProps } from "@/components/dashboard/dashboard-sidebar";

interface ProfileSettingsViewProps {
  currentUser: DashboardUserProps;
  onProfileUpdated: (updated: Partial<DashboardUserProps>) => void;
}

export function ProfileSettingsView({
  currentUser,
  onProfileUpdated,
}: ProfileSettingsViewProps) {
  const [fullName, setFullName] = React.useState(currentUser.fullName);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(currentUser.avatarUrl);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(currentUser.avatarUrl);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const initials = (fullName || currentUser.fullName || "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Handle avatar file selection & client-side preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: Image format
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    // Validation: Max size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image size must be under 5MB.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  // Upload avatar to Supabase Storage
  const handleUploadAvatar = async () => {
    if (!selectedFile) return avatarUrl;

    setIsUploading(true);
    const supabase = createClient();

    try {
      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, selectedFile, {
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newUrl = publicUrlData.publicUrl;
      setAvatarUrl(newUrl);
      setSelectedFile(null);
      return newUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload avatar.";
      throw new Error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (currentUser.isRealUser) {
        // 1. Delete physical file from storage if existing
        if (avatarUrl && avatarUrl.includes("/avatars/")) {
          try {
            const urlObj = new URL(avatarUrl);
            const pathParts = urlObj.pathname.split("/avatars/");
            if (pathParts[1]) {
              const storagePath = decodeURIComponent(pathParts[1]);
              await supabase.storage.from("avatars").remove([storagePath]);
            }
          } catch {
            // Non-critical if storage cleanup fails
          }
        }

        // 2. Clear avatar_url in profiles table
        const { error } = await supabase
          .from("profiles")
          .update({
            avatar_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentUser.id);

        if (error) throw error;
      }

      setAvatarUrl(null);
      setAvatarPreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      onProfileUpdated({ avatarUrl: null });
      setSuccessMessage("Profile picture removed successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove avatar.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Save profile changes (full name & avatar)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Full name cannot be empty.");
      return;
    }

    setIsLoading(true);

    try {
      let finalAvatarUrl = avatarUrl;

      // If a new avatar file was chosen, upload it first
      if (selectedFile) {
        finalAvatarUrl = await handleUploadAvatar();
      }

      const supabase = createClient();

      if (currentUser.isRealUser) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            avatar_url: finalAvatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentUser.id);

        if (updateError) throw updateError;
      }

      onProfileUpdated({
        fullName: fullName.trim(),
        avatarUrl: finalAvatarUrl,
      });

      setSuccessMessage("Profile updated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile changes.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          Creator Profile & Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your personal creator identity, studio details, and account preferences.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-300 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-white mb-0.5">Success</p>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-white mb-0.5">Error</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Profile Form Card */}
      <div className="rounded-2xl border border-[#1a1e2b] bg-[#0e1118] p-6 sm:p-8 space-y-8">
        {/* Section 1: Avatar Upload & Preview */}
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Profile Picture</h2>
          <p className="text-xs text-slate-400 mb-6">
            Upload an avatar to personalize your studio host presence and recordings.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Visual Avatar Container */}
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[#242a3b] bg-[#131722] flex items-center justify-center shrink-0 shadow-lg">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Profile Avatar Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-2xl font-bold text-violet-400">{initials}</span>
              )}

              {(isLoading || isUploading) && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Avatar Actions */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
                id="avatar-file-input"
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                >
                  <Camera className="w-3.5 h-3.5 mr-2 text-violet-400" />
                  {avatarPreview ? "Change Picture" : "Upload Picture"}
                </Button>

                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={isLoading || isUploading}
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Remove
                  </Button>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Recommended: Square JPG, PNG, or WebP. Max size: 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Personal Details Form */}
        <form onSubmit={handleSaveProfile} className="space-y-6 pt-6 border-t border-[#1a1e2b]">
          <h2 className="text-base font-semibold text-white">Personal Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Alex Rivera"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading || isUploading}
              required
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-medium text-slate-300 select-none">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full rounded-xl border border-[#1a1e2b] bg-[#131722] px-3.5 py-2.5 text-sm text-slate-400 cursor-not-allowed select-none opacity-80"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-[#0e1118] border border-[#1a1e2b]">
                  Read Only
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Email address is managed via your Supabase authentication account.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#1a1e2b]">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-violet-400 shrink-0" />
              <span>Row Level Security active: Only you can view and update your profile.</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading || isUploading}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Account Info Card */}
      <div className="rounded-2xl border border-[#1a1e2b] bg-[#0e1118] p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-violet-400" />
          <span>Account Authentication Details</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
          <div className="p-3 rounded-xl bg-[#131722] border border-[#1a1e2b]">
            <span className="text-slate-500 block mb-1">User ID:</span>
            <span className="font-mono text-slate-300 break-all">{currentUser.id}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#131722] border border-[#1a1e2b]">
            <span className="text-slate-500 block mb-1">Account Status:</span>
            <span className="font-mono text-emerald-400">
              {currentUser.isRealUser ? "Verified Supabase Auth" : "Guest / Preview"}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#131722] border border-[#1a1e2b]">
            <span className="text-slate-500 block mb-1">Database Sync:</span>
            <span className="font-mono text-violet-300">public.profiles (Active)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
