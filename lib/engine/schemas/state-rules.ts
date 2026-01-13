import { z } from 'zod';

// Legacy schema for backward compatibility
export const FormulaTypeSchema = z.enum([
  'high_quarter_divisor',
  'base_period_percentage',
  'average_weekly_wage',
  'custom',
]);

export const FormulaSchema = z.object({
  type: FormulaTypeSchema,
  divisor: z.number().optional(),
  percentage: z.number().min(0).max(100).optional(),
  custom_formula: z.string().optional(),
});

export const StateRuleSchema = z.object({
  state_code: z.string().length(2),
  effective_year: z.number().int().min(2020).max(2030),
  effective_date: z.string(),
  expires_date: z.string().nullable(),
  version: z.string(),
  max_benefit: z.number().positive(),
  min_benefit: z.number().min(0),
  formula_json: z.object({
    weekly_benefit: FormulaSchema,
    duration: z.object({
      base_weeks: z.number().int(),
      max_weeks: z.number().int(),
      variable: z.boolean(),
    }),
    base_period: z.object({
      type: z.enum(['standard', 'alternate']),
      lookback_quarters: z.number().int(),
    }),
  }),
});

export type FormulaType = z.infer<typeof FormulaTypeSchema>;
export type Formula = z.infer<typeof FormulaSchema>;
export type StateRule = z.infer<typeof StateRuleSchema>;

// ============================================================================
// New Comprehensive State UI Rules Schema (2025)
// Based on DOL "Significant Provisions of State Unemployment Insurance Laws"
// ============================================================================

export const MonetaryEligibilitySchema = z.object({
  description: z.string(),
  min_hqw_multiplier: z.number().nullable().optional(),
  min_base_period_wages: z.number().nullable().optional(),
  min_hq_wages: z.number().nullable().optional(),
  wages_in_multiple_quarters: z.boolean().optional(),
  min_quarters_with_wages: z.number().optional(),
  min_outside_hq: z.number().optional(),
  wba_multiplier: z.number().optional(),
  aww_multiplier: z.number().optional(),
  state_aaw_percentage: z.number().optional(),
  minimum_wage_multiplier: z.number().optional(),
  min_hours: z.number().optional(),
  weeks_of_employment: z.number().optional(),
  other_requirements: z.string().nullable().optional(),
}).catchall(z.unknown());

export const DependentsAllowanceSchema = z.object({
  per_dependent: z.number().optional(),
  max_dependents: z.number().optional(),
  max_amount: z.number().optional(),
  max_percentage_of_wba: z.number().optional(),
  no_cap: z.boolean().optional(),
  capped_at_wba: z.boolean().optional(),
  affects_divisor: z.boolean().optional(),
  included_in_formula: z.boolean().optional(),
  first_dependent: z.number().optional(),
  second_dependent: z.number().optional(),
  min_amount: z.number().optional(),
  per_dependent_min: z.number().optional(),
  per_dependent_percentage: z.number().optional(),
  cap_min: z.number().optional(),
  cap_percentage: z.number().optional(),
  based_on_aww: z.boolean().optional(),
}).catchall(z.unknown()).nullable();

export const WeeklyBenefitSchema = z.object({
  formula_type: z.string(),
  formula_description: z.string(),
  divisor: z.number().optional(),
  divisor_min: z.number().optional(),
  divisor_max: z.number().optional(),
  percentage: z.number().optional(),
  percentage_min: z.number().optional(),
  percentage_max: z.number().optional(),
  use_two_highest_quarters: z.boolean().optional(),
  use_all_quarters: z.boolean().optional(),
  use_full_bp: z.boolean().optional(),
  use_highest_quarter: z.boolean().optional(),
  use_last_two_quarters: z.boolean().optional(),
  min_wba: z.number(),
  max_wba: z.number(),
  min_wba_with_dependents: z.number().optional(),
  max_wba_with_dependents: z.number().optional(),
  max_wba_alternate: z.number().optional(),
  dependents_allowance: DependentsAllowanceSchema.optional(),
  cap_percentage_state_aww: z.number().optional(),
  minus_amount: z.number().optional(),
}).catchall(z.unknown());

