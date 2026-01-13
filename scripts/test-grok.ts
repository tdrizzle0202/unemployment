
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Manually import to avoid alias issues if tsx doesn't pick them up
// Adjust paths as needed based on where we run this script from.
// Assuming we run from root.
import { grokComplete } from '../lib/engine/grok';
import { ELIGIBILITY_SYSTEM_PROMPT } from '../lib/engine/prompts/eligibility-system';

async function main() {
    console.log('Testing Grok integration with model: grok-4-1-fast-reasoning');

    const dummyPrompt = `
<user_facts>
- State: CA
- Separation reason: Laid off due to lack of work
- Employment dates: 2023-01-01 to 2023-12-31
- Quarterly earnings: $10,000, $10,000, $10,000, $10,000
</user_facts>

<retrieved_law>
[CA-101] An individual is eligible if they are unemployed through no fault of their own.
</retrieved_law>
`;

    try {
        const response = await grokComplete(
            ELIGIBILITY_SYSTEM_PROMPT,
            dummyPrompt,
            { model: 'grok-4-1-fast-reasoning', maxTokens: 2000, temperature: 0.2 }
        );

        console.log('Response received:');
        console.log(response);

        try {
            // Extract JSON to verify parsing
            let jsonText = response;
            const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonText = jsonMatch[1].trim();
            }
            const parsed = JSON.parse(jsonText);
            console.log('Parsed JSON:', parsed);

            if (parsed.risk_factors) {
                console.log('SUCCESS: risk_factors found in response');
            } else {
                console.log('WARNING: risk_factors NOT found in response');
            }

        } catch (e) {
            console.error('Failed to parse JSON:', e);
        }

    } catch (error) {
        console.error('Error calling Grok:', error);
    }
}

main();
