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
    input: 'I got laid off for being bad at my work unemployment eligibility California',
  });
  
  const queryEmbedding = embResponse.data[0].embedding;
  
  for (const threshold of [0.65, 0.6, 0.55, 0.5]) {
    const { data } = await supabase.rpc('match_handbook_sections', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: 5,
      filter_state: 'CA',
      filter_year: 2025,
    });
    
    console.log('Threshold', threshold, '-> Results:', data ? data.length : 0);
  }
}

test().catch(console.error);
