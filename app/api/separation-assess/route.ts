import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { retrieveHandbookSections } from '@/lib/engine/pipeline/retrieve';
import { buildEligibilityPrompt, ELIGIBILITY_SYSTEM_PROMPT } from '@/lib/engine/prompts/eligibility';
import { grokComplete } from '@/lib/engine/grok';
import { calculateBenefits } from '@/lib/engine/pipeline/calculate';
import { AssessmentResultSchema } from '@/lib/engine/pipeline/assess';

const SeparationAssessRequestSchema = z.object({
    state_code: z.string().length(2).toUpperCase(),
    separation_narrative: z.string().min(10).max(10000),
    base_period_wages: z.number().positive(),
    highest_quarter_wages: z.number().positive(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validated = SeparationAssessRequestSchema.parse(body);

        // 1. Retrieve relevant handbook sections based on separation narrative
        const sections = await retrieveHandbookSections(
            `${validated.separation_narrative} unemployment eligibility ${validated.state_code}`,
            validated.state_code,
            { matchCount: 5, matchThreshold: 0.65 }
        );

        // 2. Build prompt with user context
        // Create quarterly earnings estimate from wages
        const quarterlyEarnings = [
            validated.highest_quarter_wages,
            (validated.base_period_wages - validated.highest_quarter_wages) / 3,
            (validated.base_period_wages - validated.highest_quarter_wages) / 3,
            (validated.base_period_wages - validated.highest_quarter_wages) / 3,
        ];

        const userInputs = {
            state_code: validated.state_code,
            separation_reason: validated.separation_narrative,
            quarterly_earnings: quarterlyEarnings,
        };

        const prompt = buildEligibilityPrompt(userInputs, sections);

        // 3. Call Grok for assessment
        const responseText = await grokComplete(
            ELIGIBILITY_SYSTEM_PROMPT,
            prompt,
            { model: 'grok-4-1-fast-reasoning', maxTokens: 2000, temperature: 0.2 }
        );

        // 4. Extract JSON from response (handle markdown code blocks)
        let jsonText = responseText;
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1].trim();
        }

        // 5. Parse and validate response
        const parsed = JSON.parse(jsonText);
        const assessment = AssessmentResultSchema.parse(parsed);

        // 6. Calculate benefits if not uncertain
        let benefitCalculation = null;
        if (assessment.assessment !== 'uncertain') {
            benefitCalculation = await calculateBenefits(
                validated.state_code,
                quarterlyEarnings
            );
        }

        return NextResponse.json({
            success: true,
            assessment: {
                likelihood: assessment.assessment,
                confidence_score: assessment.confidence_score,
                risk_factors: assessment.risk_factors,
                reasoning_summary: assessment.reasoning_summary,
                key_citations: assessment.key_citations,
            },
            benefit_calculation: benefitCalculation ? {
                weekly_benefit_amount: benefitCalculation.weekly_benefit_amount,
                max_duration_weeks: benefitCalculation.max_duration_weeks,
                total_potential: benefitCalculation.total_potential,
            } : null,
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Separation assessment error:', error);
        return NextResponse.json(
            { error: 'Failed to process assessment' },
            { status: 500 }
        );
    }
}
