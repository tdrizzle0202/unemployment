import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Load .env.local explicitly
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const XAI_API_KEY = process.env.XAI_API_KEY!;

async function diagnose() {
  console.log('=== RAG System Diagnostics ===\n');

  // 1. Check environment variables
  console.log('1. Environment Variables:');
  console.log(`   SUPABASE_URL: ${SUPABASE_URL ? '✓ Set' : '✗ MISSING'}`);
  console.log(`   SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ MISSING'}`);
  console.log(`   OPENAI_API_KEY: ${OPENAI_API_KEY ? '✓ Set' : '✗ MISSING'}`);
  console.log(`   XAI_API_KEY: ${XAI_API_KEY ? '✓ Set' : '✗ MISSING'}`);
  console.log();

  // 2. Test Supabase connection
  console.log('2. Supabase Connection:');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { data: tables, error } = await supabase
      .from('handbook_sections')
      .select('id')
      .limit(1);

    if (error) {
      console.log(`   ✗ Connection failed: ${error.message}`);
      console.log(`   Error details: ${JSON.stringify(error, null, 2)}`);
    } else {
      console.log('   ✓ Connected to Supabase');
    }
  } catch (e) {
    console.log(`   ✗ Connection error: ${e}`);
  }
  console.log();

  // 3. Check handbook_sections table
  console.log('3. Handbook Sections Table:');
  try {
    const { count, error } = await supabase
      .from('handbook_sections')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ✗ Query failed: ${error.message}`);
    } else {
      console.log(`   ✓ Total rows: ${count}`);
    }

    // Check for embeddings
    const { data: withEmbeddings, error: embError } = await supabase
      .from('handbook_sections')
      .select('id, state_code, embedding')
      .not('embedding', 'is', null)
      .limit(5);

    if (embError) {
      console.log(`   ✗ Embedding check failed: ${embError.message}`);
    } else {
      console.log(`   ✓ Rows with embeddings (sample): ${withEmbeddings?.length || 0}`);
      if (withEmbeddings && withEmbeddings.length > 0) {
        const states = [...new Set(withEmbeddings.map(r => r.state_code))];
        console.log(`   States in sample: ${states.join(', ')}`);
      }
    }

    // Check for rows WITHOUT embeddings
    const { count: noEmbCount, error: noEmbError } = await supabase
      .from('handbook_sections')
      .select('*', { count: 'exact', head: true })
      .is('embedding', null);

    if (!noEmbError) {
      console.log(`   Rows WITHOUT embeddings: ${noEmbCount}`);
    }
  } catch (e) {
    console.log(`   ✗ Error: ${e}`);
  }
  console.log();

  // 4. Test the RPC function
  console.log('4. match_handbook_sections RPC Function:');
  try {
    // Create a dummy embedding (1536 dimensions)
    const dummyEmbedding = new Array(1536).fill(0.01);

    const { data, error } = await supabase.rpc('match_handbook_sections', {
      query_embedding: dummyEmbedding,
      match_threshold: 0.0, // Low threshold for testing
      match_count: 3,
      filter_state: null,
      filter_year: null,
    });

    if (error) {
      console.log(`   ✗ RPC failed: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
      console.log(`   Error details: ${error.details}`);
      console.log(`   Hint: ${error.hint}`);
    } else {
      console.log(`   ✓ RPC function exists and works`);
      console.log(`   Results returned: ${data?.length || 0}`);
      if (data && data.length > 0) {
        console.log(`   Sample result: state=${data[0].state_code}, section=${data[0].section_id}, similarity=${data[0].similarity}`);
      }
    }
  } catch (e) {
    console.log(`   ✗ RPC error: ${e}`);
  }
  console.log();

  // 5. Test OpenAI embeddings
  console.log('5. OpenAI Embeddings API:');
  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'test query for unemployment eligibility',
    });

    console.log(`   ✓ Embedding generated`);
    console.log(`   Dimensions: ${response.data[0].embedding.length}`);
    console.log(`   Model: ${response.model}`);
  } catch (e: any) {
    console.log(`   ✗ OpenAI error: ${e.message}`);
    if (e.code) console.log(`   Error code: ${e.code}`);
  }
  console.log();

  // 6. Test Grok API
  console.log('6. Grok (xAI) API:');
  try {
    const grokClient = new OpenAI({
      apiKey: XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });

    const response = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Say "OK" if you can hear me.' },
      ],
      max_tokens: 10,
    });

    const content = response.choices[0]?.message?.content;
    console.log(`   ✓ Grok responded: "${content}"`);
    console.log(`   Model: ${response.model}`);
  } catch (e: any) {
    console.log(`   ✗ Grok error: ${e.message}`);
    if (e.status) console.log(`   Status: ${e.status}`);
  }
  console.log();

  // 7. End-to-end retrieval test
  console.log('7. End-to-End Retrieval Test:');
  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Generate real embedding
    const embResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'laid off from job unemployment benefits California eligibility',
    });
    const queryEmbedding = embResponse.data[0].embedding;

    // Search with real embedding
    const { data, error } = await supabase.rpc('match_handbook_sections', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5,
      filter_state: 'CA',
      filter_year: 2025,
    });

    if (error) {
      console.log(`   ✗ Retrieval failed: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.log('   ⚠ No results found for CA/2025');

      // Try without filters
      const { data: unfilteredData, error: unfilteredError } = await supabase.rpc('match_handbook_sections', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 5,
        filter_state: null,
        filter_year: null,
      });

      if (unfilteredError) {
        console.log(`   ✗ Unfiltered search failed: ${unfilteredError.message}`);
      } else {
        console.log(`   Unfiltered results: ${unfilteredData?.length || 0}`);
        if (unfilteredData && unfilteredData.length > 0) {
          console.log(`   States found: ${[...new Set(unfilteredData.map((r: any) => r.state_code))].join(', ')}`);
        }
      }
    } else {
      console.log(`   ✓ Retrieved ${data.length} relevant sections`);
      for (const row of data.slice(0, 3)) {
        console.log(`   - [${row.section_id}] similarity=${row.similarity.toFixed(3)}`);
        console.log(`     "${row.content.substring(0, 100)}..."`);
      }
    }
  } catch (e: any) {
    console.log(`   ✗ E2E test error: ${e.message}`);
  }
  console.log();

  console.log('=== Diagnostics Complete ===');
}

diagnose().catch(console.error);
