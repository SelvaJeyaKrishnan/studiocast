"use client";

import * as React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  AlertCircle,
  Loader2,
  Volume2,
  UserX,
} from "lucide-react";
import {
  Room,
  RoomEvent,
  VideoPresets,
  Track,
  Participant,
  RemoteParticipant,
  TrackPublication,
  ConnectionState,
} from "livekit-client";
import { Button } from "@/components/ui/button";

interface ParticipantState {
  identity: string;
  name: string;
  isLocal: boolean;
  isHost: boolean;
  isSpeaking: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  videoTrack: Track | null;
  audioTrack: Track | null;
}

interface LiveMediaRoomProps {
  token: string;
  liveKitUrl: string;
  displayName: string;
  isHost?: boolean;
  roomTitle: string;
  onLeave: () => void;
  headerSlot?: React.ReactNode;
  onRemoveGuest?: (guestId: string) => Promise<void>;
}

export function LiveMediaRoom({
  token,
  liveKitUrl,
  displayName,
  isHost = false,
  roomTitle,
  onLeave,
  headerSlot,
  onRemoveGuest,
}: LiveMediaRoomProps) {
  const roomRef = React.useRef<Room | null>(null);
  const [connectionState, setConnectionState] = React.useState<ConnectionState>(
    ConnectionState.Connecting
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isMicEnabled, setIsMicEnabled] = React.useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = React.useState(true);
  const [participants, setParticipants] = React.useState<Map<string, ParticipantState>>(
    new Map()
  );

  // Helper to extract clean state from LiveKit Participant
  const extractParticipantState = React.useCallback(
    (participant: Participant, isLocal = false): ParticipantState => {
      let isHostRole = isLocal ? isHost : false;
      if (participant.metadata) {
        try {
          const parsed = JSON.parse(participant.metadata);
          if (parsed.role === "host") isHostRole = true;
        } catch {
          // ignore parsing error
        }
      }
      if (participant.identity.startsWith("host_")) {
        isHostRole = true;
      }

      let videoTrack: Track | null = null;
      let audioTrack: Track | null = null;

      participant.videoTrackPublications.forEach((pub: TrackPublication) => {
        if (pub.track && pub.source === Track.Source.Camera) {
          videoTrack = pub.track;
        }
      });

      participant.audioTrackPublications.forEach((pub: TrackPublication) => {
        if (pub.track && pub.source === Track.Source.Microphone) {
          audioTrack = pub.track;
        }
      });

      const isAudioMuted = !participant.isMicrophoneEnabled;
      const isVideoMuted = !participant.isCameraEnabled;

      return {
        identity: participant.identity,
        name: participant.name || (isLocal ? displayName : "Guest"),
        isLocal,
        isHost: isHostRole,
        isSpeaking: participant.isSpeaking,
        isAudioMuted,
        isVideoMuted,
        videoTrack,
        audioTrack,
      };
    },
    [isHost, displayName]
  );

  // Synchronize participants state
  const syncParticipants = React.useCallback(
    (room: Room) => {
      const map = new Map<string, ParticipantState>();

      if (room.localParticipant) {
        map.set(
          room.localParticipant.identity,
          extractParticipantState(room.localParticipant, true)
        );
      }

      room.remoteParticipants.forEach((rp: RemoteParticipant) => {
        map.set(rp.identity, extractParticipantState(rp, false));
      });

      setParticipants(map);
    },
    [extractParticipantState]
  );

  // Connect to LiveKit Room
  React.useEffect(() => {
    let isCancelled = false;

    async function initRoom() {
      try {
        setErrorMessage(null);
        setConnectionState(ConnectionState.Connecting);

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h720.resolution,
          },
        });
        roomRef.current = room;

        // Register room event handlers
        room
          .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
            if (isCancelled) return;
            setConnectionState(state);
            syncParticipants(room);
          })
          .on(RoomEvent.Connected, () => {
            if (isCancelled) return;
            syncParticipants(room);
          })
          .on(RoomEvent.Disconnected, () => {
            if (isCancelled) return;
            setConnectionState(ConnectionState.Disconnected);
          })
          .on(RoomEvent.ParticipantConnected, () => syncParticipants(room))
          .on(RoomEvent.ParticipantDisconnected, () => syncParticipants(room))
          .on(RoomEvent.TrackSubscribed, () => {
            syncParticipants(room);
          })
          .on(RoomEvent.TrackUnsubscribed, () => {
            syncParticipants(room);
          })
          .on(RoomEvent.TrackMuted, () => {
            syncParticipants(room);
          })
          .on(RoomEvent.TrackUnmuted, () => {
            syncParticipants(room);
          })
          .on(RoomEvent.LocalTrackPublished, () => {
            syncParticipants(room);
          })
          .on(RoomEvent.LocalTrackUnpublished, () => {
            syncParticipants(room);
          })
          .on(RoomEvent.ActiveSpeakersChanged, () => syncParticipants(room));

        // Connect room
        await room.connect(liveKitUrl, token);

        if (isCancelled) {
          await room.disconnect();
          return;
        }

        // Enable microphone & camera
        try {
          await room.localParticipant.enableCameraAndMicrophone();
          setIsCameraEnabled(room.localParticipant.isCameraEnabled);
          setIsMicEnabled(room.localParticipant.isMicrophoneEnabled);
        } catch (mediaErr: unknown) {
          console.warn("[Media Error] Could not enable both camera & mic:", mediaErr);
          // Try audio only as graceful degradation
          try {
            await room.localParticipant.setMicrophoneEnabled(true);
            setIsMicEnabled(true);
            setIsCameraEnabled(false);
          } catch (audioErr: unknown) {
            console.error("[Media Error] Microphone also denied:", audioErr);
            setIsMicEnabled(false);
            setIsCameraEnabled(false);
            setErrorMessage(
              "Camera and microphone permissions were denied. You are connected in listen-only mode."
            );
          }
        }

        syncParticipants(room);
      } catch (err: unknown) {
        if (isCancelled) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to establish real-time media connection.";
        setErrorMessage(msg);
        setConnectionState(ConnectionState.Disconnected);
      }
    }

    void initRoom();

    return () => {
      isCancelled = true;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [liveKitUrl, token, syncParticipants]);

  // Toggle Microphone
  const toggleMicrophone = async () => {
    if (!roomRef.current) return;
    const nextState = !isMicEnabled;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(nextState);
      setIsMicEnabled(nextState);
      syncParticipants(roomRef.current);
    } catch (err: unknown) {
      console.error("[Mic Toggle Error]", err);
    }
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (!roomRef.current) return;
    const nextState = !isCameraEnabled;
    try {
      await roomRef.current.localParticipant.setCameraEnabled(nextState);
      setIsCameraEnabled(nextState);
      syncParticipants(roomRef.current);
    } catch (err: unknown) {
      console.error("[Camera Toggle Error]", err);
    }
  };

  // Leave Session
  const handleLeaveSession = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    onLeave();
  };

  const participantList = Array.from(participants.values());
  const participantCount = participantList.length;

  // Compute responsive grid layout based on participant count
  const getGridClass = () => {
    if (participantCount <= 1) return "grid-cols-1 max-w-3xl";
    if (participantCount === 2) return "grid-cols-1 md:grid-cols-2 max-w-5xl";
    if (participantCount <= 4) return "grid-cols-1 sm:grid-cols-2 max-w-5xl";
    if (participantCount <= 6) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-7xl";
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#090a0f] text-slate-100">
      {/* Top Header */}
      <header className="h-16 border-b border-[#1a1e2b] bg-[#0e1118]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionState === ConnectionState.Connected
                  ? "bg-emerald-400 animate-pulse"
                  : connectionState === ConnectionState.Connecting
                  ? "bg-amber-400 animate-pulse"
                  : "bg-rose-500"
              }`}
            />
            <span className="text-xs font-medium text-slate-300">
              {connectionState === ConnectionState.Connected
                ? "Live Studio"
                : connectionState === ConnectionState.Connecting
                ? "Connecting..."
                : "Disconnected"}
            </span>
          </div>
          <div className="h-4 w-px bg-[#1a1e2b]" />
          <span className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">
            {roomTitle}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#131722] border border-[#1a1e2b] text-[11px] text-slate-400">
            <Users className="w-3.5 h-3.5 text-violet-400" />
            <span>
              {participantCount} {participantCount === 1 ? "person" : "people"} in studio
            </span>
          </div>
          {headerSlot}
        </div>
      </header>

      {/* Main Grid Viewport */}
      <main className="flex-1 p-4 sm:p-6 flex flex-col justify-center items-center overflow-y-auto">
        {errorMessage && (
          <div className="mb-4 max-w-lg w-full p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {connectionState === ConnectionState.Connecting && participantCount === 0 ? (
          <div className="text-center space-y-3 py-12">
            <Loader2 className="w-10 h-10 border-violet-500 animate-spin text-violet-500 mx-auto" />
            <p className="text-xs text-slate-400">
              Joining real-time studio media room...
            </p>
          </div>
        ) : (
          <div className={`grid gap-4 w-full mx-auto ${getGridClass()}`}>
            {participantList.map((p) => (
              <ParticipantTile
                key={p.identity}
                participant={p}
                isHostUser={isHost}
                onRemoveGuest={onRemoveGuest}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Bottom Media Controls */}
      <footer className="h-20 border-t border-[#1a1e2b] bg-[#0e1118]/90 backdrop-blur-md px-4 flex items-center justify-center shrink-0">
        <div className="flex items-center gap-3">
          {/* Microphone Toggle */}
          <Button
            type="button"
            variant={isMicEnabled ? "secondary" : "danger"}
            size="md"
            onClick={toggleMicrophone}
            className="rounded-2xl gap-2 min-w-[100px]"
            title={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span className="text-xs">{isMicEnabled ? "Mute" : "Unmute"}</span>
          </Button>

          {/* Camera Toggle */}
          <Button
            type="button"
            variant={isCameraEnabled ? "secondary" : "danger"}
            size="md"
            onClick={toggleCamera}
            className="rounded-2xl gap-2 min-w-[100px]"
            title={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
          >
            {isCameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            <span className="text-xs">{isCameraEnabled ? "Stop Video" : "Start Video"}</span>
          </Button>

          {/* Leave Session */}
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={handleLeaveSession}
            className="rounded-2xl gap-2"
            title="Leave Studio Room"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="text-xs">Leave Studio</span>
          </Button>
        </div>
      </footer>
    </div>
  );
}

/**
 * Individual Participant Video & Audio Tile
 */
interface ParticipantTileProps {
  participant: ParticipantState;
  isHostUser?: boolean;
  onRemoveGuest?: (guestId: string) => Promise<void>;
}

function ParticipantTile({
  participant,
  isHostUser = false,
  onRemoveGuest,
}: ParticipantTileProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Attach Video Track
  React.useEffect(() => {
    const el = videoRef.current;
    if (!el || !participant.videoTrack) return;

    participant.videoTrack.attach(el);

    return () => {
      participant.videoTrack?.detach(el);
    };
  }, [participant.videoTrack]);

  // Attach Audio Track (only for remote participants to prevent feedback loop)
  React.useEffect(() => {
    const el = audioRef.current;
    if (!el || !participant.audioTrack || participant.isLocal) return;

    participant.audioTrack.attach(el);

    return () => {
      participant.audioTrack?.detach(el);
    };
  }, [participant.audioTrack, participant.isLocal]);

  const initials = (participant.name || "G")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const isVideoVisible = Boolean(participant.videoTrack) && !participant.isVideoMuted;

  return (
    <div
      className={`relative aspect-video w-full rounded-2xl border bg-[#0e1118] overflow-hidden flex items-center justify-center shadow-xl transition-all ${
        participant.isSpeaking
          ? "border-violet-500 ring-2 ring-violet-500/30"
          : "border-[#1a1e2b]"
      }`}
    >
      {/* Video Stream Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className={`w-full h-full object-cover ${isVideoVisible ? "block" : "hidden"} ${
          participant.isLocal ? "-scale-x-100" : ""
        }`}
      />

      {/* Audio Stream for Remote Participant */}
      {!participant.isLocal && <audio ref={audioRef} autoPlay />}

      {/* Fallback Avatar when Camera is Off */}
      {!isVideoVisible && (
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-20 h-20 rounded-2xl bg-[#131722] border-2 border-violet-500/30 flex items-center justify-center text-2xl font-bold text-violet-400 shadow-lg">
            {initials}
          </div>
          <span className="text-xs text-slate-400 font-medium">{participant.name}</span>
        </div>
      )}

      {/* Host Control: Kick/Remove Guest */}
      {isHostUser &&
        !participant.isLocal &&
        participant.identity.startsWith("guest_") &&
        onRemoveGuest && (
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              const guestId = participant.identity.replace("guest_", "");
              await onRemoveGuest(guestId);
            }}
            className="absolute top-3 left-3 p-1.5 rounded-lg bg-black/60 hover:bg-rose-500/30 border border-white/10 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 backdrop-blur-md transition z-10"
            title="Remove guest from studio"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
        )}

      {/* Participant Identity Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white">
        <span className="font-medium max-w-[140px] truncate">{participant.name}</span>
        {participant.isLocal && (
          <span className="text-[10px] text-violet-300 font-mono">(You)</span>
        )}
        {participant.isHost && (
          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-violet-600/30 border border-violet-500/40 text-violet-300">
            Host
          </span>
        )}
      </div>

      {/* Audio Muted Indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {participant.isSpeaking && (
          <span className="p-1.5 rounded-lg bg-violet-600/80 text-white animate-pulse">
            <Volume2 className="w-3.5 h-3.5" />
          </span>
        )}
        <span
          className={`p-1.5 rounded-lg border backdrop-blur-md text-xs ${
            participant.isAudioMuted
              ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
              : "bg-black/60 border-white/10 text-slate-300"
          }`}
          title={participant.isAudioMuted ? "Microphone muted" : "Microphone active"}
        >
          {participant.isAudioMuted ? (
            <MicOff className="w-3.5 h-3.5" />
          ) : (
            <Mic className="w-3.5 h-3.5" />
          )}
        </span>
      </div>
    </div>
  );
}
