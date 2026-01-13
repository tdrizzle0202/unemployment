'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import {
    useQuestionnaireFlow,
    type StepId,
    type QuestionnaireFlow
} from '@/lib/hooks/useQuestionnaireFlow';
import {
    US_STATES,
    QUARTERS_WITH_WAGES_OPTIONS,
} from '@/lib/engine/schemas/eligibility-questions';
import { SeparationChat } from './SeparationChat';
import { AssessmentResults, type AssessmentResultData } from './AssessmentResults';
import { BenefitsDisplay, type BenefitData } from './BenefitsDisplay';

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepProps {
    flow: QuestionnaireFlow;
    onNext: () => void;
}

function StateStep({ flow, onNext }: StepProps) {
    const [value, setValue] = useState(flow.answers.state_code || '');

    const handleSubmit = () => {
        if (value) {
            flow.submitStep({ state_code: value });
            onNext();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">
                    In which state did you work?
                </h2>
                <p className="mt-2 text-gray-600">
                    This determines which state&apos;s unemployment rules apply to you.
                </p>
            </div>

            <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="">Select your state...</option>
                {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                        {state.name}
                    </option>
                ))}
            </select>

            <button
                onClick={handleSubmit}
                disabled={!value}
                className="w-full py-3 px-6 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Continue
            </button>
        </div>
    );
}

function WagesStep({ flow, onNext }: StepProps) {
    const [value, setValue] = useState(
        flow.answers.base_period_wages?.toString() || ''
    );

    const handleSubmit = () => {
        const wages = parseFloat(value.replace(/[,$]/g, ''));
        if (!isNaN(wages) && wages >= 0) {
            flow.submitStep({ base_period_wages: wages });
            onNext();
        }
    };

    const formatCurrency = (val: string) => {
        const num = parseFloat(val.replace(/[,$]/g, ''));
        if (isNaN(num)) return val;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(num);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">
                    Roughly how much did you earn (pre-tax) in the last 12 months?
                </h2>
                <p className="mt-2 text-gray-600">
                    Include wages from all jobs. Your best estimate is fine.
                </p>
            </div>

            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
                    onBlur={() => setValue(formatCurrency(value).replace('$', ''))}
                    placeholder="45,000"
                    className="block w-full pl-8 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={!value || parseFloat(value.replace(/[,$]/g, '')) < 0}
                className="w-full py-3 px-6 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Continue
            </button>
        </div>
    );
}

function QuartersStep({ flow, onNext }: StepProps) {
    const [value, setValue] = useState(
        flow.answers.quarters_with_wages?.toString() || ''
    );

    const handleSubmit = () => {
        const quarters = parseInt(value, 10);
        if (quarters >= 1 && quarters <= 4) {
            flow.submitStep({ quarters_with_wages: quarters });
            onNext();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">
                    In how many 3-month blocks (quarters) did you receive a paycheck?
                </h2>
                <p className="mt-2 text-gray-600">
                    A quarter is a 3-month period. If you worked all year, select 4.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {QUARTERS_WITH_WAGES_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setValue(option.value)}
                        className={cn(
                            'p-4 text-left border-2 rounded-lg transition-all',
                            value === option.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300'
                        )}
                    >
                        <div className="text-2xl font-bold">{option.value}</div>
                        <div className="text-sm text-gray-600 mt-1">
                            {option.label.replace(/^\d+ quarter[s]? /, '')}
                        </div>
                    </button>
                ))}
            </div>

            <button
                onClick={handleSubmit}
                disabled={!value}
                className="w-full py-3 px-6 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Continue
            </button>
        </div>
    );
}

