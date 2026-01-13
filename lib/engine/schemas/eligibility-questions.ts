import { z } from 'zod';

// ============================================================================
// MONETARY ELIGIBILITY QUESTION FLOW
// Directly maps to MonetaryInputs for eligibility calculation
// ============================================================================

// All 50 US states + DC + territories
export const US_STATES = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'DC', name: 'District of Columbia' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'PR', name: 'Puerto Rico' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'VI', name: 'Virgin Islands' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
] as const;

export const STATE_CODES = US_STATES.map(s => s.code);

// ============================================================================
// STEP 1: STATE SELECTION
// "In which state did you do most of your work?"
// Maps to: state_code (loads state-specific eligibility batch)
// ============================================================================

export const StateCodeSchema = z.enum(STATE_CODES as [string, ...string[]]);

// ============================================================================
// STEP 2: BASE PERIOD WAGES
// "Roughly how much did you earn (pre-tax) in the last 12 months?"
// Maps to: base_period_wages (triggers FLAT_FLOOR check)
// ============================================================================

export const BasePeriodWagesSchema = z.number().min(0).describe('Total pre-tax earnings in last 12 months');

// ============================================================================
// STEP 3: QUARTERS WITH WAGES
// "In how many 3-month blocks (quarters) did you receive a paycheck?"
// Maps to: quarters_with_wages (triggers MULTI_QUARTER module)
// ============================================================================

export const QuartersWithWagesSchema = z.enum(['1', '2', '3', '4']).transform(val => parseInt(val, 10));

export const QUARTERS_WITH_WAGES_OPTIONS = [
    { value: '1', label: '1 quarter (only worked part of the year)' },
    { value: '2', label: '2 quarters (about half the year)' },
    { value: '3', label: '3 quarters (most of the year)' },
    { value: '4', label: '4 quarters (worked the full year)' },
] as const;

// ============================================================================
// STEP 4: HIGHEST QUARTER WAGES
// "What was your income during your highest-earning 3-month period?"
// Maps to: quarterly_wages (runs HQ_MULTIPLIER and HQ_FLOOR tests)
// ============================================================================

export const HighestQuarterInputSchema = z.discriminatedUnion('mode', [
    z.object({
        mode: z.literal('specific'),
        amount: z.number().min(0).describe('Highest quarter earnings'),
    }),
    z.object({
        mode: z.literal('even'),
        // Earnings distributed evenly - calculated from base_period_wages / 4
    }),
]);

export const HIGHEST_QUARTER_OPTIONS = [
    { value: 'specific', label: 'I know my highest quarter amount' },
    { value: 'even', label: 'Approximately similar every period' },
] as const;

// ============================================================================
// STEP 5: HOURS WORKED (Conditional - WA, OR)
// "Approximately how many hours did you work in the last 12 months?"
// Maps to: hours_worked (triggers HOURS_WORKED module)
// Required for: WA (680 hrs), OR alternate (500 hrs)
// ============================================================================

export const HoursWorkedSchema = z.number().min(0).max(4000).optional();

export const STATES_REQUIRING_HOURS = ['WA', 'OR'] as const;

// ============================================================================
// STEP 6: WEEKS WORKED (Conditional - NJ, OH, PA)
// "Approximately how many weeks did you work in the last 12 months?"
// Maps to: weeks_worked (triggers WEEKS_WORKED module)
// Required for: NJ (20 wks), OH (20 wks), PA (18 credit wks)
// ============================================================================

export const WeeksWorkedSchema = z.number().min(0).max(52).optional();

export const STATES_REQUIRING_WEEKS = ['NJ', 'OH', 'PA'] as const;

// ============================================================================
// SEPARATION REASON (for non-monetary eligibility)
// ============================================================================

export const SeparationCategorySchema = z.enum([
    'laid_off',           // "I was laid off or my position was eliminated"
    'company_closed',     // "The company closed or had mass layoffs"
    'let_go',             // "I was let go (fired)"
    'quit',               // "I quit or resigned"
    'hours_reduced',      // "My hours were significantly reduced"
    'contract_ended',     // "My contract or seasonal work ended"
    'other',              // "Something else"
]);

export const SEPARATION_CATEGORY_LABELS: Record<z.infer<typeof SeparationCategorySchema>, string> = {
    laid_off: "I was laid off or my position was eliminated",
    company_closed: "The company closed or had mass layoffs",
    let_go: "I was let go (fired)",
    quit: "I quit or resigned",
    hours_reduced: "My hours were significantly reduced",
    contract_ended: "My contract or seasonal work ended",
    other: "Something else",
};

export const FiredReasonSchema = z.enum([
    'performance',
    'policy_violation',
    'attendance',
    'economic',
    'unclear',
]);

