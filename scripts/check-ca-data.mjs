import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Check CA data count
  const { count, error } = await supabase
    .from('handbook_sections')
    .select('*', { count: 'exact', head: true })
    .eq('state_code', 'CA');

  console.log('CA sections total count:', count);
  if (error) console.log('Error:', error);

  // Get sample with embeddings check
  const { data } = await supabase
    .from('handbook_sections')
    .select('section_id, effective_year, content')
    .eq('state_code', 'CA')
    .limit(3);

  console.log('\nSample CA sections:');
  if (data) {
    data.forEach(r => {
      console.log('  -', r.section_id, '| year:', r.effective_year);
      console.log('    Content preview:', r.content.substring(0, 100) + '...');
    });
  }

  // Check what years exist
  const { data: allData } = await supabase
    .from('handbook_sections')
    .select('effective_year')
    .eq('state_code', 'CA');
  
  const yearCounts = {};
  if (allData) {
    allData.forEach(r => {
      yearCounts[r.effective_year] = (yearCounts[r.effective_year] || 0) + 1;
    });
  }
  console.log('\nCA data by effective_year:', yearCounts);
  
  // The retrieve function filters by year=2025, so check if that exists
  console.log('\nNote: retrieve.ts defaults to effective_year=2025');
}

check();
