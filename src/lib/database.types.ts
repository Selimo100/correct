// Type definitions for database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          username: string
          is_admin: boolean
          is_super_admin: boolean
          status: 'PENDING' | 'ACTIVE' | 'BANNED'
          approved_at: string | null
          approved_by_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          username?: string
          is_admin?: boolean
          is_super_admin?: boolean
          status?: 'PENDING' | 'ACTIVE' | 'BANNED'
          approved_at?: string | null
          approved_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          username?: string
          is_admin?: boolean
          is_super_admin?: boolean
          status?: 'PENDING' | 'ACTIVE' | 'BANNED'
          approved_at?: string | null
          approved_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bets: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          category: string | null
          end_at: string
          max_participants: number | null
          status: 'OPEN' | 'RESOLVED' | 'VOID'
          resolution: boolean | null
          resolved_at: string | null
          resolved_by_id: string | null
          hidden: boolean
          visibility: 'PUBLIC' | 'PRIVATE'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          category?: string | null
          end_at: string
          max_participants?: number | null
          status?: 'OPEN' | 'RESOLVED' | 'VOID'
          resolution?: boolean | null
          resolved_at?: string | null
          resolved_by_id?: string | null
          hidden?: boolean
          visibility?: 'PUBLIC' | 'PRIVATE'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          category?: string | null
          end_at?: string
          max_participants?: number | null
          status?: 'OPEN' | 'RESOLVED' | 'VOID'
          resolution?: boolean | null
          resolved_at?: string | null
          resolved_by_id?: string | null
          hidden?: boolean
          visibility?: 'PUBLIC' | 'PRIVATE'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bet_entries: {
        Row: {
          id: string
          bet_id: string
          user_id: string
          side: 'FOR' | 'AGAINST'
          stake: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bet_id: string
          user_id: string
          side: 'FOR' | 'AGAINST'
          stake: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bet_id?: string
          user_id?: string
          side?: 'FOR' | 'AGAINST'
          stake?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: 'STARTER' | 'BET_STAKE' | 'BET_PAYOUT' | 'BET_REFUND' | 'FEE' | 'ADMIN_ADJUSTMENT'
          bet_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: 'STARTER' | 'BET_STAKE' | 'BET_PAYOUT' | 'BET_REFUND' | 'FEE' | 'ADMIN_ADJUSTMENT'
          bet_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: 'STARTER' | 'BET_STAKE' | 'BET_PAYOUT' | 'BET_REFUND' | 'FEE' | 'ADMIN_ADJUSTMENT'
          bet_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      bet_settlements: {
        Row: {
          bet_id: string
          kind: 'RESOLVE' | 'VOID'
          outcome: boolean | null
          fee_bps: number
          settled_at: string
          settled_by: string
        }
        Insert: {
          bet_id: string
          kind: 'RESOLVE' | 'VOID'
          outcome?: boolean | null
          fee_bps?: number
          settled_at?: string
          settled_by: string
        }
        Update: {
          bet_id?: string
          kind?: 'RESOLVE' | 'VOID'
          outcome?: boolean | null
          fee_bps?: number
          settled_at?: string
          settled_by?: string
        }
          settled_at?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED'
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED'
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED'
          created_at?: string
          responded_at?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          created_at?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          added_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          added_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          added_at?: string
        }
        Relationships: []
      }
    }
    Functions: {
      get_balance: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      place_stake: {
        Args: {
          p_bet_id: string
          p_side: string
          p_stake: number
        }
        Returns: Json
      }
      resolve_bet: {
        Args: {
          p_bet_id: string
          p_resolution: boolean
          p_fee_bps?: number
        }
        Returns: Json
      }
      void_bet: {
        Args: {
          p_bet_id: string
        }
        Returns: Json
      }
      get_bet_stats: {
        Args: {
          p_bet_id: string
        }
        Returns: Json
      }
      set_admin_status: {
        Args: {
          p_target_user_id: string
          p_is_admin: boolean
          p_is_super_admin?: boolean
        }
        Returns: Json
      }
      rpc_bootstrap_super_admin: {
        Args: Record<string, never>
        Returns: Json
      }
      generate_username: {
        Args: {
          p_first_name: string
          p_last_name: string
          p_user_id?: string
        }
        Returns: string
      }
      fn_create_bet: {
        Args: {
          p_title: string
          p_description: string | null
          p_category_id: string | null
          p_end_at: string
          p_max_participants: number | null
          p_visibility: string
          p_invite_code_enabled: boolean
          p_hide_participants: boolean
          p_secret: string | null
        }
        Returns: Json
      }
      fn_get_invite_code: {
        Args: {
          p_bet_id: string
          p_secret: string
        }
        Returns: string
      }
      fn_rotate_invite_code: {
        Args: {
          p_bet_id: string
          p_secret: string
        }
        Returns: string
      }
      fn_admin_add_funds: {
        Args: {
          p_target_user_id: string
          p_amount: number
          p_reason: string
        }
        Returns: Json
      }
      fn_search_users: {
        Args: {
          p_query: string
          p_exclude_friends?: boolean
        }
        Returns: {
          id: string
          username: string
          first_name: string
          last_name: string
          avatar_url: string | null
        }[]
      }
      fn_send_friend_request: {
        Args: {
          p_to_username: string
        }
        Returns: string
      }
      fn_respond_friend_request: {
        Args: {
          p_request_id: string
          p_accept: boolean
        }
        Returns: string
      }
      fn_create_group: {
        Args: {
          p_name: string
          p_description: string | null
        }
        Returns: string
      }
      fn_add_group_member: {
        Args: {
          p_group_id: string
          p_username: string
        }
        Returns: string
      }
      fn_create_bet_v2: {
        Args: {
          p_title: string
          p_description: string | null
          p_category_id: string | null
          p_end_at: string
          p_max_participants: number | null
          p_audience: 'PUBLIC' | 'FRIENDS' | 'GROUP' | 'PRIVATE'
          p_group_id: string | null
          p_invite_code_enabled: boolean
          p_hide_participants: boolean
          p_secret?: string | null
        }
        Returns: Json
      }
      fn_search_bets: {
        Args: {
          p_search_text?: string | null
          p_category_id?: string | null
          p_status?: string | null
          p_sort_by?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          title: string
          description: string | null
          category_id: string | null
          category_name: string | null
          category_icon: string | null
          creator_id: string
          creator_username: string
          end_at: string
          status: 'OPEN' | 'RESOLVED' | 'VOID'
          resolution: boolean | null
          visibility: 'PUBLIC' | 'PRIVATE'
          created_at: string
          total_pot: number
          participant_count: number
          for_stake: number
          against_stake: number
        }[]
      }
      fn_search_bets_v2: {
        Args: {
          p_search_text?: string | null
          p_category_id?: string | null
          p_status?: string | null
          p_sort_by?: string
          p_limit?: number
          p_offset?: number
          p_audience_scope?: string
        }
        Returns: {
          id: string
          title: string
          description: string | null
          category_id: string | null
          category_name: string | null
          category_icon: string | null
          creator_id: string
          creator_username: string
          creator_avatar_url: string | null
          end_at: string
          status: string
          resolution: boolean | null
          created_at: string
          audience: string | null
          group_id: string | null
          group_name: string | null
          total_pot: number
          participant_count: number
          for_stake: number
          against_stake: number
        }[]
      }
      fn_admin_list_bets: {
        Args: {
          p_search?: string | null
          p_hidden?: string
          p_status?: string
          p_category_id?: string | null
          p_sort?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          bet_id: string
          title: string
          description: string | null
          end_at: string
          created_at: string
          hidden: boolean
          status: string
          derived_status: "OPEN" | "LOCKED" | "RESOLVED" | "VOID"
          visibility: string
          audience: string
          creator_username: string
          category_slug: string | null
          category_name: string | null
          pot: number
          participants: number
          for_total: number
          against_total: number
        }[]
      }
      fn_admin_bet_counts: {
        Args: Record<string, never>
        Returns: {
          total: number
          visible: number
          hidden: number
          open: number
          locked: number
          resolved: number
          void: number
        }
      }
      fn_list_categories: {
        Args: {
          p_include_inactive?: boolean
        }
        Returns: {
          id: string
          slug: string
          name: string
          icon: string | null
          is_active: boolean
          is_default: boolean
        }[]
      }
    }
    Views: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
