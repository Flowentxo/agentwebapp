import { z } from 'zod';

/**
 * Zod schemas for API validation
 */

// Knowledge Base Entry schemas
export const createEntrySchema = z.object({
  kbId: z.string().uuid('Invalid knowledge base ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(500),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  visibility: z.enum(['org', 'private']).default('org'),
  source: z.object({
    type: z.enum(['note', 'url', 'file']),
    contentMd: z.string().optional(),
    url: z.string().url().optional(),
    fileId: z.string().optional(),
  }),
});

export const listEntriesSchema = z.object({
  kbId: z.string().uuid().optional(),
  q: z.string().optional(),
  tag: z.string().optional(),
  status: z.enum(['draft', 'in_review', 'published', 'archived']).optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
  offset: z.coerce.number().min(0).default(0),
});

export const reviseEntrySchema = z.object({
  contentMd: z.string().min(1).optional(),
  url: z.string().url().optional(),
  sourceType: z.enum(['note', 'url', 'file']).default('note'),
});

export const createCommentSchema = z.object({
  bodyMd: z.string().min(1, 'Comment cannot be empty'),
});

// Search schemas
export const searchEntriesSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  kb: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  author: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  topk: z.coerce.number().min(1).max(50).default(8),
});

// RAG schemas
export const retrieveSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  kb: z.string().optional(),
  topk: z.coerce.number().min(1).max(10).default(6),
  filters: z.object({
    tags: z.array(z.string()).optional(),
    status: z.array(z.string()).default(['published']),
  }).optional(),
});

export const generateSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  kb: z.string().optional(),
  topk: z.coerce.number().min(1).max(10).optional(),
  answerStyle: z.enum(['concise', 'detailed', 'steps']).optional(),
});

/**
 * Type inference helpers
 */
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type ListEntriesInput = z.infer<typeof listEntriesSchema>;
export type ReviseEntryInput = z.infer<typeof reviseEntrySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type SearchEntriesInput = z.infer<typeof searchEntriesSchema>;
export type RetrieveInput = z.infer<typeof retrieveSchema>;
export type GenerateInput = z.infer<typeof generateSchema>;
