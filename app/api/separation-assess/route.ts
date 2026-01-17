import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { retrieveHandbookSections } from '@/lib/engine/pipeline/retrieve';
import { buildEligibilityPrompt, ELIGIBILITY_SYSTEM_PROMPT } from '@/lib/engine/prompts/eligibility';
import { grokComplete } from '@/lib/engine/grok';
import { calculateBenefits } from '@/lib/engine/pipeline/calculate';
import { AssessmentResultSchema } from '@/lib/engine/pipeline/assess';

const SeparationTypeSchema = z.enum(['laid_off', 'quit', 'fired', 'other']);

const SeparationAssessRequestSchema = z.object({
    state_code: z.string().length(2).toUpperCase(),
    separation_type: SeparationTypeSchema,
    separation_narrative: z.string().min(10).max(10000),
    base_period_wages: z.number().positive(),
    highest_quarter_wages: z.number().positive(),
    language: z.enum(['en', 'es']).optional().default('en'),
});

// Keywords to enhance RAG retrieval based on separation type
const SEPARATION_TYPE_KEYWORDS: Record<z.infer<typeof SeparationTypeSchema>, string[]> = {
    laid_off: ['layoff', 'reduction in force', 'downsizing', 'position eliminated', 'lack of work'],
    quit: ['voluntary quit', 'resignation', 'good cause', 'constructive discharge', 'quit'],
    fired: ['discharge', 'termination', 'misconduct', 'fired', 'dismissed', 'discharged for cause'],
    other: ['partial unemployment', 'reduced hours', 'separation'],
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validated = SeparationAssessRequestSchema.parse(body);

        // 1. Retrieve relevant handbook sections based on separation type + narrative
        // Enhance the query with separation-type-specific keywords for better RAG results
        const typeKeywords = SEPARATION_TYPE_KEYWORDS[validated.separation_type].join(' ');
        const enhancedQuery = `${typeKeywords} ${validated.separation_narrative}`;

        const sections = await retrieveHandbookSections(
            enhancedQuery,
            validated.state_code,
            { matchCount: 8 }  // Use default threshold (0.4) - lowered for conversational queries
        );

        // 2. Build prompt with user context
        // Create quarterly earnings estimate from wages
        const quarterlyEarnings = [
            validated.highest_quarter_wages,
            (validated.base_period_wages - validated.highest_quarter_wages) / 3,
            (validated.base_period_wages - validated.highest_quarter_wages) / 3,
            (validated.base_period_wages - validated.highest_quarter_wages) / 3,
        ];

        // Map separation type to readable label
        const separationTypeLabels: Record<z.infer<typeof SeparationTypeSchema>, string> = {
            laid_off: 'Laid off',
            quit: 'Quit/Resigned',
            fired: 'Fired/Terminated',
            other: 'Other',
        };

        const userInputs = {
            state_code: validated.state_code,
            separation_type: separationTypeLabels[validated.separation_type],
            separation_reason: validated.separation_narrative,
            quarterly_earnings: quarterlyEarnings,
        };

        const prompt = buildEligibilityPrompt(userInputs, sections);

        // 3. Call Grok for assessment
        // Add Spanish instruction if language is 'es'
        const systemPrompt = validated.language === 'es'
            ? `${ELIGIBILITY_SYSTEM_PROMPT}\n\nIMPORTANT: Write all text fields (reasoning_summary, risk_factors) in Spanish. Keep JSON keys and section_ids in English.`
            : ELIGIBILITY_SYSTEM_PROMPT;

        const responseText = await grokComplete(
            systemPrompt,
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