export const FIRED_REASON_LABELS: Record<z.infer<typeof FiredReasonSchema>, string> = {
    performance: "They said I wasn't the right fit / performance issues",
    policy_violation: "I violated a company policy",
    attendance: "I was late or absent too often",
    economic: "Economic reasons (budget cuts, downsizing)",
    unclear: "I'm not sure / they didn't give a clear reason",
};

export const QuitReasonSchema = z.enum([
    'unsafe_conditions',
    'harassment',
    'pay_schedule_change',
    'medical',
    'family_emergency',
    'spouse_relocation',
    'personal',
    'new_job',
    'other',
]);

export const QUIT_REASON_LABELS: Record<z.infer<typeof QuitReasonSchema>, string> = {
    unsafe_conditions: "Unsafe or unhealthy working conditions",
    harassment: "Harassment or discrimination",
    pay_schedule_change: "They significantly changed my pay or schedule",
    medical: "Medical or health reasons",
    family_emergency: "Family emergency or caregiving",
    spouse_relocation: "Relocated for a spouse's job",
    personal: "Personal reasons",
    new_job: "Found another job opportunity",
    other: "Other",
};

// ============================================================================
// AVAILABILITY (ability to work)
// ============================================================================

export const AvailabilitySchema = z.object({
    able_to_work: z.boolean(),
    available_to_work: z.boolean(),
    willing_to_accept_suitable_work: z.boolean(),
});

// ============================================================================
// DISQUALIFYING CONDITIONS
// ============================================================================

export const DisqualifyingConditionsSchema = z.object({
    receiving_severance: z.boolean().optional(),
    involved_in_labor_dispute: z.boolean().optional(),
    receiving_retirement_pension: z.boolean().optional(),
    filed_in_another_state: z.boolean().optional(),
});

// ============================================================================
// SEPARATION DETAILS (for non-monetary eligibility)
// ============================================================================

export const SeparationDetailsSchema = z.discriminatedUnion('category', [
    z.object({
        category: z.literal('laid_off'),
    }),
    z.object({
        category: z.literal('company_closed'),
    }),
    z.object({
        category: z.literal('let_go'),
        fired_reason: FiredReasonSchema,
    }),
    z.object({
        category: z.literal('quit'),
        quit_reason: QuitReasonSchema,
        quit_details: z.string().optional(),
    }),
    z.object({
        category: z.literal('hours_reduced'),
        reduction_percentage: z.number().min(0).max(100).optional(),
    }),
    z.object({
        category: z.literal('contract_ended'),
    }),
    z.object({
        category: z.literal('other'),
        description: z.string(),
    }),
]);

// ============================================================================
// MONETARY ELIGIBILITY INPUT SCHEMA
// Collects all data needed to run monetary eligibility checks
// ============================================================================

export const MonetaryEligibilityInputSchema = z.object({
    // Step 1: State selection
    state_code: StateCodeSchema,

    // Step 2: Total earnings in base period (last 12 months)
    base_period_wages: BasePeriodWagesSchema,

    // Step 3: Number of quarters with wages
    quarters_with_wages: z.number().min(1).max(4),

    // Step 4: Highest quarter wages
    highest_quarter_wages: HighestQuarterInputSchema,

    // Step 5: Hours worked (conditional - WA, OR)
    hours_worked: HoursWorkedSchema,

    // Step 6: Weeks worked (conditional - NJ, OH, PA)
    weeks_worked: WeeksWorkedSchema,
});

// ============================================================================
// COMPLETE USER ELIGIBILITY FLOW
// Combines monetary + non-monetary eligibility
// ============================================================================

export const UserEligibilityFlowSchema = z.object({
    // Monetary eligibility inputs
    state_code: StateCodeSchema,
    base_period_wages: BasePeriodWagesSchema,
    quarters_with_wages: z.number().min(1).max(4),
    highest_quarter_wages: HighestQuarterInputSchema,
    hours_worked: HoursWorkedSchema,
    weeks_worked: WeeksWorkedSchema,

    // Non-monetary eligibility inputs
    separation: SeparationDetailsSchema.optional(),
    availability: AvailabilitySchema.optional(),
    disqualifying_conditions: DisqualifyingConditionsSchema.optional(),
});

// ============================================================================
// PARTIAL FLOW FOR PROGRESSIVE DISCLOSURE
// ============================================================================

export const PartialUserFlowSchema = z.object({
    state_code: StateCodeSchema.optional(),
    base_period_wages: BasePeriodWagesSchema.optional(),
    quarters_with_wages: z.number().min(1).max(4).optional(),
    highest_quarter_wages: HighestQuarterInputSchema.optional(),
    hours_worked: HoursWorkedSchema,
    weeks_worked: WeeksWorkedSchema,
    separation: SeparationDetailsSchema.optional(),
    availability: AvailabilitySchema.optional(),
    disqualifying_conditions: DisqualifyingConditionsSchema.optional(),
    current_step: z.number().min(1).max(8).default(1),
});

