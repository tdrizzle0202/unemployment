/**
 * BenefitPath AI Engine
 *
 * Main entry point for the unemployment assessment engine.
 * THE BRAIN - All AI and calculation logic lives here.
 */

// Pipeline functions
export {
  retrieveHandbookSections,
  retrieveMultipleQueries,
  type HandbookSection,
} from './pipeline/retrieve';

export {
  runAssessment,
  runPartialAssessment,
  type UserInputs,
  type AssessmentResult,
} from './pipeline/assess';

export {
  calculateBenefits,
  getStateRules,
  type BenefitCalculation,
} from './pipeline/calculate';

export {
  runMonetaryEligibility,
  getRequiredInputs,
  getStateBatch,
  getStatesRequiringHours,
  getStatesRequiringWeeks,
  getStatesByPrimaryModule,
  type MonetaryInputs,
  type MonetaryEligibilityResult,
  type ModuleCheckResult,
} from './pipeline/monetary-eligibility';

// Prompts
export {
  buildEligibilityPrompt,
  buildConversationalPrompt,
} from './prompts/eligibility';

// Schemas for validation
export * from './schemas';

// User input conversion utilities
export {
  convertUserFlowToInputs,
  convertSeparationToReason,
  convertMonetaryEligibilityInputs,
  getPreliminaryRiskLevel,
  getPreliminaryMessage,
} from './utils/input-converter';
