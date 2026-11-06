import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StudioRow } from "@/types/database";
import { StudioRoomClient } from "./studio-room-client";

interface StudioPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function StudioPage({ params }: StudioPageProps) {
  const { id: studioId } = await params;

  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(studioId)) {
    notFound();
  }

  const supabase = await createClient();

  // 1. Check Authenticated Session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectedFrom=/studio/${studioId}`);
  }

  // 2. Fetch Studio verifying ownership via RLS
  const { data: studio, error } = await supabase
    .from("studios")
    .select("*")
    .eq("id", studioId)
    .single();

  // If studio does not exist or does not belong to the user, return 404 (do not leak existence)
  if (error || !studio) {
    notFound();
  }

  const typedStudio = studio as StudioRow;

  // Double-check ownership
  if (typedStudio.owner_id !== user.id) {
    notFound();
  }

  // 3. Retrieve Host profile details
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  const hostName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Studio Host";
  const hostEmail = user.email || "";
  const hostAvatar = profile?.avatar_url || null;

  return (
    <StudioRoomClient
      studio={typedStudio}
      host={{
        id: user.id,
        name: hostName,
        email: hostEmail,
        avatarUrl: hostAvatar,
      }}
    />
  );
}
