import { RoomServiceClient } from "livekit-server-sdk";
import { getLiveKitServerConfig } from "./config";

export interface EvictParticipantOptions {
  roomName: string;
  identity: string;
  revokeTokenTs?: number;
}

export interface EvictParticipantResult {
  success: boolean;
  roomName: string;
  identity: string;
  error?: string;
}

/**
 * Evict a single participant from an active LiveKit room and optionally
 * record a revocation timestamp (revokeTokenTs) in the LiveKit token cache.
 *
 * Safe behavior:
 * - If the room does not exist or participant is disconnected, LiveKit's removeParticipant
 *   records the token revocation timestamp without throwing.
 * - If network or credential errors occur, returns an error result instead of unhandled crash.
 */
export async function evictLiveKitParticipant({
  roomName,
  identity,
  revokeTokenTs,
}: EvictParticipantOptions): Promise<EvictParticipantResult> {
  const config = getLiveKitServerConfig();

  if (!config.isConfigured) {
    return {
      success: false,
      roomName,
      identity,
      error: "LiveKit server environment variables are not configured.",
    };
  }

  try {
    const roomService = new RoomServiceClient(
      config.url,
      config.apiKey,
      config.apiSecret
    );

    // Default revocation window: current time + 10 seconds (accounts for clock skew)
    const cutoffTs =
      typeof revokeTokenTs === "number"
        ? revokeTokenTs
        : Math.floor(Date.now() / 1000) + 10;

    await roomService.removeParticipant(roomName, identity, {
      revokeTokenTs: BigInt(cutoffTs),
    });

    return {
      success: true,
      roomName,
      identity,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to evict participant from LiveKit.";
    return {
      success: false,
      roomName,
      identity,
      error: message,
    };
  }
}

/**
 * Evict multiple participants from a LiveKit room concurrently and collect results.
 */
export async function evictLiveKitParticipants(
  roomName: string,
  identities: string[],
  revokeTokenTs?: number
): Promise<{
  allSuccessful: boolean;
  successfulCount: number;
  failedCount: number;
  results: EvictParticipantResult[];
}> {
  if (identities.length === 0) {
    return {
      allSuccessful: true,
      successfulCount: 0,
      failedCount: 0,
      results: [],
    };
  }

  const results = await Promise.all(
    identities.map((identity) =>
      evictLiveKitParticipant({ roomName, identity, revokeTokenTs })
    )
  );

  const successfulCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successfulCount;

  return {
    allSuccessful: failedCount === 0,
    successfulCount,
    failedCount,
    results,
  };
}
