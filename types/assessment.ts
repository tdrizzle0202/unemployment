export interface Assessment {
  likelihood: 'high' | 'medium' | 'low';
  confidence_score: number;
  risk_factors: string[];
  reasoning: string;
  citations: Citation[];
}

export interface Citation {
  section_id: string;
  section_title: string;
  content_excerpt: string;
}

export interface BenefitCalculation {
  weekly_amount: number;
  max_weeks: number;
  total_potential: number;
}

export interface AssessmentSession {
  id: string;
  user_id: string | null;
  state_code: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  user_inputs: UserInputs;
  started_at: string;
  completed_at: string | null;
  assessment?: Assessment;
  benefit_calculation?: BenefitCalculation;
}

export interface UserInputs {
  separation_reason?: string;
  employment_dates?: {
    start: string;
    end: string;
  };
  quarterly_earnings?: number[];
  employer_name?: string;
  job_title?: string;
  additional_details?: string;
}

export interface Outcome {
  reported_outcome: 'approved' | 'denied' | 'pending';
  actual_weekly_benefit?: number;
  denial_reason?: string;
  days_to_decision?: number;
  user_notes?: string;
}

export interface AssessmentResponse {
  session_id: string;
  message: string;
  assessment?: Assessment;
  benefit_calculation?: BenefitCalculation;
  next_questions?: string[];
  missing_fields?: string[];
}
