// ============================================================================
// DASHBOARD ZUSTAND STORE - Level 5: Knowledge Management & Rich Results
// ============================================================================

import { create } from 'zustand';
import { devtools, subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import type {
  AgentStatus,
  LogEntry,
  DashboardStats,
  CommandSuggestion,
  AgentCostBreakdown,
  AgentConfig,
  AgentConfigUpdate,
  AgentCapabilities,
  KnowledgeBaseStatus,
  ToolInvocation,
} from '@/components/dashboard/types';

// Level 5: Knowledge Management Types
import type { KnowledgeFile, KnowledgeSlice } from './slices/createKnowledgeSlice';

// Level 11: Pipeline Types
import type {
  Pipeline,
  PipelineStep,
  PipelineRun,
  PipelineSlice,
  CreatePipelineData,
} from './slices/createPipelineSlice';

// ============================================================================
// EXTENDED TYPES FOR STORE
// ============================================================================

export type AgentWorkStatus = 'idle' | 'working' | 'paused' | 'offline' | 'error';

export interface DashboardAgent extends Omit<AgentStatus, 'status'> {
  status: AgentWorkStatus;
  currentTask?: string;
  taskStartedAt?: Date;
  config: AgentConfig; // Level 4: Agent Configuration
}

export interface TokenUsageDataPoint {
  date: string;
  tokens: number;
  cost: number;
}

export interface DashboardMetrics {
  tokenUsage: number;
  totalCost: number;
  pendingJobs: number;
  systemHealth: number;
  tokenHistory: TokenUsageDataPoint[];
  agentCosts: AgentCostBreakdown[];
}

export interface QueuedJob {
  id: string;
  command: string;
  assignedAgent?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// ============================================================================
// DEFAULT AGENT CONFIGURATION
// ============================================================================

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  temperature: 0.7,
  capabilities: {
    internetAccess: true,
    longTermMemory: true,
    codeExecution: false,
  },
  maxTokensPerRequest: 4000,
};

// ============================================================================
// INITIAL DATA
// ============================================================================

const INITIAL_AGENTS: DashboardAgent[] = [
  {
    id: 'dexter',
    name: 'Dexter',
    role: 'Financial Analyst',
    color: '#3B82F6',
    status: 'idle',
    lastActivity: new Date(Date.now() - 120000),
    requests24h: 3421,
    successRate24h: 99.2,
    avgResponseTime: 1250,
    tokensUsed24h: 45000,
    costToday: 0.92,
    config: { ...DEFAULT_AGENT_CONFIG, temperature: 0.3, capabilities: { ...DEFAULT_AGENT_CONFIG.capabilities, codeExecution: true } },
  },
  {
    id: 'cassie',
    name: 'Cassie',
    role: 'Customer Support',
    color: '#10B981',
    status: 'idle',
    lastActivity: new Date(Date.now() - 180000),
    requests24h: 2847,
    successRate24h: 98.7,
    avgResponseTime: 890,
    tokensUsed24h: 32000,
    costToday: 0.65,
    config: { ...DEFAULT_AGENT_CONFIG, temperature: 0.8 },
  },
  {
    id: 'emmie',
    name: 'Emmie',
    role: 'Email Manager',
    color: '#8B5CF6',
    status: 'idle',
    lastActivity: new Date(Date.now() - 60000),
    requests24h: 1923,
    successRate24h: 97.5,
    avgResponseTime: 2100,
    tokensUsed24h: 28000,
    costToday: 0.57,
    config: { ...DEFAULT_AGENT_CONFIG, temperature: 0.5 },
  },
  {
    id: 'aura',
    name: 'Aura',
    role: 'Brand Strategist',
    color: '#EC4899',
    status: 'idle',
    lastActivity: new Date(Date.now() - 600000),
    requests24h: 1456,
    successRate24h: 98.1,
    avgResponseTime: 3200,
    tokensUsed24h: 18000,
    costToday: 0.37,
    config: { ...DEFAULT_AGENT_CONFIG, temperature: 0.9 },
  },
  {
    id: 'nova',
    name: 'Nova',
    role: 'Research Specialist',
    color: '#F59E0B',
    status: 'idle',
    lastActivity: new Date(Date.now() - 300000),
    requests24h: 2156,
    successRate24h: 98.9,
    avgResponseTime: 1800,
    tokensUsed24h: 35000,
    costToday: 0.71,
    config: { ...DEFAULT_AGENT_CONFIG, capabilities: { ...DEFAULT_AGENT_CONFIG.capabilities, internetAccess: true } },
  },
];

const INITIAL_LOGS: LogEntry[] = [
  {
    id: 'log-1',
    type: 'success',
    status: 'completed',
    message: 'Financial analysis completed',
    timestamp: new Date(Date.now() - 120000),
    agent: 'Dexter',
    agentColor: '#3B82F6',
    duration: 4500,
    tokensUsed: 2340,
    cost: 0.047,
    output: {
      type: 'report',
      title: 'Q4 2024 Financial Analysis Report',
      content: `## Executive Summary\n\nRevenue increased by 23% compared to Q3.`,
      downloadable: true,
      filename: 'q4-2024-financial-report.pdf',
    },
  },
  {
    id: 'log-2',
    type: 'info',
    status: 'completed',
    message: 'System health check passed',
    timestamp: new Date(Date.now() - 300000),
    duration: 1200,
  },
  {
    id: 'log-3',
    type: 'success',
    status: 'completed',
    message: '15 support tickets resolved',
    timestamp: new Date(Date.now() - 720000),
    agent: 'Cassie',
    agentColor: '#10B981',
    duration: 18500,
    tokensUsed: 8920,
    cost: 0.178,
  },
];

const INITIAL_TOKEN_HISTORY: TokenUsageDataPoint[] = [
  { date: '12/21', tokens: 85000, cost: 1.7 },
  { date: '12/22', tokens: 92000, cost: 1.84 },
  { date: '12/23', tokens: 78000, cost: 1.56 },
  { date: '12/24', tokens: 105000, cost: 2.1 },
  { date: '12/25', tokens: 68000, cost: 1.36 },
  { date: '12/26', tokens: 115000, cost: 2.3 },
  { date: '12/27', tokens: 123000, cost: 2.46 },
];

const INITIAL_KNOWLEDGE_BASE: KnowledgeBaseStatus = {
  documentCount: 142,
  lastSyncedAt: new Date(Date.now() - 120000), // 2 minutes ago
  isSyncing: false,
  totalChunks: 3847,
  vectorDimensions: 1536,
  storageUsedMb: 256.4,
};

// Level 5: Initial Knowledge Files
const INITIAL_FILES: KnowledgeFileState[] = [
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
  },
];

// Level 5: Rich Markdown Report Templates
const RESEARCH_REPORT_TEMPLATE = (topic: string, agent: string) => `## Executive Summary

This research report provides a comprehensive analysis of **${topic}**.

### Key Findings

| Metric | Value | Change |
|--------|-------|--------|
| Market Size | $4.2B | +15% YoY |
| Growth Rate | 12.3% | +2.1pp |
| Key Players | 15 | +3 new |

### Highlights

* **Finding 1**: The market shows strong momentum with consistent double-digit growth
* **Finding 2**: Three new entrants have disrupted traditional pricing models
* **Finding 3**: Customer acquisition costs have decreased by 18%

### Recommendations

1. Prioritize expansion in the APAC region
2. Invest in AI-driven customer analytics
3. Consider strategic partnerships with emerging players

---
*Report generated by ${agent} | ${new Date().toLocaleDateString()}*`;

const ANALYSIS_REPORT_TEMPLATE = (topic: string, agent: string) => `## Data Analysis Report

### Overview
Analysis performed on: **${topic}**

### Statistical Summary

| Statistic | Value |
|-----------|-------|
| Sample Size | 10,432 |
| Mean | 78.3 |
| Median | 72.1 |
| Std Dev | 15.2 |
| 95% CI | [75.4, 81.2] |

### Key Insights

1. **Trend Analysis**: Positive correlation (r=0.82) observed between engagement and revenue
2. **Anomaly Detection**: 3 outliers identified in Q3 dataset
3. **Forecasting**: 23% growth projected for next quarter

### Visualization Notes

\`\`\`
Revenue Trend (Last 6 Months)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jul ████████████░░░░ 78%
Aug █████████████░░░ 82%
Sep ██████████████░░ 88%
Oct ███████████████░ 92%
Nov ████████████████ 96%
Dec █████████████████ 102%
\`\`\`

---
*Analysis by ${agent} | Confidence: High*`;

