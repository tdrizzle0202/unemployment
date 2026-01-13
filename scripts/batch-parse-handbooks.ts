import { UnstructuredClient } from 'unstructured-client';
import { Strategy } from 'unstructured-client/sdk/models/shared/partitionparameters';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

console.log('API Key loaded:', process.env.UNSTRUCTURED_API_KEY ? 'Yes' : 'No');

// Initialize Unstructured client
const unstructured = new UnstructuredClient({
  security: { apiKeyAuth: process.env.UNSTRUCTURED_API_KEY! },
});

// Map filename to state code
const stateCodeMap: Record<string, string> = {
  'ca': 'CA',
  'california': 'CA',
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'connecticut': 'CT',
  'delaware': 'DE',
  'florida': 'FL',
  'georgia': 'GA',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'missipipi': 'MS',  // typo in filename
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'new hamphsire': 'NH',  // typo in filename
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'newyork': 'NY',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south daokota': 'SD',  // typo in filename
  'south dakota': 'SD',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wyonming': 'WY',  // typo in filename
  'wyoming': 'WY',
  'colorado': 'CO',
  'hawaii': 'HI',
  'louisiana': 'LA',
  'minnesota': 'MN',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new mexico': 'NM',
  'south carolina': 'SC',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'wisconsin': 'WI',
};

function getStateCode(filename: string): string {
  const baseName = path.basename(filename, '.pdf').toLowerCase();
  return stateCodeMap[baseName] || baseName.toUpperCase().slice(0, 2);
}

interface ProcessedChunk {
  section_id: string;
  content: string;
  metadata: {
    section_title?: string;
    page_number?: number;
    element_type?: string;
  };
}

const CHUNK_MAX = 1500;
const CHUNK_MIN = 800;
const OVERLAP = 100;

// Find sentence boundary: period followed by whitespace and capital letter
function findSentenceEnd(text: string, minPos: number): number {
  const searchText = text.slice(minPos);
  const match = searchText.match(/\.\s+[A-Z]/);
  if (!match || match.index === undefined) return text.length;

  let splitPoint = minPos + match.index + 1; // after the period

  // Don't split if preceded by exception words (look back ~50 chars)
  const lookback = text.slice(Math.max(0, splitPoint - 50), splitPoint);
  if (lookback.match(/\b(unless|except|however|provided|although|whereas)\s*$/i)) {
    // Find next sentence boundary instead
    const nextMatch = text.slice(splitPoint + 10).match(/\.\s+[A-Z]/);
    if (nextMatch && nextMatch.index !== undefined) {
      splitPoint = splitPoint + 10 + nextMatch.index + 1;
    }
  }

  return splitPoint;
}

function processElements(elements: unknown[], stateCode: string): ProcessedChunk[] {
  const chunks: ProcessedChunk[] = [];
  let currentSection = '';
  let currentContent = '';
  let currentPageNumber = 1;
  let chunkIndex = 0;
  let overlapText = ''; // Only used for size-based splits

  for (const element of elements as Array<{
    type: string;
    text?: string;
    metadata?: { page_number?: number };
  }>) {
    if (element.metadata?.page_number) {
      currentPageNumber = element.metadata.page_number;
    }

    // Title = new section, NO overlap (clean break)
    if (element.type === 'Title' && element.text) {
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
      overlapText = ''; // Reset overlap at section boundaries
    } else if (element.text) {
      currentContent += element.text + '\n';
    }

    // Size-based split WITH overlap
    if (currentContent.length > CHUNK_MAX) {
      const splitPoint = findSentenceEnd(currentContent, CHUNK_MIN);
      const chunkText = overlapText + currentContent.slice(0, splitPoint);

      chunks.push({
        section_id: `${stateCode}-${chunkIndex}`,
        content: chunkText.trim(),
        metadata: {
          section_title: currentSection || undefined,
          page_number: currentPageNumber,
        },
      });
      chunkIndex++;

      // Save overlap for next chunk (only for size-based splits)
      overlapText = currentContent.slice(Math.max(0, splitPoint - OVERLAP), splitPoint);
      currentContent = currentContent.slice(splitPoint);
    }
  }

  // Don't forget last chunk
  if (currentContent.trim()) {
    chunks.push({
      section_id: `${stateCode}-${chunkIndex}`,
      content: (overlapText + currentContent).trim(),
      metadata: {
        section_title: currentSection || undefined,
        page_number: currentPageNumber,
      },
    });
  }

  return chunks;
}

