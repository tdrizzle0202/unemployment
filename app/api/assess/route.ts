import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { runAssessment, calculateBenefits } from '@/lib/engine';

const AssessRequestSchema = z.object({
  session_id: z.string().uuid().optional(),
  state_code: z.string().length(2).toUpperCase(),
  user_message: z.string().min(1).max(5000),
  user_inputs: z.object({
    separation_reason: z.string().optional(),
    employment_dates: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
    quarterly_earnings: z.array(z.number()).optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = AssessRequestSchema.parse(body);

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Create or get session
    let sessionId = validated.session_id;

    if (!sessionId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: session, error } = await (supabase as any)
        .from('assessment_sessions')
        .insert({
          user_id: user?.id,
          state_code: validated.state_code,
          status: 'in_progress',
          user_inputs: validated.user_inputs || {},
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create session: ${error.message}`);
      }

      sessionId = session.id;
    } else {
      // Update existing session with new inputs
      if (validated.user_inputs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingSession } = await (supabase as any)
          .from('assessment_sessions')
          .select('user_inputs')
          .eq('id', sessionId)
          .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('assessment_sessions')
          .update({
            user_inputs: {
              ...(existingSession?.user_inputs || {}),
              ...validated.user_inputs,
            },
          })
          .eq('id', sessionId);
      }
    }

    // Check if we have enough info to run assessment
    const hasEnoughInfo = validated.user_inputs?.separation_reason &&
      validated.user_inputs?.quarterly_earnings &&
      validated.user_inputs.quarterly_earnings.length >= 4;

    if (hasEnoughInfo) {
      // Run full assessment
      const startTime = Date.now();

      const assessment = await runAssessment({
        state_code: validated.state_code,
        separation_reason: validated.user_inputs!.separation_reason!,
        employment_dates: validated.user_inputs?.employment_dates,
        quarterly_earnings: validated.user_inputs!.quarterly_earnings!,
      });

      const processingTime = Date.now() - startTime;

      // Save assessment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: savedAssessment } = await (supabase as any)
        .from('eligibility_assessments')
        .insert({
          session_id: sessionId,
          eligibility_likelihood: assessment.assessment,
          confidence_score: assessment.confidence_score,
          risk_factors: assessment.risk_factors,
          reasoning: assessment.reasoning_summary,
          citations: assessment.key_citations,
          assessment_version: '1.0',
          llm_model: 'grok-4-1-fast-reasoning',
          processing_time_ms: processingTime,
        })
        .select()
        .single();

      // Calculate benefits if likely eligible (not uncertain)
      if (assessment.assessment !== 'uncertain') {
        const benefits = await calculateBenefits(
          validated.state_code,
          validated.user_inputs!.quarterly_earnings!
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('benefit_calculations')
          .insert({
            session_id: sessionId,
            assessment_id: savedAssessment?.id,
            weekly_benefit_amount: benefits.weekly_benefit_amount,
            max_duration_weeks: benefits.max_duration_weeks,
            calculation_version: '1.0',
          });

        // Update session status
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('assessment_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        return NextResponse.json({
          session_id: sessionId,
          message: 'Assessment complete',
          assessment: {
            likelihood: assessment.assessment,
            confidence_score: assessment.confidence_score,
            risk_factors: assessment.risk_factors,
            reasoning: assessment.reasoning_summary,
            citations: assessment.key_citations,
          },
          benefit_calculation: {
            weekly_amount: benefits.weekly_benefit_amount,
            max_weeks: benefits.max_duration_weeks,
            total_potential: benefits.total_potential,
          },
        });
      }

      return NextResponse.json({
        session_id: sessionId,
        message: 'Assessment complete',
        assessment: {
          likelihood: assessment.assessment,
          confidence_score: assessment.confidence_score,
          risk_factors: assessment.risk_factors,
          reasoning: assessment.reasoning_summary,
          citations: assessment.key_citations,
        },
      });
    }

    // Not enough info, return what's needed
    const missingFields: string[] = [];
    if (!validated.user_inputs?.separation_reason) {
      missingFields.push('separation_reason');
    }
    if (!validated.user_inputs?.quarterly_earnings || validated.user_inputs.quarterly_earnings.length < 4) {
      missingFields.push('quarterly_earnings');
    }

    return NextResponse.json({
      session_id: sessionId,
      message: 'More information needed',
      missing_fields: missingFields,
      next_questions: generateNextQuestions(missingFields),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Assessment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateNextQuestions(missingFields: string[]): string[] {
  const questions: string[] = [];

  if (missingFields.includes('separation_reason')) {
    questions.push('What was the reason for leaving your last job? (e.g., laid off, quit, fired)');
  }

  if (missingFields.includes('quarterly_earnings')) {
    questions.push('What were your quarterly earnings for the past 4 quarters?');
  }

  return questions;
}
