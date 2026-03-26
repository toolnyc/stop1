export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4';
  };
  public: {
    Tables: {
      collaborators: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          event_id: string;
          id: string;
          invite_token: string;
          name: string;
          payout_pct: number;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          event_id: string;
          id?: string;
          invite_token?: string;
          name: string;
          payout_pct?: number;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          event_id?: string;
          id?: string;
          invite_token?: string;
          name?: string;
          payout_pct?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'collaborators_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      door_payments: {
        Row: {
          amount: number;
          created_at: string;
          event_id: string;
          id: string;
          method: Database['public']['Enums']['payment_method'];
          name: string | null;
          rsvp_id: string | null;
          stripe_payment_intent_id: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          event_id: string;
          id?: string;
          method: Database['public']['Enums']['payment_method'];
          name?: string | null;
          rsvp_id?: string | null;
          stripe_payment_intent_id?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          event_id?: string;
          id?: string;
          method?: Database['public']['Enums']['payment_method'];
          name?: string | null;
          rsvp_id?: string | null;
          stripe_payment_intent_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'door_payments_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'door_payments_rsvp_id_fkey';
            columns: ['rsvp_id'];
            isOneToOne: false;
            referencedRelation: 'rsvps';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          capacity: number | null;
          created_at: string;
          date: string;
          description: string | null;
          door_pin: string | null;
          door_price: number;
          flyer_url: string | null;
          id: string;
          reminder_email_sent_at: string | null;
          reminder_sms_sent_at: string | null;
          slug: string;
          status: Database['public']['Enums']['event_status'];
          time_end: string | null;
          title: string;
          updated_at: string;
          venue_address: string | null;
          venue_name: string | null;
        };
        Insert: {
          capacity?: number | null;
          created_at?: string;
          date: string;
          description?: string | null;
          door_pin?: string | null;
          door_price?: number;
          flyer_url?: string | null;
          id?: string;
          reminder_email_sent_at?: string | null;
          reminder_sms_sent_at?: string | null;
          slug: string;
          status?: Database['public']['Enums']['event_status'];
          time_end?: string | null;
          title: string;
          updated_at?: string;
          venue_address?: string | null;
          venue_name?: string | null;
        };
        Update: {
          capacity?: number | null;
          created_at?: string;
          date?: string;
          description?: string | null;
          door_pin?: string | null;
          door_price?: number;
          flyer_url?: string | null;
          id?: string;
          reminder_email_sent_at?: string | null;
          reminder_sms_sent_at?: string | null;
          slug?: string;
          status?: Database['public']['Enums']['event_status'];
          time_end?: string | null;
          title?: string;
          updated_at?: string;
          venue_address?: string | null;
          venue_name?: string | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          collaborator_id: string;
          created_at: string;
          description: string;
          event_id: string;
          id: string;
          receipt_url: string | null;
        };
        Insert: {
          amount: number;
          collaborator_id: string;
          created_at?: string;
          description: string;
          event_id: string;
          id?: string;
          receipt_url?: string | null;
        };
        Update: {
          amount?: number;
          collaborator_id?: string;
          created_at?: string;
          description?: string;
          event_id?: string;
          id?: string;
          receipt_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_collaborator_id_fkey';
            columns: ['collaborator_id'];
            isOneToOne: false;
            referencedRelation: 'collaborators';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      payouts: {
        Row: {
          amount: number;
          collaborator_id: string;
          created_at: string;
          event_id: string;
          id: string;
          method: Database['public']['Enums']['payout_method'];
          notes: string | null;
          paid_at: string;
        };
        Insert: {
          amount: number;
          collaborator_id: string;
          created_at?: string;
          event_id: string;
          id?: string;
          method: Database['public']['Enums']['payout_method'];
          notes?: string | null;
          paid_at?: string;
        };
        Update: {
          amount?: number;
          collaborator_id?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          method?: Database['public']['Enums']['payout_method'];
          notes?: string | null;
          paid_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payouts_collaborator_id_fkey';
            columns: ['collaborator_id'];
            isOneToOne: false;
            referencedRelation: 'collaborators';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payouts_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      rsvps: {
        Row: {
          arrived_at: string | null;
          created_at: string;
          email: string | null;
          event_id: string;
          id: string;
          name: string;
          phone: string;
          sms_opt_in: boolean;
          walk_in: boolean;
        };
        Insert: {
          arrived_at?: string | null;
          created_at?: string;
          email?: string | null;
          event_id: string;
          id?: string;
          name: string;
          phone: string;
          sms_opt_in?: boolean;
          walk_in?: boolean;
        };
        Update: {
          arrived_at?: string | null;
          created_at?: string;
          email?: string | null;
          event_id?: string;
          id?: string;
          name?: string;
          phone?: string;
          sms_opt_in?: boolean;
          walk_in?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'rsvps_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
    };
    Enums: {
      event_status: 'draft' | 'published' | 'archived';
      payment_method: 'cash' | 'card';
      payout_method: 'cash' | 'venmo' | 'zelle' | 'bank_transfer' | 'other';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      event_status: ['draft', 'published', 'archived'],
      payment_method: ['cash', 'card'],
      payout_method: ['cash', 'venmo', 'zelle', 'bank_transfer', 'other'],
    },
  },
} as const;
