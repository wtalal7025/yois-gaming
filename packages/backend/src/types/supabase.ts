/**
 * Supabase Database Types
 * Auto-generated types for the gaming platform database schema
 */

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
      users: {
        Row: {
          id: string
          username: string
          email: string
          password_hash: string
          avatar_url: string | null
          balance: number
          level: number
          experience_points: number
          total_wagered: number
          total_won: number
          games_played: number
          is_active: boolean
          is_verified: boolean
          role: string
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          email: string
          password_hash: string
          avatar_url?: string | null
          balance?: number
          level?: number
          experience_points?: number
          total_wagered?: number
          total_won?: number
          games_played?: number
          is_active?: boolean
          is_verified?: boolean
          role?: string
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          password_hash?: string
          avatar_url?: string | null
          balance?: number
          level?: number
          experience_points?: number
          total_wagered?: number
          total_won?: number
          games_played?: number
          is_active?: boolean
          is_verified?: boolean
          role?: string
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          refresh_token: string
          device_info: Json | null
          ip_address: string | null
          user_agent: string | null
          is_active: boolean
          expires_at: string
          last_used_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          refresh_token: string
          device_info?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          is_active?: boolean
          expires_at: string
          last_used_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          refresh_token?: string
          device_info?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          is_active?: boolean
          expires_at?: string
          last_used_at?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: string
          amount: number
          currency: string
          balance_before: number
          balance_after: number
          game_type: string | null
          game_session_id: string | null
          reference_id: string | null
          description: string | null
          metadata: Json | null
          status: string
          processed_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          amount: number
          currency?: string
          balance_before: number
          balance_after: number
          game_type?: string | null
          game_session_id?: string | null
          reference_id?: string | null
          description?: string | null
          metadata?: Json | null
          status?: string
          processed_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          amount?: number
          currency?: string
          balance_before?: number
          balance_after?: number
          game_type?: string | null
          game_session_id?: string | null
          reference_id?: string | null
          description?: string | null
          metadata?: Json | null
          status?: string
          processed_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      balances: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          last_updated: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency?: string
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          currency?: string
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          auto_play_enabled: boolean
          sound_enabled: boolean
          animation_speed: string
          theme: string
          language: string
          currency: string
          notifications: Json
          privacy_settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          auto_play_enabled?: boolean
          sound_enabled?: boolean
          animation_speed?: string
          theme?: string
          language?: string
          currency?: string
          notifications?: Json
          privacy_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          auto_play_enabled?: boolean
          sound_enabled?: boolean
          animation_speed?: string
          theme?: string
          language?: string
          currency?: string
          notifications?: Json
          privacy_settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      game_sessions: {
        Row: {
          id: string
          user_id: string
          game_type: string
          bet_amount: number
          payout: number
          multiplier: number
          profit_loss: number
          game_data: Json
          seed_client: string | null
          seed_server: string | null
          seed_nonce: number
          is_completed: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          game_type: string
          bet_amount: number
          payout?: number
          multiplier?: number
          profit_loss: number
          game_data: Json
          seed_client?: string | null
          seed_server?: string | null
          seed_nonce?: number
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_type?: string
          bet_amount?: number
          payout?: number
          multiplier?: number
          profit_loss?: number
          game_data?: Json
          seed_client?: string | null
          seed_server?: string | null
          seed_nonce?: number
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
      }
      password_reset_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
          used: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          expires_at: string
          used?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          expires_at?: string
          used?: boolean
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string | null
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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