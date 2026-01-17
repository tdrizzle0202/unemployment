import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data } = await supabase
    .from('handbook_sections')
    .select('state_code, effective_year');
  
  const counts = {};
  data.forEach(r => {
    const key = r.state_code + '-' + r.effective_year;
    counts[key] = (counts[key] || 0) + 1;
  });
  
  console.log('States with embedded data:\n');
  Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([key, count]) => {
      console.log(' ', key, '->', count, 'sections');
    });
}

check();