const FORECAST_REPORT_TEMPLATE = (topic: string, agent: string) => `## Financial Forecast

### ${topic}

#### Revenue Projections

| Quarter | Projected | Confidence |
|---------|-----------|------------|
| Q1 2025 | $2.4M | 95% |
| Q2 2025 | $2.8M | 90% |
| Q3 2025 | $3.2M | 85% |
| Q4 2025 | $3.8M | 80% |

#### Key Assumptions

* **Growth Rate**: 15% QoQ baseline
* **Market Conditions**: Stable with moderate expansion
* **Risk Factors**: Currency fluctuation, supply chain

#### Scenario Analysis

| Scenario | Probability | Revenue Impact |
|----------|-------------|----------------|
| Optimistic | 25% | +22% |
| Base Case | 50% | +15% |
| Pessimistic | 25% | +5% |

### Action Items

- [ ] Review pricing strategy by EOW
- [ ] Schedule stakeholder alignment meeting
- [ ] Prepare contingency plans for pessimistic scenario

---
*Forecast prepared by ${agent}*`;

const EMAIL_TEMPLATE = (topic: string, agent: string) => `## Email Draft

**Subject:** ${topic}

---

Dear [Recipient],

I hope this email finds you well. I am writing to follow up on our recent discussion regarding ${topic.toLowerCase()}.

### Key Points

1. **Timeline**: We are on track for the scheduled delivery
2. **Budget**: Currently within the allocated parameters
3. **Next Steps**: Awaiting your approval to proceed

Please let me know if you have any questions or require additional information.

Best regards,
[Your Name]

---
*Draft prepared by ${agent} | Ready for review*`;

export const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  { command: '/research', description: 'Research a topic or company', category: 'Analysis' },
  { command: '/analyze', description: 'Analyze data or metrics', category: 'Analysis' },
  { command: '/audit', description: 'Run a system audit', category: 'System' },
  { command: '/generate', description: 'Generate content or reports', category: 'Content' },
  { command: '/email', description: 'Draft or send emails', category: 'Communication' },
  { command: '/schedule', description: 'Schedule tasks or meetings', category: 'Planning' },
  { command: '/support', description: 'Handle support tickets', category: 'Support' },
  { command: '/forecast', description: 'Create financial forecasts', category: 'Finance' },
];

// Command to Agent mapping
const COMMAND_AGENT_MAP: Record<string, string> = {
  '/research': 'nova',
  '/analyze': 'dexter',
  '/audit': 'dexter',
  '/generate': 'aura',
  '/email': 'emmie',
  '/schedule': 'emmie',
  '/support': 'cassie',
  '/forecast': 'dexter',
};

// Helper function to get file type from MIME
function getFileTypeFromMime(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'text/markdown': 'md',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
  };
  return mimeMap[mimeType] || 'unknown';
}

// Level 5: Generate rich markdown report based on command
function generateRichReport(commandBase: string, topic: string, agentName: string): string {
  switch (commandBase) {
    case '/research':
      return RESEARCH_REPORT_TEMPLATE(topic || 'Market Analysis', agentName);
    case '/analyze':
    case '/audit':
      return ANALYSIS_REPORT_TEMPLATE(topic || 'Dataset Analysis', agentName);
    case '/forecast':
      return FORECAST_REPORT_TEMPLATE(topic || 'Revenue Projections', agentName);
    case '/email':
      return EMAIL_TEMPLATE(topic || 'Follow-up Discussion', agentName);
    default:
      return `## Task Completed\n\n**Command**: ${commandBase}\n**Topic**: ${topic || 'N/A'}\n\n*Completed by ${agentName}*`;
  }
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

// Level 5: File Status Types
export type FileStatus = 'uploading' | 'indexing' | 'ready' | 'error';

// Level 6: New Agent Data for Creation Wizard
export interface NewAgentData {
  name: string;
  role: string;
  color: string;
  icon: string;
  systemPrompt: string;
  temperature: number;
  capabilities: {
    internetAccess: boolean;
    longTermMemory: boolean;
    codeExecution: boolean;
  };
  accessibleFiles: string[];
}

export interface KnowledgeFileState {
  id: string;
  name: string;
  type: string;
  size: number;
  status: FileStatus;
  progress: number;
  uploadedAt: Date;
  indexedAt?: Date;
  chunks?: number;
  errorMessage?: string;
  accessibleBy: string[];
}

interface DashboardState {
  // Persisted Data
  agents: DashboardAgent[];
  logs: LogEntry[];
  metrics: DashboardMetrics;
  jobQueue: QueuedJob[];
  knowledgeBase: KnowledgeBaseStatus;

  // Level 5: Knowledge Files
  files: KnowledgeFileState[];
  isUploading: boolean;
  selectedFileId: string | null;

  // Level 7: OpenAI API Key (persisted)
  openaiApiKey: string | null;

  // Level 12: Real-World Integration Keys (persisted)
  resendApiKey: string | null;
  slackWebhookUrl: string | null;

  // Level 16: Inbox State (transient - not persisted)
  activeThreadId: string | null;
  pendingApprovalCount: number;

  // Transient State (not persisted)
  toasts: Toast[];
  isProcessing: boolean;
  streamingContent: string | null; // For streaming AI responses
  readingDocuments: number; // Level 8: Number of documents being read for context
  toolInvocations: ToolInvocation[]; // Level 10: Current tool invocations during processing
  _hasHydrated: boolean;

  // Actions - Hydration
  setHasHydrated: (state: boolean) => void;

  // Actions - Agents
  updateAgentStatus: (agentId: string, status: AgentWorkStatus, task?: string) => void;
  updateAgentConfig: (agentId: string, config: AgentConfigUpdate) => void;
  getIdleAgent: (preferredId?: string) => DashboardAgent | undefined;

  // Actions - Logs
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  updateLog: (logId: string, updates: Partial<LogEntry>) => void;
  clearLogs: () => void;

  // Actions - Jobs
  queueJob: (command: string) => string;
  startJob: (jobId: string, agentId: string) => void;
  completeJob: (jobId: string, success: boolean) => void;

  // Actions - Metrics
  incrementPendingJobs: () => void;
  decrementPendingJobs: () => void;
  addTokenUsage: (tokens: number, cost: number) => void;

  // Actions - Toasts
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Actions - Knowledge Base
  syncKnowledgeBase: () => Promise<void>;
  updateKnowledgeBase: (updates: Partial<KnowledgeBaseStatus>) => void;

  // Level 5: Actions - Knowledge Files
  uploadFile: (file: File) => Promise<string>;
  removeFile: (fileId: string) => void;
  retryIndexing: (fileId: string) => Promise<void>;
  selectFile: (fileId: string | null) => void;
  toggleFileAccess: (fileId: string, agentId: string) => void;
  getFilesForAgent: (agentId: string) => KnowledgeFileState[];

  // Level 8: RAG Context Assembly
  getContextForAgent: (agentId: string) => { files: KnowledgeFileState[]; context: string; tokenCount: number };

  // Actions - Agent Creation (Level 6)
  createAgent: (agentData: NewAgentData) => Promise<string>;

  // Level 7: Actions - API Key Management
  setOpenaiApiKey: (key: string) => void;
  clearOpenaiApiKey: () => void;
  hasApiKey: () => boolean;

  // Level 12: Actions - Real-World Integration Keys
  setResendApiKey: (key: string) => void;
  clearResendApiKey: () => void;
  setSlackWebhookUrl: (url: string) => void;
  clearSlackWebhookUrl: () => void;
  hasResendApiKey: () => boolean;
  hasSlackWebhookUrl: () => boolean;

  // Level 16: Inbox Actions
  setActiveThreadId: (threadId: string | null) => void;
  setPendingApprovalCount: (count: number) => void;
  incrementPendingApprovalCount: () => void;
  decrementPendingApprovalCount: () => void;

  // Actions - Command Execution
  executeCommand: (command: string) => Promise<void>;
  setStreamingContent: (content: string | null) => void;
  setToolInvocations: (invocations: ToolInvocation[]) => void; // Level 10

  // Level 9: Conversation Thread Support
  replyToLog: (parentId: string, message: string) => Promise<void>;
  getThreadHistory: (logId: string) => LogEntry[];
  getThreadRoot: (logId: string) => LogEntry | null;

  // Level 11: Automation Pipelines
  pipelines: Pipeline[];
  currentRunningPipelineId: string | null;
  currentStepIndex: number;
  pipelineStreamingContent: string | null;
  createPipeline: (data: CreatePipelineData) => string;
  updatePipeline: (id: string, updates: Partial<Pipeline>) => void;
  deletePipeline: (id: string) => void;
  togglePipelineActive: (id: string) => void;
  addStepToPipeline: (pipelineId: string, step: Omit<PipelineStep, 'id' | 'order' | 'status'>) => void;
  removeStepFromPipeline: (pipelineId: string, stepId: string) => void;
  updateStep: (pipelineId: string, stepId: string, updates: Partial<PipelineStep>) => void;
  reorderSteps: (pipelineId: string, stepIds: string[]) => void;
  runPipeline: (id: string) => Promise<void>;
  stopPipeline: (id: string) => void;
  getPipelineById: (id: string) => Pipeline | undefined;
  getActivePipelines: () => Pipeline[];

  // Computed
  getStats: () => DashboardStats;
}

// ============================================================================
// PERSISTED STATE TYPE
// ============================================================================

type PersistedState = {
  agents: DashboardAgent[];
  logs: LogEntry[];
  metrics: DashboardMetrics;
  jobQueue: QueuedJob[];
  knowledgeBase: KnowledgeBaseStatus;
  files: KnowledgeFileState[];
  openaiApiKey: string | null; // Level 7: API Key
  resendApiKey: string | null; // Level 12: Resend API Key
  slackWebhookUrl: string | null; // Level 12: Slack Webhook URL
  pipelines: Pipeline[]; // Level 11: Pipelines
};

// ============================================================================
// CUSTOM STORAGE WITH DATE REVIVAL
// ============================================================================

const customStorage = createJSONStorage<PersistedState>(() => localStorage, {
  reviver: (key, value) => {
    // Revive Date objects from ISO strings
    if (typeof value === 'string') {
      const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (datePattern.test(value)) {
        return new Date(value);
      }
    }
    return value;
  },
  replacer: (key, value) => {
    // Convert Date objects to ISO strings for storage
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
});

// ============================================================================
// HELPER: Execute Pipeline Step
// ============================================================================

async function executePipelineStep(
  step: PipelineStep,
  instruction: string,
  apiKey: string | null,
  hasRealAI: boolean,
  onStream: (content: string) => void
): Promise<{ content: string; tokensUsed: number }> {
  if (hasRealAI && apiKey) {
    // Real AI Mode
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openai-api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: instruction }],
        systemPrompt: `You are ${step.agentName}, executing a step in an automation pipeline. Be concise and action-oriented.`,
        agentName: step.agentName,
        agentRole: 'Pipeline Agent',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute step');
    }

    // Stream the response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const textChunk = JSON.parse(line.slice(2));
              content += textChunk;
              onStream(content);
            } catch {
              const textPart = line.slice(2).replace(/^"|"$/g, '');
              content += textPart;
              onStream(content);
            }
          }
        }
      }
    }

    const tokensUsed = Math.ceil((instruction.length + content.length) / 4);
    return { content, tokensUsed };

  } else {
    // Simulation Mode
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

    const simulatedContent = `## ${step.agentName} Response\n\n` +
      `Processed instruction: "${instruction.slice(0, 100)}${instruction.length > 100 ? '...' : ''}"\n\n` +
      `**Simulated Result:**\n` +
      `This is a simulated response from ${step.agentName}. ` +
      `In real mode, the AI would analyze the instruction and provide actionable output.\n\n` +
      `*Generated at ${new Date().toISOString()}*`;

    onStream(simulatedContent);

    return {
      content: simulatedContent,
      tokensUsed: Math.floor(500 + Math.random() * 500),
    };
  }
}

