export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      broadcast_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          sent_by: string
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          sent_by: string
          title: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sent_by?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      broadcast_reads: {
        Row: {
          broadcast_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          broadcast_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          broadcast_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_reads_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcast_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_bans: {
        Row: {
          banned_by: string
          created_at: string
          expires_at: string | null
          game_room: string | null
          id: string
          is_active: boolean
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          expires_at?: string | null
          game_room?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          game_room?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_spins: {
        Row: {
          id: string
          is_loyalty_spin: boolean
          prize_detail: string | null
          prize_type: string
          prize_value: number
          spun_at: string
          streak_count: number
          user_id: string
        }
        Insert: {
          id?: string
          is_loyalty_spin?: boolean
          prize_detail?: string | null
          prize_type: string
          prize_value?: number
          spun_at?: string
          streak_count?: number
          user_id: string
        }
        Update: {
          id?: string
          is_loyalty_spin?: boolean
          prize_detail?: string | null
          prize_type?: string
          prize_value?: number
          spun_at?: string
          streak_count?: number
          user_id?: string
        }
        Relationships: []
      }
      deposit_addresses: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          private_key_encrypted: string
          tron_address: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          private_key_encrypted: string
          tron_address: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          private_key_encrypted?: string
          tron_address?: string
          user_id?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount_usd: number
          created_at: string
          crypto_currency: string
          id: string
          nowpayments_data: Json | null
          payment_address: string | null
          payment_amount: number | null
          payment_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          crypto_currency?: string
          id?: string
          nowpayments_data?: Json | null
          payment_address?: string | null
          payment_amount?: number | null
          payment_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          crypto_currency?: string
          id?: string
          nowpayments_data?: Json | null
          payment_address?: string | null
          payment_amount?: number | null
          payment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: []
      }
      game_chat: {
        Row: {
          content: string
          created_at: string
          game_room: string
          id: string
          user_id: string
          username: string | null
        }
        Insert: {
          content: string
          created_at?: string
          game_room: string
          id?: string
          user_id: string
          username?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          game_room?: string
          id?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          category: Database["public"]["Enums"]["game_category"]
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          slug: string | null
          source: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["game_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          slug?: string | null
          source?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["game_category"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          slug?: string | null
          source?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      moderation_log: {
        Row: {
          action_type: Database["public"]["Enums"]["moderation_action"]
          created_at: string
          game_room: string | null
          id: string
          metadata: Json | null
          moderator_id: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["moderation_action"]
          created_at?: string
          game_room?: string | null
          id?: string
          metadata?: Json | null
          moderator_id: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["moderation_action"]
          created_at?: string
          game_room?: string | null
          id?: string
          metadata?: Json | null
          moderator_id?: string
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          biggest_win: number | null
          biggest_win_game: string | null
          bio: string | null
          border_style: string | null
          created_at: string
          crypto_address: string | null
          has_animated_avatar: boolean | null
          has_animated_border: boolean | null
          has_high_roller: boolean | null
          id: string
          name_color: string | null
          purchased_borders: string[]
          real_balance: number
          social_links: Json | null
          updated_at: string
          user_id: string
          username: string | null
          withdrawal_address: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          biggest_win?: number | null
          biggest_win_game?: string | null
          bio?: string | null
          border_style?: string | null
          created_at?: string
          crypto_address?: string | null
          has_animated_avatar?: boolean | null
          has_animated_border?: boolean | null
          has_high_roller?: boolean | null
          id?: string
          name_color?: string | null
          purchased_borders?: string[]
          real_balance?: number
          social_links?: Json | null
          updated_at?: string
          user_id: string
          username?: string | null
          withdrawal_address?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          biggest_win?: number | null
          biggest_win_game?: string | null
          bio?: string | null
          border_style?: string | null
          created_at?: string
          crypto_address?: string | null
          has_animated_avatar?: boolean | null
          has_animated_border?: boolean | null
          has_high_roller?: boolean | null
          id?: string
          name_color?: string | null
          purchased_borders?: string[]
          real_balance?: number
          social_links?: Json | null
          updated_at?: string
          user_id?: string
          username?: string | null
          withdrawal_address?: string | null
          xp?: number
        }
        Relationships: []
      }
      scratch_card_pool: {
        Row: {
          bet_tier: number
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: string
          is_winner: boolean
          payout_multiplier: number
          symbols: string[]
        }
        Insert: {
          bet_tier: number
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          is_winner?: boolean
          payout_multiplier?: number
          symbols?: string[]
        }
        Update: {
          bet_tier?: number
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          is_winner?: boolean
          payout_multiplier?: number
          symbols?: string[]
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      staff_tasks: {
        Row: {
          assigned_by: string
          assigned_to: string | null
          category: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          appearance_status: string
          id: string
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          appearance_status?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          appearance_status?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          destination_address: string
          error_message: string | null
          id: string
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          destination_address: string
          error_message?: string | null
          id?: string
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          destination_address?: string
          error_message?: string | null
          id?: string
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          biggest_win: number | null
          biggest_win_game: string | null
          bio: string | null
          border_style: string | null
          created_at: string | null
          has_animated_avatar: boolean | null
          has_animated_border: boolean | null
          has_high_roller: boolean | null
          name_color: string | null
          purchased_borders: string[] | null
          social_links: Json | null
          user_id: string | null
          username: string | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          biggest_win?: number | null
          biggest_win_game?: string | null
          bio?: string | null
          border_style?: string | null
          created_at?: string | null
          has_animated_avatar?: boolean | null
          has_animated_border?: boolean | null
          has_high_roller?: boolean | null
          name_color?: string | null
          purchased_borders?: string[] | null
          social_links?: Json | null
          user_id?: string | null
          username?: string | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          biggest_win?: number | null
          biggest_win_game?: string | null
          bio?: string | null
          border_style?: string | null
          created_at?: string | null
          has_animated_avatar?: boolean | null
          has_animated_border?: boolean | null
          has_high_roller?: boolean | null
          name_color?: string | null
          purchased_borders?: string[] | null
          social_links?: Json | null
          user_id?: string | null
          username?: string | null
          xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_random_scratch_card: {
        Args: { p_bet_tier: number; p_user_id: string }
        Returns: {
          card_id: string
          is_winner: boolean
          payout_multiplier: number
          symbols: string[]
        }[]
      }
      deposit_address_for_user: {
        Args: { p_user_id: string }
        Returns: {
          is_active: boolean
          tron_address: string
        }[]
      }
      grant_xp: {
        Args: { p_amount: number; p_user_id: string }
        Returns: {
          new_level: number
          new_xp: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      perform_daily_spin: {
        Args: { p_user_id: string }
        Returns: {
          is_loyalty: boolean
          prize_detail: string
          prize_type: string
          prize_value: number
          spin_id: string
          streak: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "moderator"
        | "staff"
        | "active_user"
        | "owner"
      friendship_status: "pending" | "accepted" | "rejected"
      game_category:
        | "slots"
        | "table"
        | "live"
        | "scratch"
        | "jackpot"
        | "instant"
      moderation_action:
        | "ban"
        | "unban"
        | "mute"
        | "unmute"
        | "warn"
        | "kick"
        | "delete_message"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "moderator", "staff", "active_user", "owner"],
      friendship_status: ["pending", "accepted", "rejected"],
      game_category: [
        "slots",
        "table",
        "live",
        "scratch",
        "jackpot",
        "instant",
      ],
      moderation_action: [
        "ban",
        "unban",
        "mute",
        "unmute",
        "warn",
        "kick",
        "delete_message",
      ],
    },
  },
} as const
