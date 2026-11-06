export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      studios: {
        Row: {
          id: string;
          owner_id: string;
          project_id: string | null;
          name: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          project_id?: string | null;
          name: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          project_id?: string | null;
          name?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "studios_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "studios_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      studio_invitations: {
        Row: {
          id: string;
          studio_id: string;
          token_hash: string;
          created_by: string;
          created_at: string;
          expires_at: string;
          revoked_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          studio_id: string;
          token_hash: string;
          created_by: string;
          created_at?: string;
          expires_at: string;
          revoked_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          studio_id?: string;
          token_hash?: string;
          created_by?: string;
          created_at?: string;
          expires_at?: string;
          revoked_at?: string | null;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "studio_invitations_studio_id_fkey";
            columns: ["studio_id"];
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "studio_invitations_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      guest_participants: {
        Row: {
          id: string;
          studio_id: string;
          invitation_id: string;
          session_secret_hash: string;
          display_name: string;
          joined_at: string;
          last_seen_at: string;
          status: "waiting" | "admitted" | "left";
        };
        Insert: {
          id?: string;
          studio_id: string;
          invitation_id: string;
          session_secret_hash: string;
          display_name: string;
          joined_at?: string;
          last_seen_at?: string;
          status?: "waiting" | "admitted" | "left";
        };
        Update: {
          id?: string;
          studio_id?: string;
          invitation_id?: string;
          session_secret_hash?: string;
          display_name?: string;
          joined_at?: string;
          last_seen_at?: string;
          status?: "waiting" | "admitted" | "left";
        };
        Relationships: [
          {
            foreignKeyName: "guest_participants_studio_id_fkey";
            columns: ["studio_id"];
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guest_participants_invitation_id_fkey";
            columns: ["invitation_id"];
            referencedRelation: "studio_invitations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      verify_guest_invitation: {
        Args: {
          p_token_hash: string;
        };
        Returns: {
          invitation_id: string;
          studio_id: string;
          studio_name: string;
          is_valid: boolean;
          error_code: string | null;
        }[];
      };
      register_guest_participant: {
        Args: {
          p_token_hash: string;
          p_session_secret_hash: string;
          p_display_name: string;
        };
        Returns: {
          guest_id: string;
          studio_id: string;
          studio_name: string;
          display_name: string;
          status: string;
        }[];
      };
      get_guest_session: {
        Args: {
          p_guest_id: string;
          p_session_secret_hash: string;
        };
        Returns: {
          guest_id: string;
          studio_id: string;
          studio_name: string;
          display_name: string;
          status: string;
          joined_at: string;
        }[];
      };
      leave_guest_session: {
        Args: {
          p_guest_id: string;
          p_session_secret_hash: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type StudioRow = Database["public"]["Tables"]["studios"]["Row"];
export type StudioInvitationRow = Database["public"]["Tables"]["studio_invitations"]["Row"];
export type GuestParticipantRow = Database["public"]["Tables"]["guest_participants"]["Row"];
