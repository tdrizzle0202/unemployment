import { UnstructuredClient } from 'unstructured-client';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Initialize clients
const unstructured = new UnstructuredClient({
  security: { apiKeyAuth: process.env.UNSTRUCTURED_API_KEY! },
});

const openai = new OpenAI();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProcessedChunk {
  section_id: string;
  content: string;
  metadata: {
    section_title?: string;
    page_number?: number;
    element_type?: string;
  };
}

function processElements(elements: unknown[], stateCode: string): ProcessedChunk[] {
  const chunks: ProcessedChunk[] = [];
  let currentSection = '';
  let currentContent = '';
  let currentPageNumber = 1;
  let chunkIndex = 0;

  for (const element of elements as Array<{
    type: string;
    text?: string;
    metadata?: { page_number?: number };
  }>) {
    // Track page numbers
    if (element.metadata?.page_number) {
      currentPageNumber = element.metadata.page_number;
    }

    // New section on titles
    if (element.type === 'Title' && element.text) {
      // Save previous chunk if exists
      if (currentContent.trim()) {
        chunks.push({
          section_id: `${stateCode}-${chunkIndex}`,
          content: currentContent.trim(),
          metadata: {
            section_title: currentSection || undefined,
            page_number: currentPageNumber,
          },
        });
        chunkIndex++;
      }
      currentSection = element.text;
      currentContent = '';
    } else if (element.text) {
      currentContent += element.text + '\n';
    }

    // Split if content gets too long
    if (currentContent.length > 2000) {
      chunks.push({
        section_id: `${stateCode}-${chunkIndex}`,
        content: currentContent.trim(),
        metadata: {
          section_title: currentSection || undefined,
          page_number: currentPageNumber,
        },
      });
      chunkIndex++;
      currentContent = '';
    }
  }

  // Don't forget last chunk
  if (currentContent.trim()) {
    chunks.push({
      section_id: `${stateCode}-${chunkIndex}`,
      content: currentContent.trim(),
      metadata: {
        section_title: currentSection || undefined,
        page_number: currentPageNumber,
      },
    });
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

async function ingestHandbook(
  pdfPath: string,
  stateCode: string,
  year: number,
  sourceUrl: string
) {
  console.log(`\nProcessing ${stateCode} handbook...`);
  console.log(`PDF: ${pdfPath}`);
  console.log(`Year: ${year}`);
  console.log(`Source: ${sourceUrl}\n`);

  // 1. Read PDF file
  const pdfBuffer = fs.readFileSync(pdfPath);
  const fileName = path.basename(pdfPath);

  console.log('Extracting content with Unstructured.io...');

  // 2. Extract and chunk with Unstructured
  const response = await unstructured.general.partition({
    partitionParameters: {
      files: {
        content: pdfBuffer,
        fileName: fileName,
      },
      strategy: 'auto',
      splitPdfPage: true,
      splitPdfConcurrencyLevel: 5,
    },
  });

  console.log(`Extracted ${response.elements?.length || 0} elements`);

  // 3. Process into chunks
  const chunks = processElements(response.elements || [], stateCode);
  console.log(`Created ${chunks.length} chunks`);

  // 4. Save processed chunks locally
  const processedPath = path.join(
    __dirname,
    '../data/handbooks/processed',
    `${stateCode}_extracted.json`
  );
  fs.writeFileSync(processedPath, JSON.stringify(chunks, null, 2));
  console.log(`Saved processed chunks to ${processedPath}`);

  // 5. Generate embeddings and upload
  console.log('\nGenerating embeddings and uploading to Supabase...');
  let uploaded = 0;

  for (const chunk of chunks) {
    try {
      // Generate embedding
      const embedding = await generateEmbedding(chunk.content);

      // Upload to Supabase
      const { error } = await supabase.from('handbook_sections').insert({
        state_code: stateCode,
        effective_year: year,
        section_id: chunk.section_id,
        content: chunk.content,
        embedding: embedding,
        source_url: sourceUrl,
        metadata: chunk.metadata,
      });

      if (error) {
        console.error(`Error uploading chunk ${chunk.section_id}:`, error.message);
      } else {
        uploaded++;
        if (uploaded % 10 === 0) {
          console.log(`Uploaded ${uploaded}/${chunks.length} chunks`);
        }
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error processing chunk ${chunk.section_id}:`, error);
    }
  }

  console.log(`\n✅ ${stateCode} complete: ${uploaded}/${chunks.length} chunks uploaded`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/ingest-handbook.ts <STATE_CODE> <YEAR> [PDF_PATH] [SOURCE_URL]');
    console.log('Example: npx tsx scripts/ingest-handbook.ts CA 2026');
    process.exit(1);
  }

  const stateCode = args[0].toUpperCase();
  const year = parseInt(args[1], 10);
  const pdfPath = args[2] || path.join(__dirname, `../data/handbooks/raw/${stateCode}_handbook.pdf`);
  const sourceUrl = args[3] || `https://edd.ca.gov/handbook/${stateCode.toLowerCase()}-ui-handbook-${year}.pdf`;

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    console.log('\nPlease download the handbook PDF and place it at:');
    console.log(pdfPath);
    process.exit(1);
  }

  await ingestHandbook(pdfPath, stateCode, year, sourceUrl);
}

main().catch(console.error);
