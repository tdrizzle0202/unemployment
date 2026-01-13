export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      handbook_sections: {
        Row: {
          id: string;
          state_code: string;
          effective_year: number;
          section_id: string | null;
          content: string;
          embedding: number[] | null;
          source_url: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          state_code: string;
          effective_year: number;
          section_id?: string | null;
          content: string;
          embedding?: number[] | null;
          source_url: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          state_code?: string;
          effective_year?: number;
          section_id?: string | null;
          content?: string;
          embedding?: number[] | null;
          source_url?: string;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      state_rules: {
        Row: {
          id: string;
          state_code: string;
          effective_year: number;
          effective_date: string;
          expires_date: string | null;
          version: string;
          max_benefit: number;
          min_benefit: number;
          formula_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          state_code: string;
          effective_year: number;
          effective_date: string;
          expires_date?: string | null;
          version: string;
          max_benefit: number;
          min_benefit: number;
          formula_json: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          state_code?: string;
          effective_year?: number;
          effective_date?: string;
          expires_date?: string | null;
          version?: string;
          max_benefit?: number;
          min_benefit?: number;
          formula_json?: Json;
          created_at?: string;
        };
      };
      assessment_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          state_code: string;
          status: 'in_progress' | 'completed' | 'abandoned';
          user_inputs: Json;
          started_at: string;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          state_code: string;
          status?: 'in_progress' | 'completed' | 'abandoned';
          user_inputs?: Json;
          started_at?: string;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          state_code?: string;
          status?: 'in_progress' | 'completed' | 'abandoned';
          user_inputs?: Json;
          started_at?: string;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      eligibility_assessments: {
        Row: {
          id: string;
          session_id: string | null;
          eligibility_likelihood: 'high' | 'medium' | 'low' | null;
          confidence_score: number | null;
          risk_factors: Json | null;
          reasoning: string | null;
          citations: Json | null;
          assessment_version: string;
          llm_model: string | null;
          llm_prompt_tokens: number | null;
          llm_completion_tokens: number | null;
          llm_total_tokens: number | null;
          processing_time_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          eligibility_likelihood?: 'high' | 'medium' | 'low' | null;
          confidence_score?: number | null;
          risk_factors?: Json | null;
          reasoning?: string | null;
          citations?: Json | null;
          assessment_version: string;
          llm_model?: string | null;
          llm_prompt_tokens?: number | null;
          llm_completion_tokens?: number | null;
          llm_total_tokens?: number | null;
          processing_time_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          eligibility_likelihood?: 'high' | 'medium' | 'low' | null;
          confidence_score?: number | null;
          risk_factors?: Json | null;
          reasoning?: string | null;
          citations?: Json | null;
          assessment_version?: string;
          llm_model?: string | null;
          llm_prompt_tokens?: number | null;
          llm_completion_tokens?: number | null;
          llm_total_tokens?: number | null;
          processing_time_ms?: number | null;
          created_at?: string;
        };
      };
      benefit_calculations: {
        Row: {
          id: string;
          session_id: string | null;
          assessment_id: string | null;
          weekly_benefit_amount: number | null;
          max_duration_weeks: number | null;
          calculation_version: string;
          state_rule_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          assessment_id?: string | null;
          weekly_benefit_amount?: number | null;
          max_duration_weeks?: number | null;
          calculation_version: string;
          state_rule_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          assessment_id?: string | null;
          weekly_benefit_amount?: number | null;
          max_duration_weeks?: number | null;
          calculation_version?: string;
          state_rule_id?: string | null;
          created_at?: string;
        };
      };
      outcomes: {
        Row: {
          id: string;
          session_id: string | null;
          reported_outcome: 'approved' | 'denied' | 'pending' | null;
          actual_weekly_benefit: number | null;
          denial_reason: string | null;
          days_to_decision: number | null;
          user_notes: string | null;
          verification_level: string;
          reported_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          reported_outcome?: 'approved' | 'denied' | 'pending' | null;
          actual_weekly_benefit?: number | null;
          denial_reason?: string | null;
          days_to_decision?: number | null;
          user_notes?: string | null;
          verification_level?: string;
          reported_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          reported_outcome?: 'approved' | 'denied' | 'pending' | null;
          actual_weekly_benefit?: number | null;
          denial_reason?: string | null;
          days_to_decision?: number | null;
          user_notes?: string | null;
          verification_level?: string;
          reported_at?: string;
        };
      };
    };
    Functions: {
      match_handbook_sections: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
          filter_state: string;
          filter_year?: number;
        };
        Returns: {
          id: string;
          state_code: string;
          section_id: string;
          content: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      get_active_state_rule: {
        Args: {
          p_state_code: string;
          p_effective_year: number;
          p_as_of_date?: string;
        };
        Returns: {
          id: string;
          state_code: string;
          max_benefit: number;
          min_benefit: number;
          formula_json: Json;
        }[];
      };
    };
  };
}
