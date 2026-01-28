# PIPELINE SYSTEM - UMFASSENDE ARCHITEKTUR-ANALYSE

**Version:** 1.0.0
**Analysedatum:** 01. Januar 2026
**Route:** `http://localhost:3000/pipelines`

---

## INHALTSVERZEICHNIS

1. [Executive Summary](#1-executive-summary)
2. [System-Architektur](#2-system-architektur)
3. [Frontend-Architektur](#3-frontend-architektur)
4. [Backend-Architektur](#4-backend-architektur)
5. [Datenbank-Schema](#5-datenbank-schema)
6. [Node-System & Executors](#6-node-system--executors)
7. [State Management](#7-state-management)
8. [Real-Time Features](#8-real-time-features)
9. [API-Referenz](#9-api-referenz)
10. [Kritische Dateien](#10-kritische-dateien)

---

## 1. EXECUTIVE SUMMARY

Das **Pipeline-System** ist ein visueller Workflow-Automatisierungs-Builder, der auf **React Flow** basiert. Es ermoglicht:

| Feature | Status |
|---------|--------|
| **Visual Workflow Builder** | React Flow-basiert mit Drag & Drop |
| **25+ Node-Typen** | Trigger, AI-Agent, Condition, Loop, Approval, etc. |
| **DAG-Execution** | Directed Acyclic Graph-basierte Ausfuhrung |
| **Human-in-the-Loop** | Approval-Nodes mit Workflow-Suspension |
| **Variable Resolution** | `{{path.to.value}}` Syntax |
| **Budget-Tracking** | Token-basierte Kostenkontrolle |
| **Real-Time Updates** | Socket.IO fur Live-Status |
| **Template-System** | Vordefinierte & benutzerdefinierte Vorlagen |

### Architektur-Ubersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ PipelinesPage│  │PipelineDetail│  │  PipelineEditor      │   │
│  │  (List View) │  │ (Execution)  │  │  (React Flow Canvas) │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │               │
│  ┌──────▼─────────────────▼──────────────────────▼───────────┐  │
│  │              Zustand Store (createPipelineSlice)           │  │
│  └────────────────────────────┬──────────────────────────────┘  │
└───────────────────────────────┼─────────────────────────────────┘
                                │ API Calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                 │
│  ┌────────────────┐  ┌─────────────────────────────────────┐    │
│  │  API Routes    │  │  WorkflowExecutionEngineV2          │    │
│  │  /api/pipelines│──▶│  - Node Executors                   │    │
│  │  /api/workflows│  │  - Variable Resolution               │    │
│  └────────────────┘  │  - Budget Tracking                   │    │
│                      │  - Socket.IO Events                  │    │
│                      └─────────────────────────────────────┘    │
│                                      │                           │
│  ┌───────────────────────────────────▼─────────────────────────┐│
│  │                    PostgreSQL + Redis                        ││
│  │  workflows, workflow_executions, workflow_node_logs,         ││
│  │  workflow_approval_requests                                  ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. SYSTEM-ARCHITEKTUR

### 2.1 Duale System-Struktur

Das System unterscheidet zwischen:

| Konzept | Beschreibung | Speicherort |
|---------|--------------|-------------|
| **Pipelines** | Frontend UI-Konzept fur einfache Step-Sequenzen | Zustand Store (localStorage) |
| **Workflows** | Backend-Konzept fur komplexe DAG-basierte Flows | PostgreSQL |

### 2.2 Komponenten-Beziehungen

```
Frontend Pipelines (Zustand)          Backend Workflows (PostgreSQL)
┌─────────────────────────┐           ┌─────────────────────────┐
│ - Einfache Steps        │           │ - React Flow Nodes/Edges│
│ - Sequentielle Ausfuhr. │  ──────▶  │ - DAG-basierte Execution│
│ - localStorage Persist. │           │ - Version Control       │
│ - Mock + Real AI        │           │ - Audit Trail           │
└─────────────────────────┘           └─────────────────────────┘
```

---

## 3. FRONTEND-ARCHITEKTUR

### 3.1 Seiten-Struktur

| Route | Datei | Funktion |
|-------|-------|----------|
| `/pipelines` | `app/(app)/(dashboard)/pipelines/page.tsx` | Pipeline-Liste mit Stats, Filter, Vorlagen |
| `/pipelines/[id]` | `app/(app)/(dashboard)/pipelines/[id]/page.tsx` | Pipeline-Details mit Execution-History |
| `/pipelines/[id]/editor` | `app/(app)/(dashboard)/pipelines/[id]/editor/page.tsx` | Visual Workflow Editor |
| `/pipelines/analytics` | `app/(app)/(dashboard)/pipelines/analytics/page.tsx` | Pipeline-Analytics |

### 3.2 Hauptseite (`/pipelines`)

**Datei:** `app/(app)/(dashboard)/pipelines/page.tsx` (693 Zeilen)

**Komponenten:**
```tsx
// Stats-Cards
<StatCard title="Gesamt Pipelines" value={pipelines.length} icon={Zap} />
<StatCard title="Aktive Pipelines" value={activePipelinesCount} icon={Activity} />
<StatCard title="Derzeit Laufend" value={currentRunningPipelineId ? 1 : 0} icon={Clock} />
<StatCard title="Ausfuhrungen" value={totalRuns} icon={TrendingUp} />

// Pipeline-Karten Grid
{filteredPipelines.map((pipeline) => (
  <PipelineCard
    pipeline={pipeline}
    isRunning={currentRunningPipelineId === pipeline.id}
    onRun={() => runPipeline(pipeline.id)}
    onStop={() => stopPipeline(pipeline.id)}
    onEdit={() => handleEdit(pipeline.id)}
    onDelete={() => deletePipeline(pipeline.id)}
  />
))}

// Modals
<PipelineBuilder isOpen={showBuilder} onClose={handleCloseBuilder} />
<PipelineWizard isOpen={showWizard} onClose={handleCloseWizard} />
<TemplateGalleryModal isOpen={showTemplateGallery} onClose={() => setShowTemplateGallery(false)} />
```

**Features:**
- **Filter:** Status (Alle/Aktiv/Inaktiv), Suchfeld
- **Schnellaktionen:** Cmd+K Command Palette
- **Starter-Kits:** 3 empfohlene Templates bei leerer Liste
- **Live-Updates:** Streaming-Content bei laufenden Pipelines

### 3.3 Pipeline-Detail-Seite (`/pipelines/[id]`)

**Datei:** `app/(app)/(dashboard)/pipelines/[id]/page.tsx` (676 Zeilen)

**Tabs:**
1. **Ubersicht:** Letzte Ausfuhrung + Execution-Viewer + History
2. **Ausfuhrungen:** Tabelle aller Runs mit Status, Dauer, Trigger
3. **Einstellungen:** Name, Beschreibung, Trigger-Typ, Loschen/Duplizieren

**Execution-Viewer:**
```tsx
function ExecutionViewer({ execution }: { execution: PipelineExecution }) {
  // Zeigt Steps mit Status-Badges
  // Progress-Bar bei laufenden Executions
  // Fehler-Anzeige bei Fehlschlagen
}
```

### 3.4 Pipeline-Editor (`/pipelines/[id]/editor`)

**Datei:** `app/(app)/(dashboard)/pipelines/[id]/editor/page.tsx` (319 Zeilen)

**Features:**
- **React Flow Canvas:** Visual Node-Editor
- **Header:** Name-Editor, Version-Badge, Status, Aktionen
- **Autosave:** Warnung bei ungespeicherten Anderungen

```tsx
<PipelineEditor
  workflowId={workflowId}
  initialNodes={workflow.nodes}
  initialEdges={workflow.edges}
  onSave={handleSave}
/>
```

### 3.5 Komponenten-Bibliothek

#### Pipeline-Komponenten (`components/pipelines/`)

| Komponente | Funktion |
|------------|----------|
| `PipelineBuilder.tsx` | Modal zum Erstellen/Bearbeiten (Step-basiert) |
| `PipelineEditor.tsx` | React Flow Wrapper |
| `TemplateGallery.tsx` | Template-Browser |
| `TemplateGalleryModal.tsx` | Modal-Wrapper |

#### Node-Komponenten (`components/pipelines/nodes/`)

| Node | Funktion |
|------|----------|
| `TriggerNode.tsx` | Workflow-Start (Manual/Schedule/Webhook) |
| `ActionNode.tsx` | Generische Aktionen |
| `AgentNode.tsx` | AI-Agent Aufruf |
| `ConditionNode.tsx` | If/Else Verzweigung |
| `DelayNode.tsx` | Zeitverzogerung |
| `HumanApprovalNode.tsx` | HITL Approval |
| `TransformNode.tsx` | Daten-Transformation |
| `NodeCostBadge.tsx` | Kosten-Anzeige |
| `NodeExecutionWrapper.tsx` | Execution-Status Wrapper |

#### Studio-Komponenten (`components/studio/`)

| Komponente | Funktion |
|------------|----------|
| `VisualAgentStudio.tsx` | Haupt-Studio Interface |
| `VisualCanvas.tsx` | React Flow Canvas |
| `ConfigurationPanel.tsx` | Node-Konfiguration |
| `VariablePanel.tsx` | Variable-Management |
| `ToolRegistry.tsx` | Verfugbare Tools |
| `ConditionPanel.tsx` | Condition-Builder |
| `ConditionGroupBuilder.tsx` | Komplexe Bedingungen |
| `ModelSelector.tsx` | AI-Modell-Auswahl |
| `DatabaseQueryConfig.tsx` | SQL-Query Builder |
| `ExecutionHistory.tsx` | Ausfuhrungs-Historie |
| `ExecutionTimeline.tsx` | Timeline-Ansicht |

#### Wizard-Komponenten (`components/pipelines/wizard/`)

| Komponente | Funktion |
|------------|----------|
| `PipelineWizard.tsx` | Gefuhrte Pipeline-Erstellung |
| `MiniGraphPreview.tsx` | Vorschau des Flows |

---

## 4. BACKEND-ARCHITEKTUR

### 4.1 API-Endpunkte

#### Pipeline APIs (`app/api/pipelines/`)

| Endpunkt | Methode | Funktion |
|----------|---------|----------|
| `/api/pipelines` | GET | Liste aller Pipelines mit Stats |
| `/api/pipelines` | POST | Neue Pipeline erstellen |
| `/api/pipelines/[id]` | GET | Pipeline-Details + Executions |
| `/api/pipelines/[id]` | PATCH | Pipeline aktualisieren |
| `/api/pipelines/[id]` | DELETE | Pipeline loschen |
| `/api/pipelines/[id]/execute` | POST | Pipeline ausfuhren |
| `/api/pipelines/[id]/approve` | POST | Approval-Entscheidung |
| `/api/pipelines/[id]/schedule` | POST/DELETE | Scheduling verwalten |
| `/api/pipelines/[id]/webhooks` | GET/POST | Webhook-Management |
| `/api/pipelines/templates` | GET | Template-Liste |
| `/api/pipelines/templates/clone` | POST | Template klonen |
| `/api/pipelines/analytics` | GET | Analytics-Daten |
| `/api/pipelines/generate` | POST | AI-generierte Pipeline |
| `/api/pipelines/context/[executionId]` | GET | Execution-Context |

#### Workflow APIs (`app/api/workflows/`)

| Endpunkt | Methode | Funktion |
|----------|---------|----------|
| `/api/workflows/[id]/execute` | POST | Workflow ausfuhren |
| `/api/workflows/[id]/deploy` | POST | Workflow deployen |
| `/api/workflows/approvals` | GET | Pending Approvals |
| `/api/workflows/estimate` | POST | Kosten-Schatzung |
| `/api/workflows/executions/recent` | GET | Letzte Executions |
| `/api/workflows/executions/[id]/approve` | POST | Execution genehmigen |
| `/api/workflows/executions/[id]/cancel` | POST | Execution abbrechen |
| `/api/workflows/executions/[id]/logs` | GET | Execution-Logs |

### 4.2 WorkflowExecutionEngineV2

**Datei:** `server/services/WorkflowExecutionEngineV2.ts` (1817 Zeilen)

**Hauptklasse:**
```typescript
export class WorkflowExecutionEngineV2 {
  private executors: Map<string, INodeExecutor> = new Map();
  private activeExecutions: Map<string, ExecutionContext> = new Map();

  // Haupt-Execution-Methode
  async executeWorkflow(
    workflowId: string,
    nodes: Node[],
    edges: Edge[],
    userId: string,
    triggerPayload: any = {},
    options: ExecutionOptions = {}
  ): Promise<ExecutionContext>

  // Human-in-the-Loop Resume
  async resumeWorkflow(
    executionId: string,
    approvalData: ApprovalResponse
  ): Promise<ExecutionContext>
}
```

**Execution-Flow:**
```
1. Pre-flight Budget Check
2. Create Execution Record in DB
3. Initialize Pipeline Context
4. Find Entry Nodes (Triggers)
5. For each Entry Node:
   5.1. Resolve Variables in Node Config
   5.2. Budget Check for Costly Nodes
   5.3. Execute Node via Executor
   5.4. Store Node Output in State
   5.5. Track Cost
   5.6. Check for Suspension (HITL)
   5.7. Execute Connected Nodes (recursively)
6. Mark as Complete
7. Emit Socket Events
8. Cleanup after 5 minutes
```

### 4.3 Node Executors

**Registrierte Executors:**

| Node-Type | Executor | Beschreibung |
|-----------|----------|--------------|
| `trigger` | TriggerExecutorV2 | Entry-Point, gibt Trigger-Payload weiter |
| `data-transform` | DataTransformExecutorV2 | JavaScript-Transformation |
| `condition` | ConditionExecutorV2 | If/Else mit AI-Fallback |
| `output` | OutputExecutorV2 | End-Node |
| `set-variable` | SetVariableExecutorV2 | Variable setzen |
| `human-approval` | HumanApprovalExecutorV2 | HITL Approval |
| `loop-controller` | LoopExecutorV2 | Array-Iteration |
| `email` | EmailExecutorV2 | SMTP-Versand |
| `llm-agent` | ContextAwareLLMExecutor | AI-Agent mit Budget |
| `database-query` | DatabaseQueryNodeExecutor | SQL-Execution |
| `webhook` | WebhookNodeExecutor | HTTP-Calls |
| `hubspot-*` | HubSpot*Executor | HubSpot-Integration |

### 4.4 Variable Resolution

**Syntax:** `{{path.to.value}}`

```typescript
// Unterstutzte Pfade:
{{variableName}}           // Einfache Variable
{{trigger.payload.data}}   // Trigger-Daten
{{nodeId.outputField}}     // Node-Output
{{array.0.property}}       // Array-Zugriff

// Service:
import { resolveVariables, storeNodeOutput, createInitialState } from './VariableService';
```

### 4.5 Human-in-the-Loop (HITL)

**Flow:**
```
1. HumanApprovalExecutorV2 erstellt ApprovalRequest
2. Execution wird "suspended"
3. State wird in DB persistiert
4. Socket-Event "node:suspended" wird emittiert
5. User erhalt Benachrichtigung (Inbox)
6. User entscheidet: Approve/Reject
7. POST /api/workflows/executions/[id]/approve
8. resumeWorkflow() wird aufgerufen
9. Execution fahrt fort oder wird beendet
```

---

## 5. DATENBANK-SCHEMA

### 5.1 Haupttabellen

**Datei:** `lib/db/schema-workflows.ts`

#### `workflows`
```typescript
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  nodes: jsonb('nodes').$type<any[]>().notNull().default([]),
  edges: jsonb('edges').$type<any[]>().notNull().default([]),
  status: workflowStatusEnum('status').default('draft'),
  visibility: workflowVisibilityEnum('visibility').default('private'),
  isTemplate: boolean('is_template').default(false),
  templateCategory: templateCategoryEnum('template_category'),
  tags: jsonb('tags').$type<string[]>().default([]),
  // Enterprise Template Fields
  roiBadge: varchar('roi_badge', { length: 100 }),
  complexity: templateComplexityEnum('complexity').default('beginner'),
  isFeatured: boolean('is_featured').default(false),
  downloadCount: integer('download_count').default(0),
  rating: numeric('rating', { precision: 2, scale: 1 }).default('0.0'),
  // Deployment Fields
  isPublished: boolean('is_published').default(false),
  webhookSecret: varchar('webhook_secret', { length: 64 }),
  publishedVersion: integer('published_version').default(0),
  // Ownership
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: varchar('workspace_id', { length: 255 }),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

#### `workflow_executions`
```typescript
export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => workflows.id),
  input: jsonb('input').$type<any>(),
  output: jsonb('output').$type<any>(),
  logs: jsonb('logs').$type<any[]>().default([]),
  status: executionStatusEnum('status').default('pending'),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  durationMs: jsonb('duration_ms').$type<number>(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  isTest: boolean('is_test').default(false),
});
```

#### `workflow_node_logs`
```typescript
export const workflowNodeLogs = pgTable('workflow_node_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id').references(() => workflowExecutions.id),
  workflowId: uuid('workflow_id').references(() => workflows.id),
  nodeId: varchar('node_id', { length: 100 }).notNull(),
  nodeType: varchar('node_type', { length: 50 }).notNull(),
  nodeName: varchar('node_name', { length: 255 }),
  status: nodeLogStatusEnum('status').default('started'),
  input: jsonb('input').$type<any>(),
  output: jsonb('output').$type<any>(),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),
  tokensUsed: integer('tokens_used'),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }),
});
```

#### `workflow_approval_requests`
```typescript
export const workflowApprovalRequests = pgTable('workflow_approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id').references(() => workflowExecutions.id),
  workflowId: uuid('workflow_id').references(() => workflows.id),
  nodeId: varchar('node_id', { length: 100 }).notNull(),
  status: approvalStatusEnum('status').default('pending'),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  contextData: jsonb('context_data').$type<Record<string, any>>(),
  previewData: jsonb('preview_data'),
  suspendedState: jsonb('suspended_state'),
  assignedUserId: varchar('assigned_user_id', { length: 255 }),
  resolvedBy: varchar('resolved_by', { length: 255 }),
  resolvedAt: timestamp('resolved_at'),
  rejectionReason: text('rejection_reason'),
  expiresAt: timestamp('expires_at'),
});
```

### 5.2 Enums

```typescript
export const workflowStatusEnum = pgEnum('workflow_status', ['draft', 'active', 'archived']);
export const workflowVisibilityEnum = pgEnum('workflow_visibility', ['private', 'team', 'public']);
export const templateCategoryEnum = pgEnum('template_category', [
  'customer-support', 'data-analysis', 'content-generation',
  'automation', 'research', 'sales', 'marketing', 'other'
]);
export const templateComplexityEnum = pgEnum('template_complexity', ['beginner', 'intermediate', 'advanced']);
export const executionStatusEnum = pgEnum('execution_status', ['pending', 'running', 'success', 'error', 'suspended']);
export const nodeLogStatusEnum = pgEnum('node_log_status', ['started', 'running', 'success', 'error', 'skipped', 'waiting']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected', 'expired']);
```

---

## 6. NODE-SYSTEM & EXECUTORS

### 6.1 Node-Typen-Ubersicht

#### Control Flow
| Node | Handle | Beschreibung |
|------|--------|--------------|
| Trigger | `out` | Entry-Point |
| Condition | `true`, `false` | If/Else Verzweigung |
| Loop | `body`, `done` | Array-Iteration |
| Approval | `approved`, `rejected` | Human-in-the-Loop |

#### AI/LLM
| Node | Beschreibung | Cost |
|------|--------------|------|
| LLM Agent | GPT-4o-mini/GPT-4 Call | $0.0002-$0.02/1K tokens |
| Transform | JavaScript-Code | Free |
| Set Variable | State Update | Free |

#### Actions
| Node | Beschreibung |
|------|--------------|
| API Call | GET/POST/PUT/DELETE |
| Database | SQL Execution |
| Email | SMTP Versand |
| Webhook | HTTP POST |
| Web Search | Brave/DuckDuckGo/Google |

#### Integrations
| Node | Beschreibung |
|------|--------------|
| hubspot-create-contact | Kontakt erstellen |
| hubspot-update-deal | Deal aktualisieren |
| hubspot-add-note | Notiz hinzufugen |
| hubspot-search-contacts | Kontakte suchen |

### 6.2 INodeExecutor Interface

```typescript
interface INodeExecutor {
  execute(input: NodeExecutorInput): Promise<NodeExecutorOutput>;
}

interface NodeExecutorInput {
  node: Node;
  context: ExecutionContext;
  inputs: any; // Resolved Variables
  rawInputs: any; // Original Config
}

interface NodeExecutorOutput {
  data: any;
  success: boolean;
  error?: string;
  meta?: {
    tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    cost?: number;
  };
}
```

### 6.3 Condition-Executor mit AI-Fallback

```typescript
class ConditionExecutorV2 implements INodeExecutor {
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { conditions, fallbackToAI } = input.node.data;

    // 1. Versuche regelbasierte Auswertung
    for (const condition of conditions) {
      const result = evaluateCondition(condition, input.context.state);
      if (result !== undefined) {
        return { data: { result, branch: result ? 'true' : 'false' }, success: true };
      }
    }

    // 2. Fallback zu AI wenn aktiviert
    if (fallbackToAI) {
      const aiResult = await this.evaluateWithAI(conditions, input);
      return aiResult;
    }

    // 3. Default: false
    return { data: { result: false, branch: 'false' }, success: true };
  }
}
```

---

## 7. STATE MANAGEMENT

### 7.1 Zustand Store (Frontend)

**Datei:** `store/slices/createPipelineSlice.ts` (704 Zeilen)

**State:**
```typescript
interface PipelineSlice {
  pipelines: Pipeline[];
  currentRunningPipelineId: string | null;
  currentStepIndex: number;
  pipelineStreamingContent: string | null;
}
```

**Actions:**
```typescript
createPipeline: (data: CreatePipelineData) => string;
updatePipeline: (id: string, updates: Partial<Pipeline>) => void;
deletePipeline: (id: string) => void;
togglePipelineActive: (id: string) => void;
addStepToPipeline: (pipelineId: string, step: Omit<PipelineStep, 'id' | 'order' | 'status'>) => void;
removeStepFromPipeline: (pipelineId: string, stepId: string) => void;
runPipeline: (id: string) => Promise<void>;
stopPipeline: (id: string) => void;
```

**Selectors:**
```typescript
export const usePipelines = () => useDashboardStore((s) => s.pipelines);
export const useCurrentRunningPipelineId = () => useDashboardStore((s) => s.currentRunningPipelineId);
export const usePipelineStreamingContent = () => useDashboardStore((s) => s.pipelineStreamingContent);
```

### 7.2 ExecutionState (Backend)

```typescript
interface ExecutionState {
  global: Record<string, any>;
  nodes: Record<string, {
    output: any;
    meta: {
      status: 'pending' | 'running' | 'completed' | 'error' | 'waiting';
      startedAt?: number;
      completedAt?: number;
      error?: string;
    };
  }>;
  variables: Record<string, any>;
  trigger: {
    type: string;
    payload: any;
    timestamp: number;
  };
}
```

---

## 8. REAL-TIME FEATURES

### 8.1 Socket.IO Namespaces

| Namespace | Verwendung |
|-----------|------------|
| `/` | Default (User, Workflow, Agent) |
| `/v1` | Frontend Compatibility |
| `/pipelines` | Pipeline-Execution Events |

### 8.2 Socket Events

**Node Events:**
```typescript
// Node gestartet
'step:started': { stepId, stepName, timestamp }

// Node abgeschlossen
'step:completed': { stepId, stepName, output, durationMs, timestamp }

// Node fehlgeschlagen
'step:failed': { stepId, stepName, error, isRecoverable, timestamp }

// Node wartet auf Approval
'node:suspended': { executionId, workflowId, nodeId, nodeName, approvalId, reason, expiresAt }
```

**Workflow Events:**
```typescript
// Workflow abgeschlossen
'workflow:complete': { executionId, workflowId, state, totalDurationMs, totalCost }

// Workflow fortgesetzt
'workflow:resumed': { executionId, workflowId, resumedFromNodeId, approvalData }

// State Update
'state:update': { executionId, state, currentNodeId, progress }

// Fataler Fehler
'fatal:error': { executionId, workflowId, message, errorCode }
```

### 8.3 Hooks fur Real-Time

**Datei:** `hooks/useExecutionStreamV2.ts`

```typescript
export function useExecutionStreamV2(executionId: string) {
  const [state, setState] = useState<ExecutionState | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  useEffect(() => {
    const socket = io('/pipelines');
    socket.emit('join:execution', { executionId });

    socket.on('state:update', (data) => {
      setState(data.state);
      setProgress(data.progress);
      setCurrentNodeId(data.currentNodeId);
    });

    return () => {
      socket.emit('leave:execution', { executionId });
      socket.disconnect();
    };
  }, [executionId]);

  return { state, progress, currentNodeId };
}
```

---

## 9. API-REFERENZ

### 9.1 GET /api/pipelines

**Response:**
```json
{
  "pipelines": [
    {
      "id": "uuid",
      "name": "My Pipeline",
      "description": "...",
      "is_active": true,
      "trigger_type": "manual",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z",
      "latest_execution": {
        "id": "uuid",
        "status": "completed",
        "started_at": "...",
        "completed_at": "...",
        "current_step": 5,
        "total_steps": 5
      },
      "execution_count": 10,
      "successful_count": 9,
      "failed_count": 1
    }
  ],
  "meta": {
    "total": 5,
    "running": 1,
    "limit": 50,
    "offset": 0
  }
}
```

### 9.2 POST /api/pipelines/[id]/execute

**Request:**
```json
{
  "payload": {
    "data": "any trigger data"
  },
  "skipBudgetCheck": false,
  "variables": {
    "customVar": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "executionId": "uuid",
  "status": "running"
}
```

### 9.3 POST /api/workflows/executions/[id]/approve

**Request:**
```json
{
  "approved": true,
  "comment": "Looks good!",
  "approvedBy": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "executionId": "uuid",
  "status": "running",
  "resumedFromNodeId": "node-id"
}
```

---

## 10. KRITISCHE DATEIEN

### 10.1 Frontend

| Datei | Zweck |
|-------|-------|
| `app/(app)/(dashboard)/pipelines/page.tsx` | Hauptseite |
| `app/(app)/(dashboard)/pipelines/[id]/page.tsx` | Detail-Ansicht |
| `app/(app)/(dashboard)/pipelines/[id]/editor/page.tsx` | Visual Editor |
| `components/pipelines/PipelineBuilder.tsx` | Step-basierter Builder |
| `components/pipelines/PipelineEditor.tsx` | React Flow Wrapper |
| `components/pipelines/nodes/*.tsx` | Node-Komponenten |
| `components/studio/VisualAgentStudio.tsx` | Studio-Hauptkomponente |
| `store/slices/createPipelineSlice.ts` | Zustand State |
| `hooks/useExecutionStreamV2.ts` | Real-Time Hook |

### 10.2 Backend

| Datei | Zweck |
|-------|-------|
| `app/api/pipelines/route.ts` | Pipeline CRUD API |
| `app/api/pipelines/[id]/execute/route.ts` | Execution API |
| `server/services/WorkflowExecutionEngineV2.ts` | Execution Engine |
| `server/services/executors/*.ts` | Node Executors |
| `server/services/VariableService.ts` | Variable Resolution |
| `server/services/BudgetService.ts` | Budget Tracking |
| `server/services/WorkflowCostEstimator.ts` | Cost Estimation |
| `lib/db/schema-workflows.ts` | Datenbank-Schema |
| `lib/db/schema-pipeline-enterprise.ts` | Enterprise Features |

### 10.3 Typen

| Datei | Zweck |
|-------|-------|
| `types/execution.ts` | Execution Types |
| `types/workflow-errors.ts` | Error Types |
| `lib/types/pipeline-templates.ts` | Template Types |
| `lib/studio/types.ts` | Studio Types |

---

## ZUSAMMENFASSUNG

Das Pipeline-System ist eine **produktionsreife, enterprise-fahige** Workflow-Automatisierungslosung mit:

1. **Visual Builder:** React Flow-basierter Drag & Drop Editor
2. **25+ Node-Typen:** Von Triggern uber AI-Agents bis zu Integrationen
3. **DAG-Execution:** Intelligente Graph-Traversierung mit Branch-Support
4. **HITL-Support:** Human-in-the-Loop Approvals mit Workflow-Suspension
5. **Budget-Tracking:** Token-basierte Kostenkontrolle pro User
6. **Real-Time Updates:** Socket.IO fur Live-Status
7. **Template-System:** Vordefinierte Workflows zum Klonen
8. **Enterprise Features:** Scheduling, Webhooks, Analytics

**Nachste Schritte fur Weiterentwicklung:**
- [ ] Pipeline-Versioning mit Diff-Ansicht
- [ ] Workflow-Debugging mit Breakpoints
- [ ] Erweiterte Analytics mit Charts
- [ ] Team-Sharing fur Pipelines
- [ ] Custom Node-Entwicklung

---

**Erstellt mit Claude Code**
**Flowent AI Agent Webapp v3.0.0**
