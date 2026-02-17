/**
 * Backfill Embeddings Script
 *
 * Generates Gemini gemini-embedding-001 embeddings for all story_memory_chunks
 * that have NULL embedding values. Processes in batches per project+chapter.
 *
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts
 *   npx tsx scripts/backfill-embeddings.ts --project <project_id>  # single project
 *   npx tsx scripts/backfill-embeddings.ts --dry-run               # count only
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

// ── Gemini Embedding API (same as rag-retriever.ts) ──

const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const EMBEDDING_DIMENSION = 768;
const OUTPUT_DIMENSIONALITY = 768; // Truncate 3072 -> 768 to keep DB column compatible
const BATCH_SIZE = 100; // Gemini batch limit

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function embedBatch(texts: string[], apiKey: string): Promise<(number[] | null)[]> {
  const requests = texts.map(text => ({
    model: `models/${GEMINI_EMBEDDING_MODEL}`,
    content: { parts: [{ text: text.slice(0, 8000) }] },
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: OUTPUT_DIMENSIONALITY,
  }));

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error(`  Batch embed failed: ${response.status} ${errBody.slice(0, 200)}`);
      return texts.map(() => null);
    }

    const data = await response.json();
    const embeddings = data?.embeddings;

    if (!Array.isArray(embeddings)) {
      console.error('  Unexpected response shape');
      return texts.map(() => null);
    }

    return embeddings.map((e: { values?: number[] }) => {
      const values = e?.values;
      return Array.isArray(values) && values.length === EMBEDDING_DIMENSION ? values : null;
    });
  } catch (e) {
    console.error(`  Batch embed error: ${e instanceof Error ? e.message : String(e)}`);
    return texts.map(() => null);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const projectIdx = args.indexOf('--project');
  const projectFilter = projectIdx >= 0 ? args[projectIdx + 1] : null;

  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = getEnv('GEMINI_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Count un-embedded chunks
  let query = supabase
    .from('story_memory_chunks')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null);

  if (projectFilter) {
    query = query.eq('project_id', projectFilter);
  }

  const { count } = await query;
  console.log(`\nFound ${count ?? 0} chunks without embeddings${projectFilter ? ` (project: ${projectFilter})` : ''}`);

  if (dryRun || !count || count === 0) {
    console.log(dryRun ? 'Dry run — no changes made.' : 'Nothing to backfill.');
    return;
  }

  // Process in pages of BATCH_SIZE
  let processed = 0;
  let embedded = 0;
  let page = 0;

  while (processed < count) {
    // Fetch a batch of un-embedded chunks
    let fetchQuery = supabase
      .from('story_memory_chunks')
      .select('id, content')
      .is('embedding', null)
      .order('created_at', { ascending: true })
      .range(0, BATCH_SIZE - 1); // Always fetch from top since we're updating them

    if (projectFilter) {
      fetchQuery = fetchQuery.eq('project_id', projectFilter);
    }

    const { data: chunks, error } = await fetchQuery;

    if (error) {
      console.error(`Fetch error: ${error.message}`);
      break;
    }

    if (!chunks || chunks.length === 0) {
      break;
    }

    page++;
    console.log(`\nBatch ${page}: ${chunks.length} chunks (${processed}/${count} done)`);

    // Embed
    const texts = chunks.map(c => c.content);
    const embeddings = await embedBatch(texts, geminiKey);

    // Update each chunk
    let batchEmbedded = 0;
    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddings[i];
      if (!embedding) continue;

      const { error: updateError } = await supabase
        .from('story_memory_chunks')
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', chunks[i].id);

      if (!updateError) batchEmbedded++;
    }

    processed += chunks.length;
    embedded += batchEmbedded;
    console.log(`  Embedded: ${batchEmbedded}/${chunks.length}`);

    // Rate limit: ~1 batch per second
    if (processed < count) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n✓ Done. Embedded ${embedded}/${processed} chunks total.`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
