interface LiveKitServerConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
  isConfigured: boolean;
}

export function getLiveKitServerConfig(): LiveKitServerConfig {
  const url = process.env.LIVEKIT_URL?.trim() || "";
  const apiKey = process.env.LIVEKIT_API_KEY?.trim() || "";
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim() || "";

  const isConfigured = Boolean(
    url.length > 0 &&
    apiKey.length > 0 &&
    apiSecret.length > 0 &&
    !url.includes("placeholder") &&
    !apiKey.includes("placeholder")
  );

  return {
    url,
    apiKey,
    apiSecret,
    isConfigured,
  };
}
