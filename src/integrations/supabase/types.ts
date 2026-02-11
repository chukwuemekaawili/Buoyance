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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      bank_connections: {
        Row: {
          account_id: string
          account_name: string | null
          connected_at: string | null
          id: string
          last_sync: string | null
          provider: string
          status: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          account_name?: string | null
          connected_at?: string | null
          id?: string
          last_sync?: string | null
          provider: string
          status?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          account_name?: string | null
          connected_at?: string | null
          id?: string
          last_sync?: string | null
          provider?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      classification_rules: {
        Row: {
          category_key: string
          category_label: string
          created_at: string
          created_by: string | null
          default_value: boolean
          examples: string[] | null
          id: string
          legal_reference: string | null
          reasoning: string | null
          rule_type: string
          updated_at: string
        }
        Insert: {
          category_key: string
          category_label: string
          created_at?: string
          created_by?: string | null
          default_value?: boolean
          examples?: string[] | null
          id?: string
          legal_reference?: string | null
          reasoning?: string | null
          rule_type: string
          updated_at?: string
        }
        Update: {
          category_key?: string
          category_label?: string
          created_at?: string
          created_by?: string | null
          default_value?: boolean
          examples?: string[] | null
          id?: string
          legal_reference?: string | null
          reasoning?: string | null
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      consent_texts: {
        Row: {
          context: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          text_content: string
          text_hash: string
          version: string
        }
        Insert: {
          context: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          text_content: string
          text_hash: string
          version: string
        }
        Update: {
          context?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          text_content?: string
          text_hash?: string
          version?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          accepted_at: string
          consent_text_hash: string
          consent_version: string
          context: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          consent_text_hash: string
          consent_version: string
          context?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          consent_text_hash?: string
          consent_version?: string
          context?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          message: string
          name: string
          status: string | null
          subject: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          message: string
          name: string
          status?: string | null
          subject?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          message?: string
          name?: string
          status?: string | null
          subject?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      crypto_transactions: {
        Row: {
          amount: number
          archived: boolean | null
          asset_symbol: string
          cost_basis_kobo: string | null
          created_at: string | null
          exchange_platform: string | null
          fee_kobo: string | null
          id: string
          notes: string | null
          price_ngn_kobo: string
          status: string
          supersedes_id: string | null
          total_ngn_kobo: string
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          archived?: boolean | null
          asset_symbol: string
          cost_basis_kobo?: string | null
          created_at?: string | null
          exchange_platform?: string | null
          fee_kobo?: string | null
          id?: string
          notes?: string | null
          price_ngn_kobo: string
          status?: string
          supersedes_id?: string | null
          total_ngn_kobo: string
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          archived?: boolean | null
          asset_symbol?: string
          cost_basis_kobo?: string | null
          created_at?: string | null
          exchange_platform?: string | null
          fee_kobo?: string | null
          id?: string
          notes?: string | null
          price_ngn_kobo?: string
          status?: string
          supersedes_id?: string | null
          total_ngn_kobo?: string
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_transactions_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "crypto_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_kobo: string
          archived: boolean | null
          category: string
          created_at: string | null
          date: string
          deductible: boolean | null
          description: string
          id: string
          input_vat_kobo: string | null
          invoice_ref: string | null
          status: string
          supersedes_id: string | null
          user_id: string
          vatable: boolean
        }
        Insert: {
          amount_kobo: string
          archived?: boolean | null
          category: string
          created_at?: string | null
          date: string
          deductible?: boolean | null
          description: string
          id?: string
          input_vat_kobo?: string | null
          invoice_ref?: string | null
          status?: string
          supersedes_id?: string | null
          user_id: string
          vatable?: boolean
        }
        Update: {
          amount_kobo?: string
          archived?: boolean | null
          category?: string
          created_at?: string | null
          date?: string
          deductible?: boolean | null
          description?: string
          id?: string
          input_vat_kobo?: string | null
          invoice_ref?: string | null
          status?: string
          supersedes_id?: string | null
          user_id?: string
          vatable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "expenses_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      explanations: {
        Row: {
          answer: string
          context: Json | null
          created_at: string | null
          id: string
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          context?: Json | null
          created_at?: string | null
          id?: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string
          context?: Json | null
          created_at?: string | null
          id?: string
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      filing_events: {
        Row: {
          created_at: string
          event_type: string
          filing_id: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          filing_id: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          filing_id?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "filing_events_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      filings: {
        Row: {
          archived: boolean
          created_at: string
          document_url: string | null
          id: string
          input_json: Json
          nrs_reference: string | null
          nrs_status: string | null
          nrs_submitted_at: string | null
          output_json: Json
          period_end: string
          period_start: string
          rule_version: string
          status: string
          submitted_at: string | null
          supersedes_id: string | null
          tax_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          document_url?: string | null
          id?: string
          input_json?: Json
          nrs_reference?: string | null
          nrs_status?: string | null
          nrs_submitted_at?: string | null
          output_json?: Json
          period_end: string
          period_start: string
          rule_version?: string
          status?: string
          submitted_at?: string | null
          supersedes_id?: string | null
          tax_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          document_url?: string | null
          id?: string
          input_json?: Json
          nrs_reference?: string | null
          nrs_status?: string | null
          nrs_submitted_at?: string | null
          output_json?: Json
          period_end?: string
          period_start?: string
          rule_version?: string
          status?: string
          submitted_at?: string | null
          supersedes_id?: string | null
          tax_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "filings_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      foreign_income: {
        Row: {
          amount_foreign_currency: number
          amount_ngn_kobo: string
          archived: boolean | null
          created_at: string | null
          currency_code: string
          id: string
          income_type: string
          source_country: string
          tax_paid_foreign_kobo: string | null
          treaty_applicable: boolean | null
          user_id: string
        }
        Insert: {
          amount_foreign_currency: number
          amount_ngn_kobo: string
          archived?: boolean | null
          created_at?: string | null
          currency_code: string
          id?: string
          income_type: string
          source_country: string
          tax_paid_foreign_kobo?: string | null
          treaty_applicable?: boolean | null
          user_id: string
        }
        Update: {
          amount_foreign_currency?: number
          amount_ngn_kobo?: string
          archived?: boolean | null
          created_at?: string | null
          currency_code?: string
          id?: string
          income_type?: string
          source_country?: string
          tax_paid_foreign_kobo?: string | null
          treaty_applicable?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount_kobo: string
          archived: boolean | null
          category: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          output_vat_kobo: string | null
          source: string
          status: string
          supersedes_id: string | null
          tax_exempt: boolean
          user_id: string
          vatable: boolean
          wht_credit_kobo: number | null
          wht_deducted: boolean
        }
        Insert: {
          amount_kobo: string
          archived?: boolean | null
          category?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          output_vat_kobo?: string | null
          source: string
          status?: string
          supersedes_id?: string | null
          tax_exempt?: boolean
          user_id: string
          vatable?: boolean
          wht_credit_kobo?: number | null
          wht_deducted?: boolean
        }
        Update: {
          amount_kobo?: string
          archived?: boolean | null
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          output_vat_kobo?: string | null
          source?: string
          status?: string
          supersedes_id?: string | null
          tax_exempt?: boolean
          user_id?: string
          vatable?: boolean
          wht_credit_kobo?: number | null
          wht_deducted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "incomes_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "incomes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          email_sent: boolean | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parsed_emails: {
        Row: {
          created_at: string | null
          email_subject: string | null
          id: string
          parsed_data: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_subject?: string | null
          id?: string
          parsed_data?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_subject?: string | null
          id?: string
          parsed_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_kobo: string
          archived: boolean
          created_at: string
          currency: string
          filing_id: string
          gateway: string | null
          gateway_reference: string | null
          gateway_response: Json | null
          id: string
          paid_at: string | null
          payment_method: string | null
          receipt_file_name: string | null
          receipt_path: string | null
          receipt_uploaded_at: string | null
          reference: string | null
          status: string
          supersedes_id: string | null
          user_id: string
          verification_ip: unknown
          verification_notes: string | null
          verification_status: string
          verification_user_agent: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_kobo: string
          archived?: boolean
          created_at?: string
          currency?: string
          filing_id: string
          gateway?: string | null
          gateway_reference?: string | null
          gateway_response?: Json | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          receipt_file_name?: string | null
          receipt_path?: string | null
          receipt_uploaded_at?: string | null
          reference?: string | null
          status?: string
          supersedes_id?: string | null
          user_id: string
          verification_ip?: unknown
          verification_notes?: string | null
          verification_status?: string
          verification_user_agent?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_kobo?: string
          archived?: boolean
          created_at?: string
          currency?: string
          filing_id?: string
          gateway?: string | null
          gateway_reference?: string | null
          gateway_response?: Json | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          receipt_file_name?: string | null
          receipt_path?: string | null
          receipt_uploaded_at?: string | null
          reference?: string | null
          status?: string
          supersedes_id?: string | null
          user_id?: string
          verification_ip?: unknown
          verification_notes?: string | null
          verification_status?: string
          verification_user_agent?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: Database["public"]["Enums"]["app_permission"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: Database["public"]["Enums"]["app_permission"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: Database["public"]["Enums"]["app_permission"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          onboarding_completed: boolean | null
          tax_identity: string | null
          tin: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          tax_identity?: string | null
          tin?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          tax_identity?: string | null
          tin?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: Database["public"]["Enums"]["app_permission"]
          role_name: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: Database["public"]["Enums"]["app_permission"]
          role_name: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: Database["public"]["Enums"]["app_permission"]
          role_name?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      tax_calculations: {
        Row: {
          archived: boolean | null
          created_at: string
          effective_date_used: string | null
          finalized: boolean | null
          finalized_at: string | null
          id: string
          input_json: Json
          legal_basis_json: Json | null
          output_json: Json
          rule_version: string
          status: string
          supersedes_id: string | null
          tax_type: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          created_at?: string
          effective_date_used?: string | null
          finalized?: boolean | null
          finalized_at?: string | null
          id?: string
          input_json: Json
          legal_basis_json?: Json | null
          output_json: Json
          rule_version: string
          status?: string
          supersedes_id?: string | null
          tax_type?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean | null
          created_at?: string
          effective_date_used?: string | null
          finalized?: boolean | null
          finalized_at?: string | null
          id?: string
          input_json?: Json
          legal_basis_json?: Json | null
          output_json?: Json
          rule_version?: string
          status?: string
          supersedes_id?: string | null
          tax_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_calculations_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "tax_calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rules: {
        Row: {
          archived: boolean
          created_at: string
          effective_date: string
          id: string
          law_reference_json: Json | null
          legal_reference: string | null
          nta_section: string | null
          published: boolean
          rules_json: Json
          tax_type: string
          version: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          effective_date: string
          id?: string
          law_reference_json?: Json | null
          legal_reference?: string | null
          nta_section?: string | null
          published?: boolean
          rules_json: Json
          tax_type: string
          version: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          effective_date?: string
          id?: string
          law_reference_json?: Json | null
          legal_reference?: string | null
          nta_section?: string | null
          published?: boolean
          rules_json?: Json
          tax_type?: string
          version?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_bulk_set_user_roles: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_ids: string[]
        }
        Returns: Json
      }
      admin_set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: Json
      }
      admin_verify_payment: {
        Args: {
          p_ip?: unknown
          p_notes?: string
          p_payment_id: string
          p_status: string
          p_user_agent?: string
        }
        Returns: Json
      }
      correct_expense_atomic: {
        Args: {
          p_amount_kobo: string
          p_category: string
          p_date: string
          p_deductible?: boolean
          p_description: string
          p_input_vat_kobo?: string
          p_invoice_ref?: string
          p_original_id: string
          p_vatable?: boolean
        }
        Returns: Json
      }
      correct_income_atomic: {
        Args: {
          p_amount_kobo: string
          p_category?: string
          p_date: string
          p_description?: string
          p_original_id: string
          p_output_vat_kobo?: string
          p_source: string
          p_tax_exempt?: boolean
          p_vatable?: boolean
          p_wht_credit_kobo?: number
          p_wht_deducted?: boolean
        }
        Returns: Json
      }
      create_filing_draft: {
        Args: {
          p_input_json: Json
          p_period_end: string
          p_period_start: string
          p_tax_type: string
        }
        Returns: string
      }
      finalize_calculation_atomic: {
        Args: { p_calculation_id: string }
        Returns: Json
      }
      get_admin_users_list: {
        Args: never
        Returns: {
          assigned_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          display_name: string
          email: string
          user_id: string
          user_type: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_consent: {
        Args: { _user_id: string; _version: string }
        Returns: boolean
      }
      record_payment: {
        Args: {
          p_amount_kobo: string
          p_filing_id: string
          p_method: string
          p_reference: string
        }
        Returns: string
      }
      submit_filing: {
        Args: { p_filing_id: string; p_output_json: Json }
        Returns: Json
      }
      update_filing_document: {
        Args: { p_document_url: string; p_filing_id: string }
        Returns: undefined
      }
      update_filing_draft: {
        Args: { p_filing_id: string; p_input_json: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_permission:
        | "calculator.use"
        | "calculation.save"
        | "calculation.view_own"
        | "calculation.view_all"
        | "filing.create"
        | "filing.submit"
        | "filing.view_own"
        | "filing.view_all"
        | "payment.create"
        | "payment.view_own"
        | "payment.view_all"
        | "tax_rules.view"
        | "tax_rules.publish"
        | "audit.view"
        | "audit.export"
        | "user.manage"
        | "role.assign"
      app_role:
        | "individual"
        | "freelancer"
        | "sme"
        | "corporate"
        | "accountant"
        | "admin"
        | "auditor"
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
      app_permission: [
        "calculator.use",
        "calculation.save",
        "calculation.view_own",
        "calculation.view_all",
        "filing.create",
        "filing.submit",
        "filing.view_own",
        "filing.view_all",
        "payment.create",
        "payment.view_own",
        "payment.view_all",
        "tax_rules.view",
        "tax_rules.publish",
        "audit.view",
        "audit.export",
        "user.manage",
        "role.assign",
      ],
      app_role: [
        "individual",
        "freelancer",
        "sme",
        "corporate",
        "accountant",
        "admin",
        "auditor",
      ],
    },
  },
} as const
