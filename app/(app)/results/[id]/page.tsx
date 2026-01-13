import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { LikelihoodBadge } from '@/components/assessment/likelihood-badge';
import { CitationLink } from '@/components/assessment/citation-link';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Define type for session - database types may not include this table yet
  type SessionData = {
    id: string;
    state_code: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    user_inputs: Record<string, unknown>;
    eligibility_assessments?: Array<{
      eligibility_likelihood: string;
      confidence_score: number;
      reasoning: string;
      risk_factors: string[];
      citations: Array<{ section_id: string; section_title: string; content_excerpt: string }>;
    }>;
    benefit_calculations?: Array<{
      weekly_benefit_amount: number;
      max_duration_weeks: number;
    }>;
    outcomes?: Array<{
      reported_outcome: string;
    }>;
  };

  // Fetch the assessment session with related data
  const { data: session, error } = await supabase
    .from('assessment_sessions')
    .select(`
      *,
      eligibility_assessments (*),
      benefit_calculations (*),
      outcomes (*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single() as { data: SessionData | null; error: unknown };

  if (error || !session) {
    notFound();
  }

  const assessment = session.eligibility_assessments?.[0];
  const calculation = session.benefit_calculations?.[0];
  const outcome = session.outcomes?.[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-500 mb-4 inline-block"
          >
            &larr; Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              {session.state_code} Assessment Results
            </h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${session.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
              }`}>
              {session.status}
            </span>
          </div>
          <p className="mt-2 text-gray-600">
            Started on {new Date(session.started_at).toLocaleDateString()}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Eligibility Assessment */}
            {assessment && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Eligibility Assessment
                </h2>

                <div className="flex items-center space-x-4 mb-6">
                  <LikelihoodBadge likelihood={assessment.eligibility_likelihood as 'high' | 'medium' | 'low'} />
                  <span className="text-gray-500">
                    {assessment.confidence_score}% confidence
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Reasoning</h3>
                  <p className="text-gray-600">{assessment.reasoning}</p>
                </div>

                {assessment.risk_factors && assessment.risk_factors.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Risk Factors</h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      {assessment.risk_factors.map((factor: string, index: number) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {assessment.citations && assessment.citations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Citations</h3>
                    <div className="space-y-2">
                      {assessment.citations.map((citation: { section_id: string; section_title: string; content_excerpt: string }, index: number) => (
                        <CitationLink key={index} citation={citation} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Inputs */}
            {session.user_inputs && Object.keys(session.user_inputs).length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Information Provided
                </h2>
                <dl className="space-y-4">
                  {Object.entries(session.user_inputs).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm font-medium text-gray-500 capitalize">
                        {key.replace(/_/g, ' ')}
                      </dt>
                      <dd className="mt-1 text-gray-900">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Benefit Calculation */}
            {calculation && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Estimated Benefits
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Weekly Benefit</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${calculation.weekly_benefit_amount?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Maximum Duration</p>
                    <p className="text-lg font-medium text-gray-900">
                      {calculation.max_duration_weeks} weeks
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">Total Potential</p>
                    <p className="text-xl font-bold text-green-600">
                      ${(calculation.weekly_benefit_amount * calculation.max_duration_weeks).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Outcome Reporting */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Report Outcome
              </h2>
              {outcome ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Reported outcome:</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${outcome.reported_outcome === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : outcome.reported_outcome === 'denied'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {outcome.reported_outcome}
                  </span>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Help us improve by sharing your actual outcome.
                  </p>
                  <Link
                    href={`/results/${id}/feedback`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Report Outcome
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
