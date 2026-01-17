'use client';

import { type getStrings } from '@/lib/i18n/strings';

export interface BenefitData {
    weekly_benefit_amount: number;
    max_duration_weeks: number;
    total_potential: number;
    state_name?: string;
}

interface BenefitsDisplayProps {
    benefits: BenefitData;
    stateCode: string;
    strings: ReturnType<typeof getStrings>;
}

export function BenefitsDisplay({ benefits, stateCode, strings }: BenefitsDisplayProps) {
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
                {strings.maxPotentialBenefits}
            </h3>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {/* Weekly Amount */}
                <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-emerald-700">
                        {formatCurrency(benefits.weekly_benefit_amount)}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        {strings.weekly}
                    </div>
                </div>

                {/* Duration */}
                <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-emerald-700">
                        {benefits.max_duration_weeks}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        {strings.weeksLabel}
                    </div>
                </div>

                {/* Total */}
                <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-emerald-700">
                        {formatCurrency(benefits.total_potential)}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        {strings.totalMax}
                    </div>
                </div>
            </div>

            <p className="mt-4 text-sm text-emerald-700 text-center">
                {strings.benefitsDisclaimer(stateCode)}
            </p>
        </div>
    );
}

export default BenefitsDisplay;
