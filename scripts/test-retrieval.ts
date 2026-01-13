import { config } from 'dotenv';
config({ path: '.env.local' });

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RetrievalResult {
  id: string;
  state_code: string;
  section_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

async function testQuery(
  query: string,
  state: string,
  options: { matchCount?: number; matchThreshold?: number } = {}
) {
  const { matchCount = 5, matchThreshold = 0.7 } = options;

  console.log('\n' + '='.repeat(60));
  console.log(`Query: "${query}"`);
  console.log(`State: ${state}`);
  console.log(`Threshold: ${matchThreshold}, Max results: ${matchCount}`);
  console.log('='.repeat(60));

  // Generate embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Search
  const { data, error } = await supabase.rpc('match_handbook_sections', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_state: state,
    filter_year: 2025, // TODO: make configurable
  });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const results = data as RetrievalResult[];

  if (results.length === 0) {
    console.log('\nNo results found. Try lowering the threshold.');
    return;
  }

  console.log(`\nFound ${results.length} results:\n`);

  for (const result of results) {
    console.log(`[${result.section_id}] Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    if (result.metadata?.section_title) {
      console.log(`Title: ${result.metadata.section_title}`);
    }
    console.log(`Content: ${result.content.substring(0, 200)}...`);
    console.log('-'.repeat(40));
  }
}

async function runTests() {
  const testQueries = [
    { query: 'voluntary quit eligibility good cause', state: 'CA' },
    { query: 'fired for misconduct disqualification', state: 'CA' },
    { query: 'how to calculate weekly benefit amount', state: 'CA' },
    { query: 'base period earnings requirement', state: 'CA' },
    { query: 'appeal process denied claim', state: 'CA' },
  ];

  for (const test of testQueries) {
    await testQuery(test.query, test.state);
  }
}

// Allow single query from command line
async function main() {
  const args = process.argv.slice(2);

  if (args.length >= 2) {
    const query = args[0];
    const state = args[1].toUpperCase();
    const threshold = args[2] ? parseFloat(args[2]) : 0.7;
    await testQuery(query, state, { matchThreshold: threshold });
  } else if (args[0] === '--all') {
    await runTests();
  } else {
    console.log('Usage:');
    console.log('  npx tsx scripts/test-retrieval.ts "<query>" <STATE> [threshold]');
    console.log('  npx tsx scripts/test-retrieval.ts --all');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/test-retrieval.ts "quit job eligibility" CA');
    console.log('  npx tsx scripts/test-retrieval.ts "weekly benefit calculation" TX 0.6');
  }
}

main().catch(console.error);
