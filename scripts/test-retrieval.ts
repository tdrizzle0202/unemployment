import { config } from 'dotenv';
config({ path: '.env.local' });

import { retrieveHandbookSections } from '../lib/engine/pipeline/retrieve';
import { buildEligibilityPrompt, ELIGIBILITY_SYSTEM_PROMPT } from '../lib/engine/prompts/eligibility';
import { grokComplete } from '../lib/engine/grok';

async function testRetrieval() {
  const stateCode = 'CA';
  const separationNarrative = 'I was laid off due to company downsizing. My entire department was eliminated.';

  console.log('=== Testing RAG Retrieval ===\n');
  console.log(`State: ${stateCode}`);
  console.log(`Narrative: ${separationNarrative}\n`);

  // Test 1: Check what's being retrieved
  console.log('--- 1. Retrieval Results ---');
  const query = `${separationNarrative} unemployment eligibility ${stateCode}`;
  console.log(`Query: "${query}"\n`);

  const sections = await retrieveHandbookSections(
    query,
    stateCode,
    { matchCount: 5, matchThreshold: 0.65 }
  );

  console.log(`Retrieved ${sections.length} sections:\n`);

  if (sections.length === 0) {
    console.log('⚠️  NO SECTIONS RETRIEVED! This is the problem.');
    console.log('\nTrying with lower threshold (0.4)...\n');

    const sectionsLow = await retrieveHandbookSections(
      query,
      stateCode,
      { matchCount: 10, matchThreshold: 0.4 }
    );

    console.log(`With threshold 0.4: Retrieved ${sectionsLow.length} sections`);
    for (const s of sectionsLow) {
      console.log(`  - [${s.section_id}] similarity=${s.similarity.toFixed(3)}`);
      console.log(`    "${s.content.substring(0, 150)}..."\n`);
    }
  } else {
    for (const s of sections) {
      console.log(`  - [${s.section_id}] similarity=${s.similarity.toFixed(3)}`);
      console.log(`    "${s.content.substring(0, 150)}..."\n`);
    }
  }

  // Test 2: Build the prompt
  console.log('\n--- 2. Built Prompt ---');
  const userInputs = {
    state_code: stateCode,
    separation_reason: separationNarrative,
    quarterly_earnings: [15000, 12000, 12000, 11000],
  };

  const prompt = buildEligibilityPrompt(userInputs, sections);
  console.log('User prompt preview:');
  console.log(prompt.substring(0, 500) + '...\n');

  // Test 3: Call Grok
  console.log('\n--- 3. Grok Response ---');
  try {
    const response = await grokComplete(
      ELIGIBILITY_SYSTEM_PROMPT,
      prompt,
      { model: 'grok-4-1-fast-reasoning', maxTokens: 2000, temperature: 0.2 }
    );

    console.log('Raw response:');
    console.log(response);

    // Try to parse
    let jsonText = response;
    const jsonMatch = jsonText.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonText);
      console.log('\n--- Parsed Assessment ---');
      console.log(`Assessment: ${parsed.assessment}`);
      console.log(`Confidence: ${parsed.confidence_score}`);
      console.log(`Risk factors: ${parsed.risk_factors?.join(', ') || 'none'}`);
      console.log(`Reasoning: ${parsed.reasoning_summary}`);
    } catch (e) {
      console.log('Failed to parse JSON:', e);
    }
  } catch (e) {
    console.error('Grok error:', e);
  }
}

testRetrieval().catch(console.error);
