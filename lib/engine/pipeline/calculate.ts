import stateUIRules from '@/data/state-ui-rules-2025.json';

export interface BenefitCalculation {
  weekly_benefit_amount: number;
  max_duration_weeks: number;
  total_potential: number;
}

interface StateRule {
  state_code: string;
  state_name: string;
  weekly_benefit: {
    max_wba: number;
    max_wba_with_dependents?: number;
  };
  duration: {
    max_weeks: number;
  };
}

/**
 * Calculate benefits for a given state.
 * Returns the maximum eligible benefit amount (max_wba) and max weeks based on state-ui-rules-2025.json
 */
export async function calculateBenefits(
  stateCode: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _quarterlyEarnings: number[]
): Promise<BenefitCalculation> {
  // Get state rules from the JSON data
  const states = stateUIRules.states as Record<string, StateRule>;
  const stateRule = states[stateCode];

  if (!stateRule) {
    // Fallback for unknown states
    console.warn(`No rules found for state: ${stateCode}, using default values`);
    return {
      weekly_benefit_amount: 450,
      max_duration_weeks: 26,
      total_potential: 450 * 26,
    };
  }

  const maxWba = stateRule.weekly_benefit.max_wba;
  const maxWeeks = stateRule.duration.max_weeks;

  return {
    weekly_benefit_amount: maxWba,
    max_duration_weeks: maxWeeks,
    total_potential: maxWba * maxWeeks,
  };
}

export function getStateRules(stateCode: string) {
  const states = stateUIRules.states as Record<string, StateRule>;
  return states[stateCode] || null;
}