// ============================================================================
// STORE IMPLEMENTATION WITH PERSIST
// ============================================================================

export const useDashboardStore = create<DashboardState>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          // Initial State
          agents: INITIAL_AGENTS,
          logs: INITIAL_LOGS,
          metrics: {
            tokenUsage: 158000,
            totalCost: 3.21,
            pendingJobs: 0,
            systemHealth: 98,
            tokenHistory: INITIAL_TOKEN_HISTORY,
            agentCosts: INITIAL_AGENTS.map((agent) => ({
              agentId: agent.id,
              agentName: agent.name,
              agentColor: agent.color,
              tokens: agent.tokensUsed24h,
              cost: agent.costToday,
              percentage: 0,
            })),
          },
          jobQueue: [],
          knowledgeBase: INITIAL_KNOWLEDGE_BASE,

          // Level 5: Knowledge Files
          files: INITIAL_FILES,
          isUploading: false,
          selectedFileId: null,

          // Level 7: OpenAI API Key
          openaiApiKey: null,

          // Level 12: Real-World Integration Keys
          resendApiKey: null,
          slackWebhookUrl: null,

          // Level 16: Inbox State
          activeThreadId: null,
          pendingApprovalCount: 0,

          // Level 11: Pipelines
          pipelines: [],
          currentRunningPipelineId: null,
          currentStepIndex: 0,
          pipelineStreamingContent: null,

          // Transient State
          toasts: [],
          isProcessing: false,
          streamingContent: null,
          readingDocuments: 0,
          toolInvocations: [], // Level 10
          _hasHydrated: false,

          // Hydration Action
          setHasHydrated: (state) => set({ _hasHydrated: state }),

          // Agent Actions
          updateAgentStatus: (agentId, status, task) =>
            set(
              (state) => ({
                agents: state.agents.map((agent) =>
                  agent.id === agentId
                    ? {
                        ...agent,
                        status,
                        currentTask: task,
                        taskStartedAt: status === 'working' ? new Date() : undefined,
                        lastActivity: new Date(),
                      }
                    : agent
                ),
              }),
              false,
              'updateAgentStatus'
            ),

          updateAgentConfig: (agentId, configUpdates) =>
            set(
              (state) => ({
                agents: state.agents.map((agent) =>
                  agent.id === agentId
                    ? {
                        ...agent,
                        config: {
                          ...agent.config,
                          ...configUpdates,
                          capabilities: {
                            ...agent.config.capabilities,
                            ...(configUpdates.capabilities || {}),
                          },
                        },
                      }
                    : agent
                ),
              }),
              false,
              'updateAgentConfig'
            ),

          getIdleAgent: (preferredId) => {
            const { agents } = get();
            if (preferredId) {
              const preferred = agents.find((a) => a.id === preferredId && a.status === 'idle');
              if (preferred) return preferred;
            }
            return agents.find((a) => a.status === 'idle');
          },

          // Log Actions
          addLog: (log) =>
            set(
              (state) => ({
                logs: [
                  {
                    ...log,
                    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date(),
                  },
                  ...state.logs,
                ].slice(0, 100),
              }),
              false,
              'addLog'
            ),

          updateLog: (logId, updates) =>
            set(
              (state) => ({
                logs: state.logs.map((log) =>
                  log.id === logId ? { ...log, ...updates } : log
                ),
              }),
              false,
              'updateLog'
            ),

          clearLogs: () =>
            set(
              { logs: [] },
              false,
              'clearLogs'
            ),

          // Job Actions
          queueJob: (command) => {
            const jobId = `job-${Date.now()}`;
            set(
              (state) => ({
                jobQueue: [
                  ...state.jobQueue,
                  {
                    id: jobId,
                    command,
                    status: 'queued',
                    createdAt: new Date(),
                  },
                ],
                metrics: {
                  ...state.metrics,
                  pendingJobs: state.metrics.pendingJobs + 1,
                },
              }),
              false,
              'queueJob'
            );
            return jobId;
          },

          startJob: (jobId, agentId) =>
            set(
              (state) => ({
                jobQueue: state.jobQueue.map((job) =>
                  job.id === jobId
                    ? { ...job, status: 'running', assignedAgent: agentId, startedAt: new Date() }
                    : job
                ),
              }),
              false,
              'startJob'
            ),

          completeJob: (jobId, success) =>
            set(
              (state) => ({
                jobQueue: state.jobQueue.map((job) =>
                  job.id === jobId
                    ? { ...job, status: success ? 'completed' : 'failed', completedAt: new Date() }
                    : job
                ),
                metrics: {
                  ...state.metrics,
                  pendingJobs: Math.max(0, state.metrics.pendingJobs - 1),
                },
              }),
              false,
              'completeJob'
            ),

          // Metrics Actions
          incrementPendingJobs: () =>
            set(
              (state) => ({
                metrics: { ...state.metrics, pendingJobs: state.metrics.pendingJobs + 1 },
              }),
              false,
              'incrementPendingJobs'
            ),

          decrementPendingJobs: () =>
            set(
              (state) => ({
                metrics: {
                  ...state.metrics,
                  pendingJobs: Math.max(0, state.metrics.pendingJobs - 1),
                },
              }),
              false,
              'decrementPendingJobs'
            ),

          addTokenUsage: (tokens, cost) =>
            set(
              (state) => {
                const today = new Date().toLocaleDateString(undefined, {
                  day: '2-digit',
                  month: '2-digit',
                });
                const history = [...state.metrics.tokenHistory];
                const lastEntry = history[history.length - 1];

                if (lastEntry && lastEntry.date === today) {
                  lastEntry.tokens += tokens;
                  lastEntry.cost += cost;
                } else {
                  history.push({ date: today, tokens, cost });
                  if (history.length > 7) history.shift();
                }

                return {
                  metrics: {
                    ...state.metrics,
                    tokenUsage: state.metrics.tokenUsage + tokens,
                    totalCost: state.metrics.totalCost + cost,
                    tokenHistory: history,
                  },
                };
              },
              false,
              'addTokenUsage'
            ),

          // Toast Actions
          addToast: (toast) => {
            const id = `toast-${Date.now()}`;
            set(
              (state) => ({
                toasts: [...state.toasts, { ...toast, id }],
              }),
              false,
              'addToast'
            );

            setTimeout(() => {
              get().removeToast(id);
            }, toast.duration || 4000);
          },

          removeToast: (id) =>
            set(
              (state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
              }),
              false,
              'removeToast'
            ),

          // Knowledge Base Actions
          syncKnowledgeBase: async () => {
            set(
              (state) => ({
                knowledgeBase: { ...state.knowledgeBase, isSyncing: true },
              }),
              false,
              'syncKnowledgeBase:start'
            );

            // Simulate sync delay
            await new Promise((resolve) => setTimeout(resolve, 2000));

            set(
              (state) => ({
                knowledgeBase: {
                  ...state.knowledgeBase,
                  isSyncing: false,
                  documentCount: state.knowledgeBase.documentCount + 1,
                  totalChunks: state.knowledgeBase.totalChunks + Math.floor(Math.random() * 50) + 10,
                  lastSyncedAt: new Date(),
                },
              }),
              false,
              'syncKnowledgeBase:complete'
            );

            get().addToast({
              message: 'Knowledge base synced successfully',
              type: 'success',
            });
          },

          updateKnowledgeBase: (updates) =>
            set(
              (state) => ({
                knowledgeBase: { ...state.knowledgeBase, ...updates },
              }),
              false,
              'updateKnowledgeBase'
            ),

          // Level 5: Knowledge File Actions
          uploadFile: async (file: File) => {
            const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const fileType = getFileTypeFromMime(file.type);

            const newFile: KnowledgeFileState = {
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

            // Simulate upload progress
            const uploadDelay = Math.max(500, Math.min(file.size / 1000, 5000));
            const progressSteps = 10;
            const stepDelay = uploadDelay / progressSteps;

            for (let i = 1; i <= progressSteps; i++) {
              await new Promise((resolve) => setTimeout(resolve, stepDelay));
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

            // Start indexing
            set(
              (state) => ({
                files: state.files.map((f) =>
                  f.id === fileId ? { ...f, status: 'indexing', progress: 0 } : f
                ),
              }),
              false,
              'knowledge/uploadFile:indexing'
            );

            // Simulate indexing progress
            const indexingDelay = Math.max(1000, Math.min((file.size / 1000) * 2, 8000));
            const indexingSteps = 5;
            const indexingStepDelay = indexingDelay / indexingSteps;

            for (let i = 1; i <= indexingSteps; i++) {
              await new Promise((resolve) => setTimeout(resolve, indexingStepDelay));
              set(
                (state) => ({
                  files: state.files.map((f) =>
                    f.id === fileId ? { ...f, progress: i * 20 } : f
                  ),
                }),
                false,
                'knowledge/uploadFile:indexing:progress'
              );
            }

            // Complete indexing
            const chunks = Math.floor(file.size / 4000) + Math.floor(Math.random() * 20);
            set(
              (state) => ({
                files: state.files.map((f) =>
                  f.id === fileId
                    ? { ...f, status: 'ready', progress: 100, indexedAt: new Date(), chunks }
                    : f
                ),
                isUploading: false,
              }),
              false,
              'knowledge/uploadFile:complete'
            );

            return fileId;
          },

          removeFile: (fileId: string) =>
            set(
              (state) => ({
                files: state.files.filter((f) => f.id !== fileId),
                selectedFileId: state.selectedFileId === fileId ? null : state.selectedFileId,
              }),
              false,
              'knowledge/removeFile'
            ),

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

            const indexingDelay = Math.max(1000, Math.min((file.size / 1000) * 2, 8000));
            const indexingSteps = 5;
            const indexingStepDelay = indexingDelay / indexingSteps;

            for (let i = 1; i <= indexingSteps; i++) {
              await new Promise((resolve) => setTimeout(resolve, indexingStepDelay));
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
                    ? { ...f, status: 'ready', progress: 100, indexedAt: new Date(), chunks }
                    : f
                ),
              }),
              false,
              'knowledge/retryIndexing:complete'
            );
          },

          selectFile: (fileId: string | null) =>
            set({ selectedFileId: fileId }, false, 'knowledge/selectFile'),

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

          getFilesForAgent: (agentId: string) => {
            return get().files.filter((f) => f.accessibleBy.includes(agentId));
          },

          // Level 8: RAG Context Assembly
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

              const fileTokens = file.tokenCount || Math.ceil(file.content.length / 4);

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

          // Level 6: Agent Creation
          createAgent: async (agentData: NewAgentData) => {
            const agentId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Create new agent with provided data
            const newAgent: DashboardAgent = {
              id: agentId,
              name: agentData.name,
              role: agentData.role,
              color: agentData.color,
              status: 'idle',
              lastActivity: new Date(),
              requests24h: 0,
              successRate24h: 100,
              avgResponseTime: 0,
              tokensUsed24h: 0,
              costToday: 0,
              config: {
                temperature: agentData.temperature,
                capabilities: agentData.capabilities,
                maxTokensPerRequest: 4000,
                systemPromptOverride: agentData.systemPrompt || undefined,
              },
            };

            // Add agent to store
            set(
              (state) => ({
                agents: [...state.agents, newAgent],
              }),
              false,
              'agents/createAgent'
            );

            // Update file access for selected files
            if (agentData.accessibleFiles.length > 0) {
              set(
                (state) => ({
                  files: state.files.map((f) =>
                    agentData.accessibleFiles.includes(f.id)
                      ? { ...f, accessibleBy: [...f.accessibleBy, agentId] }
                      : f
                  ),
                }),
                false,
                'agents/createAgent:fileAccess'
              );
            }

            // Add log entry
            get().addLog({
              type: 'success',
              status: 'completed',
              message: `New agent "${agentData.name}" created`,
              agent: agentData.name,
              agentColor: agentData.color,
            });

            // Simulate brief creation delay for UX
            await new Promise((resolve) => setTimeout(resolve, 500));

            return agentId;
          },

          // Level 7: API Key Management
          setOpenaiApiKey: (key: string) =>
            set({ openaiApiKey: key }, false, 'api/setOpenaiApiKey'),

          clearOpenaiApiKey: () =>
            set({ openaiApiKey: null }, false, 'api/clearOpenaiApiKey'),

          hasApiKey: () => {
            const { openaiApiKey } = get();
            return !!openaiApiKey && openaiApiKey.startsWith('sk-');
          },

          // Level 12: Real-World Integration Keys Management
          setResendApiKey: (key: string) =>
            set({ resendApiKey: key }, false, 'integrations/setResendApiKey'),

          clearResendApiKey: () =>
            set({ resendApiKey: null }, false, 'integrations/clearResendApiKey'),

          setSlackWebhookUrl: (url: string) =>
            set({ slackWebhookUrl: url }, false, 'integrations/setSlackWebhookUrl'),

          clearSlackWebhookUrl: () =>
            set({ slackWebhookUrl: null }, false, 'integrations/clearSlackWebhookUrl'),

          hasResendApiKey: () => {
            const { resendApiKey } = get();
            return !!resendApiKey && resendApiKey.startsWith('re_') && resendApiKey.length >= 20;
          },

          hasSlackWebhookUrl: () => {
            const { slackWebhookUrl } = get();
            return !!slackWebhookUrl && slackWebhookUrl.startsWith('https://hooks.slack.com/services/') && slackWebhookUrl.length > 50;
          },

          // Level 16: Inbox Actions
          setActiveThreadId: (threadId: string | null) =>
            set({ activeThreadId: threadId }, false, 'inbox/setActiveThreadId'),

          setPendingApprovalCount: (count: number) =>
            set({ pendingApprovalCount: count }, false, 'inbox/setPendingApprovalCount'),

          incrementPendingApprovalCount: () =>
            set(
              (state) => ({ pendingApprovalCount: state.pendingApprovalCount + 1 }),
              false,
              'inbox/incrementPendingApprovalCount'
            ),

          decrementPendingApprovalCount: () =>
            set(
              (state) => ({ pendingApprovalCount: Math.max(0, state.pendingApprovalCount - 1) }),
              false,
              'inbox/decrementPendingApprovalCount'
            ),

          setStreamingContent: (content: string | null) =>
            set({ streamingContent: content }, false, 'streaming/setContent'),

          // Level 10: Tool Invocations
          setToolInvocations: (invocations: ToolInvocation[]) =>
            set({ toolInvocations: invocations }, false, 'tools/setInvocations'),

          // Command Execution (with Real AI or Simulation fallback)
          executeCommand: async (command) => {
            const store = get();
            const commandBase = command.split(' ')[0].toLowerCase();
            const preferredAgentId = COMMAND_AGENT_MAP[commandBase];

            const agent = store.getIdleAgent(preferredAgentId);

            if (!agent) {
              store.addToast({
                message: 'All agents are busy. Task queued.',
                type: 'warning',
              });
              store.queueJob(command);
              return;
            }

            // Level 8: Get RAG context for this agent
            const ragContext = store.getContextForAgent(agent.id);
            const hasContext = ragContext.files.length > 0;

            set({
              isProcessing: true,
              streamingContent: null,
              readingDocuments: ragContext.files.length,
              toolInvocations: [], // Level 10: Reset tool invocations
            });

            const jobId = store.queueJob(command);
            store.updateAgentStatus(agent.id, 'working', command);
            store.startJob(jobId, agent.id);

            const logId = `log-${Date.now()}`;
            store.addLog({
              type: 'info',
              status: 'running',
              message: hasContext
                ? `${agent.name} is reading ${ragContext.files.length} document(s)...`
                : `${agent.name} is processing: ${command}`,
              agent: agent.name,
              agentColor: agent.color,
              // Level 9: Mark as root of thread
              originalCommand: command,
              threadDepth: 0,
            });

            const hasRealAI = store.hasApiKey();
            const startTime = Date.now();

            store.addToast({
              message: hasRealAI
                ? hasContext
                  ? `${agent.name} is reading ${ragContext.files.length} document(s) with GPT-4...`
                  : `${agent.name} is working with GPT-4...`
                : `Task assigned to ${agent.name} (Simulation)`,
              type: 'info',
            });

            let finalContent = '';
            let tokensUsed = 0;

            try {
              if (hasRealAI && store.openaiApiKey) {
                // ==========================================
                // REAL AI MODE - Stream from OpenAI with RAG Context
                // ==========================================
                const baseSystemPrompt = agent.config.systemPromptOverride ||
                  `You are ${agent.name}, a professional ${agent.role} AI agent.

YOUR ROLE: Provide helpful, accurate, and actionable responses.
FORMAT: Use Markdown with headers, bullet points, and tables when appropriate.
STYLE: Be concise but thorough. Start with key insights, then provide details.`;

                const response = await fetch('/api/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-openai-api-key': store.openaiApiKey,
                  },
                  body: JSON.stringify({
                    messages: [{ role: 'user', content: command }],
                    systemPrompt: baseSystemPrompt,
                    agentName: agent.name,
                    agentRole: agent.role,
                    // Level 8: RAG Context Injection
                    context: hasContext ? ragContext.context : undefined,
                    contextFiles: hasContext ? ragContext.files.map(f => f.name) : undefined,
                    // Level 10: Agent Capabilities for Tool Access
                    capabilities: agent.config.capabilities,
                  }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || 'Failed to get AI response');
                }

                // Stream the response
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                const currentToolInvocations: ToolInvocation[] = [];

                if (reader) {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Parse SSE data chunks
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                      // Vercel AI SDK format: "0:text chunk" for text
                      if (line.startsWith('0:')) {
                        try {
                          const textChunk = JSON.parse(line.slice(2));
                          finalContent += textChunk;
                          set({ streamingContent: finalContent });
                        } catch {
                          // Not JSON, might be raw text
                          const textPart = line.slice(2).replace(/^"|"$/g, '');
                          finalContent += textPart;
                          set({ streamingContent: finalContent });
                        }
                      }
                      // Level 10: Handle tool calls (prefix 9:)
                      else if (line.startsWith('9:')) {
                        try {
                          const toolData = JSON.parse(line.slice(2));
                          // toolData is an array of tool call objects
                          if (Array.isArray(toolData)) {
                            for (const toolCall of toolData) {
                              const existingIndex = currentToolInvocations.findIndex(
                                t => t.toolCallId === toolCall.toolCallId
                              );
                              if (existingIndex >= 0) {
                                currentToolInvocations[existingIndex] = toolCall;
                              } else {
                                currentToolInvocations.push(toolCall);
                              }
                            }
                            set({ toolInvocations: [...currentToolInvocations] });
                          }
                        } catch (e) {
                          console.warn('[STREAM] Failed to parse tool call:', e);
                        }
                      }
                      // Level 10: Handle tool results (prefix a:)
                      else if (line.startsWith('a:')) {
                        try {
                          const resultData = JSON.parse(line.slice(2));
                          if (Array.isArray(resultData)) {
                            for (const result of resultData) {
                              const toolIndex = currentToolInvocations.findIndex(
                                t => t.toolCallId === result.toolCallId
                              );
                              if (toolIndex >= 0) {
                                currentToolInvocations[toolIndex] = {
                                  ...currentToolInvocations[toolIndex],
                                  state: 'result',
                                  result: result.result,
                                };
                              }
                            }
                            set({ toolInvocations: [...currentToolInvocations] });
                          }
                        } catch (e) {
                          console.warn('[STREAM] Failed to parse tool result:', e);
                        }
                      }
                    }
                  }
                }

                // Estimate tokens (rough: ~4 chars per token)
                tokensUsed = Math.ceil((command.length + finalContent.length) / 4);

              } else {
                // ==========================================
                // SIMULATION MODE - Use mock reports
                // ==========================================
                const baseTime = 2000;
                const variableTime = agent.config.temperature * 2000;
                await new Promise((resolve) => setTimeout(resolve, baseTime + Math.random() * variableTime));

                finalContent = generateRichReport(
                  commandBase,
                  command.replace(commandBase, '').trim(),
                  agent.name
                );
                tokensUsed = Math.floor(1000 + Math.random() * (agent.config.maxTokensPerRequest || 3000));
              }

              const processingTime = Date.now() - startTime;
              const cost = tokensUsed * 0.00002;

              // Update agent stats
              set((state) => ({
                agents: state.agents.map((a) =>
                  a.id === agent.id
                    ? {
                        ...a,
                        requests24h: a.requests24h + 1,
                        tokensUsed24h: a.tokensUsed24h + tokensUsed,
                        costToday: a.costToday + cost,
                      }
                    : a
                ),
              }));

              store.addTokenUsage(tokensUsed, cost);

              // Level 10: Capture tool invocations before updating log
              const { toolInvocations: finalToolInvocations } = get();

              // Update log with result
              set((state) => ({
                logs: state.logs.map((log) =>
                  log.id === logId || log.message.includes(command)
                    ? {
                        ...log,
                        type: 'success' as const,
                        status: 'completed' as const,
                        message: `${agent.name} completed: ${command}`,
                        duration: processingTime,
                        tokensUsed,
                        cost,
                        output: {
                          type: 'report' as const,
                          title: `Result: ${command}`,
                          content: finalContent,
                          downloadable: true,
                          filename: `${commandBase.replace('/', '')}-${Date.now()}.md`,
                        },
                        // Level 10: Store tool invocations with completed entry
                        toolInvocations: finalToolInvocations.length > 0 ? [...finalToolInvocations] : undefined,
                      }
                    : log
                ),
              }));

              store.completeJob(jobId, true);
              store.updateAgentStatus(agent.id, 'idle');

              store.addToast({
                message: `${agent.name} completed the task`,
                type: 'success',
              });

            } catch (error: any) {
              console.error('[EXECUTE_COMMAND_ERROR]', error);

              // Update log with error
              set((state) => ({
                logs: state.logs.map((log) =>
                  log.id === logId || log.message.includes(command)
                    ? {
                        ...log,
                        type: 'error' as const,
                        status: 'failed' as const,
                        message: `${agent.name} failed: ${error.message || 'Unknown error'}`,
                      }
                    : log
                ),
              }));

              store.completeJob(jobId, false);
              store.updateAgentStatus(agent.id, 'idle');

              store.addToast({
                message: error.message || 'Failed to execute command',
                type: 'error',
              });
            } finally {
              set({ isProcessing: false, streamingContent: null, readingDocuments: 0, toolInvocations: [] });
            }
          },

          // ============================================================================
          // Level 9: Conversation Thread Support
          // ============================================================================

          // Get the root log entry of a thread
          getThreadRoot: (logId: string) => {
            const logs = get().logs;
            let current = logs.find((l) => l.id === logId);
            if (!current) return null;

            // Walk up the parent chain to find root
            while (current?.parentId) {
              const parent = logs.find((l) => l.id === current!.parentId);
              if (!parent) break;
              current = parent;
            }
            return current || null;
          },

          // Get all entries in a thread (root + all children)
          getThreadHistory: (logId: string) => {
            const logs = get().logs;
            const root = get().getThreadRoot(logId);
            if (!root) return [];

            // Get all entries that belong to this thread
            const threadEntries: LogEntry[] = [root];
            const findChildren = (parentId: string) => {
              const children = logs.filter((l) => l.parentId === parentId);
              for (const child of children) {
                threadEntries.push(child);
                findChildren(child.id);
              }
            };
            findChildren(root.id);

            // Sort by timestamp
            return threadEntries.sort((a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          },

          // Reply to an existing log entry (refinement/follow-up)
          replyToLog: async (parentId: string, message: string) => {
            const store = get();
            const parentLog = store.logs.find((l) => l.id === parentId);

            if (!parentLog) {
              store.addToast({
                message: 'Original message not found',
                type: 'error',
              });
              return;
            }

            // Find the thread root for context
            const threadRoot = store.getThreadRoot(parentId);
            const threadHistory = store.getThreadHistory(parentId);

            // Use the same agent that handled the original request
            const agent = store.agents.find((a) => a.name === parentLog.agent);
            if (!agent) {
              store.addToast({
                message: 'Original agent not available',
                type: 'error',
              });
              return;
            }

            // Get RAG context for this agent
            const ragContext = store.getContextForAgent(agent.id);
            const hasContext = ragContext.files.length > 0;

            set({
              isProcessing: true,
              streamingContent: null,
              readingDocuments: ragContext.files.length,
            });

            // Create a new log entry for this reply
            const newLogId = `log-${Date.now()}`;
            const threadDepth = (parentLog.threadDepth ?? 0) + 1;

            store.addLog({
              type: 'info',
              status: 'running',
              message: `${agent.name} is refining: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`,
              agent: agent.name,
              agentColor: agent.color,
              parentId: parentId,
              originalCommand: threadRoot?.originalCommand || parentLog.message,
              threadDepth,
            });

            store.updateAgentStatus(agent.id, 'working', message);

            const hasRealAI = store.hasApiKey();
            const startTime = Date.now();
            let finalContent = '';
            let tokensUsed = 0;

            try {
              if (hasRealAI && store.openaiApiKey) {
                // Build conversation history from thread
                const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

                for (const entry of threadHistory) {
                  if (entry.status === 'completed' || entry.status === 'running') {
                    // Find the original user command for this entry
                    const userCommand = entry.originalCommand || entry.message.replace(`${entry.agent} completed: `, '');
                    if (!userCommand.includes('is refining') && !userCommand.includes('is processing')) {
                      conversationMessages.push({
                        role: 'user',
                        content: userCommand,
                      });
                    }

                    // Add assistant response if available
                    if (entry.output?.content && entry.status === 'completed') {
                      conversationMessages.push({
                        role: 'assistant',
                        content: entry.output.content,
                      });
                    }
                  }
                }

                // Add the new refinement request
                conversationMessages.push({
                  role: 'user',
                  content: message,
                });

                const baseSystemPrompt = agent.config.systemPromptOverride ||
                  `You are ${agent.name}, a professional ${agent.role} AI agent.

YOUR ROLE: Provide helpful, accurate, and actionable responses.
FORMAT: Use Markdown with headers, bullet points, and tables when appropriate.
STYLE: Be concise but thorough. Start with key insights, then provide details.

IMPORTANT: This is a follow-up conversation. The user is refining or asking for changes to your previous response. Consider the full conversation history when responding.`;

                const response = await fetch('/api/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-openai-api-key': store.openaiApiKey,
                  },
                  body: JSON.stringify({
                    messages: conversationMessages,
                    systemPrompt: baseSystemPrompt,
                    agentName: agent.name,
                    agentRole: agent.role,
                    context: hasContext ? ragContext.context : undefined,
                    contextFiles: hasContext ? ragContext.files.map((f) => f.name) : undefined,
                  }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || 'Failed to get AI response');
                }

                // Stream the response
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                if (reader) {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                      if (line.startsWith('0:')) {
                        try {
                          const textChunk = JSON.parse(line.slice(2));
                          finalContent += textChunk;
                          set({ streamingContent: finalContent });
                        } catch {
                          const textPart = line.slice(2).replace(/^"|"$/g, '');
                          finalContent += textPart;
                          set({ streamingContent: finalContent });
                        }
                      }
                    }
                  }
                }

                tokensUsed = Math.ceil((message.length + finalContent.length) / 4);
              } else {
                // Simulation mode for refinements
                await new Promise((resolve) => setTimeout(resolve, 1500));
                finalContent = `## Refined Response

Based on your feedback: "${message}"

Here is the updated version with the requested changes applied.

${parentLog.output?.content ? '### Original Points Maintained:\n- Key insights preserved\n- Structure enhanced per request' : ''}

### Improvements Made:
- Applied your specific modifications
- Enhanced clarity and presentation
- Optimized for your requirements

*This is a simulated refinement. Enable Real AI mode for actual content updates.*`;
                tokensUsed = Math.floor(500 + Math.random() * 1000);
              }

              const processingTime = Date.now() - startTime;
              const cost = tokensUsed * 0.00002;

              // Update agent stats
              set((state) => ({
                agents: state.agents.map((a) =>
                  a.id === agent.id
                    ? {
                        ...a,
                        requests24h: a.requests24h + 1,
                        tokensUsed24h: a.tokensUsed24h + tokensUsed,
                        costToday: a.costToday + cost,
                      }
                    : a
                ),
              }));

              store.addTokenUsage(tokensUsed, cost);

              // Update the log entry with the result
              set((state) => ({
                logs: state.logs.map((log) =>
                  log.message.includes(message.slice(0, 30)) && log.status === 'running'
                    ? {
                        ...log,
                        type: 'success' as const,
                        status: 'completed' as const,
                        message: `${agent.name} refined: "${message.slice(0, 40)}${message.length > 40 ? '...' : ''}"`,
                        duration: processingTime,
                        tokensUsed,
                        cost,
                        output: {
                          type: 'report' as const,
                          title: `Refinement: ${message.slice(0, 30)}...`,
                          content: finalContent,
                          downloadable: true,
                          filename: `refinement-${Date.now()}.md`,
                        },
                      }
                    : log
                ),
              }));

              store.updateAgentStatus(agent.id, 'idle');

              store.addToast({
                message: `${agent.name} completed refinement`,
                type: 'success',
              });

            } catch (error: any) {
              console.error('[REPLY_TO_LOG_ERROR]', error);

              set((state) => ({
                logs: state.logs.map((log) =>
                  log.message.includes(message.slice(0, 30)) && log.status === 'running'
                    ? {
                        ...log,
                        type: 'error' as const,
                        status: 'failed' as const,
                        message: `${agent.name} failed: ${error.message || 'Unknown error'}`,
                      }
                    : log
                ),
              }));

              store.updateAgentStatus(agent.id, 'idle');

              store.addToast({
                message: error.message || 'Failed to refine response',
                type: 'error',
              });
            } finally {
              set({ isProcessing: false, streamingContent: null, readingDocuments: 0, toolInvocations: [] });
            }
          },

          // ============================================================================
          // LEVEL 11: PIPELINE ACTIONS
          // ============================================================================

          createPipeline: (data: CreatePipelineData) => {
            const id = `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const steps: PipelineStep[] = (data.steps || []).map((step, index) => ({
              ...step,
              id: `step-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
              order: index,
              status: 'pending' as const,
            }));

            const newPipeline: Pipeline = {
              id,
              name: data.name,
              description: data.description,
              triggerType: data.triggerType || 'manual',
              steps,
              isActive: true,
              status: 'idle',
              createdAt: new Date(),
              updatedAt: new Date(),
              runCount: 0,
              runs: [],
            };

            set(
              (state) => ({
                pipelines: [...state.pipelines, newPipeline],
              }),
              false,
              'pipelines/create'
            );

            get().addToast({
              message: `Pipeline "${data.name}" created`,
              type: 'success',
            });

            return id;
          },

          updatePipeline: (id, updates) => {
            set(
              (state) => ({
                pipelines: state.pipelines.map((p) =>
                  p.id === id
                    ? { ...p, ...updates, updatedAt: new Date() }
                    : p
                ),
              }),
              false,
              'pipelines/update'
            );
          },

          deletePipeline: (id) => {
            const pipeline = get().pipelines.find((p) => p.id === id);

            set(
              (state) => ({
                pipelines: state.pipelines.filter((p) => p.id !== id),
              }),
              false,
              'pipelines/delete'
            );

            if (pipeline) {
              get().addToast({
                message: `Pipeline "${pipeline.name}" deleted`,
                type: 'info',
              });
            }
          },

          togglePipelineActive: (id) => {
            set(
              (state) => ({
                pipelines: state.pipelines.map((p) =>
                  p.id === id
                    ? { ...p, isActive: !p.isActive, updatedAt: new Date() }
                    : p
                ),
              }),
              false,
              'pipelines/toggleActive'
            );
          },

          addStepToPipeline: (pipelineId, step) => {
            const pipeline = get().pipelines.find((p) => p.id === pipelineId);
            if (!pipeline) return;

            const newStep: PipelineStep = {
              ...step,
              id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              order: pipeline.steps.length,
              status: 'pending',
            };

            set(
              (state) => ({
                pipelines: state.pipelines.map((p) =>
                  p.id === pipelineId
                    ? { ...p, steps: [...p.steps, newStep], updatedAt: new Date() }
                    : p
                ),
              }),
              false,
              'pipelines/addStep'
            );
          },

          removeStepFromPipeline: (pipelineId, stepId) => {
            set(
              (state) => ({
                pipelines: state.pipelines.map((p) =>
                  p.id === pipelineId
                    ? {
                        ...p,
                        steps: p.steps
                          .filter((s) => s.id !== stepId)
                          .map((s, index) => ({ ...s, order: index })),
                        updatedAt: new Date(),
                      }
                    : p
                ),
              }),
              false,
              'pipelines/removeStep'
            );
          },

          updateStep: (pipelineId, stepId, updates) => {
            set(
              (state) => ({
                pipelines: state.pipelines.map((p) =>
                  p.id === pipelineId
                    ? {
                        ...p,
                        steps: p.steps.map((s) =>
                          s.id === stepId ? { ...s, ...updates } : s
                        ),
                        updatedAt: new Date(),
                      }
                    : p
                ),
              }),
              false,
              'pipelines/updateStep'
            );
          },

          reorderSteps: (pipelineId, stepIds) => {
            set(
              (state) => ({
                pipelines: state.pipelines.map((p) => {
                  if (p.id !== pipelineId) return p;

                  const reorderedSteps = stepIds
                    .map((id, index) => {
                      const step = p.steps.find((s) => s.id === id);
                      return step ? { ...step, order: index } : null;
                    })
                    .filter((s): s is PipelineStep => s !== null);

                  return { ...p, steps: reorderedSteps, updatedAt: new Date() };
                }),
              }),
              false,
              'pipelines/reorderSteps'
            );
          },

          runPipeline: async (id) => {
            const store = get();
            const pipeline = store.pipelines.find((p) => p.id === id);

            if (!pipeline) {
              store.addToast({ message: 'Pipeline not found', type: 'error' });
              return;
            }

            if (pipeline.steps.length === 0) {
              store.addToast({ message: 'Pipeline has no steps', type: 'warning' });
              return;
            }

            if (!pipeline.isActive) {
              store.addToast({ message: 'Pipeline is inactive', type: 'warning' });
              return;
            }

            // Create a new run
            const runId = `run-${Date.now()}`;
            const run: PipelineRun = {
              id: runId,
              pipelineId: id,
              status: 'running',
              startedAt: new Date(),
              stepResults: [],
              totalTokensUsed: 0,
              totalCost: 0,
            };

            // Update pipeline status
            set(
              (state) => ({
                pipelines: state.pipelines.map((p) =>
                  p.id === id
                    ? {
                        ...p,
                        status: 'running' as const,
                        steps: p.steps.map((s) => ({ ...s, status: 'pending' as const, result: undefined, error: undefined })),
                        runs: [run, ...p.runs].slice(0, 10),
                      }
                    : p
                ),
                currentRunningPipelineId: id,
                currentStepIndex: 0,
              }),
              false,
              'pipelines/startRun'
            );

            store.addLog({
              type: 'info',
              status: 'running',
              message: `Pipeline "${pipeline.name}" started`,
              agent: 'System',
              agentColor: '#8B5CF6',
            });

            let previousResult = '';
            let totalTokens = 0;
            const stepResults: PipelineRun['stepResults'] = [];

            // Execute each step sequentially
            for (let i = 0; i < pipeline.steps.length; i++) {
              const step = pipeline.steps[i];

              set({ currentStepIndex: i }, false, 'pipelines/updateStepIndex');

              // Mark step as running
              set(
                (state) => ({
                  pipelines: state.pipelines.map((p) =>
                    p.id === id
                      ? {
                          ...p,
                          steps: p.steps.map((s) =>
                            s.id === step.id
                              ? { ...s, status: 'running' as const, startedAt: new Date() }
                              : s
                          ),
                        }
                      : p
                  ),
                }),
                false,
                'pipelines/stepRunning'
              );

              try {
                const contextualInstruction = previousResult
                  ? `Context from previous step:\n${previousResult}\n\nNew instruction: ${step.instruction}`
                  : step.instruction;

                // Execute the step
                const result = await executePipelineStep(
                  step,
                  contextualInstruction,
                  store.openaiApiKey,
                  store.hasApiKey(),
                  (content) => set({ pipelineStreamingContent: content }, false, 'pipelines/streaming')
                );

                previousResult = result.content;
                totalTokens += result.tokensUsed;

                // Mark step as completed
                set(
                  (state) => ({
                    pipelines: state.pipelines.map((p) =>
                      p.id === id
                        ? {
                            ...p,
                            steps: p.steps.map((s) =>
                              s.id === step.id
                                ? {
                                    ...s,
                                    status: 'completed' as const,
                                    result: result.content,
                                    tokensUsed: result.tokensUsed,
                                    completedAt: new Date(),
                                  }
                                : s
                            ),
                          }
                        : p
                    ),
                    pipelineStreamingContent: null,
                  }),
                  false,
                  'pipelines/stepCompleted'
                );

                stepResults.push({
                  stepId: step.id,
                  status: 'completed',
                  result: result.content,
                  tokensUsed: result.tokensUsed,
                });

                store.addLog({
                  type: 'success',
                  status: 'completed',
                  message: `Step ${i + 1}: ${step.agentName} completed`,
                  agent: step.agentName,
                  agentColor: step.agentColor,
                  tokensUsed: result.tokensUsed,
                });

              } catch (error: any) {
                // Mark step as failed
                set(
                  (state) => ({
                    pipelines: state.pipelines.map((p) =>
                      p.id === id
                        ? {
                            ...p,
                            status: 'failed' as const,
                            steps: p.steps.map((s) =>
                              s.id === step.id
                                ? { ...s, status: 'failed' as const, error: error.message, completedAt: new Date() }
                                : s.order > step.order
                                ? { ...s, status: 'skipped' as const }
                                : s
                            ),
                            runs: p.runs.map((r) =>
                              r.id === runId
                                ? { ...r, status: 'failed' as const, completedAt: new Date(), stepResults, totalTokensUsed: totalTokens, totalCost: totalTokens * 0.00002 }
                                : r
                            ),
                          }
                        : p
                    ),
                    currentRunningPipelineId: null,
                    pipelineStreamingContent: null,
                  }),
                  false,
                  'pipelines/stepFailed'
                );

                store.addLog({
                  type: 'error',
                  status: 'failed',
                  message: `Pipeline "${pipeline.name}" failed at step ${i + 1}`,
                  agent: step.agentName,
                  agentColor: step.agentColor,
                });

                store.addToast({ message: `Pipeline failed: ${error.message}`, type: 'error' });
                return;
              }
            }

            // All steps completed
            const totalCost = totalTokens * 0.00002;

            set(
              (state) => ({
                pipelines: state.pipelines.map((p) =>
                  p.id === id
                    ? {
                        ...p,
                        status: 'completed' as const,
                        lastRunAt: new Date(),
                        runCount: p.runCount + 1,
                        runs: p.runs.map((r) =>
                          r.id === runId
                            ? { ...r, status: 'completed' as const, completedAt: new Date(), stepResults, totalTokensUsed: totalTokens, totalCost }
                            : r
                        ),
                      }
                    : p
                ),
                currentRunningPipelineId: null,
                currentStepIndex: 0,
              }),
              false,
              'pipelines/runCompleted'
            );

            store.addLog({
              type: 'success',
              status: 'completed',
              message: `Pipeline "${pipeline.name}" completed (${pipeline.steps.length} steps)`,
              agent: 'System',
              agentColor: '#8B5CF6',
              tokensUsed: totalTokens,
              cost: totalCost,
            });

            store.addToast({ message: `Pipeline "${pipeline.name}" completed successfully`, type: 'success' });
          },

          stopPipeline: (id) => {
            set(
              (state) => ({
                pipelines: state.pipelines.map((p) =>
                  p.id === id
                    ? {
                        ...p,
                        status: 'paused' as const,
                        steps: p.steps.map((s) =>
                          s.status === 'running'
                            ? { ...s, status: 'failed' as const, error: 'Stopped by user' }
                            : s.status === 'pending'
                            ? { ...s, status: 'skipped' as const }
                            : s
                        ),
                      }
                    : p
                ),
                currentRunningPipelineId: null,
                pipelineStreamingContent: null,
              }),
              false,
              'pipelines/stop'
            );

            get().addToast({ message: 'Pipeline stopped', type: 'warning' });
          },

          getPipelineById: (id) => {
            return get().pipelines.find((p) => p.id === id);
          },

          getActivePipelines: () => {
            return get().pipelines.filter((p) => p.isActive);
          },

          // Computed Stats
          getStats: () => {
            const { agents, metrics } = get();
            const activeCount = agents.filter(
              (a) => a.status === 'idle' || a.status === 'working'
            ).length;

            const totalTokens = agents.reduce((sum, a) => sum + a.tokensUsed24h, 0);
            const agentCosts: AgentCostBreakdown[] = agents.map((agent) => ({
              agentId: agent.id,
              agentName: agent.name,
              agentColor: agent.color,
              tokens: agent.tokensUsed24h,
              cost: agent.costToday,
              percentage: totalTokens > 0 ? (agent.tokensUsed24h / totalTokens) * 100 : 0,
            }));

            return {
              totalAgents: agents.length,
              activeAgents: activeCount,
              pendingJobs: metrics.pendingJobs,
              tokenUsage: metrics.tokenUsage,
              totalCost: metrics.totalCost,
              systemHealth: metrics.systemHealth,
              agentCosts,
            };
          },
        }),
        {
          name: 'sintra-dashboard-store',
          storage: customStorage,
          partialize: (state) => ({
            // Only persist these fields
            agents: state.agents,
            logs: state.logs,
            metrics: state.metrics,
            jobQueue: state.jobQueue,
            knowledgeBase: state.knowledgeBase,
            files: state.files, // Level 5: Persist knowledge files
            openaiApiKey: state.openaiApiKey, // Level 7: Persist API key
            resendApiKey: state.resendApiKey, // Level 12: Persist Resend API key
            slackWebhookUrl: state.slackWebhookUrl, // Level 12: Persist Slack webhook URL
            pipelines: state.pipelines, // Level 11: Persist pipelines
          }),
          onRehydrateStorage: () => (state) => {
            state?.setHasHydrated(true);
          },
        }
      )
    ),
    { name: 'dashboard-store' }
  )
);

