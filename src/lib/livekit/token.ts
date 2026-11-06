import { AccessToken, type VideoGrant } from "livekit-server-sdk";
import { getLiveKitServerConfig } from "./config";

export interface CreateLiveKitTokenOptions {
  roomName: string;
  identity: string;
  name: string;
  metadata?: Record<string, unknown>;
  isHost?: boolean;
}

/**
 * Creates a signed LiveKit JWT access token on the server.
 * Never exposes the API key or secret to the caller/browser.
 */
export async function createLiveKitAccessToken({
  roomName,
  identity,
  name,
  metadata,
  isHost = false,
}: CreateLiveKitTokenOptions): Promise<{ token: string; url: string }> {
  const config = getLiveKitServerConfig();

  if (!config.isConfigured) {
    throw new Error("LiveKit environment variables are not configured on the server.");
  }

  // Construct grants strictly scoped to this specific room
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };

  if (isHost) {
    // Only verified hosts receive administrative permissions
    grant.roomAdmin = true;
    grant.roomRecord = false; // Recording engine reserved for Phase 4
  }

  const at = new AccessToken(config.apiKey, config.apiSecret, {
    identity,
    name,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    ttl: "6h",
  });

  at.addGrant(grant);

  const token = await at.toJwt();

  return {
    token,
    url: config.url,
  };
}