export const EarningsDisregardSchema = z.object({
  type: z.string(),
  description: z.string(),
  flat_amount: z.number().optional(),
  fraction: z.number().optional(),
  fraction_of_wba: z.number().optional(),
  percentage: z.number().optional(),
  percentage_of_wba: z.number().optional(),
  fraction_over_flat: z.number().optional(),
  percentage_over_flat: z.number().optional(),
  flat_threshold: z.number().optional(),
  multiplier: z.number().optional(),
  amount: z.string().optional(),
  note: z.string().optional(),
}).catchall(z.unknown());

export const MaximumBenefitSchema = z.object({
  formula_description: z.string(),
  type: z.string().optional(),
  bpw_fraction: z.number().optional(),
  wba_multiplier: z.number().optional(),
  wba_multiplier_min: z.number().optional(),
  wba_multiplier_max: z.number().optional(),
  wba_multiplier_high: z.number().optional(),
  wba_multiplier_low: z.number().optional(),
  max_wba_multiplier: z.number().optional(),
  base_wba_multiplier: z.number().optional(),
  additional_per_week: z.number().optional(),
  or_bpw: z.boolean().optional(),
  variable_by_unemployment_rate: z.boolean().optional(),
  unemployment_threshold: z.number().optional(),
}).catchall(z.unknown());

export const DurationSchema = z.object({
  min_weeks: z.number(),
  max_weeks: z.number(),
  uniform: z.boolean(),
  variable_based_on: z.string().nullable().optional(),
});

export const StateUIRuleSchema = z.object({
  state_code: z.string().length(2),
  state_name: z.string(),
  monetary_eligibility: MonetaryEligibilitySchema,
  weekly_benefit: WeeklyBenefitSchema,
  earnings_disregard: EarningsDisregardSchema,
  maximum_benefit: MaximumBenefitSchema,
  duration: DurationSchema,
});

export const StateUIRulesFileSchema = z.object({
  metadata: z.object({
    source: z.string(),
    title: z.string(),
    effective_date: z.string(),
    version: z.string(),
  }),
  states: z.record(z.string(), StateUIRuleSchema),
});

export type MonetaryEligibility = z.infer<typeof MonetaryEligibilitySchema>;
export type DependentsAllowance = z.infer<typeof DependentsAllowanceSchema>;
export type WeeklyBenefit = z.infer<typeof WeeklyBenefitSchema>;
export type EarningsDisregard = z.infer<typeof EarningsDisregardSchema>;
export type MaximumBenefit = z.infer<typeof MaximumBenefitSchema>;
export type Duration = z.infer<typeof DurationSchema>;
export type StateUIRule = z.infer<typeof StateUIRuleSchema>;
export type StateUIRulesFile = z.infer<typeof StateUIRulesFileSchema>;

// Example state rules for reference
export const EXAMPLE_STATE_RULES: Record<string, Partial<StateRule>> = {
  CA: {
    state_code: 'CA',
    max_benefit: 450,
    min_benefit: 40,
    formula_json: {
      weekly_benefit: {
        type: 'high_quarter_divisor',
        divisor: 26,
      },
      duration: {
        base_weeks: 26,
        max_weeks: 26,
        variable: false,
      },
      base_period: {
        type: 'standard',
        lookback_quarters: 4,
      },
    },
  },
  TX: {
    state_code: 'TX',
    max_benefit: 577,
    min_benefit: 72,
    formula_json: {
      weekly_benefit: {
        type: 'high_quarter_divisor',
        divisor: 25,
      },
      duration: {
        base_weeks: 26,
        max_weeks: 26,
        variable: false,
      },
      base_period: {
        type: 'standard',
        lookback_quarters: 4,
      },
    },
  },
  FL: {
    state_code: 'FL',
    max_benefit: 275,
    min_benefit: 32,
    formula_json: {
      weekly_benefit: {
        type: 'high_quarter_divisor',
        divisor: 26,
      },
      duration: {
        base_weeks: 12,
        max_weeks: 23,
        variable: true,
      },
      base_period: {
        type: 'standard',
        lookback_quarters: 4,
      },
    },
  },
};
