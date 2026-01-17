import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI();

async function check() {
  // Count total rows
  const { count, error } = await supabase
    .from('handbook_sections')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Total rows in handbook_sections:', count);

  // Get ALL unique state codes
  const { data: allStates } = await supabase
    .from('handbook_sections')
    .select('state_code');

  const uniqueStates = [...new Set(allStates?.map(s => s.state_code))].sort();
  console.log('States in DB:', uniqueStates.join(', ') || 'none');

  // Check effective years
  const { data: years } = await supabase
    .from('handbook_sections')
    .select('effective_year')
    .limit(1000);

  const uniqueYears = [...new Set(years?.map(y => y.effective_year))].sort();
  console.log('Effective years:', uniqueYears.join(', ') || 'none');

  // Check CA specifically
  const { data: caData, count: caCount } = await supabase
    .from('handbook_sections')
    .select('section_id, effective_year', { count: 'exact' })
    .eq('state_code', 'CA')
    .limit(5);

  console.log('\nCA sections count:', caCount);
  console.log('CA sample:');
  caData?.forEach(s => {
    console.log('  -', s.section_id, 'year:', s.effective_year);
  });

  // Check embedding dimension and format
  const { data: embedSample } = await supabase
    .from('handbook_sections')
    .select('embedding')
    .not('embedding', 'is', null)
    .limit(1);

  if (embedSample && embedSample[0]?.embedding) {
    const emb = embedSample[0].embedding;
    console.log('\nEmbedding info:');
    console.log('  Type:', typeof emb);
    console.log('  Is array:', Array.isArray(emb));
    console.log('  Length:', Array.isArray(emb) ? emb.length : (typeof emb === 'string' ? emb.length : 'N/A'));
    console.log('  Sample:', JSON.stringify(emb).substring(0, 100) + '...');
  }

  // Count sections WITH embeddings for CA
  const { count: withEmbedCount } = await supabase
    .from('handbook_sections')
    .select('*', { count: 'exact', head: true })
    .eq('state_code', 'CA')
    .not('embedding', 'is', null);

  console.log('\nCA sections with embeddings:', withEmbedCount);

  // Test the RPC function directly with a simple vector
  console.log('\nTesting RPC function...');
  const { data: rpcTest, error: rpcError } = await supabase.rpc('match_handbook_sections', {
    query_embedding: new Array(1536).fill(0.01), // text-embedding-3-small is 1536 dimensions
    match_threshold: 0.0, // No threshold to see if anything comes back
    match_count: 3,
    filter_state: 'CA',
    filter_year: 2025,
  });

  if (rpcError) {
    console.log('RPC Error:', rpcError.message);
  } else {
    console.log('RPC returned:', rpcTest?.length || 0, 'results');
    if (rpcTest && rpcTest.length > 0) {
      console.log('First result similarity:', rpcTest[0].similarity);
    }
  }
}

check().catch(console.error);