async function parseHandbook(pdfPath: string): Promise<{ stateCode: string; chunks: ProcessedChunk[]; rawElements: unknown[] }> {
  const stateCode = getStateCode(pdfPath);
  const pdfBuffer = fs.readFileSync(pdfPath);
  const fileName = path.basename(pdfPath);

  console.log(`  Sending to Unstructured.io API...`);

  const response = await unstructured.general.partition({
    partitionParameters: {
      files: {
        content: pdfBuffer,
        fileName: fileName,
      },
      strategy: Strategy.Auto,
      splitPdfPage: true,
      splitPdfConcurrencyLevel: 5,
    },
  });

  // Response can be string or object with elements
  const elements = (typeof response === 'object' && 'elements' in response)
    ? (response as { elements: unknown[] }).elements
    : (Array.isArray(response) ? response : []);
  console.log(`  Extracted ${elements.length} elements`);

  const chunks = processElements(elements, stateCode);
  console.log(`  Created ${chunks.length} chunks`);

  return { stateCode, chunks, rawElements: elements };
}

async function main() {
  const inputDir = process.argv[2] || path.join(__dirname, '../data/states');
  const outputDir = process.argv[3] || path.join(__dirname, '../data/handbooks/processed');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get all PDF files
  const pdfFiles = fs.readdirSync(inputDir)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(inputDir, f));

  console.log(`Found ${pdfFiles.length} PDF files to process\n`);

  const results: { state: string; status: string; chunks?: number; error?: string }[] = [];

  let skipped = 0;
  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfPath = pdfFiles[i];
    const fileName = path.basename(pdfPath);
    const stateCode = getStateCode(pdfPath);

    // Skip if already processed
    const chunksOutputPath = path.join(outputDir, `${stateCode}_chunks.json`);
    if (fs.existsSync(chunksOutputPath)) {
      console.log(`[${i + 1}/${pdfFiles.length}] Skipping ${fileName} (${stateCode}_chunks.json already exists)`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${pdfFiles.length}] Processing: ${fileName} -> ${stateCode}`);

    try {
      const { stateCode, chunks, rawElements } = await parseHandbook(pdfPath);

      // Save processed chunks
      const chunksOutputPath = path.join(outputDir, `${stateCode}_chunks.json`);
      fs.writeFileSync(chunksOutputPath, JSON.stringify(chunks, null, 2));

      // Save raw elements for reference
      const rawOutputPath = path.join(outputDir, `${stateCode}_raw.json`);
      fs.writeFileSync(rawOutputPath, JSON.stringify(rawElements, null, 2));

      console.log(`  ✅ Saved to ${stateCode}_chunks.json and ${stateCode}_raw.json\n`);

      results.push({ state: stateCode, status: 'success', chunks: chunks.length });

      // Rate limiting between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Error: ${errorMsg}\n`);
      results.push({ state: fileName, status: 'error', error: errorMsg });
    }
  }

  // Save summary
  const summaryPath = path.join(outputDir, '_processing_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    processedAt: new Date().toISOString(),
    totalFiles: pdfFiles.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'error').length,
    results,
  }, null, 2));

  console.log('\n========================================');
  console.log('Processing Complete!');
  console.log(`  Total: ${pdfFiles.length}`);
  console.log(`  Skipped (already processed): ${skipped}`);
  console.log(`  Success: ${results.filter(r => r.status === 'success').length}`);
  console.log(`  Failed: ${results.filter(r => r.status === 'error').length}`);
  console.log(`  Output: ${outputDir}`);
  console.log('========================================\n');
}

main().catch(console.error);
