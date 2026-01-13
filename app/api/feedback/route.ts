import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const FeedbackRequestSchema = z.object({
  session_id: z.string().uuid(),
  reported_outcome: z.enum(['approved', 'denied', 'pending']),
  actual_weekly_benefit: z.number().positive().optional(),
  denial_reason: z.string().max(1000).optional(),
  user_notes: z.string().max(2000).optional(),
  days_to_decision: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = FeedbackRequestSchema.parse(body);

    const supabase = await createClient();

    // Verify user owns this session
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase as any)
      .from('assessment_sessions')
      .select('id, user_id')
      .eq('id', validated.session_id)
      .single();

    if (!session || session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if outcome already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingOutcome } = await (supabase as any)
      .from('outcomes')
      .select('id')
      .eq('session_id', validated.session_id)
      .single();

    if (existingOutcome) {
      // Update existing outcome
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('outcomes')
        .update({
          reported_outcome: validated.reported_outcome,
          actual_weekly_benefit: validated.actual_weekly_benefit,
          denial_reason: validated.denial_reason,
          user_notes: validated.user_notes,
          days_to_decision: validated.days_to_decision,
          reported_at: new Date().toISOString(),
        })
        .eq('id', existingOutcome.id);

      if (error) {
        throw new Error(`Failed to update outcome: ${error.message}`);
      }

      return NextResponse.json({
        success: true,
        message: 'Outcome updated successfully',
      });
    }

    // Create new outcome
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('outcomes')
      .insert({
        session_id: validated.session_id,
        reported_outcome: validated.reported_outcome,
        actual_weekly_benefit: validated.actual_weekly_benefit,
        denial_reason: validated.denial_reason,
        user_notes: validated.user_notes,
        days_to_decision: validated.days_to_decision,
        verification_level: 'self_reported',
      });

    if (error) {
      throw new Error(`Failed to save outcome: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback! This helps us improve our assessments.',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