function HighestQuarterStep({ flow, onNext }: StepProps) {
    const [mode, setMode] = useState<'specific' | 'even'>(
        flow.answers.highest_quarter_wages?.mode || 'even'
    );
    const [amount, setAmount] = useState(
        flow.answers.highest_quarter_wages?.mode === 'specific'
            ? (flow.answers.highest_quarter_wages as { mode: 'specific'; amount: number }).amount.toString()
            : ''
    );

    const handleSubmit = () => {
        if (mode === 'even') {
            flow.submitStep({ highest_quarter_wages: { mode: 'even' } });
            onNext();
        } else {
            const val = parseFloat(amount.replace(/[,$]/g, ''));
            if (!isNaN(val) && val >= 0) {
                flow.submitStep({ highest_quarter_wages: { mode: 'specific', amount: val } });
                onNext();
            }
        }
    };

    const isValid = mode === 'even' || (mode === 'specific' && amount && parseFloat(amount.replace(/[,$]/g, '')) >= 0);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">
                    What was your income during your highest-earning 3-month period?
                </h2>
                <p className="mt-2 text-gray-600">
                    If your income was steady, select &quot;approximately similar every period&quot;.
                </p>
            </div>

            <div className="space-y-4">
                <button
                    onClick={() => setMode('even')}
                    className={cn(
                        'w-full p-4 text-left border-2 rounded-lg transition-all',
                        mode === 'even'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                    )}
                >
                    <div className="font-medium">Approximately similar every period</div>
                    <div className="text-sm text-gray-600 mt-1">
                        My income was fairly consistent throughout the year
                    </div>
                </button>

                <button
                    onClick={() => setMode('specific')}
                    className={cn(
                        'w-full p-4 text-left border-2 rounded-lg transition-all',
                        mode === 'specific'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                    )}
                >
                    <div className="font-medium">I know my highest quarter amount</div>
                    <div className="text-sm text-gray-600 mt-1">
                        One quarter was notably higher than others
                    </div>
                </button>

                {mode === 'specific' && (
                    <div className="relative mt-4">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                        <input
                            type="text"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="15,000"
                            className="block w-full pl-8 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                )}
            </div>

            <button
                onClick={handleSubmit}
                disabled={!isValid}
                className="w-full py-3 px-6 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Continue
            </button>
        </div>
    );
}

function HoursStep({ flow, onNext }: StepProps) {
    const [value, setValue] = useState(
        flow.answers.hours_worked?.toString() || ''
    );
    const minHours = flow.conditionalSteps.minHours || 680;

    const handleSubmit = () => {
        const hours = parseInt(value, 10);
        if (!isNaN(hours) && hours >= 0) {
            flow.submitStep({ hours_worked: hours });
            onNext();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">
                    Approximately how many hours did you work in the last 12 months?
                </h2>
                <p className="mt-2 text-gray-600">
                    Your state requires at least {minHours} hours. Full-time is roughly 2,080 hours/year.
                </p>
            </div>

            <div className="relative">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="1,500"
                    min="0"
                    max="4000"
                    className="block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">hours</span>
            </div>

            <button
                onClick={handleSubmit}
                disabled={!value || parseInt(value, 10) < 0}
                className="w-full py-3 px-6 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Continue
            </button>
        </div>
    );
}

function WeeksStep({ flow, onNext }: StepProps) {
    const [value, setValue] = useState(
        flow.answers.weeks_worked?.toString() || ''
    );
    const minWeeks = flow.conditionalSteps.minWeeks || 20;

    const handleSubmit = () => {
        const weeks = parseInt(value, 10);
        if (!isNaN(weeks) && weeks >= 0 && weeks <= 52) {
            flow.submitStep({ weeks_worked: weeks });
            onNext();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">
                    Approximately how many weeks did you work in the last 12 months?
                </h2>
                <p className="mt-2 text-gray-600">
                    Your state requires at least {minWeeks} weeks. Count any week where you worked at least one day.
                </p>
            </div>

            <div className="relative">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="40"
                    min="0"
                    max="52"
                    className="block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">weeks</span>
            </div>

            <button
                onClick={handleSubmit}
                disabled={!value || parseInt(value, 10) < 0}
                className="w-full py-3 px-6 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Continue
            </button>
        </div>
    );
}

// Shown when user fails monetary eligibility - stops the flow here
function MonetaryFailureStep({ flow }: Omit<StepProps, 'onNext'>) {
    const monetaryResult = flow.monetaryResult;

    // Filter to show only relevant checks (required ones)
    const failedChecks = monetaryResult?.checks.filter(c => c.required && !c.passed) || [];
    const passedChecks = monetaryResult?.checks.filter(c => c.required && c.passed) || [];

    return (
        <div className="space-y-6">
            {/* Monetary Failure Banner */}
            <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-red-800">
                            Monetary Requirements Not Met
                        </h2>
                        <p className="mt-1 text-red-700">
                            {monetaryResult?.summary || 'Based on the information provided, you do not meet the monetary eligibility requirements for unemployment benefits.'}
                        </p>
                    </div>
                </div>

                {/* Show detailed checks */}
                {(failedChecks.length > 0 || passedChecks.length > 0) && (
                    <div className="mt-6 space-y-3">
                        <h3 className="font-semibold text-red-800">Eligibility Check Details:</h3>

                        {/* Failed checks first */}
                        {failedChecks.map((check, i) => (
                            <div key={`fail-${i}`} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                                <span className="text-red-500 font-bold mt-0.5">✗</span>
                                <div>
                                    <span className="font-medium text-red-800 capitalize">
                                        {check.module.replace(/_/g, ' ')}
                                    </span>
                                    <p className="text-sm text-red-700">{check.explanation}</p>
                                </div>
                            </div>
                        ))}

                        {/* Passed checks */}
                        {passedChecks.map((check, i) => (
                            <div key={`pass-${i}`} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                                <span className="text-green-500 font-bold mt-0.5">✓</span>
                                <div>
                                    <span className="font-medium text-green-800 capitalize">
                                        {check.module.replace(/_/g, ' ')}
                                    </span>
                                    <p className="text-sm text-green-700">{check.explanation}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* What You Can Do */}
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="font-semibold text-blue-900 mb-3">What You Can Do</h3>
                <ul className="space-y-2 text-blue-800">
                    <li className="flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>Contact your state&apos;s unemployment office to discuss your specific situation</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>Some states have alternative base period calculations that may help you qualify</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>If your circumstances have changed, you may be able to reapply later</span>
                    </li>
                </ul>
            </div>

            {/* Start Over Button */}
            <button
                onClick={flow.reset}
                className="w-full py-3 px-6 text-lg font-medium text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
                Start Over
            </button>
        </div>
    );
}


// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

function ProgressIndicator({
    currentStep,
    totalSteps,
    stepOrder
}: {
    currentStep: number;
    totalSteps: number;
    stepOrder: StepId[];
}) {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                    Step {currentStep + 1} of {totalSteps}
                </span>
                <span className="text-sm text-gray-500">
                    {Math.round(((currentStep + 1) / totalSteps) * 100)}%
                </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
            </div>
            <div className="flex justify-between mt-2">
                {stepOrder.map((step, i) => (
                    <div
                        key={step}
                        className={cn(
                            'w-3 h-3 rounded-full',
                            i <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN QUESTIONNAIRE COMPONENT
// ============================================================================

export function Questionnaire() {
    const flow = useQuestionnaireFlow();
    const [isAssessing, setIsAssessing] = useState(false);
    const [assessmentResult, setAssessmentResult] = useState<AssessmentResultData | null>(null);
    const [benefitData, setBenefitData] = useState<BenefitData | null>(null);

    const handleSubmitAssessment = async (narrative: string) => {
        if (!flow.answers.state_code || !flow.answers.base_period_wages) {
            return;
        }

        setIsAssessing(true);

        try {
            // Calculate highest quarter wages
            let hqWages = flow.answers.base_period_wages / 4;
            if (flow.answers.highest_quarter_wages?.mode === 'specific') {
                hqWages = flow.answers.highest_quarter_wages.amount;
            }

            const response = await fetch('/api/separation-assess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    state_code: flow.answers.state_code,
                    separation_narrative: narrative,
                    base_period_wages: flow.answers.base_period_wages,
                    highest_quarter_wages: hqWages,
                }),
            });

            if (!response.ok) {
                throw new Error('Assessment failed');
            }

            const data = await response.json();

            setAssessmentResult({
                assessment: data.assessment.likelihood,
                confidence_score: data.assessment.confidence_score,
                reasoning_summary: data.assessment.reasoning_summary,
                risk_factors: data.assessment.risk_factors,
                key_citations: data.assessment.key_citations,
            });

            if (data.benefit_calculation) {
                setBenefitData(data.benefit_calculation);
            }
        } catch (error) {
            console.error('Assessment error:', error);
            // Set a fallback uncertain result
            setAssessmentResult({
                assessment: 'uncertain',
                confidence_score: 30,
                reasoning_summary: 'We encountered an issue analyzing your case. Please try again or contact your state unemployment office for assistance.',
                risk_factors: ['Unable to complete automated analysis'],
                key_citations: [],
            });
        } finally {
            setIsAssessing(false);
        }
    };

    const renderStep = () => {
        const onNext = () => { };  // Handled internally by each step

        switch (flow.currentStep) {
            case 'state':
                return <StateStep flow={flow} onNext={onNext} />;
            case 'wages':
                return <WagesStep flow={flow} onNext={onNext} />;
            case 'quarters':
                return <QuartersStep flow={flow} onNext={onNext} />;
            case 'highest_quarter':
                return <HighestQuarterStep flow={flow} onNext={onNext} />;
            case 'hours':
                return <HoursStep flow={flow} onNext={onNext} />;
            case 'weeks':
                return <WeeksStep flow={flow} onNext={onNext} />;
            case 'separation':
                // Check monetary eligibility first
                if (flow.monetaryResult && !flow.monetaryResult.eligible) {
                    // Stop here - show failure
                    return <MonetaryFailureStep flow={flow} />;
                }

                // If we have assessment results, show those
                if (assessmentResult) {
                    return (
                        <div className="space-y-6">
                            <AssessmentResults result={assessmentResult} />
                            {benefitData && flow.answers.state_code && (
                                <BenefitsDisplay
                                    benefits={benefitData}
                                    stateCode={flow.answers.state_code}
                                />
                            )}
                            <button
                                onClick={() => {
                                    flow.reset();
                                    setAssessmentResult(null);
                                    setBenefitData(null);
                                }}
                                className="w-full py-3 px-6 text-lg font-medium text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                Start New Assessment
                            </button>
                        </div>
                    );
                }

                // Show chat for separation reason
                return (
                    <SeparationChat
                        flow={flow}
                        onSubmitAssessment={handleSubmitAssessment}
                        isAssessing={isAssessing}
                    />
                );
            default:
                return null;
        }
    };

    // Don't show progress if we're on the assessment results
    const showProgress = !assessmentResult && !(flow.currentStep === 'separation' && flow.monetaryResult && !flow.monetaryResult.eligible);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8">
                {showProgress && (
                    <ProgressIndicator
                        currentStep={flow.currentStepIndex}
                        totalSteps={flow.totalSteps}
                        stepOrder={flow.stepOrder}
                    />
                )}

                {flow.error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {flow.error}
                    </div>
                )}

                {renderStep()}

                {/* Back button - don't show on results or failure screens */}
                {flow.canGoBack && !assessmentResult && !(flow.currentStep === 'separation' && flow.monetaryResult && !flow.monetaryResult.eligible) && (
                    <button
                        onClick={flow.prevStep}
                        className="mt-4 w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        ← Back
                    </button>
                )}
            </div>
        </div>
    );
}

export default Questionnaire;
