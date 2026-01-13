'use client';

import { cn } from '@/lib/utils/cn';

export type AssessmentLikelihood = 'most_likely' | 'likely' | 'uncertain';

export interface AssessmentResultData {
    assessment: AssessmentLikelihood;
    confidence_score: number;
    reasoning_summary: string;
    risk_factors: string[];
    key_citations: string[];
}

interface AssessmentResultsProps {
    result: AssessmentResultData;
}

const LIKELIHOOD_CONFIG = {
    most_likely: {
        label: 'Most Likely Eligible',
        description: 'Based on your situation, you have a strong case for unemployment benefits.',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        badgeColor: 'bg-green-500',
        icon: (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
        ),
    },
    likely: {
        label: 'Likely Eligible',
        description: 'Your case looks promising, though there are some factors to be aware of.',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        badgeColor: 'bg-yellow-500',
        icon: (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
        ),
    },
    uncertain: {
        label: 'Uncertain Eligibility',
        description: 'We need more information to make a clear determination.',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-800',
        badgeColor: 'bg-gray-500',
        icon: (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
        ),
    },
};

export function AssessmentResults({ result }: AssessmentResultsProps) {
    const config = LIKELIHOOD_CONFIG[result.assessment];

    return (
        <div className="space-y-6">
            {/* Main Result Card */}
            <div className={cn(
                'p-6 rounded-xl border-2',
                config.bgColor,
                config.borderColor
            )}>
                <div className="flex items-start gap-4">
                    <div className={cn(
                        'w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0',
                        config.badgeColor
                    )}>
                        {config.icon}
                    </div>
                    <div className="flex-1">
                        <h2 className={cn('text-2xl font-bold', config.textColor)}>
                            {config.label}
                        </h2>
                        <p className={cn('mt-1 text-sm', config.textColor, 'opacity-80')}>
                            {config.description}
                        </p>
                    </div>
                </div>

                {/* Confidence Score */}
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">
                            Confidence Score
                        </span>
                        <span className={cn('text-sm font-bold', config.textColor)}>
                            {result.confidence_score}%
                        </span>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden">
                        <div
                            className={cn('h-full rounded-full transition-all duration-500', config.badgeColor)}
                            style={{ width: `${result.confidence_score}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Reasoning Summary */}
            <div className="p-5 bg-white border border-gray-200 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Our Analysis
                </h3>
                <p className="text-gray-700 leading-relaxed">
                    {result.reasoning_summary}
                </p>
            </div>

            {/* Risk Factors */}
            {result.risk_factors.length > 0 && (
                <div className="p-5 bg-orange-50 border border-orange-200 rounded-xl">
                    <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Factors to Consider
                    </h3>
                    <ul className="space-y-2">
                        {result.risk_factors.map((factor, index) => (
                            <li key={index} className="flex items-start gap-2 text-orange-700">
                                <span className="mt-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0" />
                                <span>{factor}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Citations */}
            {result.key_citations.length > 0 && (
                <details className="group">
                    <summary className="cursor-pointer p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-100 transition-colors">
                        <span className="font-medium text-gray-700 flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Legal References ({result.key_citations.length})
                        </span>
                        <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </summary>
                    <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                        <ul className="space-y-1 text-sm text-gray-600">
                            {result.key_citations.map((citation, index) => (
                                <li key={index} className="font-mono">
                                    [{citation}]
                                </li>
                            ))}
                        </ul>
                    </div>
                </details>
            )}

            {/* Disclaimer */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                    <strong>Note:</strong> This assessment is for informational purposes only and does not guarantee eligibility.
                    Your state&apos;s unemployment office will make the final determination.
                </p>
            </div>
        </div>
    );
}

export default AssessmentResults;
