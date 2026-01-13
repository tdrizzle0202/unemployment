import eligibilityBatches from '@/data/eligibility-batches.json';
import stateUIRules from '@/data/state-ui-rules-2025.json';

// ============================================================================
// TYPES
// ============================================================================

export interface MonetaryInputs {
  state_code: string;
  base_period_wages: number;
  quarterly_wages: number[]; // Q1, Q2, Q3, Q4 (oldest to newest)
  hours_worked?: number;
  weeks_worked?: number;
}

export interface ModuleCheckResult {
  module: string;
  passed: boolean;
  required: boolean;
  required_value: number | string;
  actual_value: number | string;
  explanation: string;
}

export interface MonetaryEligibilityResult {
  eligible: boolean;
  state_code: string;
  state_name: string;
  primary_path_passed: boolean;
  alternate_path_passed: boolean | null;
  checks: ModuleCheckResult[];
  failed_requirements: string[];
  missing_inputs: string[];
  summary: string;
}

interface ModuleParams {
  multiplier?: number;
  min_amount?: number;
  min_quarters?: number;
  min_hours?: number;
  min_weeks?: number;
  min_percentage?: number;
  percentage?: number;
  tolerance?: number;
  quarters?: string | number;
  wage_type?: string;
  wage_period?: string;
  apply_to?: string;
  of?: string;
  any_quarter?: boolean;
  any_other_quarter?: boolean;
  min_wage_multiplier?: number;
  type?: string;
  logic?: string;
  min_wba_multiplier?: number;
}

interface ModuleConfig {
  module: string;
  params: ModuleParams;
  required: boolean;
}

interface StateBatch {
  state_code: string;
  state_name: string;
  primary_module: string;
  modules: ModuleConfig[];
  alternate_path?: {
    description: string;
    modules: ModuleConfig[];
  };
  logic: string;
}

