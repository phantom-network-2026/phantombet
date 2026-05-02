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
      activity_feed: {
        Row: {
          activity_type: string
          amount: number | null
          created_at: string
          detail: string | null
          id: string
          metadata: Json
          title: string
          user_id: string
          username: string
        }
        Insert: {
          activity_type: string
          amount?: number | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          title: string
          user_id: string
          username: string
        }
        Update: {
          activity_type?: string
          amount?: number | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          title?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      ai_agent_log: {
        Row: {
          created_at: string
          id: string
          prompt: string
          reply: string | null
          tool_results: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          reply?: string | null
          tool_results?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          reply?: string | null
          tool_results?: Json | null
          user_id?: string
        }
        Relationships: []
      }
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
      coin_listing_applications: {
        Row: {
          admin_notes: string | null
          applicant_user_id: string | null
          contract_address: string | null
          created_at: string
          description: string | null
          email: string
          extra_data: Json
          id: string
          network: string | null
          project_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          social_links: string | null
          status: string
          symbol: string
          team_info: string | null
          updated_at: string
          website: string | null
          whitepaper_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          applicant_user_id?: string | null
          contract_address?: string | null
          created_at?: string
          description?: string | null
          email: string
          extra_data?: Json
          id?: string
          network?: string | null
          project_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_links?: string | null
          status?: string
          symbol: string
          team_info?: string | null
          updated_at?: string
          website?: string | null
          whitepaper_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          applicant_user_id?: string | null
          contract_address?: string | null
          created_at?: string
          description?: string | null
          email?: string
          extra_data?: Json
          id?: string
          network?: string | null
          project_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_links?: string | null
          status?: string
          symbol?: string
          team_info?: string | null
          updated_at?: string
          website?: string | null
          whitepaper_url?: string | null
        }
        Relationships: []
      }
      coin_price_history: {
        Row: {
          id: number
          price_usd: number
          recorded_at: string
          symbol: string
        }
        Insert: {
          id?: number
          price_usd: number
          recorded_at?: string
          symbol: string
        }
        Update: {
          id?: number
          price_usd?: number
          recorded_at?: string
          symbol?: string
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
      exchange_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      exchange_coins: {
        Row: {
          change_24h: number
          circulating_supply: number
          coingecko_id: string | null
          cold_wallet_address: string | null
          contract_address: string | null
          created_at: string
          daily_withdraw_limit: number
          description: string | null
          display_order: number
          fallback_icon: string | null
          hot_wallet_address: string | null
          id: string
          is_deposit_enabled: boolean
          is_featured: boolean
          is_trading_enabled: boolean
          is_withdraw_enabled: boolean
          kyc_tier_required: number
          last_price_sync_at: string | null
          logo_url: string | null
          market_cap: number
          max_supply: number | null
          name: string
          network: string
          price_usd: number
          risk_score: number
          scheduled_listing_at: string | null
          sector: string
          status: string
          symbol: string
          updated_at: string
          volume_24h: number
          website_url: string | null
          whitepaper_url: string | null
          withdrawal_fee: number
          withdrawal_min: number
        }
        Insert: {
          change_24h?: number
          circulating_supply?: number
          coingecko_id?: string | null
          cold_wallet_address?: string | null
          contract_address?: string | null
          created_at?: string
          daily_withdraw_limit?: number
          description?: string | null
          display_order?: number
          fallback_icon?: string | null
          hot_wallet_address?: string | null
          id?: string
          is_deposit_enabled?: boolean
          is_featured?: boolean
          is_trading_enabled?: boolean
          is_withdraw_enabled?: boolean
          kyc_tier_required?: number
          last_price_sync_at?: string | null
          logo_url?: string | null
          market_cap?: number
          max_supply?: number | null
          name: string
          network?: string
          price_usd?: number
          risk_score?: number
          scheduled_listing_at?: string | null
          sector?: string
          status?: string
          symbol: string
          updated_at?: string
          volume_24h?: number
          website_url?: string | null
          whitepaper_url?: string | null
          withdrawal_fee?: number
          withdrawal_min?: number
        }
        Update: {
          change_24h?: number
          circulating_supply?: number
          coingecko_id?: string | null
          cold_wallet_address?: string | null
          contract_address?: string | null
          created_at?: string
          daily_withdraw_limit?: number
          description?: string | null
          display_order?: number
          fallback_icon?: string | null
          hot_wallet_address?: string | null
          id?: string
          is_deposit_enabled?: boolean
          is_featured?: boolean
          is_trading_enabled?: boolean
          is_withdraw_enabled?: boolean
          kyc_tier_required?: number
          last_price_sync_at?: string | null
          logo_url?: string | null
          market_cap?: number
          max_supply?: number | null
          name?: string
          network?: string
          price_usd?: number
          risk_score?: number
          scheduled_listing_at?: string | null
          sector?: string
          status?: string
          symbol?: string
          updated_at?: string
          volume_24h?: number
          website_url?: string | null
          whitepaper_url?: string | null
          withdrawal_fee?: number
          withdrawal_min?: number
        }
        Relationships: []
      }
      exchange_watchlist: {
        Row: {
          created_at: string
          id: string
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          symbol: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      football_bets: {
        Row: {
          id: string
          match_id: string
          odds_taken: number
          payout: number
          placed_at: string
          potential_payout: number
          selection: Database["public"]["Enums"]["football_bet_market"]
          settled_at: string | null
          stake: number
          status: Database["public"]["Enums"]["sports_bet_status"]
          user_id: string
        }
        Insert: {
          id?: string
          match_id: string
          odds_taken: number
          payout?: number
          placed_at?: string
          potential_payout: number
          selection: Database["public"]["Enums"]["football_bet_market"]
          settled_at?: string | null
          stake: number
          status?: Database["public"]["Enums"]["sports_bet_status"]
          user_id: string
        }
        Update: {
          id?: string
          match_id?: string
          odds_taken?: number
          payout?: number
          placed_at?: string
          potential_payout?: number
          selection?: Database["public"]["Enums"]["football_bet_market"]
          settled_at?: string | null
          stake?: number
          status?: Database["public"]["Enums"]["sports_bet_status"]
          user_id?: string
        }
        Relationships: []
      }
      football_matches: {
        Row: {
          away_odds: number
          away_score: number
          away_team: string
          competition: string
          created_at: string
          draw_odds: number
          home_odds: number
          home_score: number
          home_team: string
          id: string
          kickoff_time: string
          minute: number
          result: Database["public"]["Enums"]["football_bet_market"] | null
          status: Database["public"]["Enums"]["football_match_status"]
          updated_at: string
        }
        Insert: {
          away_odds?: number
          away_score?: number
          away_team: string
          competition: string
          created_at?: string
          draw_odds?: number
          home_odds?: number
          home_score?: number
          home_team: string
          id?: string
          kickoff_time: string
          minute?: number
          result?: Database["public"]["Enums"]["football_bet_market"] | null
          status?: Database["public"]["Enums"]["football_match_status"]
          updated_at?: string
        }
        Update: {
          away_odds?: number
          away_score?: number
          away_team?: string
          competition?: string
          created_at?: string
          draw_odds?: number
          home_odds?: number
          home_score?: number
          home_team?: string
          id?: string
          kickoff_time?: string
          minute?: number
          result?: Database["public"]["Enums"]["football_bet_market"] | null
          status?: Database["public"]["Enums"]["football_match_status"]
          updated_at?: string
        }
        Relationships: []
      }
      forum_attachments: {
        Row: {
          created_at: string
          id: string
          kind: string
          thread_id: string
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          thread_id: string
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          thread_id?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_attachments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_bookmarks: {
        Row: {
          created_at: string
          id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_bookmarks_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_likes: {
        Row: {
          created_at: string
          id: string
          reply_id: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_likes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reactions: {
        Row: {
          created_at: string
          id: string
          reaction: string
          reply_id: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction: string
          reply_id?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          like_count: number
          thread_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          like_count?: number
          thread_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          like_count?: number
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_locked: boolean
          is_pinned: boolean
          last_activity_at: string
          like_count: number
          prefix: Database["public"]["Enums"]["forum_prefix"]
          reply_count: number
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          last_activity_at?: string
          like_count?: number
          prefix?: Database["public"]["Enums"]["forum_prefix"]
          reply_count?: number
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          last_activity_at?: string
          like_count?: number
          prefix?: Database["public"]["Enums"]["forum_prefix"]
          reply_count?: number
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      free_bet_progress: {
        Row: {
          award_amount: number
          awarded_at: string | null
          created_at: string
          deposit_progress: number
          deposit_required: number
          expires_at: string
          id: string
          status: Database["public"]["Enums"]["free_bet_status"]
          updated_at: string
          user_id: string
          wager_progress: number
          wager_required: number
        }
        Insert: {
          award_amount?: number
          awarded_at?: string | null
          created_at?: string
          deposit_progress?: number
          deposit_required?: number
          expires_at?: string
          id?: string
          status?: Database["public"]["Enums"]["free_bet_status"]
          updated_at?: string
          user_id: string
          wager_progress?: number
          wager_required?: number
        }
        Update: {
          award_amount?: number
          awarded_at?: string | null
          created_at?: string
          deposit_progress?: number
          deposit_required?: number
          expires_at?: string
          id?: string
          status?: Database["public"]["Enums"]["free_bet_status"]
          updated_at?: string
          user_id?: string
          wager_progress?: number
          wager_required?: number
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
      party_lobbies: {
        Row: {
          created_at: string
          host_id: string
          id: string
          is_active: boolean
          is_public: boolean
          max_members: number
          name: string
          password_hash: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          host_id: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          max_members?: number
          name: string
          password_hash?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          host_id?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          max_members?: number
          name?: string
          password_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      party_lobby_members: {
        Row: {
          id: string
          is_muted: boolean
          joined_at: string
          lobby_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_muted?: boolean
          joined_at?: string
          lobby_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_muted?: boolean
          joined_at?: string
          lobby_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_lobby_members_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "party_lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      party_reports: {
        Row: {
          created_at: string
          id: string
          lobby_id: string | null
          reason: string | null
          reported_user_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lobby_id?: string | null
          reason?: string | null
          reported_user_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lobby_id?: string | null
          reason?: string | null
          reported_user_id?: string
          reporter_id?: string
        }
        Relationships: []
      }
      password_reset_nonces: {
        Row: {
          created_at: string
          expires_at: string
          nonce: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          nonce: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          nonce?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          direction: string
          id: string
          is_active: boolean
          symbol: string
          target_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          direction?: string
          id?: string
          is_active?: boolean
          symbol: string
          target_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          is_active?: boolean
          symbol?: string
          target_price?: number
          user_id?: string
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
          pinned_achievement: string | null
          purchased_borders: string[]
          real_balance: number
          social_links: Json | null
          status_message: string | null
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
          pinned_achievement?: string | null
          purchased_borders?: string[]
          real_balance?: number
          social_links?: Json | null
          status_message?: string | null
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
          pinned_achievement?: string | null
          purchased_borders?: string[]
          real_balance?: number
          social_links?: Json | null
          status_message?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          withdrawal_address?: string | null
          xp?: number
        }
        Relationships: []
      }
      race_runners: {
        Row: {
          created_at: string
          finishing_position: number | null
          id: string
          is_scratched: boolean
          jockey_trainer: string | null
          name: string
          number: number
          place_odds: number
          race_id: string
          updated_at: string
          win_odds: number
        }
        Insert: {
          created_at?: string
          finishing_position?: number | null
          id?: string
          is_scratched?: boolean
          jockey_trainer?: string | null
          name: string
          number: number
          place_odds?: number
          race_id: string
          updated_at?: string
          win_odds?: number
        }
        Update: {
          created_at?: string
          finishing_position?: number | null
          id?: string
          is_scratched?: boolean
          jockey_trainer?: string | null
          name?: string
          number?: number
          place_odds?: number
          race_id?: string
          updated_at?: string
          win_odds?: number
        }
        Relationships: [
          {
            foreignKeyName: "race_runners_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      races: {
        Row: {
          created_at: string
          distance: string
          going: string | null
          id: string
          off_time: string
          race_name: string
          race_number: number
          race_type: Database["public"]["Enums"]["race_type"]
          status: Database["public"]["Enums"]["race_status"]
          updated_at: string
          venue: string
          winners: number[] | null
        }
        Insert: {
          created_at?: string
          distance: string
          going?: string | null
          id?: string
          off_time: string
          race_name: string
          race_number: number
          race_type: Database["public"]["Enums"]["race_type"]
          status?: Database["public"]["Enums"]["race_status"]
          updated_at?: string
          venue: string
          winners?: number[] | null
        }
        Update: {
          created_at?: string
          distance?: string
          going?: string | null
          id?: string
          off_time?: string
          race_name?: string
          race_number?: number
          race_type?: Database["public"]["Enums"]["race_type"]
          status?: Database["public"]["Enums"]["race_status"]
          updated_at?: string
          venue?: string
          winners?: number[] | null
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
      sports_bets: {
        Row: {
          bet_type: Database["public"]["Enums"]["sports_bet_type"]
          id: string
          odds_taken: number
          payout: number
          placed_at: string
          potential_payout: number
          race_id: string
          selections: number[]
          settled_at: string | null
          stake: number
          status: Database["public"]["Enums"]["sports_bet_status"]
          user_id: string
        }
        Insert: {
          bet_type: Database["public"]["Enums"]["sports_bet_type"]
          id?: string
          odds_taken: number
          payout?: number
          placed_at?: string
          potential_payout: number
          race_id: string
          selections: number[]
          settled_at?: string | null
          stake: number
          status?: Database["public"]["Enums"]["sports_bet_status"]
          user_id: string
        }
        Update: {
          bet_type?: Database["public"]["Enums"]["sports_bet_type"]
          id?: string
          odds_taken?: number
          payout?: number
          placed_at?: string
          potential_payout?: number
          race_id?: string
          selections?: number[]
          settled_at?: string | null
          stake?: number
          status?: Database["public"]["Enums"]["sports_bet_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_bets_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
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
      user_bonuses: {
        Row: {
          awarded_at: string
          bonus_type: Database["public"]["Enums"]["user_bonus_type"]
          created_at: string
          expires_at: string
          id: string
          remaining_count: number
          source: string
          source_label: string | null
          stake_value: number
          status: Database["public"]["Enums"]["user_bonus_status"]
          total_count: number
          updated_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          bonus_type?: Database["public"]["Enums"]["user_bonus_type"]
          created_at?: string
          expires_at?: string
          id?: string
          remaining_count?: number
          source?: string
          source_label?: string | null
          stake_value?: number
          status?: Database["public"]["Enums"]["user_bonus_status"]
          total_count?: number
          updated_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          bonus_type?: Database["public"]["Enums"]["user_bonus_type"]
          created_at?: string
          expires_at?: string
          id?: string
          remaining_count?: number
          source?: string
          source_label?: string | null
          stake_value?: number
          status?: Database["public"]["Enums"]["user_bonus_status"]
          total_count?: number
          updated_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_coin_balances: {
        Row: {
          available: number
          created_at: string
          id: string
          locked: number
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available?: number
          created_at?: string
          id?: string
          locked?: number
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available?: number
          created_at?: string
          id?: string
          locked?: number
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gifts: {
        Row: {
          amount: number
          created_at: string
          gift_type: string
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          gift_type: string
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gift_type?: string
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
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
      bump_free_bet_progress: {
        Args: {
          p_deposit_amount?: number
          p_user_id: string
          p_wager_amount?: number
        }
        Returns: Database["public"]["Enums"]["free_bet_status"]
      }
      claim_random_scratch_card: {
        Args: { p_bet_tier: number; p_user_id: string }
        Returns: {
          card_id: string
          is_winner: boolean
          payout_multiplier: number
          symbols: string[]
        }[]
      }
      consume_free_spin: {
        Args: { p_user_id: string }
        Returns: {
          remaining_total: number
          stake_value: number
          success: boolean
        }[]
      }
      deposit_address_for_user: {
        Args: { p_user_id: string }
        Returns: {
          is_active: boolean
          tron_address: string
        }[]
      }
      expire_old_bonuses: { Args: { p_user_id: string }; Returns: undefined }
      forum_increment_view: {
        Args: { p_thread_id: string }
        Returns: undefined
      }
      get_public_setting: { Args: { p_key: string }; Returns: Json }
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
      sim_like: {
        Args: { p_reply_id?: string; p_thread_id?: string; p_user_id: string }
        Returns: undefined
      }
      sim_post_forum_reply: {
        Args: { p_author_id: string; p_body: string; p_thread_id: string }
        Returns: string
      }
      sim_post_forum_thread: {
        Args: {
          p_author_id: string
          p_body: string
          p_prefix?: string
          p_title: string
        }
        Returns: string
      }
      sim_post_game_chat: {
        Args: {
          p_content: string
          p_game_room: string
          p_user_id: string
          p_username: string
        }
        Returns: string
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
      football_bet_market: "home" | "draw" | "away"
      football_match_status: "upcoming" | "live" | "finished" | "cancelled"
      forum_prefix:
        | "tutorial"
        | "question"
        | "release"
        | "issue"
        | "discussion"
        | "announcement"
        | "guide"
        | "trade"
        | "offtopic"
        | "strategy"
        | "news"
      free_bet_status: "pending" | "qualified" | "awarded" | "expired"
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
      race_status: "upcoming" | "live" | "settled" | "cancelled"
      race_type: "horse" | "greyhound"
      sports_bet_status: "pending" | "won" | "lost" | "void" | "partial"
      sports_bet_type: "win" | "place" | "each_way" | "forecast" | "tricast"
      user_bonus_status: "active" | "used" | "expired"
      user_bonus_type: "free_spin"
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
      football_bet_market: ["home", "draw", "away"],
      football_match_status: ["upcoming", "live", "finished", "cancelled"],
      forum_prefix: [
        "tutorial",
        "question",
        "release",
        "issue",
        "discussion",
        "announcement",
        "guide",
        "trade",
        "offtopic",
        "strategy",
        "news",
      ],
      free_bet_status: ["pending", "qualified", "awarded", "expired"],
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
      race_status: ["upcoming", "live", "settled", "cancelled"],
      race_type: ["horse", "greyhound"],
      sports_bet_status: ["pending", "won", "lost", "void", "partial"],
      sports_bet_type: ["win", "place", "each_way", "forecast", "tricast"],
      user_bonus_status: ["active", "used", "expired"],
      user_bonus_type: ["free_spin"],
    },
  },
} as const