// ============================================================================
// SELECTOR HOOKS (for optimized re-renders)
// ============================================================================

export const useAgents = () => useDashboardStore((state) => state.agents);
export const useLogs = () => useDashboardStore((state) => state.logs);
export const useMetrics = () => useDashboardStore((state) => state.metrics);
export const useToasts = () => useDashboardStore((state) => state.toasts);
export const useIsProcessing = () => useDashboardStore((state) => state.isProcessing);
export const useHasHydrated = () => useDashboardStore((state) => state._hasHydrated);

// Stable scalar selectors for stats (avoid object creation)
export const useTotalAgents = () => useDashboardStore((state) => state.agents.length);
export const useActiveAgents = () =>
  useDashboardStore((state) =>
    state.agents.filter((a) => a.status === 'idle' || a.status === 'working').length
  );
export const usePendingJobs = () => useDashboardStore((state) => state.metrics.pendingJobs);
export const useTokenUsage = () => useDashboardStore((state) => state.metrics.tokenUsage);
export const useTotalCost = () => useDashboardStore((state) => state.metrics.totalCost);
export const useSystemHealth = () => useDashboardStore((state) => state.metrics.systemHealth);
export const useTokenHistory = () => useDashboardStore((state) => state.metrics.tokenHistory);

// Knowledge Base selectors
export const useKnowledgeBase = () => useDashboardStore((state) => state.knowledgeBase);
export const useDocumentCount = () => useDashboardStore((state) => state.knowledgeBase.documentCount);
export const useIsSyncing = () => useDashboardStore((state) => state.knowledgeBase.isSyncing);
export const useLastSyncedAt = () => useDashboardStore((state) => state.knowledgeBase.lastSyncedAt);

