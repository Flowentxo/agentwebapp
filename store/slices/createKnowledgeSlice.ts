// ============================================================================
// KNOWLEDGE SLICE - Level 5 & 8: Knowledge Management with RAG-Lite
// ============================================================================

import type { StateCreator } from 'zustand';
import { parseFile, estimateTokens } from '@/lib/file-parser';

// ============================================================================
// TYPES
// ============================================================================

export type FileStatus = 'uploading' | 'parsing' | 'indexing' | 'ready' | 'error';

export interface KnowledgeFile {
  id: string;
  name: string;
  type: string; // 'pdf' | 'txt' | 'csv' | 'docx' | 'md'
  size: number; // in bytes
  status: FileStatus;
  progress: number; // 0-100
  uploadedAt: Date;
  indexedAt?: Date;
  chunks?: number;
  errorMessage?: string;
  // Agent access control
  accessibleBy: string[]; // agent IDs that can access this file
  // Level 8: RAG-Lite - Parsed content
  content?: string; // Extracted text content
  tokenCount?: number; // Estimated token count
}

export interface KnowledgeState {
  files: KnowledgeFile[];
  isUploading: boolean;
  selectedFileId: string | null;
}

export interface KnowledgeActions {
  // File management
  uploadFile: (file: File) => Promise<string>;
  removeFile: (fileId: string) => void;
  retryIndexing: (fileId: string) => Promise<void>;

  // File selection
  selectFile: (fileId: string | null) => void;

  // Agent access control
  toggleFileAccess: (fileId: string, agentId: string) => void;
  setFileAccessForAgent: (fileId: string, agentIds: string[]) => void;
  getFilesForAgent: (agentId: string) => KnowledgeFile[];

  // Level 8: RAG Context
  getContextForAgent: (agentId: string) => { files: KnowledgeFile[]; context: string; tokenCount: number };

  // Bulk operations
  clearAllFiles: () => void;
}

export type KnowledgeSlice = KnowledgeState & KnowledgeActions;

// ============================================================================
// INITIAL STATE (with sample content for demo)
// ============================================================================

