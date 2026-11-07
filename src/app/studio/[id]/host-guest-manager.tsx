"use client";

import * as React from "react";
import {
  Users,
  Copy,
  Check,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  Loader2,
  X,
  Share2,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createStudioInvitationAction,
  revokeStudioInvitationAction,
} from "@/app/studio/actions/invitation-actions";
import {
  admitGuestParticipantAction,
  removeGuestParticipantAction,
} from "@/app/studio/actions/guest-management-actions";
import { createClient } from "@/lib/supabase/client";
import type { StudioInvitationRow, GuestParticipantRow } from "@/types/database";

interface HostGuestManagerProps {
  studioId: string;
}

export function HostGuestManager({ studioId }: HostGuestManagerProps) {
  const [invitations, setInvitations] = React.useState<StudioInvitationRow[]>([]);
  const [guests, setGuests] = React.useState<GuestParticipantRow[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Invitation creation state
  const [isCreating, setIsCreating] = React.useState(false);
  const [expirationHours, setExpirationHours] = React.useState(24);
  const [recentlyCreatedUrl, setRecentlyCreatedUrl] = React.useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    const supabase = createClient();
    try {
      // 1. Invitations (Owner RLS protected)
      const { data: invData, error: invErr } = await supabase
        .from("studio_invitations")
        .select("*")
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false });

      if (!invErr && invData) {
        setInvitations(invData as StudioInvitationRow[]);
      }

      // 2. Guest Participants (Owner RLS protected)
      const { data: guestData, error: guestErr } = await supabase
        .from("guest_participants")
        .select("*")
        .eq("studio_id", studioId)
        .order("joined_at", { ascending: false });

      if (!guestErr && guestData) {
        setGuests(guestData as GuestParticipantRow[]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading guests.";
      setErrorMessage(msg);
    }
  }, [studioId]);

  React.useEffect(() => {
    let ignore = false;

    async function initialFetch() {
      const supabase = createClient();
      try {
        const { data: invData } = await supabase
          .from("studio_invitations")
          .select("*")
          .eq("studio_id", studioId)
          .order("created_at", { ascending: false });

        if (!ignore && invData) {
          setInvitations(invData as StudioInvitationRow[]);
        }

        const { data: guestData } = await supabase
          .from("guest_participants")
          .select("*")
          .eq("studio_id", studioId)
          .order("joined_at", { ascending: false });

        if (!ignore && guestData) {
          setGuests(guestData as GuestParticipantRow[]);
        }
      } catch {
        // Ignored in initial fetch
      }
    }

    void initialFetch();

    // Poll for guests arriving in the waiting room
    const interval = setInterval(() => {
      void loadData();
    }, 4000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [studioId, loadData]);

  const handleCreateInvitation = async () => {
    setIsCreating(true);
    setErrorMessage(null);
    setRecentlyCreatedUrl(null);

    const res = await createStudioInvitationAction(studioId, expirationHours);

    if (!res.success || !res.invitationUrl) {
      setErrorMessage(res.error || "Failed to generate guest invitation.");
      setIsCreating(false);
      return;
    }

    setRecentlyCreatedUrl(res.invitationUrl);
    setIsCreating(false);
    void loadData();
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    setRevokingId(invitationId);
    setErrorMessage(null);
    const res = await revokeStudioInvitationAction(invitationId);

    if (!res.success) {
      setErrorMessage(res.error || "Failed to revoke invitation.");
    } else {
      void loadData();
    }
    setRevokingId(null);
  };

  const handleAdmitGuest = async (guestId: string) => {
    setActionLoadingId(`admit_${guestId}`);
    setErrorMessage(null);
    try {
      const res = await admitGuestParticipantAction(studioId, guestId);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to admit guest.");
      } else {
        await loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to admit guest.";
      setErrorMessage(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveGuest = async (guestId: string) => {
    setActionLoadingId(`remove_${guestId}`);
    setErrorMessage(null);
    try {
      const res = await removeGuestParticipantAction(studioId, guestId);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to remove guest.");
      } else {
        await loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove guest.";
      setErrorMessage(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const activeGuests = guests.filter((g) => g.status === "waiting" || g.status === "admitted");

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-start justify-between">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Guest Invitation Generation Box */}
      <div className="p-5 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600/15 border border-violet-500/30 text-violet-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Guest Invitation Protocol</h3>
              <p className="text-xs text-slate-400">Generate secure one-click guest links</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={expirationHours}
              onChange={(e) => setExpirationHours(Number(e.target.value))}
              disabled={isCreating}
              className="rounded-xl border border-[#1a1e2b] bg-[#131722] px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value={1}>Expires in 1 Hour</option>
              <option value={6}>Expires in 6 Hours</option>
              <option value={24}>Expires in 24 Hours</option>
              <option value={72}>Expires in 3 Days</option>
            </select>

            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateInvitation}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Guest Link
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Recently Created Invitation Display Banner */}
        {recentlyCreatedUrl && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Ready to Share with Guest
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Expires in {expirationHours} hours
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={recentlyCreatedUrl}
                className="flex-1 rounded-xl border border-[#1a1e2b] bg-[#090a0f] px-3 py-1.5 text-xs font-mono text-emerald-300 select-all"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyLink(recentlyCreatedUrl)}
                className="shrink-0 text-xs"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Guest Participants Live Waiting Room Section */}
      <div className="p-5 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] space-y-4">
        <div className="flex items-center justify-between border-b border-[#1a1e2b] pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Guest Waiting Room</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
              {activeGuests.length} Active
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Live automatic updates</span>
        </div>

        {activeGuests.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-[#1a1e2b] bg-[#131722]/50 space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-medium text-slate-300">No guests in the waiting room</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Share a guest invitation link above. When guests enter their name, they will immediately appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeGuests.map((guest) => (
              <div
                key={guest.id}
                className="p-3.5 rounded-xl border border-[#1a1e2b] bg-[#131722] flex items-center justify-between gap-3 hover:border-[#242a3b] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 font-bold text-xs flex items-center justify-center">
                    {guest.display_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{guest.display_name}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> Joined at {formatTime(guest.joined_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {guest.status === "waiting" && (
                    <>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Waiting
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAdmitGuest(guest.id)}
                        disabled={actionLoadingId !== null}
                        className="text-xs h-7 px-2.5"
                      >
                        {actionLoadingId === `admit_${guest.id}` ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <UserCheck className="w-3 h-3 mr-1" />
                        )}
                        <span>Admit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveGuest(guest.id)}
                        disabled={actionLoadingId !== null}
                        className="text-xs h-7 px-2 text-rose-400 hover:text-rose-300 hover:border-rose-500/30"
                      >
                        {actionLoadingId === `remove_${guest.id}` ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <UserX className="w-3 h-3 mr-1" />
                        )}
                        <span>Decline</span>
                      </Button>
                    </>
                  )}

                  {guest.status === "admitted" && (
                    <>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Admitted
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveGuest(guest.id)}
                        disabled={actionLoadingId !== null}
                        className="text-xs h-7 px-2 text-rose-400 hover:text-rose-300 hover:border-rose-500/30"
                      >
                        {actionLoadingId === `remove_${guest.id}` ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <UserX className="w-3 h-3 mr-1" />
                        )}
                        <span>Remove</span>
                      </Button>
                    </>
                  )}

                  {guest.status === "left" && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                      Left
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invitations History / Revocation Section */}
      {invitations.length > 0 && (
        <div className="p-5 rounded-2xl border border-[#1a1e2b] bg-[#0e1118] space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider">
            Issued Invitations ({invitations.length})
          </h3>
          <div className="space-y-2">
            {invitations.map((inv) => {
              const isExpired = new Date(inv.expires_at) <= new Date();
              const isRevoked = !inv.is_active || inv.revoked_at !== null;
              const isLive = !isExpired && !isRevoked;

              return (
                <div
                  key={inv.id}
                  className="p-3 rounded-xl border border-[#1a1e2b] bg-[#131722] flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[11px]">
                        ID: {inv.id.substring(0, 8)}...
                      </span>
                      {isLive ? (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : isRevoked ? (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Revoked
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Created: {new Date(inv.created_at).toLocaleDateString()} • Expires:{" "}
                      {new Date(inv.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {isLive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeInvitation(inv.id)}
                      disabled={revokingId === inv.id}
                      className="text-[11px] text-rose-400 hover:text-rose-300 hover:border-rose-500/30 h-7 px-2"
                    >
                      {revokingId === inv.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3 mr-1" />
                          <span>Revoke</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
