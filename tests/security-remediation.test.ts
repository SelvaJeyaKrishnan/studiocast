import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getGuestLiveKitTokenAction } from "../src/app/studio/actions/livekit-actions";
import {
  admitGuestParticipantAction,
  removeGuestParticipantAction,
} from "../src/app/studio/actions/guest-management-actions";
import { revokeStudioInvitationAction } from "../src/app/studio/actions/invitation-actions";
import { TokenVerifier } from "livekit-server-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

// Test UUID constants
const VALID_STUDIO_ID = "11111111-1111-4111-8111-111111111111";
const VALID_GUEST_ID = "22222222-2222-4222-8222-222222222222";
const VALID_INVITATION_ID = "33333333-3333-4333-8333-333333333333";
const OWNER_USER_ID = "44444444-4444-4444-8444-444444444444";
const NON_OWNER_USER_ID = "55555555-5555-4555-8555-555555555555";
const VALID_SECRET = "secure-test-session-secret-with-high-entropy-123456789";

describe("StudioCast Sprint 1 Task 1: Security Remediation Suite", () => {
  // =========================================================================
  // CRITICAL ISSUE 1: Waiting-Room Authorization Bypass Tests
  // =========================================================================
  describe("1. Waiting-Room Authorization Gating (getGuestLiveKitTokenAction)", () => {
    test("Waiting guest cannot obtain a token", async () => {
      const mockSupabase = {
        rpc: async (name: string) => {
          if (name === "get_guest_session") {
            return {
              data: [
                {
                  guest_id: VALID_GUEST_ID,
                  studio_id: VALID_STUDIO_ID,
                  studio_name: "Test Studio",
                  display_name: "Waiting Guest",
                  status: "waiting", // STILL WAITING
                  joined_at: new Date().toISOString(),
                },
              ],
              error: null,
            };
          }
          return { data: null, error: new Error("Unknown RPC") };
        },
      };

      const result = await getGuestLiveKitTokenAction(
        VALID_GUEST_ID,
        VALID_SECRET,
        mockSupabase as unknown as SupabaseClient<Database>
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.token, undefined);
      assert.match(
        result.error || "",
        /waiting room and has not been admitted/i
      );
    });

    test("Admitted guest can obtain a token with 300s TTL", async () => {
      // Ensure environment variables are set for livekit token signing
      process.env.LIVEKIT_URL = process.env.LIVEKIT_URL || "https://test.livekit.cloud";
      process.env.LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
      process.env.LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secretsecretsecretsecretsecretsecret32";

      const mockSupabase = {
        rpc: async (name: string) => {
          if (name === "get_guest_session") {
            return {
              data: [
                {
                  guest_id: VALID_GUEST_ID,
                  studio_id: VALID_STUDIO_ID,
                  studio_name: "Test Studio",
                  display_name: "Admitted Guest",
                  status: "admitted", // PROPERLY ADMITTED
                  joined_at: new Date().toISOString(),
                },
              ],
              error: null,
            };
          }
          return { data: null, error: new Error("Unknown RPC") };
        },
      };

      const result = await getGuestLiveKitTokenAction(
        VALID_GUEST_ID,
        VALID_SECRET,
        mockSupabase as unknown as SupabaseClient<Database>
      );

      assert.strictEqual(result.success, true);
      assert.ok(result.token);
      assert.strictEqual(result.roomName, `studio_${VALID_STUDIO_ID}`);

      // Verify token TTL: Guest tokens must have short 300s TTL
      const verifier = new TokenVerifier(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
      const claims = await verifier.verify(result.token!);
      const lifetimeSeconds = (claims.exp || 0) - (claims.nbf || 0);
      assert.strictEqual(lifetimeSeconds, 300, "Guest token lifetime must be exactly 300 seconds");
    });

    test("Left guest cannot obtain a token", async () => {
      const mockSupabase = {
        rpc: async (name: string) => {
          if (name === "get_guest_session") {
            return {
              data: [
                {
                  guest_id: VALID_GUEST_ID,
                  studio_id: VALID_STUDIO_ID,
                  studio_name: "Test Studio",
                  display_name: "Left Guest",
                  status: "left", // HAS LEFT
                  joined_at: new Date().toISOString(),
                },
              ],
              error: null,
            };
          }
          return { data: null, error: new Error("Unknown RPC") };
        },
      };

      const result = await getGuestLiveKitTokenAction(
        VALID_GUEST_ID,
        VALID_SECRET,
        mockSupabase as unknown as SupabaseClient<Database>
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.token, undefined);
      assert.match(result.error || "", /session has ended or is not authorized/i);
    });

    test("Revoked invitation cannot obtain a token", async () => {
      // In PostgreSQL get_guest_session RPC, revoked invitations return empty rows
      const mockSupabase = {
        rpc: async () => ({
          data: [], // No active session returned because parent invitation is revoked
          error: null,
        }),
      };

      const result = await getGuestLiveKitTokenAction(
        VALID_GUEST_ID,
        VALID_SECRET,
        mockSupabase as unknown as SupabaseClient<Database>
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.token, undefined);
      assert.match(result.error || "", /session not found or credentials invalid/i);
    });
  });

  // =========================================================================
  // CRITICAL ISSUE 3: Host Admission and Removal Controls Tests
  // =========================================================================
  describe("2. Host Admission & Removal Controls (guest-management-actions)", () => {
    test("Non-owner cannot admit guests", async () => {
      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: NON_OWNER_USER_ID } }, error: null }),
        },
        from: (table: string) => {
          if (table === "studios") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: null, // Studio ownership check fails for NON_OWNER
                      error: { message: "Row not found" },
                    }),
                  }),
                }),
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      };

      const result = await admitGuestParticipantAction(
        VALID_STUDIO_ID,
        VALID_GUEST_ID,
        mockSupabase as unknown as SupabaseClient<Database>
      );

      assert.strictEqual(result.success, false);
      assert.match(result.error || "", /Studio not found or access denied/i);
    });

    test("Non-owner cannot remove guests", async () => {
      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: NON_OWNER_USER_ID } }, error: null }),
        },
        from: (table: string) => {
          if (table === "studios") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: null, // Studio ownership check fails
                      error: { message: "Row not found" },
                    }),
                  }),
                }),
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      };

      const result = await removeGuestParticipantAction(
        VALID_STUDIO_ID,
        VALID_GUEST_ID,
        mockSupabase as unknown as SupabaseClient<Database>
      );

      assert.strictEqual(result.success, false);
      assert.match(result.error || "", /Studio not found or access denied/i);
    });

    test("Owner can admit a waiting guest", async () => {
      let updatedStatus = "";
      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: OWNER_USER_ID } }, error: null }),
        },
        from: (table: string) => {
          if (table === "studios") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: { id: VALID_STUDIO_ID, owner_id: OWNER_USER_ID },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "guest_participants") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: VALID_GUEST_ID,
                        studio_id: VALID_STUDIO_ID,
                        invitation_id: VALID_INVITATION_ID,
                        status: "waiting", // currently waiting
                        display_name: "Alice",
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: (fields: Record<string, unknown>) => ({
                eq: () => ({
                  eq: async () => {
                    updatedStatus = fields.status as string;
                    return { error: null };
                  },
                }),
              }),
            };
          }
          if (table === "studio_invitations") {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: VALID_INVITATION_ID,
                      is_active: true,
                      revoked_at: null,
                      expires_at: new Date(Date.now() + 3600000).toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      };

      const result = await admitGuestParticipantAction(
        VALID_STUDIO_ID,
        VALID_GUEST_ID,
        mockSupabase as unknown as SupabaseClient<Database>
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, "admitted");
      assert.strictEqual(updatedStatus, "admitted");
    });

    test("Duplicate admission requests do not corrupt state (idempotent)", async () => {
      let updateAttempted = false;
      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: OWNER_USER_ID } }, error: null }),
        },
        from: (table: string) => {
          if (table === "studios") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: { id: VALID_STUDIO_ID, owner_id: OWNER_USER_ID },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "guest_participants") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: VALID_GUEST_ID,
                        studio_id: VALID_STUDIO_ID,
                        invitation_id: VALID_INVITATION_ID,
                        status: "admitted", // ALREADY ADMITTED
                        display_name: "Alice",
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: () => {
                updateAttempted = true;
                return { eq: () => ({ eq: async () => ({ error: null }) }) };
              },
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      };

      const result = await admitGuestParticipantAction(
        VALID_STUDIO_ID,
        VALID_GUEST_ID,
        mockSupabase as unknown as SupabaseClient<Database>
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, "admitted");
      assert.strictEqual(result.message, "Guest is already admitted.");
      assert.strictEqual(updateAttempted, false, "Should not execute redundant update for already admitted guest");
    });

    test("Owner can remove an admitted guest with LiveKit eviction", async () => {
      let evictedIdentity = "";
      let dbStatusSet = "";

      const mockLiveKitService = {
        evictLiveKitParticipant: async (opts: { roomName: string; identity: string; revokeTokenTs?: number }) => {
          evictedIdentity = opts.identity;
          return { success: true, roomName: opts.roomName, identity: opts.identity };
        },
      };

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: OWNER_USER_ID } }, error: null }),
        },
        from: (table: string) => {
          if (table === "studios") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: { id: VALID_STUDIO_ID, owner_id: OWNER_USER_ID },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "guest_participants") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: VALID_GUEST_ID,
                        studio_id: VALID_STUDIO_ID,
                        status: "admitted",
                        display_name: "Bob",
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: (fields: Record<string, unknown>) => ({
                eq: () => ({
                  eq: async () => {
                    dbStatusSet = fields.status as string;
                    return { error: null };
                  },
                }),
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      };

      const result = await removeGuestParticipantAction(
        VALID_STUDIO_ID,
        VALID_GUEST_ID,
        mockSupabase as unknown as SupabaseClient<Database>,
        mockLiveKitService
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, "left");
      assert.strictEqual(dbStatusSet, "left");
      assert.strictEqual(evictedIdentity, `guest_${VALID_GUEST_ID}`);
    });
  });

  // =========================================================================
  // CRITICAL ISSUE 2: Invitation Revocation & LiveKit Eviction Tests
  // =========================================================================
  describe("3. Invitation Revocation & LiveKit Eviction (revokeStudioInvitationAction)", () => {
    test("Invitation revocation removes connected guests from LiveKit", async () => {
      let evictedIdentities: string[] = [];
      let invitationRevoked = false;
      let guestsMarkedLeft = false;

      const mockLiveKitService = {
        evictLiveKitParticipants: async (
          roomName: string,
          identities: string[]
        ) => {
          evictedIdentities = [...identities];
          return {
            allSuccessful: true,
            successfulCount: identities.length,
            failedCount: 0,
            results: identities.map((id) => ({ success: true, roomName, identity: id })),
          };
        },
      };

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: OWNER_USER_ID } }, error: null }),
        },
        from: (table: string) => {
          if (table === "studio_invitations") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: VALID_INVITATION_ID,
                        studio_id: VALID_STUDIO_ID,
                        created_by: OWNER_USER_ID,
                        is_active: true,
                        revoked_at: null,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: (fields: Record<string, unknown>) => ({
                eq: () => ({
                  eq: async () => {
                    if (fields.is_active === false && fields.revoked_at) {
                      invitationRevoked = true;
                    }
                    return { error: null };
                  },
                }),
              }),
            };
          }
          if (table === "studios") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: { id: VALID_STUDIO_ID, owner_id: OWNER_USER_ID },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "guest_participants") {
            return {
              select: () => ({
                eq: () => ({
                  neq: async () => ({
                    data: [
                      { id: "guest-1", status: "admitted" },
                      { id: "guest-2", status: "waiting" },
                    ],
                    error: null,
                  }),
                }),
              }),
              update: (fields: Record<string, unknown>) => ({
                eq: () => ({
                  neq: async () => {
                    if (fields.status === "left") {
                      guestsMarkedLeft = true;
                    }
                    return { error: null };
                  },
                }),
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      };

      const result = await revokeStudioInvitationAction(
        VALID_INVITATION_ID,
        mockSupabase as unknown as SupabaseClient<Database>,
        mockLiveKitService
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(invitationRevoked, true);
      assert.strictEqual(guestsMarkedLeft, true);
      assert.deepStrictEqual(evictedIdentities, ["guest_guest-1", "guest_guest-2"]);
    });

    test("LiveKit API failure is handled safely (partial failure reported, retryable)", async () => {
      const mockLiveKitService = {
        evictLiveKitParticipants: async (
          roomName: string,
          identities: string[]
        ) => ({
          allSuccessful: false, // LiveKit API call failed for a participant
          successfulCount: 0,
          failedCount: 1,
          results: [{ success: false, roomName, identity: identities[0], error: "LiveKit SFU 503 Service Unavailable" }],
        }),
      };

      const mockSupabase = {
        auth: {
          getUser: async () => ({ data: { user: { id: OWNER_USER_ID } }, error: null }),
        },
        from: (table: string) => {
          if (table === "studio_invitations") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: {
                        id: VALID_INVITATION_ID,
                        studio_id: VALID_STUDIO_ID,
                        created_by: OWNER_USER_ID,
                        is_active: true,
                        revoked_at: null,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
            };
          }
          if (table === "studios") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: { id: VALID_STUDIO_ID, owner_id: OWNER_USER_ID },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "guest_participants") {
            return {
              select: () => ({
                eq: () => ({
                  neq: async () => ({
                    data: [{ id: "guest-failing", status: "admitted" }],
                    error: null,
                  }),
                }),
              }),
              update: () => ({ eq: () => ({ neq: async () => ({ error: null }) }) }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      };

      const result = await revokeStudioInvitationAction(
        VALID_INVITATION_ID,
        mockSupabase as unknown as SupabaseClient<Database>,
        mockLiveKitService
      );

      // Must NOT report success when LiveKit eviction fails
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.partialFailure, true);
      assert.match(result.error || "", /LiveKit room eviction failed/i);
      assert.strictEqual(result.evictionResults?.[0].success, false);
      assert.strictEqual(result.evictionResults?.[0].error, "LiveKit SFU 503 Service Unavailable");
    });
  });
});
