'use client';

import { useState, useCallback, useMemo } from 'react';
import {
    type MonetaryEligibilityInput,
    type HighestQuarterInput,
    type SeparationDetails,
    convertToMonetaryInputs,
} from '@/lib/engine/schemas/eligibility-questions';
import {
    runMonetaryEligibility,
    getRequiredInputs,
    type MonetaryEligibilityResult,
} from '@/lib/engine/pipeline/monetary-eligibility';

// ============================================================================
// TYPES
// ============================================================================

export interface QuestionnaireAnswers {
    state_code?: string;
    base_period_wages?: number;
    quarters_with_wages?: number;
    highest_quarter_wages?: HighestQuarterInput;
    hours_worked?: number;
    weeks_worked?: number;
    separation?: SeparationDetails;
}

export interface ConditionalSteps {
    needsHours: boolean;
    needsWeeks: boolean;
    minHours?: number;
    minWeeks?: number;
}

export type StepId =
    | 'state'
    | 'wages'
    | 'quarters'
    | 'highest_quarter'
    | 'hours'
    | 'weeks'
    | 'separation';

export interface QuestionnaireState {
    currentStep: StepId;
    answers: QuestionnaireAnswers;
    conditionalSteps: ConditionalSteps;
    monetaryResult: MonetaryEligibilityResult | null;
    isLoading: boolean;
    error: string | null;
}

// ============================================================================
// STEP ORDER LOGIC
// ============================================================================

function getStepOrder(conditionalSteps: ConditionalSteps): StepId[] {
    const steps: StepId[] = ['state', 'wages', 'quarters', 'highest_quarter'];

    if (conditionalSteps.needsHours) {
        steps.push('hours');
    }
    if (conditionalSteps.needsWeeks) {
        steps.push('weeks');
    }

    steps.push('separation');
    return steps;
}

function getNextStep(currentStep: StepId, conditionalSteps: ConditionalSteps): StepId | null {
    const order = getStepOrder(conditionalSteps);
    const currentIndex = order.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex >= order.length - 1) {
        return null;
    }
    return order[currentIndex + 1];
}

function getPrevStep(currentStep: StepId, conditionalSteps: ConditionalSteps): StepId | null {
    const order = getStepOrder(conditionalSteps);
    const currentIndex = order.indexOf(currentStep);
    if (currentIndex <= 0) {
        return null;
    }
    return order[currentIndex - 1];
}

// ============================================================================
// HOOK
// ============================================================================