const INITIAL_FILES: KnowledgeFile[] = [
  {
    id: 'file-1',
    name: 'Q4-2024-Financial-Report.pdf',
    type: 'pdf',
    size: 2458000,
    status: 'ready',
    progress: 100,
    uploadedAt: new Date(Date.now() - 86400000 * 3),
    indexedAt: new Date(Date.now() - 86400000 * 3),
    chunks: 127,
    accessibleBy: ['dexter', 'nova'],
    content: `Q4 2024 Financial Report Summary

Executive Summary:
- Total Revenue: $4.2M (up 23% YoY)
- Gross Profit Margin: 68%
- Operating Expenses: $1.8M
- Net Income: $1.1M
- Customer Acquisition Cost (CAC): $125
- Lifetime Value (LTV): $2,400
- LTV:CAC Ratio: 19.2x

Key Highlights:
1. Enterprise segment grew 45% QoQ
2. SaaS recurring revenue reached $3.1M ARR
3. Customer churn reduced to 2.1%
4. Cash reserves: $8.5M

Revenue Breakdown by Segment:
- Enterprise: $2.1M (50%)
- Mid-Market: $1.3M (31%)
- SMB: $0.8M (19%)

Quarterly Trends:
Q1: $3.2M | Q2: $3.5M | Q3: $3.8M | Q4: $4.2M`,
    tokenCount: 200,
  },
  {
    id: 'file-2',
    name: 'Customer-Support-Guidelines.docx',
    type: 'docx',
    size: 845000,
    status: 'ready',
    progress: 100,
    uploadedAt: new Date(Date.now() - 86400000 * 7),
    indexedAt: new Date(Date.now() - 86400000 * 7),
    chunks: 45,
    accessibleBy: ['cassie', 'emmie'],
    content: `Customer Support Guidelines v2.0

Response Time Standards:
- Critical (P1): 15 minutes
- High (P2): 1 hour
- Medium (P3): 4 hours
- Low (P4): 24 hours

Escalation Matrix:
1. Tier 1: Basic troubleshooting, FAQ
2. Tier 2: Technical issues, account problems
3. Tier 3: Engineering escalation, bugs
4. Tier 4: Executive escalation

Communication Templates:
- Greeting: "Hi [Name], thank you for reaching out!"
- Acknowledgment: "I understand your concern about [issue]."
- Resolution: "I've resolved this by [action taken]."
- Follow-up: "Is there anything else I can help with?"

Refund Policy:
- Within 30 days: Full refund
- 31-60 days: 50% refund or credit
- After 60 days: Case-by-case basis

Common Issues & Solutions:
1. Password Reset: Link in email, expires in 24h
2. Billing Questions: Check invoice portal
3. Feature Requests: Submit to feedback board
4. Bug Reports: Collect screenshots, steps to reproduce`,
    tokenCount: 250,
  },
  {
    id: 'file-3',
    name: 'Brand-Guidelines-2024.pdf',
    type: 'pdf',
    size: 5120000,
    status: 'ready',
    progress: 100,
    uploadedAt: new Date(Date.now() - 86400000 * 14),
    indexedAt: new Date(Date.now() - 86400000 * 14),
    chunks: 234,
    accessibleBy: ['aura', 'emmie'],
    content: `Brand Guidelines 2024

Brand Identity:
- Primary Color: #6366F1 (Indigo)
- Secondary Color: #EC4899 (Pink)
- Accent Color: #10B981 (Emerald)
- Background: #09090B (Near Black)

Typography:
- Headings: Inter, Bold, 700
- Body: Inter, Regular, 400
- Code: JetBrains Mono

Logo Usage:
- Minimum size: 32px height
- Clear space: 1.5x logo height
- Never distort or recolor

Voice & Tone:
- Professional but approachable
- Clear and concise
- Empowering, not condescending
- Technical when needed, simple when possible

Content Pillars:
1. Innovation & AI
2. Productivity & Efficiency
3. User Empowerment
4. Data-Driven Decisions

Social Media:
- Twitter: Short, punchy updates
- LinkedIn: Professional insights
- Blog: In-depth tutorials`,
    tokenCount: 220,
  },
  {
    id: 'file-4',
    name: 'Market-Research-Data.csv',
    type: 'csv',
    size: 1250000,
    status: 'ready',
    progress: 100,
    uploadedAt: new Date(Date.now() - 86400000 * 2),
    indexedAt: new Date(Date.now() - 86400000 * 2),
    chunks: 89,
    accessibleBy: ['nova', 'dexter'],
    content: `Market Research Data Summary

Industry Analysis:
- Total Addressable Market (TAM): $45B
- Serviceable Addressable Market (SAM): $12B
- Serviceable Obtainable Market (SOM): $800M

Competitor Analysis:
1. Competitor A: 35% market share, $15B valuation
2. Competitor B: 22% market share, $8B valuation
3. Competitor C: 15% market share, $4B valuation
4. Others: 28% market share

Customer Segments:
- Enterprise (500+ employees): 40% of revenue
- Mid-Market (50-499): 35% of revenue
- SMB (1-49): 25% of revenue

Growth Projections:
- 2024: $4.2M
- 2025: $8.5M (projected)
- 2026: $15M (projected)
- CAGR: 89%

Key Trends:
1. AI adoption increasing 40% YoY
2. Remote work driving collaboration tools
3. Security concerns rising
4. Integration capabilities crucial`,
    tokenCount: 230,
  },
  {
    id: 'file-5',
    name: 'API-Documentation.md',
    type: 'md',
    size: 156000,
    status: 'ready',
    progress: 100,
    uploadedAt: new Date(Date.now() - 86400000),
    indexedAt: new Date(Date.now() - 86400000),
    chunks: 34,
    accessibleBy: ['dexter', 'nova', 'cassie'],
    content: `# API Documentation v2.0

## Authentication
All requests require Bearer token in header:
\`\`\`
Authorization: Bearer <your-api-key>
\`\`\`

## Endpoints

### GET /api/agents
Returns list of available agents.
Response: { agents: Agent[], total: number }

### POST /api/agents/:id/chat
Send message to agent.
Body: { message: string, context?: string }
Response: { response: string, tokens: number }

### GET /api/knowledge
List knowledge base files.
Response: { files: File[], total: number }

### POST /api/knowledge/upload
Upload new file to knowledge base.
Body: FormData with file
Response: { fileId: string, status: string }

## Rate Limits
- Free tier: 100 requests/hour
- Pro tier: 1000 requests/hour
- Enterprise: Unlimited

## Error Codes
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Rate Limited
- 500: Server Error`,
    tokenCount: 200,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFileTypeFromMime(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'text/markdown': 'md',
    'application/json': 'json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
  };
  return mimeMap[mimeType] || 'unknown';
}

function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createKnowledgeSlice: StateCreator<
  KnowledgeSlice,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  KnowledgeSlice
> = (set, get) => ({
  // Initial State
  files: INITIAL_FILES,
  isUploading: false,
  selectedFileId: null,

  // Upload a file with real content parsing
  uploadFile: async (file: File) => {
    const fileId = generateFileId();
    const fileType = getFileTypeFromMime(file.type);

    // Add file with uploading status
    const newFile: KnowledgeFile = {
      id: fileId,
      name: file.name,
      type: fileType,
      size: file.size,
      status: 'uploading',
      progress: 0,
      uploadedAt: new Date(),
      accessibleBy: [],
    };

    set(
      (state) => ({
        files: [newFile, ...state.files],
        isUploading: true,
      }),
      false,
      'knowledge/uploadFile:start'
    );

    try {
      // Simulate upload progress (quick)
      for (let i = 1; i <= 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        set(
          (state) => ({
            files: state.files.map((f) =>
              f.id === fileId ? { ...f, progress: i * 10 } : f
            ),
          }),
          false,
          'knowledge/uploadFile:progress'
        );
      }

      // Start parsing phase
      set(
        (state) => ({
          files: state.files.map((f) =>
            f.id === fileId ? { ...f, status: 'parsing', progress: 50 } : f
          ),
        }),
        false,
        'knowledge/uploadFile:parsing'
      );

      // Parse file content
      const parseResult = await parseFile(file);

      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse file');
      }

      // Update progress to 75%
      set(
        (state) => ({
          files: state.files.map((f) =>
            f.id === fileId ? { ...f, progress: 75 } : f
          ),
        }),
        false,
        'knowledge/uploadFile:parsed'
      );

      // Indexing phase (simulate)
      set(
        (state) => ({
          files: state.files.map((f) =>
            f.id === fileId ? { ...f, status: 'indexing', progress: 80 } : f
          ),
        }),
        false,
        'knowledge/uploadFile:indexing'
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Complete with parsed content
      const tokenCount = estimateTokens(parseResult.content);
      const chunks = Math.ceil(parseResult.content.length / 4000);

      set(
        (state) => ({
          files: state.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'ready',
                  progress: 100,
                  indexedAt: new Date(),
                  chunks,
                  content: parseResult.content,
                  tokenCount,
                }
              : f
          ),
          isUploading: false,
        }),
        false,
        'knowledge/uploadFile:complete'
      );

      return fileId;
    } catch (error: any) {
      set(
        (state) => ({
          files: state.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'error',
                  progress: 0,
                  errorMessage: error.message || 'Failed to process file',
                }
              : f
          ),
          isUploading: false,
        }),
        false,
        'knowledge/uploadFile:error'
      );

      throw error;
    }
  },

  // Remove a file
  removeFile: (fileId: string) =>
    set(
      (state) => ({
        files: state.files.filter((f) => f.id !== fileId),
        selectedFileId: state.selectedFileId === fileId ? null : state.selectedFileId,
      }),
      false,
      'knowledge/removeFile'
    ),

  // Retry indexing a failed file
  retryIndexing: async (fileId: string) => {
    const file = get().files.find((f) => f.id === fileId);
    if (!file) return;

    set(
      (state) => ({
        files: state.files.map((f) =>
          f.id === fileId
            ? { ...f, status: 'indexing', progress: 0, errorMessage: undefined }
            : f
        ),
      }),
      false,
      'knowledge/retryIndexing:start'
    );

    // Simulate indexing
    for (let i = 1; i <= 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      set(
        (state) => ({
          files: state.files.map((f) =>
            f.id === fileId ? { ...f, progress: i * 20 } : f
          ),
        }),
        false,
        'knowledge/retryIndexing:progress'
      );
    }

    const chunks = Math.floor(file.size / 4000) + Math.floor(Math.random() * 20);
    set(
      (state) => ({
        files: state.files.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: 'ready',
                progress: 100,
                indexedAt: new Date(),
                chunks,
              }
            : f
        ),
      }),
      false,
      'knowledge/retryIndexing:complete'
    );
  },

  // Select a file
  selectFile: (fileId: string | null) =>
    set({ selectedFileId: fileId }, false, 'knowledge/selectFile'),

  // Toggle file access for an agent
  toggleFileAccess: (fileId: string, agentId: string) =>
    set(
      (state) => ({
        files: state.files.map((f) => {
          if (f.id !== fileId) return f;
          const hasAccess = f.accessibleBy.includes(agentId);
          return {
            ...f,
            accessibleBy: hasAccess
              ? f.accessibleBy.filter((id) => id !== agentId)
              : [...f.accessibleBy, agentId],
          };
        }),
      }),
      false,
      'knowledge/toggleFileAccess'
    ),

  // Set file access for multiple agents
  setFileAccessForAgent: (fileId: string, agentIds: string[]) =>
    set(
      (state) => ({
        files: state.files.map((f) =>
          f.id === fileId ? { ...f, accessibleBy: agentIds } : f
        ),
      }),
      false,
      'knowledge/setFileAccessForAgent'
    ),

  // Get files accessible by a specific agent
  getFilesForAgent: (agentId: string) => {
    return get().files.filter(
      (f) => f.accessibleBy.includes(agentId) && f.status === 'ready' && f.content
    );
  },

  // Level 8: Get assembled context for an agent
  getContextForAgent: (agentId: string) => {
    const files = get().files.filter(
      (f) => f.accessibleBy.includes(agentId) && f.status === 'ready' && f.content
    );

    if (files.length === 0) {
      return { files: [], context: '', tokenCount: 0 };
    }

    // Build context string
    let context = '=== KNOWLEDGE BASE CONTEXT ===\n\n';
    let totalTokens = 0;
    const maxTokens = 6000; // Reserve tokens for response

    for (const file of files) {
      if (!file.content) continue;

      const fileTokens = file.tokenCount || estimateTokens(file.content);

      // Check if adding this file would exceed limit
      if (totalTokens + fileTokens > maxTokens) {
        context += `\n[Additional files truncated to fit context window]\n`;
        break;
      }

      context += `--- Document: ${file.name} (${file.type.toUpperCase()}) ---\n`;
      context += file.content;
      context += '\n\n';
      totalTokens += fileTokens;
    }

    context += '=== END OF KNOWLEDGE BASE ===\n';

    return {
      files,
      context,
      tokenCount: totalTokens,
    };
  },

  // Clear all files
  clearAllFiles: () =>
    set(
      { files: [], selectedFileId: null },
      false,
      'knowledge/clearAllFiles'
    ),
});

// ============================================================================
// SELECTORS
// ============================================================================

export const selectFiles = (state: KnowledgeSlice) => state.files;
export const selectReadyFiles = (state: KnowledgeSlice) =>
  state.files.filter((f) => f.status === 'ready');
export const selectIsUploading = (state: KnowledgeSlice) => state.isUploading;
export const selectSelectedFile = (state: KnowledgeSlice) =>
  state.files.find((f) => f.id === state.selectedFileId) || null;
export const selectTotalChunks = (state: KnowledgeSlice) =>
  state.files.reduce((sum, f) => sum + (f.chunks || 0), 0);
export const selectTotalStorageBytes = (state: KnowledgeSlice) =>
  state.files.reduce((sum, f) => sum + f.size, 0);
export const selectTotalTokens = (state: KnowledgeSlice) =>
  state.files.reduce((sum, f) => sum + (f.tokenCount || 0), 0);
