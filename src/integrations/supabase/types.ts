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
      achievement_defs: {
        Row: {
          agent_id: string | null
          condition_agent_id: string | null
          condition_type: string
          id: string
          threshold: number
        }
        Insert: {
          agent_id?: string | null
          condition_agent_id?: string | null
          condition_type: string
          id: string
          threshold: number
        }
        Update: {
          agent_id?: string | null
          condition_agent_id?: string | null
          condition_type?: string
          id?: string
          threshold?: number
        }
        Relationships: []
      }
      achievements: {
        Row: {
          achievement_id: string
          agent_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          agent_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          agent_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_bonds: {
        Row: {
          agent_id: string
          bond_level: number
          created_at: string
          easter_eggs_found: Json
          energy_bits: number
          id: string
          last_turn_date: string | null
          total_turns: number
          turns_today: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          bond_level?: number
          created_at?: string
          easter_eggs_found?: Json
          energy_bits?: number
          id?: string
          last_turn_date?: string | null
          total_turns?: number
          turns_today?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          bond_level?: number
          created_at?: string
          easter_eggs_found?: Json
          energy_bits?: number
          id?: string
          last_turn_date?: string | null
          total_turns?: number
          turns_today?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          assessment_type: string
          created_at: string
          id: string
          result_data: Json
          user_id: string
        }
        Insert: {
          assessment_type: string
          created_at?: string
          id?: string
          result_data?: Json
          user_id: string
        }
        Update: {
          assessment_type?: string
          created_at?: string
          id?: string
          result_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      compatibility_reports: {
        Row: {
          created_at: string
          id: string
          partner_info: Json
          result_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partner_info?: Json
          result_data?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partner_info?: Json
          result_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      conversation_summaries: {
        Row: {
          agent_id: string
          conversation_id: string | null
          created_at: string
          id: string
          key_topics: Json | null
          summary: string
          user_id: string
        }
        Insert: {
          agent_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          key_topics?: Json | null
          summary: string
          user_id: string
        }
        Update: {
          agent_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          key_topics?: Json | null
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          locale: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          locale?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          locale?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_records: {
        Row: {
          amount: number
          created_at: string
          id: string
          product_id: string | null
          product_type: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          product_id?: string | null
          product_type: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          product_id?: string | null
          product_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      soul_fragments: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          source_agent: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          source_agent?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          source_agent?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_vault: {
        Row: {
          agent_id: string | null
          content: string | null
          created_at: string
          icon: string | null
          id: string
          title: string
          type: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          content?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          title: string
          type: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          content?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          title?: string
          type?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tarot_card_art: {
        Row: {
          card_id: number
          created_at: string
          image_path: string
          is_reversed: boolean
        }
        Insert: {
          card_id: number
          created_at?: string
          image_path: string
          is_reversed: boolean
        }
        Update: {
          card_id?: number
          created_at?: string
          image_path?: string
          is_reversed?: boolean
        }
        Relationships: []
      }
      tarot_draws: {
        Row: {
          action_tip: string | null
          card_id: number
          card_name: string
          created_at: string
          draw_date: string
          energy_score: number | null
          id: string
          image_path: string | null
          image_status: string
          interpretation: string | null
          is_reversed: boolean
          user_id: string
        }
        Insert: {
          action_tip?: string | null
          card_id: number
          card_name: string
          created_at?: string
          draw_date?: string
          energy_score?: number | null
          id?: string
          image_path?: string | null
          image_status?: string
          interpretation?: string | null
          is_reversed?: boolean
          user_id: string
        }
        Update: {
          action_tip?: string | null
          card_id?: number
          card_name?: string
          created_at?: string
          draw_date?: string
          energy_score?: number | null
          id?: string
          image_path?: string | null
          image_status?: string
          interpretation?: string | null
          is_reversed?: boolean
          user_id?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          assessment_count: number
          chat_count: number
          deep_report_count: number
          id: string
          track_date: string
          user_id: string
        }
        Insert: {
          assessment_count?: number
          chat_count?: number
          deep_report_count?: number
          id?: string
          track_date?: string
          user_id: string
        }
        Update: {
          assessment_count?: number
          chat_count?: number
          deep_report_count?: number
          id?: string
          track_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_memories: {
        Row: {
          agent_id: string
          category: string | null
          content: string
          created_at: string
          embedding: string | null
          emotion_tag: string | null
          expires_at: string | null
          id: string
          importance: number
          last_used_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          category?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          emotion_tag?: string | null
          expires_at?: string | null
          id?: string
          importance?: number
          last_used_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          category?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          emotion_tag?: string | null
          expires_at?: string | null
          id?: string
          importance?: number
          last_used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profile_facts: {
        Row: {
          category: string
          confidence: number
          created_at: string
          id: string
          key: string
          last_confirmed_at: string
          source_agent_id: string | null
          user_id: string
          value: string
        }
        Insert: {
          category: string
          confidence?: number
          created_at?: string
          id?: string
          key: string
          last_confirmed_at?: string
          source_agent_id?: string | null
          user_id: string
          value: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          id?: string
          key?: string
          last_confirmed_at?: string
          source_agent_id?: string | null
          user_id?: string
          value?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_period: string
          created_at: string
          environment: string | null
          expires_at: string | null
          id: string
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period?: string
          created_at?: string
          environment?: string | null
          expires_at?: string | null
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          environment?: string | null
          expires_at?: string | null
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decay_memories: { Args: never; Returns: undefined }
      grant_achievement: {
        Args: { p_achievement_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_user_memories: {
        Args: {
          p_agent_id: string
          p_match_count?: number
          p_query_embedding: string
          p_user_id: string
        }
        Returns: {
          agent_id: string
          category: string
          content: string
          created_at: string
          emotion_tag: string
          id: string
          importance: number
          score: number
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
