export type KnowledgeStatus = "draft" | "in_review" | "published" | "archived";
export type UserRole = "user" | "editor" | "reviewer" | "admin";

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  categoryPath?: string[];
  tags: string[];
  author: string;
  authorEmail: string;
  status: KnowledgeStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
  metadata?: {
    views: number;
    likes: number;
    linkedAgents?: string[];
  };
}

export interface KnowledgeRevision {
  id: string;
  entryId: string;
  version: number;
  content: string;
  author: string;
  createdAt: string;
  changes: string;
}

export interface KnowledgeComment {
  id: string;
  entryId: string;
  author: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface KnowledgeAuditLog {
  id: string;
  entryId: string;
  action: string;
  user: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeTag {
  id: string;
  name: string;
  color?: string;
  usageCount: number;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  parentId?: string;
  children?: KnowledgeCategory[];
  entryCount: number;
}

export interface KnowledgeStats {
  totalEntries: number;
  recentChanges24h: number;
  pendingApprovals: number;
  popularTags: Array<{ tag: string; count: number }>;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  status?: KnowledgeStatus;
  fromDate?: string;
  toDate?: string;
}

export interface SearchResult {
  entry: KnowledgeEntry;
  relevanceScore: number;
  highlights: string[];
}

export interface AskResponse {
  answer: string;
  sources: Array<{
    entryId: string;
    title: string;
    relevance: number;
  }>;
  confidence: number;
}
