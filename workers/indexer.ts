import { Worker } from 'bullmq';
import { getDb } from '../lib/db/connection';
import { kbRevisions, kbChunks, kbEntries } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { chunkMarkdown } from '../lib/knowledge/chunker';
import { generateEmbeddingsBatch } from '../lib/knowledge/embeddings';
import Redis from 'ioredis';

// Job name constants (must match queues.ts)
const JOB_INDEX_REVISION = 'index-revision';
const JOB_REINDEX_KB = 'reindex-kb';

const connection = new Redis({
  host: (process.env.REDIS_HOST || 'localhost').replace(/^['"]|['"]$/g, ''),
  port: parseInt((process.env.REDIS_PORT || '6379').replace(/^['"]|['"]$/g, '')),
  password: process.env.REDIS_PASSWORD?.replace(/^['"]|['"]$/g, '') || undefined,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
});

const worker = new Worker(
  'knowledge-index',
  async (job) => {
    const db = getDb();

    if (job.name === JOB_INDEX_REVISION) {
      const { revisionId } = job.data;
      console.log(`[Worker] Indexing revision ${revisionId}`);

      const [revision] = await db
        .select()
        .from(kbRevisions)
        .where(eq(kbRevisions.id, revisionId));

      if (!revision) {
        throw new Error(`Revision ${revisionId} not found`);
      }

      const chunks = await chunkMarkdown(revision.contentMd);
      console.log(`[Worker] Created ${chunks.length} chunks`);

      const texts = chunks.map((c) => c.text);
      const embeddings = await generateEmbeddingsBatch(texts, {}, (done, total) => {
        job.updateProgress((done / total) * 100);
      });

      for (let i = 0; i < chunks.length; i++) {
        await db.insert(kbChunks).values({
          revisionId: revision.id,
          idx: chunks[i].idx,
          text: chunks[i].text,
          tokens: chunks[i].tokens,
          embedding: embeddings[i],
          meta: chunks[i].meta,
        });
      }

      console.log(`[Worker] Indexed ${chunks.length} chunks for revision ${revisionId}`);
      return { chunksCreated: chunks.length };
    }

    if (job.name === JOB_REINDEX_KB) {
      const { kbId } = job.data;
      console.log(`[Worker] Reindexing KB ${kbId}`);

      const entries = await db
        .select()
        .from(kbEntries)
        .where(eq(kbEntries.kbId, kbId));

      let totalChunks = 0;
      for (const entry of entries) {
        if (entry.currentRevisionId) {
          const [revision] = await db
            .select()
            .from(kbRevisions)
            .where(eq(kbRevisions.id, entry.currentRevisionId));

          if (revision) {
            const chunks = await chunkMarkdown(revision.contentMd);
            const texts = chunks.map((c) => c.text);
            const embeddings = await generateEmbeddingsBatch(texts);

            for (let i = 0; i < chunks.length; i++) {
              await db.insert(kbChunks).values({
                revisionId: revision.id,
                idx: chunks[i].idx,
                text: chunks[i].text,
                tokens: chunks[i].tokens,
                embedding: embeddings[i],
                meta: chunks[i].meta,
              });
            }

            totalChunks += chunks.length;
          }
        }
      }

      console.log(`[Worker] Reindexed KB ${kbId}, created ${totalChunks} chunks`);
      return { chunksCreated: totalChunks };
    }

    throw new Error(`Unknown job type: ${job.name}`);
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err);
});

console.log('✅ Knowledge indexer worker started');