interface StateRule {
  state_code: string;
  state_name: string;
  monetary_eligibility: {
    state_minimum_wage?: number;
    state_average_annual_wage?: number;
  };
  weekly_benefit: {
    min_wba: number;
    max_wba: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getHighestQuarter(quarterly: number[]): number {
  return Math.max(...quarterly);
}

function getQuartersWithWages(quarterly: number[]): number {
  return quarterly.filter(q => q > 0).length;
}

function getTwoHighestQuarters(quarterly: number[]): number[] {
  return [...quarterly].sort((a, b) => b - a).slice(0, 2);
}

function getWagesOutsideHQ(quarterly: number[]): number {
  const hq = getHighestQuarter(quarterly);
  const hqIndex = quarterly.indexOf(hq);
  return quarterly.reduce((sum, q, i) => i === hqIndex ? sum : sum + q, 0);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ============================================================================
// MODULE RUNNERS
// ============================================================================

function runHQMultiplier(
  inputs: MonetaryInputs,
  params: ModuleParams
): ModuleCheckResult {
  const multiplier = params.multiplier || 1.5;
  const tolerance = params.tolerance || 0;
  const hqw = getHighestQuarter(inputs.quarterly_wages);
  const required = hqw * multiplier - tolerance;
  const passed = inputs.base_period_wages >= required;

  return {
    module: 'HQ_MULTIPLIER',
    passed,
    required: true,
    required_value: `${formatCurrency(required)} (${multiplier}x HQW)`,
    actual_value: formatCurrency(inputs.base_period_wages),
    explanation: passed
      ? `Base period wages (${formatCurrency(inputs.base_period_wages)}) meet the ${multiplier}x high quarter requirement`
      : `Base period wages (${formatCurrency(inputs.base_period_wages)}) must be at least ${multiplier}x your highest quarter (${formatCurrency(hqw)}) = ${formatCurrency(required)}`,
  };
}

function runWBAMultiplier(
  inputs: MonetaryInputs,
  params: ModuleParams,
  stateRule: StateRule | null
): ModuleCheckResult {
  const multiplier = params.multiplier || 26;
  const applyTo = params.apply_to;

  // Estimate WBA for checking (use min_wba as conservative estimate)
  const estimatedWBA = stateRule?.weekly_benefit.min_wba || 100;
  const required = estimatedWBA * multiplier;

  let valueToCheck = inputs.base_period_wages;
  let valueDescription = 'Base period wages';

  if (applyTo === 'outside_hq') {
    valueToCheck = getWagesOutsideHQ(inputs.quarterly_wages);
    valueDescription = 'Wages outside high quarter';
  }

  const passed = valueToCheck >= required;

  return {
    module: 'WBA_MULTIPLIER',
    passed,
    required: true,
    required_value: `${formatCurrency(required)} (${multiplier}x estimated WBA)`,
    actual_value: formatCurrency(valueToCheck),
    explanation: passed
      ? `${valueDescription} (${formatCurrency(valueToCheck)}) meet the ${multiplier}x WBA requirement`
      : `${valueDescription} (${formatCurrency(valueToCheck)}) should be at least ${multiplier}x the weekly benefit amount`,
  };
}

function runFlatFloor(
  inputs: MonetaryInputs,
  params: ModuleParams
): ModuleCheckResult {
  const minAmount = params.min_amount || 0;
  const quarters = params.quarters;

  let valueToCheck = inputs.base_period_wages;
  let valueDescription = 'Base period wages';

  if (quarters === 2 || quarters === 'highest_2') {
    const twoHighest = getTwoHighestQuarters(inputs.quarterly_wages);
    valueToCheck = twoHighest[0] + twoHighest[1];
    valueDescription = 'Two highest quarters';
  } else if (quarters === 'last_2') {
    valueToCheck = inputs.quarterly_wages[2] + inputs.quarterly_wages[3];
    valueDescription = 'Last two quarters';
  } else if (quarters === 'highest_2_avg') {
    const twoHighest = getTwoHighestQuarters(inputs.quarterly_wages);
    valueToCheck = (twoHighest[0] + twoHighest[1]) / 2;
    valueDescription = 'Average of two highest quarters';
  }

  const passed = valueToCheck >= minAmount;

  return {
    module: 'FLAT_FLOOR',
    passed,
    required: true,
    required_value: formatCurrency(minAmount),
    actual_value: formatCurrency(valueToCheck),
    explanation: passed
      ? `${valueDescription} (${formatCurrency(valueToCheck)}) meet the minimum ${formatCurrency(minAmount)} requirement`
      : `${valueDescription} (${formatCurrency(valueToCheck)}) must be at least ${formatCurrency(minAmount)}`,
  };
}

function runHQFloor(
  inputs: MonetaryInputs,
  params: ModuleParams
): ModuleCheckResult {
  const minAmount = params.min_amount || 0;
  const minQuarters = params.min_quarters;
  const anyQuarter = params.any_quarter;

  let valueToCheck: number;
  let valueDescription: string;

  if (minQuarters && minQuarters >= 2) {
    // Need min_amount in each of min_quarters quarters
    const sortedQuarters = [...inputs.quarterly_wages].sort((a, b) => b - a);
    const qualifyingQuarters = sortedQuarters.filter(q => q >= minAmount).length;
    valueToCheck = qualifyingQuarters >= minQuarters ? minAmount : 0;
    valueDescription = `${qualifyingQuarters} quarters with ${formatCurrency(minAmount)}+`;
    const passed = qualifyingQuarters >= minQuarters;
    return {
      module: 'HQ_FLOOR',
      passed,
      required: true,
      required_value: `${formatCurrency(minAmount)} in ${minQuarters} quarters`,
      actual_value: valueDescription,
      explanation: passed
        ? `You have ${qualifyingQuarters} quarters with at least ${formatCurrency(minAmount)}`
        : `Need at least ${formatCurrency(minAmount)} in ${minQuarters} quarters, but only ${qualifyingQuarters} quarters qualify`,
    };
  } else if (anyQuarter) {
    // Any quarter meets the threshold
    valueToCheck = Math.max(...inputs.quarterly_wages);
    valueDescription = 'Any quarter';
  } else {
    // Standard: highest quarter must meet threshold
    valueToCheck = getHighestQuarter(inputs.quarterly_wages);
    valueDescription = 'Highest quarter wages';
  }

  const passed = valueToCheck >= minAmount;

  return {
    module: 'HQ_FLOOR',
    passed,
    required: true,
    required_value: formatCurrency(minAmount),
    actual_value: formatCurrency(valueToCheck),
    explanation: passed
      ? `${valueDescription} (${formatCurrency(valueToCheck)}) meet the minimum ${formatCurrency(minAmount)} requirement`
      : `${valueDescription} (${formatCurrency(valueToCheck)}) must be at least ${formatCurrency(minAmount)}`,
  };
}

function runMultiQuarter(
  inputs: MonetaryInputs,
  params: ModuleParams
): ModuleCheckResult {
  const minQuarters = params.min_quarters || 2;
  const quartersWithWages = getQuartersWithWages(inputs.quarterly_wages);
  const passed = quartersWithWages >= minQuarters;

  return {
    module: 'MULTI_QUARTER',
    passed,
    required: true,
    required_value: `${minQuarters} quarters`,
    actual_value: `${quartersWithWages} quarters`,
    explanation: passed
      ? `You have wages in ${quartersWithWages} quarters, meeting the ${minQuarters}-quarter requirement`
      : `You need wages in at least ${minQuarters} quarters, but only have ${quartersWithWages}`,
  };
}

function runOutsideHQ(
  inputs: MonetaryInputs,
  params: ModuleParams
): ModuleCheckResult {
  const minAmount = params.min_amount;
  const minPercentage = params.min_percentage;
  const ofValue = params.of;

  const outsideHQ = getWagesOutsideHQ(inputs.quarterly_wages);
  const hqw = getHighestQuarter(inputs.quarterly_wages);

  let required: number;
  let requiredDescription: string;

  if (minAmount) {
    required = minAmount;
    requiredDescription = formatCurrency(minAmount);
  } else if (minPercentage) {
    if (ofValue === 'hqw') {
      required = hqw * (minPercentage / 100);
      requiredDescription = `${minPercentage}% of HQW (${formatCurrency(required)})`;
    } else {
      required = inputs.base_period_wages * (minPercentage / 100);
      requiredDescription = `${minPercentage}% of BPW (${formatCurrency(required)})`;
    }
  } else {
    required = 0;
    requiredDescription = '$0';
  }

  const passed = outsideHQ >= required;

  return {
    module: 'OUTSIDE_HQ',
    passed,
    required: true,
    required_value: requiredDescription,
    actual_value: formatCurrency(outsideHQ),
    explanation: passed
      ? `Wages outside your highest quarter (${formatCurrency(outsideHQ)}) meet the requirement`
      : `Wages outside your highest quarter (${formatCurrency(outsideHQ)}) must be at least ${requiredDescription}`,
  };
}

function runHoursWorked(
  inputs: MonetaryInputs,
  params: ModuleParams
): ModuleCheckResult {
  const minHours = params.min_hours || 0;
  const hoursWorked = inputs.hours_worked;

  if (hoursWorked === undefined) {
    return {
      module: 'HOURS_WORKED',
      passed: false,
      required: true,
      required_value: `${minHours} hours`,
      actual_value: 'Not provided',
      explanation: `This state requires ${minHours} hours worked - please provide your hours`,
    };
  }

  const passed = hoursWorked >= minHours;

  return {
    module: 'HOURS_WORKED',
    passed,
    required: true,
    required_value: `${minHours} hours`,
    actual_value: `${hoursWorked} hours`,
    explanation: passed
      ? `You worked ${hoursWorked} hours, meeting the ${minHours}-hour requirement`
      : `You need at least ${minHours} hours worked, but only have ${hoursWorked}`,
  };
}

function runWeeksWorked(
  inputs: MonetaryInputs,
  params: ModuleParams
): ModuleCheckResult {
  const minWeeks = params.min_weeks || 0;
  const weeksWorked = inputs.weeks_worked;

  if (weeksWorked === undefined) {
    return {
      module: 'WEEKS_WORKED',
      passed: false,
      required: true,
      required_value: `${minWeeks} weeks`,
      actual_value: 'Not provided',
      explanation: `This state requires ${minWeeks} weeks worked - please provide your weeks`,
    };
  }

  const passed = weeksWorked >= minWeeks;

  return {
    module: 'WEEKS_WORKED',
    passed,
    required: true,
    required_value: `${minWeeks} weeks`,
    actual_value: `${weeksWorked} weeks`,
    explanation: passed
      ? `You worked ${weeksWorked} weeks, meeting the ${minWeeks}-week requirement`
      : `You need at least ${minWeeks} weeks worked, but only have ${weeksWorked}`,
  };
}

function runMinWageMultiplier(
  inputs: MonetaryInputs,
  params: ModuleParams,
  stateRule: StateRule | null
): ModuleCheckResult {
  const multiplier = params.multiplier || 0;
  const wageType = params.wage_type || 'state_hourly';
  const applyTo = params.apply_to || 'bp';

  // Get minimum wage (state or federal)
  let minWage = 7.25; // Federal minimum
  if (wageType === 'state_hourly' && stateRule?.monetary_eligibility?.state_minimum_wage) {
    minWage = stateRule.monetary_eligibility.state_minimum_wage;
  }

  const required = multiplier * minWage;

  let valueToCheck = inputs.base_period_wages;
  let valueDescription = 'Base period wages';

  if (applyTo === 'one_quarter') {
    valueToCheck = getHighestQuarter(inputs.quarterly_wages);
    valueDescription = 'Highest quarter';
  } else if (applyTo === 'quarterly') {
    valueToCheck = getHighestQuarter(inputs.quarterly_wages);
    valueDescription = 'Quarterly wages';
  }

  const passed = valueToCheck >= required;

  return {
    module: 'MIN_WAGE_MULTIPLIER',
    passed,
    required: true,
    required_value: `${formatCurrency(required)} (${multiplier}x $${minWage.toFixed(2)} min wage)`,
    actual_value: formatCurrency(valueToCheck),
    explanation: passed
      ? `${valueDescription} (${formatCurrency(valueToCheck)}) meet the minimum wage requirement`
      : `${valueDescription} (${formatCurrency(valueToCheck)}) must be at least ${formatCurrency(required)}`,
  };
}

function runStateAWW(
  inputs: MonetaryInputs,
  params: ModuleParams,
  stateRule: StateRule | null
): ModuleCheckResult {
  const percentage = params.percentage;
  const multiplier = params.multiplier;
  const wagePeriod = params.wage_period || 'annual';
  const applyTo = params.apply_to || 'bpw';

  // Get state average wage
  let stateAWW = 60000; // Default fallback
  if (stateRule?.monetary_eligibility?.state_average_annual_wage) {
    stateAWW = stateRule.monetary_eligibility.state_average_annual_wage;
  }

  // Convert to weekly if needed
  if (wagePeriod === 'weekly') {
    stateAWW = stateAWW / 52;
  }

  let required: number;
  if (percentage) {
    required = stateAWW * (percentage / 100);
  } else if (multiplier) {
    required = stateAWW * multiplier;
  } else {
    required = stateAWW;
  }

  let valueToCheck = inputs.base_period_wages;
  let valueDescription = 'Base period wages';

  if (applyTo === 'hq') {
    valueToCheck = getHighestQuarter(inputs.quarterly_wages);
    valueDescription = 'Highest quarter';
  } else if (applyTo === 'weekly_avg') {
    valueToCheck = inputs.base_period_wages / 52;
    valueDescription = 'Average weekly wages';
  }

  const passed = valueToCheck >= required;

  return {
    module: 'STATE_AWW',
    passed,
    required: true,
    required_value: formatCurrency(required),
    actual_value: formatCurrency(valueToCheck),
    explanation: passed
      ? `${valueDescription} (${formatCurrency(valueToCheck)}) meet the state wage requirement`
      : `${valueDescription} (${formatCurrency(valueToCheck)}) must be at least ${formatCurrency(required)} based on state average wages`,
  };
}

// ============================================================================
// MODULE DISPATCHER
// ============================================================================

function runModule(
  moduleName: string,
  inputs: MonetaryInputs,
  params: ModuleParams,
  stateRule: StateRule | null
): ModuleCheckResult {
  switch (moduleName) {
    case 'HQ_MULTIPLIER':
      return runHQMultiplier(inputs, params);
    case 'WBA_MULTIPLIER':
      return runWBAMultiplier(inputs, params, stateRule);
    case 'FLAT_FLOOR':
      return runFlatFloor(inputs, params);
    case 'HQ_FLOOR':
      return runHQFloor(inputs, params);
    case 'MULTI_QUARTER':
      return runMultiQuarter(inputs, params);
    case 'OUTSIDE_HQ':
      return runOutsideHQ(inputs, params);
    case 'HOURS_WORKED':
      return runHoursWorked(inputs, params);
    case 'WEEKS_WORKED':
      return runWeeksWorked(inputs, params);
    case 'MIN_WAGE_MULTIPLIER':
      return runMinWageMultiplier(inputs, params, stateRule);
    case 'STATE_AWW':
      return runStateAWW(inputs, params, stateRule);
    default:
      return {
        module: moduleName,
        passed: true,
        required: false,
        required_value: 'Unknown',
        actual_value: 'Unknown',
        explanation: `Module ${moduleName} not implemented`,
      };
  }
}

// ============================================================================
// LOGIC RUNNERS
// ============================================================================

function runModulesWithLogic(
  modules: ModuleConfig[],
  logic: string,
  inputs: MonetaryInputs,
  stateRule: StateRule | null
): { passed: boolean; checks: ModuleCheckResult[] } {
  const checks: ModuleCheckResult[] = [];

  for (const moduleConfig of modules) {
    const result = runModule(moduleConfig.module, inputs, moduleConfig.params, stateRule);
    result.required = moduleConfig.required;
    checks.push(result);
  }

  let passed: boolean;

  switch (logic) {
    case 'ALL':
      // All required modules must pass
      passed = checks.filter(c => c.required).every(c => c.passed);
      break;
    case 'ANY':
      // Any module passing is sufficient
      passed = checks.some(c => c.passed);
      break;
    case 'GREATER_OF':
      // At least one must pass (used for "greater of X or Y" requirements)
      passed = checks.some(c => c.passed);
      break;
    default:
      passed = checks.filter(c => c.required).every(c => c.passed);
  }

  return { passed, checks };
}

// ============================================================================
// MAIN ELIGIBILITY FUNCTION
// ============================================================================

export function getRequiredInputs(stateCode: string): {
  needs_hours: boolean;
  needs_weeks: boolean;
  min_hours?: number;
  min_weeks?: number;
} {
  const batches = eligibilityBatches.state_batches as Record<string, StateBatch>;
  const batch = batches[stateCode];

  if (!batch) {
    return { needs_hours: false, needs_weeks: false };
  }

  let needsHours = false;
  let needsWeeks = false;
  let minHours: number | undefined;
  let minWeeks: number | undefined;

  const checkModules = (modules: ModuleConfig[]) => {
    for (const m of modules) {
      if (m.module === 'HOURS_WORKED') {
        needsHours = true;
        minHours = m.params.min_hours;
      }
      if (m.module === 'WEEKS_WORKED') {
        needsWeeks = true;
        minWeeks = m.params.min_weeks;
      }
    }
  };

  checkModules(batch.modules);
  if (batch.alternate_path) {
    checkModules(batch.alternate_path.modules);
  }

  return { needs_hours: needsHours, needs_weeks: needsWeeks, min_hours: minHours, min_weeks: minWeeks };
}

export function runMonetaryEligibility(inputs: MonetaryInputs): MonetaryEligibilityResult {
  const batches = eligibilityBatches.state_batches as Record<string, StateBatch>;
  const batch = batches[inputs.state_code];

  if (!batch) {
    return {
      eligible: false,
      state_code: inputs.state_code,
      state_name: 'Unknown',
      primary_path_passed: false,
      alternate_path_passed: null,
      checks: [],
      failed_requirements: [`Unknown state code: ${inputs.state_code}`],
      missing_inputs: [],
      summary: `Unknown state code: ${inputs.state_code}`,
    };
  }

  // Get state rules for additional context
  const states = stateUIRules.states as Record<string, StateRule>;
  const stateRule = states[inputs.state_code] || null;

  // Check for missing inputs
  const missingInputs: string[] = [];
  const requiredInputs = getRequiredInputs(inputs.state_code);

  if (requiredInputs.needs_hours && inputs.hours_worked === undefined) {
    missingInputs.push(`hours_worked (${requiredInputs.min_hours} required)`);
  }
  if (requiredInputs.needs_weeks && inputs.weeks_worked === undefined) {
    missingInputs.push(`weeks_worked (${requiredInputs.min_weeks} required)`);
  }

  // Run primary path
  const primaryResult = runModulesWithLogic(batch.modules, batch.logic, inputs, stateRule);

  // Run alternate path if exists and primary failed
  let alternateResult: { passed: boolean; checks: ModuleCheckResult[] } | null = null;
  if (batch.alternate_path && batch.alternate_path.modules.length > 0) {
    alternateResult = runModulesWithLogic(batch.alternate_path.modules, 'ALL', inputs, stateRule);
  }

  // Determine overall eligibility based on logic type
  let eligible: boolean;
  const logic = batch.logic;

  if (logic === 'ALL_OR_ALTERNATE' || logic === 'PRIMARY_OR_ALTERNATE') {
    eligible = primaryResult.passed || (alternateResult?.passed ?? false);
  } else {
    eligible = primaryResult.passed;
  }

  // Collect all checks
  const allChecks = [...primaryResult.checks];
  if (alternateResult) {
    allChecks.push(...alternateResult.checks.map(c => ({ ...c, module: `ALT_${c.module}` })));
  }

  // Get failed requirements
  const failedRequirements = allChecks
    .filter(c => c.required && !c.passed)
    .map(c => c.explanation);

  // Build summary
  let summary: string;
  if (missingInputs.length > 0) {
    summary = `Missing required information: ${missingInputs.join(', ')}`;
  } else if (eligible) {
    summary = `You appear to meet ${batch.state_name}'s monetary eligibility requirements.`;
  } else {
    const failedCount = failedRequirements.length;
    summary = `You may not meet ${batch.state_name}'s monetary eligibility requirements (${failedCount} requirement${failedCount === 1 ? '' : 's'} not met).`;
  }

  return {
    eligible: eligible && missingInputs.length === 0,
    state_code: batch.state_code,
    state_name: batch.state_name,
    primary_path_passed: primaryResult.passed,
    alternate_path_passed: alternateResult?.passed ?? null,
    checks: allChecks,
    failed_requirements: failedRequirements,
    missing_inputs: missingInputs,
    summary,
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export function getStateBatch(stateCode: string): StateBatch | null {
  const batches = eligibilityBatches.state_batches as Record<string, StateBatch>;
  return batches[stateCode] || null;
}

export function getStatesRequiringHours(): string[] {
  return eligibilityBatches.batch_index.by_primary_module.HOURS_WORKED;
}

export function getStatesRequiringWeeks(): string[] {
  return eligibilityBatches.batch_index.by_primary_module.WEEKS_WORKED;
}

export function getStatesByPrimaryModule(module: string): string[] {
  const index = eligibilityBatches.batch_index.by_primary_module as Record<string, string[]>;
  return index[module] || [];
}
