import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI();

async function testRPC() {
  console.log('Generating embedding...');
  
  const embResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'laid off unemployment eligibility California',
  });
  
  const queryEmbedding = embResponse.data[0].embedding;
  console.log('Embedding dimensions:', queryEmbedding.length);
  
  // Test with threshold 0.5
  console.log('\nTesting RPC with threshold 0.5, CA, year 2025...');
  
  const { data, error } = await supabase.rpc('match_handbook_sections', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5,
    filter_state: 'CA',
    filter_year: 2025,
  });
  
  if (error) {
    console.log('RPC Error:', error.message);
    console.log('Code:', error.code);
    console.log('Details:', error.details);
  } else {
    console.log('Results found:', data ? data.length : 0);
    if (data) {
      data.forEach(function(r) {
        console.log('  Section:', r.section_id, '| Similarity:', r.similarity);
      });
    }
  }
  
  // Test without year filter
  console.log('\nTesting without year filter...');
  const result2 = await supabase.rpc('match_handbook_sections', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5,
    filter_state: 'CA',
    filter_year: null,
  });
  
  console.log('Results without year:', result2.data ? result2.data.length : 0);
  if (result2.data) {
    result2.data.forEach(function(r) {
      console.log('  Section:', r.section_id, '| Similarity:', r.similarity);
    });
  }
}

testRPC().catch(console.error);
