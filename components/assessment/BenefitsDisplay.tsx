'use client';

import { cn } from '@/lib/utils/cn';

export interface BenefitData {
    weekly_benefit_amount: number;
    max_duration_weeks: number;
    total_potential: number;
    state_name?: string;
}

interface BenefitsDisplayProps {
    benefits: BenefitData;
    stateCode: string;
}

export function BenefitsDisplay({ benefits, stateCode }: BenefitsDisplayProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl">
            <h3 className="text-lg font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Maximum Potential Benefits
            </h3>

            <div className="grid grid-cols-3 gap-4">
                {/* Weekly Amount */}
                <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-700">
                        {formatCurrency(benefits.weekly_benefit_amount)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        Weekly Payment
                    </div>
                </div>

                {/* Duration */}
                <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-700">
                        {benefits.max_duration_weeks}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        Weeks Available
                    </div>
                </div>

                {/* Total */}
                <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-700">
                        {formatCurrency(benefits.total_potential)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        Total Maximum
                    </div>
                </div>
            </div>

            <p className="mt-4 text-sm text-emerald-700 text-center">
                Based on {stateCode}&apos;s 2025 unemployment benefit rates.
                Actual benefits depend on your earnings history.
            </p>
        </div>
    );
}

export default BenefitsDisplay;