// ============================================================================
// CONVERSION UTILITIES
// Convert user inputs to MonetaryInputs for eligibility pipeline
// ============================================================================

export interface MonetaryInputs {
    state_code: string;
    base_period_wages: number;
    quarterly_wages: number[];
    hours_worked?: number;
    weeks_worked?: number;
}

/**
 * Convert user flow answers to MonetaryInputs for eligibility calculation
 */
export function convertToMonetaryInputs(
    userInputs: z.infer<typeof MonetaryEligibilityInputSchema>
): MonetaryInputs {
    const { state_code, base_period_wages, quarters_with_wages, highest_quarter_wages } = userInputs;

    // Calculate quarterly_wages array based on user inputs
    let quarterly_wages: number[];

    if (highest_quarter_wages.mode === 'even') {
        // Distribute evenly across quarters worked
        const perQuarter = base_period_wages / quarters_with_wages;
        quarterly_wages = Array(4).fill(0);
        for (let i = 0; i < quarters_with_wages; i++) {
            quarterly_wages[3 - i] = perQuarter; // Fill from most recent
        }
    } else {
        // User provided specific highest quarter amount
        const hqAmount = highest_quarter_wages.amount;
        const remainingWages = base_period_wages - hqAmount;
        const otherQuarters = quarters_with_wages - 1;

        quarterly_wages = Array(4).fill(0);
        quarterly_wages[3] = hqAmount; // Highest quarter is most recent

        if (otherQuarters > 0 && remainingWages > 0) {
            const perOtherQuarter = remainingWages / otherQuarters;
            for (let i = 0; i < otherQuarters; i++) {
                quarterly_wages[2 - i] = perOtherQuarter;
            }
        }
    }

    return {
        state_code,
        base_period_wages,
        quarterly_wages,
        hours_worked: userInputs.hours_worked,
        weeks_worked: userInputs.weeks_worked,
    };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type StateCode = z.infer<typeof StateCodeSchema>;
export type SeparationCategory = z.infer<typeof SeparationCategorySchema>;
export type FiredReason = z.infer<typeof FiredReasonSchema>;
export type QuitReason = z.infer<typeof QuitReasonSchema>;
export type HighestQuarterInput = z.infer<typeof HighestQuarterInputSchema>;
export type Availability = z.infer<typeof AvailabilitySchema>;
export type DisqualifyingConditions = z.infer<typeof DisqualifyingConditionsSchema>;
export type SeparationDetails = z.infer<typeof SeparationDetailsSchema>;
export type MonetaryEligibilityInput = z.infer<typeof MonetaryEligibilityInputSchema>;
export type UserEligibilityFlow = z.infer<typeof UserEligibilityFlowSchema>;
export type PartialUserFlow = z.infer<typeof PartialUserFlowSchema>;

// ============================================================================
// QUESTION STEP METADATA
// ============================================================================

export interface QuestionStep {
    id: number;
    title: string;
    description: string;
    helpText?: string;
    required: boolean;
    conditional?: {
        states?: string[];
    };
}

export const QUESTION_STEPS: QuestionStep[] = [
    {
        id: 1,
        title: "In which state did you do most of your work?",
        description: "Select your work state",
        helpText: "This determines which state's unemployment rules apply to you.",
        required: true,
    },
    {
        id: 2,
        title: "Roughly how much did you earn (pre-tax) in the last 12 months?",
        description: "Enter your total earnings",
        helpText: "Include wages from all jobs. Your best estimate is fine.",
        required: true,
    },
    {
        id: 3,
        title: "In how many 3-month blocks (quarters) did you receive a paycheck?",
        description: "Select number of quarters",
        helpText: "A quarter is a 3-month period. If you worked all year, select 4.",
        required: true,
    },
    {
        id: 4,
        title: "What was your income during your highest-earning 3-month period?",
        description: "Enter highest quarter earnings",
        helpText: "If your income was steady, select 'approximately similar every period'.",
        required: true,
    },
    {
        id: 5,
        title: "Approximately how many hours did you work in the last 12 months?",
        description: "Enter total hours worked",
        helpText: "Full-time is roughly 2,080 hours/year. Part-time varies.",
        required: true,
        conditional: {
            states: ['WA', 'OR'],
        },
    },
    {
        id: 6,
        title: "Approximately how many weeks did you work in the last 12 months?",
        description: "Enter weeks worked",
        helpText: "Count any week where you worked at least one day.",
        required: true,
        conditional: {
            states: ['NJ', 'OH', 'PA'],
        },
    },
    {
        id: 7,
        title: "What happened with your job?",
        description: "Tell us about your job separation",
        helpText: "This helps determine non-monetary eligibility.",
        required: false,
    },
    {
        id: 8,
        title: "Are you ready to work?",
        description: "Your current availability",
        helpText: "Most states require you to be able, available, and actively looking for work.",
        required: false,
    },
];
