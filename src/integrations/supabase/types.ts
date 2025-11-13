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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          button_text: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          event_id: number | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          event_id?: number | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          event_id?: number | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "past_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "upcoming_events"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          event_id: number | null
          id: number
          issued_at: string | null
          issued_by: string | null
          student_id: string | null
        }
        Insert: {
          event_id?: number | null
          id?: number
          issued_at?: string | null
          issued_by?: string | null
          student_id?: string | null
        }
        Update: {
          event_id?: number | null
          id?: number
          issued_at?: string | null
          issued_by?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "past_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "upcoming_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          created_at: string
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_checkins: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string | null
          event_id: number
          expires_at: string
          id: string
          is_checked_in: boolean | null
          issued_at: string | null
          qr_token: string
          registration_id: number
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string | null
          event_id: number
          expires_at: string
          id?: string
          is_checked_in?: boolean | null
          issued_at?: string | null
          qr_token: string
          registration_id: number
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string | null
          event_id?: number
          expires_at?: string
          id?: string
          is_checked_in?: boolean | null
          issued_at?: string | null
          qr_token?: string
          registration_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "past_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "upcoming_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checkins_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback: {
        Row: {
          comment: string | null
          created_at: string
          event_id: number
          id: string
          rating: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: number
          id?: string
          rating: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: number
          id?: string
          rating?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "past_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "upcoming_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          check_in_time: string | null
          class: string | null
          created_at: string
          department: string | null
          event_id: number
          id: number
          is_winner: boolean | null
          participant_name: string | null
          registration_time: string
          remarks: string | null
          roll_number: string | null
          status: string
          updated_at: string
          user_id: string
          winner_position: number | null
          year: string | null
        }
        Insert: {
          check_in_time?: string | null
          class?: string | null
          created_at?: string
          department?: string | null
          event_id: number
          id?: never
          is_winner?: boolean | null
          participant_name?: string | null
          registration_time?: string
          remarks?: string | null
          roll_number?: string | null
          status?: string
          updated_at?: string
          user_id: string
          winner_position?: number | null
          year?: string | null
        }
        Update: {
          check_in_time?: string | null
          class?: string | null
          created_at?: string
          department?: string | null
          event_id?: number
          id?: never
          is_winner?: boolean | null
          participant_name?: string | null
          registration_time?: string
          remarks?: string | null
          roll_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          winner_position?: number | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "past_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "upcoming_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tag_relations: {
        Row: {
          event_id: number | null
          id: number
          tag_id: number | null
        }
        Insert: {
          event_id?: number | null
          id?: never
          tag_id?: number | null
        }
        Update: {
          event_id?: number | null
          id?: never
          tag_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_tag_relations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tag_relations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "past_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tag_relations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "upcoming_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          category_id: number | null
          created_at: string
          date: string | null
          description: string
          end_time: string
          event_name: string | null
          id: number
          image_url: string | null
          is_approved: boolean | null
          location: string
          max_capacity: number
          organizer_id: string
          registration_deadline: string | null
          start_time: string
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          category?: string | null
          category_id?: number | null
          created_at?: string
          date?: string | null
          description: string
          end_time: string
          event_name?: string | null
          id?: never
          image_url?: string | null
          is_approved?: boolean | null
          location: string
          max_capacity: number
          organizer_id: string
          registration_deadline?: string | null
          start_time: string
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          category?: string | null
          category_id?: number | null
          created_at?: string
          date?: string | null
          description?: string
          end_time?: string
          event_name?: string | null
          id?: never
          image_url?: string | null
          is_approved?: boolean | null
          location?: string
          max_capacity?: number
          organizer_id?: string
          registration_deadline?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          event_id: number
          id: string
          message: string
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: number
          id?: string
          message: string
          read_at?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: number
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          branch: string
          created_at: string
          email: string
          event_id: number
          id: string
          name: string
          year: string
        }
        Insert: {
          branch: string
          created_at?: string
          email: string
          event_id: number
          id?: string
          name: string
          year: string
        }
        Update: {
          branch?: string
          created_at?: string
          email?: string
          event_id?: number
          id?: string
          name?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "past_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "upcoming_events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_approved: boolean
          name: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          is_approved?: boolean
          name: string
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_approved?: boolean
          name?: string
          role?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      past_events: {
        Row: {
          category_id: number | null
          category_name: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          id: number | null
          image_url: string | null
          is_approved: boolean | null
          location: string | null
          max_capacity: number | null
          organizer_email: string | null
          organizer_id: string | null
          organizer_name: string | null
          registration_count: number | null
          registration_deadline: string | null
          start_time: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_events: {
        Row: {
          category_id: number | null
          category_name: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          id: number | null
          image_url: string | null
          is_approved: boolean | null
          location: string | null
          max_capacity: number | null
          organizer_email: string | null
          organizer_id: string | null
          organizer_name: string | null
          registration_count: number | null
          registration_deadline: string | null
          start_time: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
