import { config } from 'dotenv';
import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Lazy-initialized clients
let openai: OpenAI;
let supabase: SupabaseClient;

function initClients() {
  if (!openai) {
    openai = new OpenAI();
  }
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
}

// Unstructured.io JSON element structure
interface UnstructuredElement {
  type: string;
  element_id: string;
  text: string;
  metadata: {
    filetype?: string;
    languages?: string[];
    page_number?: number;
    filename?: string;
    parent_id?: string;
    category_depth?: number;
    [key: string]: unknown;
  };
}

interface ProcessedChunk {
  section_id: string;
  content: string;
  metadata: {
    section_title?: string;
    page_number?: number;
    element_types?: string[];
    element_ids?: string[];
  };
}

const MAX_CHUNK_SIZE = 1500; // Characters per chunk (leaves room for section title context)
const MIN_CHUNK_SIZE = 100; // Don't create tiny chunks

function processElements(elements: UnstructuredElement[], stateCode: string): ProcessedChunk[] {
  const chunks: ProcessedChunk[] = [];
  let currentSection = '';
  let currentContent = '';
  let currentPageNumber = 1;
  let currentElementTypes: string[] = [];
  let currentElementIds: string[] = [];
  let chunkIndex = 0;

  const saveChunk = () => {
    if (currentContent.trim().length >= MIN_CHUNK_SIZE) {
      // Prepend section title for context if available
      const contentWithContext = currentSection
        ? `## ${currentSection}\n\n${currentContent.trim()}`
        : currentContent.trim();

      chunks.push({
        section_id: `${stateCode}-${chunkIndex.toString().padStart(4, '0')}`,
        content: contentWithContext,
        metadata: {
          section_title: currentSection || undefined,
          page_number: currentPageNumber,
          element_types: [...new Set(currentElementTypes)],
          element_ids: currentElementIds.slice(0, 10), // Keep first 10 for reference
        },
      });
      chunkIndex++;
    }
    currentContent = '';
    currentElementTypes = [];
    currentElementIds = [];
  };

  for (const element of elements) {
    // Track page numbers
    if (element.metadata?.page_number) {
      currentPageNumber = element.metadata.page_number;
    }

    // Track element info
    currentElementTypes.push(element.type);
    currentElementIds.push(element.element_id);

    // Handle titles - start new section
    if (element.type === 'Title' && element.text) {
      // Save previous chunk if it has content
      if (currentContent.trim()) {
        saveChunk();
      }
      currentSection = element.text;
      continue;
    }

    // Handle headers - can start new sections for major headers
    if (element.type === 'Header' && element.text) {
      // If we have substantial content, save it before new header
      if (currentContent.length > MAX_CHUNK_SIZE * 0.5) {
        saveChunk();
        currentSection = element.text;
        continue;
      }
      // Otherwise include header in current content
      currentContent += `\n### ${element.text}\n`;
      continue;
    }

    // Add text content
    if (element.text) {
      // Add appropriate spacing based on element type
      if (element.type === 'ListItem') {
        currentContent += `• ${element.text}\n`;
      } else if (element.type === 'NarrativeText' || element.type === 'Text') {
        currentContent += element.text + '\n\n';
      } else {
        currentContent += element.text + '\n';
      }
    }

    // Split if content gets too long
    if (currentContent.length > MAX_CHUNK_SIZE) {
      saveChunk();
    }
  }

  // Save final chunk
  if (currentContent.trim()) {
    saveChunk();
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  // OpenAI supports batching up to 2048 inputs
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

async function ingestJson(
  jsonPath: string,
  stateCode: string,
  year: number,
  sourceUrl?: string
) {
  console.log(`\n📄 Ingesting ${stateCode} handbook from JSON...`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`Year: ${year}`);
  if (sourceUrl) console.log(`Source: ${sourceUrl}`);
  console.log('');

  // 1. Read JSON file
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const elements: UnstructuredElement[] = JSON.parse(jsonContent);
  console.log(`Loaded ${elements.length} elements from Unstructured JSON`);

  // 2. Process into chunks
  const chunks = processElements(elements, stateCode);
  console.log(`Created ${chunks.length} chunks`);

  // 3. Save processed chunks locally for debugging
  const outputDir = path.join(process.cwd(), 'data', 'handbooks', 'processed');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const processedPath = path.join(outputDir, `${stateCode}_${year}_chunks.json`);
  fs.writeFileSync(processedPath, JSON.stringify(chunks, null, 2));
  console.log(`Saved processed chunks to ${processedPath}`);

  // 4. Generate embeddings in batches
  console.log('\nGenerating embeddings...');
  const BATCH_SIZE = 100;
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchTexts = batch.map((c) => c.content);

    try {
      const batchEmbeddings = await generateEmbeddingsBatch(batchTexts);
      embeddings.push(...batchEmbeddings);
      console.log(`Embedded ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`);
    } catch (error) {
      console.error(`Error embedding batch starting at ${i}:`, error);
      // Fall back to individual embeddings
      for (const chunk of batch) {
        try {
          const embedding = await generateEmbedding(chunk.content);
          embeddings.push(embedding);
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (e) {
          console.error(`Failed to embed chunk ${chunk.section_id}:`, e);
          embeddings.push([]); // Placeholder
        }
      }
    }

    // Small delay between batches
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // 5. Upload to Supabase
  console.log('\nUploading to Supabase...');
  let uploaded = 0;
  let errors = 0;

  // Use upsert to handle re-runs
  const UPLOAD_BATCH_SIZE = 50;

  for (let i = 0; i < chunks.length; i += UPLOAD_BATCH_SIZE) {
    const batch = chunks.slice(i, i + UPLOAD_BATCH_SIZE);
    const records = batch.map((chunk, idx) => ({
      state_code: stateCode,
      effective_year: year,
      section_id: chunk.section_id,
      content: chunk.content,
      embedding: embeddings[i + idx],
      source_url: sourceUrl || null,
      metadata: chunk.metadata,
    }));

    const { error } = await supabase
      .from('handbook_sections')
      .upsert(records, {
        onConflict: 'state_code,effective_year,section_id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`Error uploading batch at ${i}:`, error.message);
      errors += batch.length;
    } else {
      uploaded += batch.length;
      console.log(`Uploaded ${uploaded}/${chunks.length} chunks`);
    }
  }

  console.log(`\n✅ ${stateCode} ${year} complete!`);
  console.log(`   Uploaded: ${uploaded} chunks`);
  console.log(`   Errors: ${errors} chunks`);
}

// Main execution
async function main() {
  initClients();
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log(`
Usage: npx tsx scripts/ingest-unstructured-json.ts <JSON_PATH> <STATE_CODE> <YEAR> [SOURCE_URL]

Arguments:
  JSON_PATH    Path to the Unstructured.io JSON output file
  STATE_CODE   Two-letter state code (e.g., CA, NY, TX)
  YEAR         Effective year for the handbook (e.g., 2025)
  SOURCE_URL   (Optional) Original source URL of the handbook

Example:
  npx tsx scripts/ingest-unstructured-json.ts ./data/ca-handbook.json CA 2025 https://edd.ca.gov/handbook.pdf
`);
    process.exit(1);
  }

  const jsonPath = path.resolve(args[0]);
  const stateCode = args[1].toUpperCase();
  const year = parseInt(args[2], 10);
  const sourceUrl = args[3];

  if (!fs.existsSync(jsonPath)) {
    console.error(`JSON file not found: ${jsonPath}`);
    process.exit(1);
  }

  if (isNaN(year) || year < 2000 || year > 2100) {
    console.error(`Invalid year: ${args[2]}`);
    process.exit(1);
  }

  if (!/^[A-Z]{2}$/.test(stateCode)) {
    console.error(`Invalid state code: ${args[1]} (must be 2 letters)`);
    process.exit(1);
  }

  await ingestJson(jsonPath, stateCode, year, sourceUrl);
}

main().catch(console.error);
