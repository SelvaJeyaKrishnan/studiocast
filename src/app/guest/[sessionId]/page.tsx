import * as React from "react";
import { notFound } from "next/navigation";
import { GuestWaitingRoomClient } from "./guest-waiting-room-client";

interface GuestPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function GuestWaitingRoomPage({ params }: GuestPageProps) {
  const { sessionId: guestId } = await params;

  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(guestId)) {
    notFound();
  }

  return <GuestWaitingRoomClient guestId={guestId} />;
}
