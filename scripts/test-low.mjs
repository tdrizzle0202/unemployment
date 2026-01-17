import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI();

async function test() {
  const embResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'I got laid off for being bad at my work',
  });
  
  const queryEmbedding = embResponse.data[0].embedding;
  
  // Test with very low threshold to see actual similarities
  const { data } = await supabase.rpc('match_handbook_sections', {
    query_embedding: queryEmbedding,
    match_threshold: 0.3,  // Very low
    match_count: 10,
    filter_state: 'CA',
    filter_year: 2025,
  });
  
  console.log('Results with threshold 0.3:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('\nTop matches:');
    data.forEach(function(r) {
      console.log('  Sim:', r.similarity.toFixed(3), '| Section:', r.section_id);
    });
  }
  
  // Also test a better query format
  console.log('\n--- Testing improved query ---');
  const embResponse2 = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'fired poor performance misconduct unemployment eligibility California disqualification',
  });
  
  const { data: data2 } = await supabase.rpc('match_handbook_sections', {
    query_embedding: embResponse2.data[0].embedding,
    match_threshold: 0.4,
    match_count: 5,
    filter_state: 'CA',
    filter_year: 2025,
  });
  
  console.log('Results with improved query:', data2 ? data2.length : 0);
  if (data2 && data2.length > 0) {
    data2.forEach(function(r) {
      console.log('  Sim:', r.similarity.toFixed(3), '| Section:', r.section_id);
    });
  }
}

test().catch(console.error);
