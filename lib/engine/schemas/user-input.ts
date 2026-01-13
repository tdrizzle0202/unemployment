import { z } from 'zod';

export const EmploymentDatesSchema = z.object({
  start: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date',
  }),
  end: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end date',
  }),
});

export const QuarterlyEarningsSchema = z
  .array(z.number().min(0))
  .min(4, 'Must provide at least 4 quarters of earnings')
  .max(8, 'Maximum 8 quarters of earnings');

export const SeparationReasonSchema = z.enum([
  'laid_off',
  'fired',
  'quit',
  'contract_ended',
  'business_closed',
  'reduced_hours',
  'other',
]);

export const UserInputsSchema = z.object({
  state_code: z
    .string()
    .length(2)
    .toUpperCase()
    .refine((val) => VALID_STATE_CODES.includes(val), {
      message: 'Invalid state code',
    }),
  separation_reason: z.string().min(1).max(1000),
  separation_reason_category: SeparationReasonSchema.optional(),
  employment_dates: EmploymentDatesSchema.optional(),
  quarterly_earnings: QuarterlyEarningsSchema.optional(),
  employer_name: z.string().max(200).optional(),
  job_title: z.string().max(200).optional(),
  additional_details: z.string().max(5000).optional(),
});

export type UserInputs = z.infer<typeof UserInputsSchema>;
export type EmploymentDates = z.infer<typeof EmploymentDatesSchema>;
export type SeparationReason = z.infer<typeof SeparationReasonSchema>;

export const VALID_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI',
];

export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
  PR: 'Puerto Rico',
  VI: 'Virgin Islands',
};
