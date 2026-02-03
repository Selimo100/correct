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
}
