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
  
  console.log('Testing different years with threshold 0.45:\n');
  
  for (const year of [2025, 2026, null]) {
    const { data, error } = await supabase.rpc('match_handbook_sections', {
      query_embedding: queryEmbedding,
      match_threshold: 0.45,
      match_count: 5,
      filter_state: 'CA',
      filter_year: year,
    });
    
    console.log('Year', year, '-> Results:', data ? data.length : 0);
    if (error) console.log('  Error:', error.message);
    if (data && data.length > 0) {
      console.log('  Best match similarity:', data[0].similarity);
    }
  }
}

test().catch(console.error);
