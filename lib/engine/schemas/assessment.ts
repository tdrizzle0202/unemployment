import { z } from 'zod';

export const LikelihoodSchema = z.enum(['likely_eligible', 'likely_ineligible', 'uncertain']);

export const CitationSchema = z.object({
  section_id: z.string(),
  section_title: z.string(),
  content_excerpt: z.string().max(500),
});

export const AssessmentResponseSchema = z.object({
  likelihood: LikelihoodSchema,
  confidence_score: z.number().int().min(0).max(100),
  risk_factors: z.array(z.string()),
  reasoning: z.string(),
  citations: z.array(CitationSchema),
});

export const BenefitCalculationSchema = z.object({
  weekly_benefit_amount: z.number().min(0),
  max_duration_weeks: z.number().int().min(1).max(52),
  total_potential: z.number().min(0),
});

export const AssessmentSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  state_code: z.string().length(2),
  status: z.enum(['in_progress', 'completed', 'abandoned']),
  user_inputs: z.record(z.string(), z.unknown()),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
});

export const OutcomeSchema = z.object({
  reported_outcome: z.enum(['approved', 'denied', 'pending']),
  actual_weekly_benefit: z.number().positive().nullable(),
  denial_reason: z.string().nullable(),
  days_to_decision: z.number().int().positive().nullable(),
  user_notes: z.string().nullable(),
});

export type Likelihood = z.infer<typeof LikelihoodSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>;
export type BenefitCalculation = z.infer<typeof BenefitCalculationSchema>;
export type AssessmentSession = z.infer<typeof AssessmentSessionSchema>;
export type Outcome = z.infer<typeof OutcomeSchema>;