// Agent config selector
export const useAgentConfig = (agentId: string) =>
  useDashboardStore((state) => state.agents.find((a) => a.id === agentId)?.config);

// Level 5: Knowledge Files selectors
export const useFiles = () => useDashboardStore((state) => state.files);
export const useIsUploading = () => useDashboardStore((state) => state.isUploading);
export const useSelectedFileId = () => useDashboardStore((state) => state.selectedFileId);
export const useSelectedFile = () =>
  useDashboardStore((state) => state.files.find((f) => f.id === state.selectedFileId));
export const useFilesByStatus = (status: FileStatus) =>
  useDashboardStore((state) => state.files.filter((f) => f.status === status));

// Computed selector for agent costs with percentage (memoized)
export const useAgentCosts = () =>
  useDashboardStore((state) => {
    const { agents } = state;
    const totalTokens = agents.reduce((sum, a) => sum + a.tokensUsed24h, 0);
    return agents.map((agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      agentColor: agent.color,
      tokens: agent.tokensUsed24h,
      cost: agent.costToday,
      percentage: totalTokens > 0 ? (agent.tokensUsed24h / totalTokens) * 100 : 0,
    }));
  });

// Level 7: API Key and Streaming selectors
export const useOpenaiApiKey = () => useDashboardStore((state) => state.openaiApiKey);
export const useHasApiKey = () => useDashboardStore((state) => !!state.openaiApiKey);
export const useStreamingContent = () => useDashboardStore((state) => state.streamingContent);

