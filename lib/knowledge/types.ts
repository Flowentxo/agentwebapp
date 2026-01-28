/**
 * Knowledge Domain Types
 * Sprint 3 - Knowledge MVP
 */

export interface KnowledgeItem {
  id: string;
  type: "note" | "url";
  title: string;
  content?: string; // for type="note"
  url?: string; // for type="url"
  createdAt: string;
  updatedAt: string;
  chunkCount: number;
  redactions: {
    emails: number;
    phones: number;
  };
}

export interface Chunk {
  id: string;
  itemId: string;
  index: number;
  text: string;
  redactions: {
    emails: number;
    phones: number;
  };
}

export interface SearchResult {
  itemId: string;
  title: string;
  score: number;
  url?: string;
  chunkIndices: number[];
}

export interface AskResponse {
  answer: string;
  sources: Array<{
    itemId: string;
    title: string;
    score: number;
    url?: string;
  }>;
  debug?: {
    chunks: Array<{
      itemId: string;
      chunkIndex: number;
      text: string;
      score: number;
    }>;
  };
}
