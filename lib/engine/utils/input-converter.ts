import type { UserInputs } from '../pipeline/assess';
import type {
    UserEligibilityFlow,
    SeparationDetails,
    FiredReason,
    QuitReason,
    MonetaryEligibilityInput,
    MonetaryInputs,
} from '../schemas/eligibility-questions';
import { convertToMonetaryInputs } from '../schemas/eligibility-questions';

// ============================================================================
// CONVERT USER-FRIENDLY INPUTS TO TECHNICAL FORMAT
// ============================================================================

/**
 * Converts the user-friendly separation details to a technical separation reason string
 * that the eligibility assessment engine can understand.
 */
export function convertSeparationToReason(separation: SeparationDetails): string {
    switch (separation.category) {
        case 'laid_off':
            return 'Laid off - position eliminated due to business reasons';

        case 'company_closed':
            return 'Laid off - company closure or mass layoff';

        case 'let_go':
            return convertFiredReason(separation.fired_reason);

        case 'quit':
            return convertQuitReason(separation.quit_reason, separation.quit_details);

        case 'hours_reduced':
            const reduction = separation.reduction_percentage;
            if (reduction && reduction >= 50) {
                return `Hours significantly reduced by ${reduction}% - constructive layoff`;
            }
            return 'Hours significantly reduced - potential constructive layoff';

        case 'contract_ended':
            return 'Contract or seasonal work ended - scheduled termination';

        case 'other':
            return separation.description || 'Separation reason unclear';

        default:
            return 'Separation reason not specified';
    }
}

function convertFiredReason(reason: FiredReason): string {
    switch (reason) {
        case 'performance':
            return 'Terminated - performance issues or not meeting job requirements';
        case 'policy_violation':
            return 'Terminated - violation of company policy (potential misconduct)';
        case 'attendance':
            return 'Terminated - attendance or punctuality issues (potential misconduct)';
        case 'economic':
            return 'Laid off - economic/budget reasons presented as termination';
        case 'unclear':
            return 'Terminated - reason not clearly communicated by employer';
        default:
            return 'Terminated - reason unknown';
    }
}

function convertQuitReason(reason: QuitReason, details?: string): string {
    const detailsSuffix = details ? ` (${details})` : '';

    switch (reason) {
        case 'unsafe_conditions':
            return `Quit - unsafe or unhealthy working conditions (good cause)${detailsSuffix}`;
        case 'harassment':
            return `Quit - workplace harassment or discrimination (good cause)${detailsSuffix}`;
        case 'pay_schedule_change':
            return `Quit - substantial change in pay or working conditions (good cause)${detailsSuffix}`;
        case 'medical':
            return `Quit - medical or health reasons (potential good cause)${detailsSuffix}`;
        case 'family_emergency':
            return `Quit - family emergency or caregiving responsibilities (potential good cause)${detailsSuffix}`;
        case 'spouse_relocation':
            return `Quit - relocated due to spouse's employment (varies by state)${detailsSuffix}`;
        case 'personal':
            return `Quit - personal reasons (no documented good cause)${detailsSuffix}`;
        case 'new_job':
            return `Quit - accepted another job opportunity${detailsSuffix}`;
        case 'other':
            return `Quit - other reason${detailsSuffix}`;
        default:
            return `Quit - reason not specified${detailsSuffix}`;
    }
}

// ============================================================================
// MAIN CONVERTER FUNCTION
// ============================================================================

/**
 * Converts the complete user-friendly eligibility flow to the technical
 * UserInputs format expected by the assessment engine.
 */
export function convertUserFlowToInputs(flow: UserEligibilityFlow): UserInputs {
    // Convert monetary inputs to quarterly wages
    const monetaryInputs = convertToMonetaryInputs({
        state_code: flow.state_code,
        base_period_wages: flow.base_period_wages,
        quarters_with_wages: flow.quarters_with_wages,
        highest_quarter_wages: flow.highest_quarter_wages,
        hours_worked: flow.hours_worked,
        weeks_worked: flow.weeks_worked,
    });

    return {
        state_code: flow.state_code,
        separation_reason: flow.separation
            ? convertSeparationToReason(flow.separation)
            : 'Separation reason not provided',
        quarterly_earnings: monetaryInputs.quarterly_wages,
    };
}

/**
 * Convert monetary eligibility inputs directly to MonetaryInputs for pipeline
 */
export function convertMonetaryEligibilityInputs(input: MonetaryEligibilityInput): MonetaryInputs {
    return convertToMonetaryInputs(input);
}

// ============================================================================
// RISK INDICATOR HELPERS
// ============================================================================

/**
 * Provides early warning about potential eligibility issues based on user selections.
 * This is for UI feedback purposes - the actual assessment is done by the LLM.
 */
export function getPreliminaryRiskLevel(separation: SeparationDetails): 'low' | 'medium' | 'high' {
    switch (separation.category) {
        case 'laid_off':
        case 'company_closed':
        case 'contract_ended':
            return 'low';

        case 'hours_reduced':
            return 'low'; // Often qualifies as constructive layoff

        case 'let_go':
            if (separation.fired_reason === 'economic' || separation.fired_reason === 'performance') {
                return 'medium';
            }
            if (separation.fired_reason === 'policy_violation' || separation.fired_reason === 'attendance') {
                return 'high'; // Potential misconduct
            }
            return 'medium';

        case 'quit':
            // Good cause quits
            if (['unsafe_conditions', 'harassment', 'pay_schedule_change'].includes(separation.quit_reason)) {
                return 'medium';
            }
            // Potential good cause
            if (['medical', 'family_emergency', 'spouse_relocation'].includes(separation.quit_reason)) {
                return 'medium';
            }
            // No good cause
            return 'high';

        case 'other':
            return 'medium';

        default:
            return 'medium';
    }
}

/**
 * Returns user-friendly message about their situation based on preliminary indicators.
 */
export function getPreliminaryMessage(separation: SeparationDetails): string {
    const risk = getPreliminaryRiskLevel(separation);

    switch (risk) {
        case 'low':
            return "Good news! Your situation typically qualifies for unemployment benefits. Let's continue to estimate your potential benefits.";

        case 'medium':
            return "Your situation may qualify for benefits depending on the specific circumstances. We'll gather more details to give you a better assessment.";

        case 'high':
            return "Your situation might face some challenges with eligibility. Don't worry though - many people in similar situations still qualify. Let's continue to get the full picture.";

        default:
            return "Let's continue gathering information to assess your eligibility.";
    }
}