// Level 10: Tool Invocations selector
export const useToolInvocations = () => useDashboardStore((state) => state.toolInvocations);

// Level 8: RAG Context selectors
export const useReadingDocuments = () => useDashboardStore((state) => state.readingDocuments);

// Level 11: Pipeline selectors
export const usePipelines = () => useDashboardStore((state) => state.pipelines);
export const useActivePipelines = () => useDashboardStore((state) => state.pipelines.filter((p) => p.isActive));
export const useCurrentRunningPipelineId = () => useDashboardStore((state) => state.currentRunningPipelineId);
export const usePipelineStreamingContent = () => useDashboardStore((state) => state.pipelineStreamingContent);
export const useCurrentStepIndex = () => useDashboardStore((state) => state.currentStepIndex);
export const usePipelineById = (id: string) => useDashboardStore((state) => state.pipelines.find((p) => p.id === id));

// Level 12: Real-World Integration selectors
export const useResendApiKey = () => useDashboardStore((state) => state.resendApiKey);
export const useSlackWebhookUrl = () => useDashboardStore((state) => state.slackWebhookUrl);
export const useHasResendApiKey = () => useDashboardStore((state) => !!state.resendApiKey && state.resendApiKey.startsWith('re_'));
export const useHasSlackWebhookUrl = () => useDashboardStore((state) => !!state.slackWebhookUrl && state.slackWebhookUrl.startsWith('https://hooks.slack.com/services/'));

// Level 16: Inbox selectors
export const useActiveThreadId = () => useDashboardStore((state) => state.activeThreadId);
export const usePendingApprovalCount = () => useDashboardStore((state) => state.pendingApprovalCount);
