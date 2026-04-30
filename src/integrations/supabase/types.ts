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
      advertisements: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          link_url: string | null
          mess_id: string
          title: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          mess_id: string
          title: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          mess_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      bazar_schedule: {
        Row: {
          boarder_id: string
          created_at: string
          done: boolean
          id: string
          mess_id: string
          notes: string | null
          schedule_date: string
        }
        Insert: {
          boarder_id: string
          created_at?: string
          done?: boolean
          id?: string
          mess_id: string
          notes?: string | null
          schedule_date: string
        }
        Update: {
          boarder_id?: string
          created_at?: string
          done?: boolean
          id?: string
          mess_id?: string
          notes?: string | null
          schedule_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bazar_schedule_boarder_id_fkey"
            columns: ["boarder_id"]
            isOneToOne: false
            referencedRelation: "boarders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bazar_schedule_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      boarders: {
        Row: {
          balance: number
          created_at: string
          full_name: string
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          join_date: string
          mess_id: string
          monthly_deposit: number
          notes: string | null
          phone: string
          photo_url: string | null
          room_id: string | null
          seat_number: string | null
          status: Database["public"]["Enums"]["boarder_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          full_name: string
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          join_date?: string
          mess_id: string
          monthly_deposit?: number
          notes?: string | null
          phone: string
          photo_url?: string | null
          room_id?: string | null
          seat_number?: string | null
          status?: Database["public"]["Enums"]["boarder_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          full_name?: string
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          join_date?: string
          mess_id?: string
          monthly_deposit?: number
          notes?: string | null
          phone?: string
          photo_url?: string | null
          room_id?: string | null
          seat_number?: string | null
          status?: Database["public"]["Enums"]["boarder_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boarders_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_menus: {
        Row: {
          breakfast: string
          created_at: string
          created_by: string | null
          dinner: string
          id: string
          lunch: string
          menu_date: string
          mess_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          breakfast?: string
          created_at?: string
          created_by?: string | null
          dinner?: string
          id?: string
          lunch?: string
          menu_date: string
          mess_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          breakfast?: string
          created_at?: string
          created_by?: string | null
          dinner?: string
          id?: string
          lunch?: string
          menu_date?: string
          mess_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          boarder_id: string
          created_at: string
          created_by: string | null
          deposit_date: string
          id: string
          mess_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          boarder_id: string
          created_at?: string
          created_by?: string | null
          deposit_date?: string
          id?: string
          mess_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          boarder_id?: string
          created_at?: string
          created_by?: string | null
          deposit_date?: string
          id?: string
          mess_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposits_boarder_id_fkey"
            columns: ["boarder_id"]
            isOneToOne: false
            referencedRelation: "boarders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          location: string | null
          mess_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          location?: string | null
          mess_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          location?: string | null
          mess_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_default: boolean
          mess_id: string | null
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          mess_id?: string | null
          name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          mess_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          bill_image_url: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          mess_id: string
        }
        Insert: {
          amount: number
          bill_image_url?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          mess_id: string
        }
        Update: {
          amount?: number
          bill_image_url?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          mess_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_bills: {
        Row: {
          amount: number
          bill_date: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          mess_id: string
          notes: string | null
          split_method: Database["public"]["Enums"]["bill_split_method"]
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          bill_date?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mess_id: string
          notes?: string | null
          split_method?: Database["public"]["Enums"]["bill_split_method"]
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bill_date?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mess_id?: string
          notes?: string | null
          split_method?: Database["public"]["Enums"]["bill_split_method"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          mess_id: string
          message: string
          rating: number | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mess_id: string
          message: string
          rating?: number | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mess_id?: string
          message?: string
          rating?: number | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          mess_id: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          mess_id: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          mess_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          mess_id: string
          message: string | null
          requested_name: string
          requested_phone: string
          status: Database["public"]["Enums"]["join_request_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          mess_id: string
          message?: string | null
          requested_name: string
          requested_phone: string
          status?: Database["public"]["Enums"]["join_request_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          mess_id?: string
          message?: string | null
          requested_name?: string
          requested_phone?: string
          status?: Database["public"]["Enums"]["join_request_status"]
          user_id?: string
        }
        Relationships: []
      }
      meal_entries: {
        Row: {
          boarder_id: string
          breakfast: number
          created_at: string
          created_by: string | null
          dinner: number
          guest: number
          id: string
          lunch: number
          meal_date: string
          mess_id: string
          updated_at: string
        }
        Insert: {
          boarder_id: string
          breakfast?: number
          created_at?: string
          created_by?: string | null
          dinner?: number
          guest?: number
          id?: string
          lunch?: number
          meal_date?: string
          mess_id: string
          updated_at?: string
        }
        Update: {
          boarder_id?: string
          breakfast?: number
          created_at?: string
          created_by?: string | null
          dinner?: number
          guest?: number
          id?: string
          lunch?: number
          meal_date?: string
          mess_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_entries_boarder_id_fkey"
            columns: ["boarder_id"]
            isOneToOne: false
            referencedRelation: "boarders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_entries_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      mess_settings: {
        Row: {
          bank_info: string | null
          bkash_number: string | null
          created_at: string
          default_meal_rate: number
          join_key: string
          low_balance_threshold: number
          mess_id: string
          nagad_number: string | null
          updated_at: string
        }
        Insert: {
          bank_info?: string | null
          bkash_number?: string | null
          created_at?: string
          default_meal_rate?: number
          join_key?: string
          low_balance_threshold?: number
          mess_id: string
          nagad_number?: string | null
          updated_at?: string
        }
        Update: {
          bank_info?: string | null
          bkash_number?: string | null
          created_at?: string
          default_meal_rate?: number
          join_key?: string
          low_balance_threshold?: number
          mess_id?: string
          nagad_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mess_settings_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: true
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_pinned: boolean
          mess_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          mess_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          mess_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      messes: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["mess_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["mess_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["mess_status"]
          updated_at?: string
        }
        Relationships: []
      }
      monthly_bills: {
        Row: {
          boarder_id: string
          created_at: string
          details: Json | null
          extra_share: number
          generated_by: string | null
          id: string
          meal_cost: number
          meal_rate: number
          mess_id: string
          month: number
          paid: number
          payable: number
          status: Database["public"]["Enums"]["monthly_bill_status"]
          total_deposit: number
          total_meals: number
          updated_at: string
          year: number
        }
        Insert: {
          boarder_id: string
          created_at?: string
          details?: Json | null
          extra_share?: number
          generated_by?: string | null
          id?: string
          meal_cost?: number
          meal_rate?: number
          mess_id: string
          month: number
          paid?: number
          payable?: number
          status?: Database["public"]["Enums"]["monthly_bill_status"]
          total_deposit?: number
          total_meals?: number
          updated_at?: string
          year: number
        }
        Update: {
          boarder_id?: string
          created_at?: string
          details?: Json | null
          extra_share?: number
          generated_by?: string | null
          id?: string
          meal_cost?: number
          meal_rate?: number
          mess_id?: string
          month?: number
          paid?: number
          payable?: number
          status?: Database["public"]["Enums"]["monthly_bill_status"]
          total_deposit?: number
          total_meals?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      monthly_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          meal_rate: number
          mess_id: string
          month: number
          status: string
          total_deposit: number
          total_expense: number
          total_meals: number
          updated_at: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          meal_rate?: number
          mess_id: string
          month: number
          status?: string
          total_deposit?: number
          total_expense?: number
          total_meals?: number
          updated_at?: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          meal_rate?: number
          mess_id?: string
          month?: number
          status?: string
          total_deposit?: number
          total_expense?: number
          total_meals?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      notices: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          mess_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          mess_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          mess_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          mess_id: string | null
          phone: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          mess_id?: string | null
          phone: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          mess_id?: string | null
          phone?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          id: string
          mess_id: string
          room_number: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          mess_id: string
          room_number: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          mess_id?: string
          room_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mess_id: string
          notes: string | null
          quantity: number
          stock_id: string
          txn_type: Database["public"]["Enums"]["stock_txn_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mess_id: string
          notes?: string | null
          quantity: number
          stock_id: string
          txn_type: Database["public"]["Enums"]["stock_txn_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mess_id?: string
          notes?: string | null
          quantity?: number
          stock_id?: string
          txn_type?: Database["public"]["Enums"]["stock_txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks: {
        Row: {
          created_at: string
          id: string
          low_stock_threshold: number
          mess_id: string
          name: string
          quantity: number
          unit: Database["public"]["Enums"]["stock_unit"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          low_stock_threshold?: number
          mess_id: string
          name: string
          quantity?: number
          unit?: Database["public"]["Enums"]["stock_unit"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          low_stock_threshold?: number
          mess_id?: string
          name?: string
          quantity?: number
          unit?: Database["public"]["Enums"]["stock_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stocks_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          mess_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mess_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mess_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_mess_id_fkey"
            columns: ["mess_id"]
            isOneToOne: false
            referencedRelation: "messes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_month: {
        Args: { _mess_id: string; _month: number; _year: number }
        Returns: string
      }
      find_mess_by_join_key: { Args: { _key: string }; Returns: string }
      generate_monthly_bills: {
        Args: { _mess_id: string; _month: number; _year: number }
        Returns: number
      }
      get_boarder_month_summary: {
        Args: { _mess_id: string; _month: number; _year: number }
        Returns: {
          boarder_id: string
          deposits: number
          full_name: string
          meals: number
        }[]
      }
      get_month_stats: {
        Args: { _mess_id: string; _month: number; _year: number }
        Returns: {
          meal_rate: number
          total_deposit: number
          total_expense: number
          total_meals: number
        }[]
      }
      get_user_mess_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_mess_admin_of: {
        Args: { _mess_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "mess_admin" | "boarder"
      bill_split_method: "equal" | "meal_ratio"
      boarder_status: "active" | "inactive" | "left"
      join_request_status: "pending" | "approved" | "rejected"
      mess_status: "active" | "suspended" | "trial"
      monthly_bill_status: "unpaid" | "partial" | "paid"
      payment_method: "cash" | "bkash" | "nagad" | "bank"
      stock_txn_type: "in" | "out"
      stock_unit: "kg" | "litre" | "piece" | "gram" | "packet"
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
      app_role: ["super_admin", "mess_admin", "boarder"],
      bill_split_method: ["equal", "meal_ratio"],
      boarder_status: ["active", "inactive", "left"],
      join_request_status: ["pending", "approved", "rejected"],
      mess_status: ["active", "suspended", "trial"],
      monthly_bill_status: ["unpaid", "partial", "paid"],
      payment_method: ["cash", "bkash", "nagad", "bank"],
      stock_txn_type: ["in", "out"],
      stock_unit: ["kg", "litre", "piece", "gram", "packet"],
    },
  },
} as const
