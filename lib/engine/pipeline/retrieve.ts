import OpenAI from 'openai';
import { createServiceClient } from '@/lib/supabase/server';

const openai = new OpenAI();

export interface HandbookSection {
  id: string;
  state_code: string;
  section_id: string;
  content: string;
  metadata: {
    section_title?: string;
    page_number?: number;
    [key: string]: unknown;
  };
  similarity: number;
}

export async function retrieveHandbookSections(
  query: string,
  stateCode: string,
  options: {
    matchCount?: number;
    matchThreshold?: number;
    effectiveYear?: number;
  } = {}
): Promise<HandbookSection[]> {
  const {
    matchCount = 5,
    matchThreshold = 0.7,
    effectiveYear = new Date().getFullYear(),
  } = options;

  try {
    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search for similar sections
    const supabase = await createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('match_handbook_sections', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_state: stateCode,
      filter_year: effectiveYear,
    });

    if (error) {
      console.error('Error retrieving handbook sections:', error);
      return [];
    }

    return (data || []).map((row: {
      id: string;
      state_code: string;
      section_id: string;
      content: string;
      metadata: Record<string, unknown>;
      similarity: number;
    }) => ({
      id: row.id,
      state_code: row.state_code,
      section_id: row.section_id,
      content: row.content,
      metadata: row.metadata as HandbookSection['metadata'],
      similarity: row.similarity,
    }));
  } catch (error) {
    console.error('Error in retrieveHandbookSections:', error);
    return [];
  }
}

export async function retrieveMultipleQueries(
  queries: string[],
  stateCode: string,
  options: {
    matchCount?: number;
    matchThreshold?: number;
  } = {}
): Promise<HandbookSection[]> {
  const results = await Promise.all(
    queries.map((query) => retrieveHandbookSections(query, stateCode, options))
  );

  // Deduplicate by section ID, keeping highest similarity
  const sectionMap = new Map<string, HandbookSection>();

  for (const sections of results) {
    for (const section of sections) {
      const existing = sectionMap.get(section.section_id);
      if (!existing || section.similarity > existing.similarity) {
        sectionMap.set(section.section_id, section);
      }
    }
  }

  return Array.from(sectionMap.values()).sort(
    (a, b) => b.similarity - a.similarity
  );
}
