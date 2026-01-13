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

// Structure of pre-processed chunk files
interface ChunkFile {
    section_id: string;
    content: string;
    metadata: {
        section_title?: string;
        page_number?: number;
        element_types?: string[];
        element_ids?: string[];
    };
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
    });
    return response.data.map((d) => d.embedding);
}

async function embedStateChunks(
    stateCode: string,
    chunks: ChunkFile[],
    year: number,
    dryRun: boolean
): Promise<{ uploaded: number; errors: number }> {
    console.log(`\n📄 Processing ${stateCode}: ${chunks.length} chunks`);

    if (dryRun) {
        console.log(`   [DRY RUN] Would embed and upload ${chunks.length} chunks`);
        return { uploaded: chunks.length, errors: 0 };
    }

    // Generate embeddings in batches
    const BATCH_SIZE = 100;
    const embeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchTexts = batch.map((c) => c.content);

        try {
            const batchEmbeddings = await generateEmbeddingsBatch(batchTexts);
            embeddings.push(...batchEmbeddings);
            console.log(`   Embedded ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}`);
        } catch (error) {
            console.error(`   Error embedding batch at ${i}:`, error);
            // Add empty embeddings as placeholders
            for (let j = 0; j < batch.length; j++) {
                embeddings.push([]);
            }
        }

        // Rate limiting delay
        await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Upload to Supabase
    let uploaded = 0;
    let errors = 0;
    const UPLOAD_BATCH_SIZE = 50;

    for (let i = 0; i < chunks.length; i += UPLOAD_BATCH_SIZE) {
        const batch = chunks.slice(i, i + UPLOAD_BATCH_SIZE);
        const records = batch.map((chunk, idx) => ({
            state_code: stateCode,
            effective_year: year,
            section_id: chunk.section_id,
            content: chunk.content,
            embedding: embeddings[i + idx]?.length ? embeddings[i + idx] : null,
            source_url: '',
            metadata: chunk.metadata,
        }));

        const { error } = await supabase
            .from('handbook_sections')
            .upsert(records, {
                onConflict: 'state_code,effective_year,section_id',
                ignoreDuplicates: false,
            });

        if (error) {
            console.error(`   Upload error at ${i}: ${error.message}`);
            errors += batch.length;
        } else {
            uploaded += batch.length;
        }
    }

    console.log(`   ✅ Uploaded: ${uploaded}, Errors: ${errors}`);
    return { uploaded, errors };
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const singleState = args.find((a) => a.match(/^[A-Z]{2}$/));

    if (dryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    initClients();

    // Find all chunk files
    const processedDir = path.join(process.cwd(), 'data', 'handbooks', 'processed');
    const files = fs.readdirSync(processedDir).filter((f) => f.endsWith('_chunks.json'));

    console.log(`Found ${files.length} chunk files in ${processedDir}\n`);

    const year = 2026; // Default year for all handbooks
    let totalUploaded = 0;
    let totalErrors = 0;
    let statesProcessed = 0;

    for (const file of files) {
        // Extract state code from filename (e.g., "CA_chunks.json" -> "CA")
        const stateCode = file.replace('_chunks.json', '').replace('_2025', '').toUpperCase();

        // Skip if filtering to single state
        if (singleState && stateCode !== singleState) {
            continue;
        }

        const filePath = path.join(processedDir, file);

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const chunks: ChunkFile[] = JSON.parse(content);

            if (!Array.isArray(chunks) || chunks.length === 0) {
                console.log(`⚠️  Skipping ${file}: empty or invalid`);
                continue;
            }

            const result = await embedStateChunks(stateCode, chunks, year, dryRun);
            totalUploaded += result.uploaded;
            totalErrors += result.errors;
            statesProcessed++;

        } catch (error) {
            console.error(`❌ Error processing ${file}:`, error);
            totalErrors++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 SUMMARY`);
    console.log(`   States processed: ${statesProcessed}`);
    console.log(`   Total chunks uploaded: ${totalUploaded}`);
    console.log(`   Total errors: ${totalErrors}`);
    console.log('='.repeat(50));
}

main().catch(console.error);
