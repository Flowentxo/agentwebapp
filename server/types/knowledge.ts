export interface KnowledgeChunk {
  id: string
  userId: string
  content: string
  embedding: number[]
  filename: string
  fileType: string
  createdAt: Date
  source: string // "knowledge-upload"
  metadata: {
    chunkIndex: number
    totalChunks: number
    documentId: string
    summary?: string
    [key: string]: any
  }
  shared: boolean // Always true for shared knowledge
}

export interface KnowledgeDocument {
  id: string
  userId: string
  title: string
  filename: string
  fileType: string
  size: number
  uploadedBy: string
  uploadedAt: Date
  chunks: string[] // Array of chunk IDs
  vectorized: boolean
  tags: string[]
  metadata: {
    summary?: string
    path: string
    totalChunks: number
    [key: string]: any
  }
}

export interface KnowledgeQueryRequest {
  userId: string
  query: string
  agentName?: string
  topK?: number
  threshold?: number
}

export interface KnowledgeQueryResult {
  chunk: KnowledgeChunk
  score: number
}
