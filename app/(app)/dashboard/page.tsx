import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Define type for sessions - database types may not include this table yet
  type SessionData = {
    id: string;
    state_code: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    eligibility_assessments?: Array<{
      eligibility_likelihood: string;
      confidence_score: number;
    }>;
    benefit_calculations?: Array<{
      weekly_benefit_amount: number;
      max_duration_weeks: number;
    }>;
  };

  // Fetch user's assessment sessions
  const { data: sessions } = await supabase
    .from('assessment_sessions')
    .select(`
      id,
      state_code,
      status,
      started_at,
      completed_at,
      eligibility_assessments (
        eligibility_likelihood,
        confidence_score
      ),
      benefit_calculations (
        weekly_benefit_amount,
        max_duration_weeks
      )
    `)
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(10) as { data: SessionData[] | null };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <Link
            href="/assess"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            New Assessment
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Assessments</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {sessions?.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Completed</h3>
            <p className="mt-2 text-3xl font-semibold text-green-600">
              {sessions?.filter(s => s.status === 'completed').length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
            <p className="mt-2 text-3xl font-semibold text-yellow-600">
              {sessions?.filter(s => s.status === 'in_progress').length || 0}
            </p>
          </div>
        </div>

        {/* Recent Assessments */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Assessments</h2>
          </div>

          {sessions && sessions.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={`/results/${session.id}`}
                    className="block hover:bg-gray-50 px-6 py-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.state_code} Assessment
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(session.started_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        {session.eligibility_assessments?.[0] && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${session.eligibility_assessments[0].eligibility_likelihood === 'high'
                              ? 'bg-green-100 text-green-800'
                              : session.eligibility_assessments[0].eligibility_likelihood === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                            {session.eligibility_assessments[0].eligibility_likelihood}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${session.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : session.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No assessments yet.</p>
              <Link
                href="/assess"
                className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Start your first assessment
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
