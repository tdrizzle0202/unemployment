import { LikelihoodBadge } from './likelihood-badge';

interface BenefitSummaryProps {
  likelihood?: 'high' | 'medium' | 'low';
  confidenceScore?: number;
  weeklyAmount?: number;
  maxWeeks?: number;
}

export function BenefitSummary({
  likelihood,
  confidenceScore,
  weeklyAmount,
  maxWeeks,
}: BenefitSummaryProps) {
  const totalPotential = weeklyAmount && maxWeeks ? weeklyAmount * maxWeeks : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Assessment Summary
        </h3>

        {likelihood && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Eligibility</p>
            <LikelihoodBadge likelihood={likelihood} size="lg" />
          </div>
        )}

        {confidenceScore !== undefined && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">Confidence Score</p>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${confidenceScore}%` }}
                />
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                {confidenceScore}%
              </span>
            </div>
          </div>
        )}
      </div>

      {(weeklyAmount || maxWeeks || totalPotential) && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Estimated Benefits
          </h4>

          {weeklyAmount && (
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-gray-500">Weekly Amount</span>
              <span className="text-lg font-semibold text-gray-900">
                ${weeklyAmount.toLocaleString()}
              </span>
            </div>
          )}

          {maxWeeks && (
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-gray-500">Maximum Weeks</span>
              <span className="text-lg font-medium text-gray-900">
                {maxWeeks} weeks
              </span>
            </div>
          )}

          {totalPotential && (
            <div className="flex justify-between items-baseline pt-2 border-t border-gray-100 mt-2">
              <span className="text-sm font-medium text-gray-700">Total Potential</span>
              <span className="text-xl font-bold text-green-600">
                ${totalPotential.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Disclaimer</p>
        <p>
          This is an estimate based on the information provided. Actual eligibility
          and benefit amounts are determined by your state&apos;s unemployment office.
        </p>
      </div>
    </div>
  );
}