export function useQuestionnaireFlow() {
    const [state, setState] = useState<QuestionnaireState>({
        currentStep: 'state',
        answers: {},
        conditionalSteps: { needsHours: false, needsWeeks: false },
        monetaryResult: null,
        isLoading: false,
        error: null,
    });

    // Calculate step info
    const stepOrder = useMemo(() =>
        getStepOrder(state.conditionalSteps),
        [state.conditionalSteps]
    );

    const currentStepIndex = stepOrder.indexOf(state.currentStep);
    const totalSteps = stepOrder.length;
    const progress = ((currentStepIndex + 1) / totalSteps) * 100;

    // Update answers for current step
    const updateAnswers = useCallback((updates: Partial<QuestionnaireAnswers>) => {
        setState(prev => {
            const newAnswers = { ...prev.answers, ...updates };

            // If state changed, recalculate conditional steps
            let newConditionalSteps = prev.conditionalSteps;
            if (updates.state_code && updates.state_code !== prev.answers.state_code) {
                const required = getRequiredInputs(updates.state_code);
                newConditionalSteps = {
                    needsHours: required.needs_hours,
                    needsWeeks: required.needs_weeks,
                    minHours: required.min_hours,
                    minWeeks: required.min_weeks,
                };
            }

            return {
                ...prev,
                answers: newAnswers,
                conditionalSteps: newConditionalSteps,
                error: null,
            };
        });
    }, []);

    // Go to next step
    const nextStep = useCallback(() => {
        setState(prev => {
            const next = getNextStep(prev.currentStep, prev.conditionalSteps);
            if (!next) return prev;

            return {
                ...prev,
                currentStep: next,
                error: null,
            };
        });
    }, []);

    // Go to previous step
    const prevStep = useCallback(() => {
        setState(prev => {
            const previous = getPrevStep(prev.currentStep, prev.conditionalSteps);
            if (!previous) return prev;

            return {
                ...prev,
                currentStep: previous,
                error: null,
            };
        });
    }, []);

    // Run monetary eligibility check (after step 4 or conditional steps)
    const runMonetaryCheck = useCallback(() => {
        const { answers, conditionalSteps } = state;

        if (!answers.state_code ||
            answers.base_period_wages === undefined ||
            answers.quarters_with_wages === undefined ||
            !answers.highest_quarter_wages) {
            setState(prev => ({ ...prev, error: 'Missing required answers' }));
            return null;
        }

        // Check if conditional inputs are required but missing
        if (conditionalSteps.needsHours && answers.hours_worked === undefined) {
            setState(prev => ({ ...prev, error: 'Hours worked is required for this state' }));
            return null;
        }
        if (conditionalSteps.needsWeeks && answers.weeks_worked === undefined) {
            setState(prev => ({ ...prev, error: 'Weeks worked is required for this state' }));
            return null;
        }

        const monetaryInput: MonetaryEligibilityInput = {
            state_code: answers.state_code,
            base_period_wages: answers.base_period_wages,
            quarters_with_wages: answers.quarters_with_wages,
            highest_quarter_wages: answers.highest_quarter_wages,
            hours_worked: answers.hours_worked,
            weeks_worked: answers.weeks_worked,
        };

        const monetaryInputs = convertToMonetaryInputs(monetaryInput);
        const result = runMonetaryEligibility(monetaryInputs);

        setState(prev => ({ ...prev, monetaryResult: result }));
        return result;
    }, [state]);

    // Check if we should run monetary check (before separation step)
    const shouldRunMonetaryCheck = useCallback(() => {
        const { currentStep, conditionalSteps, monetaryResult } = state;

        // Run check when moving to separation step and haven't run yet
        if (currentStep === 'separation' && !monetaryResult) {
            return true;
        }

        // Also run when on last monetary step before separation
        const order = getStepOrder(conditionalSteps);
        const sepIndex = order.indexOf('separation');
        const currentIndex = order.indexOf(currentStep);

        return currentIndex === sepIndex - 1 && !monetaryResult;
    }, [state]);

    // Submit current step and advance
    const submitStep = useCallback((data: Partial<QuestionnaireAnswers>) => {
        updateAnswers(data);

        // Check if we need to run monetary before advancing to separation
        setState(prev => {
            const next = getNextStep(prev.currentStep, prev.conditionalSteps);

            if (next === 'separation' && !prev.monetaryResult) {
                // Build inputs and run check
                const allAnswers = { ...prev.answers, ...data };

                if (allAnswers.state_code &&
                    allAnswers.base_period_wages !== undefined &&
                    allAnswers.quarters_with_wages !== undefined &&
                    allAnswers.highest_quarter_wages) {

                    const monetaryInput: MonetaryEligibilityInput = {
                        state_code: allAnswers.state_code,
                        base_period_wages: allAnswers.base_period_wages,
                        quarters_with_wages: allAnswers.quarters_with_wages,
                        highest_quarter_wages: allAnswers.highest_quarter_wages,
                        hours_worked: allAnswers.hours_worked,
                        weeks_worked: allAnswers.weeks_worked,
                    };

                    const monetaryInputs = convertToMonetaryInputs(monetaryInput);
                    const result = runMonetaryEligibility(monetaryInputs);

                    return {
                        ...prev,
                        answers: allAnswers,
                        currentStep: next,
                        monetaryResult: result,
                        error: null,
                    };
                }
            }

            return {
                ...prev,
                answers: { ...prev.answers, ...data },
                currentStep: next || prev.currentStep,
                error: null,
            };
        });
    }, [updateAnswers]);

    // Reset flow
    const reset = useCallback(() => {
        setState({
            currentStep: 'state',
            answers: {},
            conditionalSteps: { needsHours: false, needsWeeks: false },
            monetaryResult: null,
            isLoading: false,
            error: null,
        });
    }, []);

    return {
        // State
        currentStep: state.currentStep,
        answers: state.answers,
        conditionalSteps: state.conditionalSteps,
        monetaryResult: state.monetaryResult,
        isLoading: state.isLoading,
        error: state.error,

        // Computed
        stepOrder,
        currentStepIndex,
        totalSteps,
        progress,
        canGoBack: currentStepIndex > 0,
        canGoNext: currentStepIndex < totalSteps - 1,
        isLastStep: state.currentStep === 'separation',

        // Actions
        updateAnswers,
        nextStep,
        prevStep,
        submitStep,
        runMonetaryCheck,
        shouldRunMonetaryCheck,
        reset,
    };
}

export type QuestionnaireFlow = ReturnType<typeof useQuestionnaireFlow>;
