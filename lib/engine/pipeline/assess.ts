import { z } from 'zod';
import { retrieveHandbookSections } from './retrieve';
import { buildEligibilityPrompt, ELIGIBILITY_SYSTEM_PROMPT } from '../prompts/eligibility';
import { grokComplete } from '../grok';

export const AssessmentResultSchema = z.object({
  assessment: z.enum(['most_likely', 'likely', 'unlikely', 'uncertain']),
  confidence_score: z.number().min(0).max(100),
  risk_factors: z.array(z.string()),
  reasoning_summary: z.string(),
  key_citations: z.array(z.string()),
});

export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;

export interface UserInputs {
  state_code: string;
  separation_type?: string;
  separation_reason: string;
  employment_dates?: {
    start: string;
    end: string;
  };
  quarterly_earnings: number[];
}

export async function runAssessment(userInputs: UserInputs): Promise<AssessmentResult> {
  // 1. Retrieve relevant handbook sections
  const sections = await retrieveHandbookSections(
    `${userInputs.separation_reason} unemployment eligibility ${userInputs.state_code}`,
    userInputs.state_code,
    { matchCount: 5, matchThreshold: 0.65 }
  );

  // 2. Build prompt with context
  const prompt = buildEligibilityPrompt(userInputs, sections);

  // 3. Call Grok for assessment reasoning
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

  // 5. Validate response
  const parsed = JSON.parse(jsonText);
  const assessment = AssessmentResultSchema.parse(parsed);

  return assessment;
}

export async function runPartialAssessment(
  userInputs: Partial<UserInputs> & { state_code: string }
): Promise<{
  can_assess: boolean;
  missing_fields: string[];
  preliminary_assessment?: {
    likelihood_range: 'likely_eligible' | 'uncertain' | 'likely_ineligible';
    key_factors: string[];
  };
}> {
  const missingFields: string[] = [];

  if (!userInputs.separation_reason) {
    missingFields.push('separation_reason');
  }
  if (!userInputs.quarterly_earnings || userInputs.quarterly_earnings.length < 4) {
    missingFields.push('quarterly_earnings');
  }

  if (missingFields.length > 0) {
    // If we have separation reason, we can give preliminary assessment
    if (userInputs.separation_reason) {
      const sections = await retrieveHandbookSections(
        userInputs.separation_reason,
        userInputs.state_code,
        { matchCount: 3 }
      );

      const isPotentiallyDisqualifying =
        userInputs.separation_reason.toLowerCase().includes('quit') ||
        userInputs.separation_reason.toLowerCase().includes('fired for cause') ||
        userInputs.separation_reason.toLowerCase().includes('misconduct');

      return {
        can_assess: false,
        missing_fields: missingFields,
        preliminary_assessment: {
          likelihood_range: isPotentiallyDisqualifying ? 'uncertain' : 'likely_eligible',
          key_factors: sections.slice(0, 2).map((s) => s.section_id),
        },
      };
    }

    return {
      can_assess: false,
      missing_fields: missingFields,
    };
  }

  return {
    can_assess: true,
    missing_fields: [],
  };
}
