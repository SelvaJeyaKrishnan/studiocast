import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "./dashboard-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | StudioCast",
  description: "Manage your creative workspace, recordings, and studio projects.",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    profile = data;
  }

  const currentUser = {
    id: user?.id || "demo-user-id",
    fullName: profile?.full_name || user?.user_metadata?.full_name || "Alex Rivera",
    email: user?.email || "alex@domain.com",
    avatarUrl: profile?.avatar_url || user?.user_metadata?.avatar_url || null,
    isRealUser: !!user,
  };

  return <DashboardView currentUser={currentUser} />;
}
