import type { Metadata } from "next";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard | StudioCast",
  description: "Manage your creative workspace, recordings, and studio projects.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
