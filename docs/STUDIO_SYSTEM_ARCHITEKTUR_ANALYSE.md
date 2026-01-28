# Flowent AI Studio - Umfassende System-Architektur-Analyse

**Datum:** Januar 2026
**Version:** 3.0.0
**Status:** Production-Ready Enterprise Platform

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Frontend-Architektur](#2-frontend-architektur)
3. [Backend-Architektur](#3-backend-architektur)
4. [Datenbank-Schema](#4-datenbank-schema)
5. [API-Schnittstellen](#5-api-schnittstellen)
6. [Datenfluss & Execution](#6-datenfluss--execution)
7. [Modul-System](#7-modul-system)
8. [Architektur-Patterns](#8-architektur-patterns)
9. [Integration Points](#9-integration-points)

---

## 1. Executive Summary

### Was ist das Studio?

Das **Visual Agent Studio** ist ein n8n-inspirierter, visueller Workflow-Editor, der es Benutzern ermöglicht:

- **Visuelle Pipelines** mit Drag-and-Drop zu erstellen
- **AI-gestützte Nodes** (LLM-Calls, Datenanalyse) einzubinden
- **Integrationen** (HubSpot, Gmail, Webhooks) zu orchestrieren
- **Human-in-the-Loop** Approval-Workflows zu implementieren
- **Echtzeit-Debugging** mit Flight Recorder (Time-Travel Debugging)

### Technologie-Stack

| Schicht | Technologie |
|---------|-------------|
| **Canvas** | React Flow 11.x (Node-basierter Editor) |
| **State Management** | Zustand (usePipelineStore) + React Hooks |
| **Styling** | Tailwind CSS + Framer Motion |
| **Backend** | Express.js + TypeScript |
| **Execution Engine** | WorkflowExecutionEngineV2 |
| **Datenbank** | PostgreSQL + Drizzle ORM |
| **Real-Time** | Socket.IO + Server-Sent Events |

### Datei-Statistik

| Kategorie | Anzahl Dateien |
|-----------|----------------|
| Frontend Components (`components/studio/`) | 61 |
| Backend Services (`server/services/`) | ~30 |
| Type Definitions | 12 |
| Utility Libraries (`lib/studio/`) | 16 |
| API Routes | 25 |
| **Gesamt Studio-System** | ~150+ Dateien |

---

## 2. Frontend-Architektur

### 2.1 Komponenten-Hierarchie

```
VisualAgentStudio (Haupt-Container)
│
├── Header-Bereich
│   ├── AgentName Input
│   ├── Save/Execute Buttons
│   ├── Mode Toggle (Guided/Advanced)
│   └── More Menu (Publish, Archive, etc.)
│
├── Main Content Area (Flexbox Layout)
│   │
│   ├── Left Sidebar (Optional)
│   │   ├── RunHistorySidebar (Flight Recorder)
│   │   └── ActionConfigPanel (Node Properties)
│   │
│   ├── Center: VisualCanvas
│   │   ├── React Flow Provider
│   │   ├── CustomNode (Standard Nodes)
│   │   ├── DatabaseQueryNode (Spezial-Node)
│   │   ├── WebhookNode (Trigger-Node)
│   │   ├── CustomEdge (Animierte Verbindungen)
│   │   └── QuickAddMenu (Edge-Drop Actions)
│   │
│   └── Right Panels (Conditional)
│       ├── ConfigurationPanel (Node-Einstellungen)
│       ├── PreviewPanel (Test-Ausführung)
│       ├── VariablePanel (Variablen-Editor)
│       └── DataContextPanel (Execution State Inspector)
│
└── Dialogs/Modals
    ├── SaveDialog
    ├── TemplateDialog
    ├── TemplateMarketplace
    ├── SaveAsTemplateDialog
    ├── ToolRegistry
    ├── ConnectionsDialog
    ├── WorkflowVersionHistory
    └── ExpressionEditorModal (Neu!)
```

### 2.2 Haupt-Komponenten

#### VisualAgentStudio.tsx
**Pfad:** `components/studio/VisualAgentStudio.tsx`

```typescript
// Zentrale State-Variablen
const [nodes, setNodes, onNodesChange] = useNodesState([]);
const [edges, setEdges, onEdgesChange] = useEdgesState([]);
const [selectedNode, setSelectedNode] = useState<Node | null>(null);
const [mode, setMode] = useState<'guided' | 'advanced'>('guided');

// Flight Recorder Integration
const { isDebugMode, currentRun, selectedNodeId } = usePipelineStore();

// V2 Execution Stream
const executionStream = useExecutionStreamV2();

// Variable Store (Shared Context)
const variableStore = useMemo(() => new VariableStore(), []);
```

#### VisualCanvas.tsx
**Pfad:** `components/studio/VisualCanvas.tsx`

- **Verantwortung:** React Flow Canvas mit Drag-and-Drop
- **Features:**
  - Minimap für Navigation
  - Background Grid
  - Controls (Zoom, Fit)
  - Custom Node Types
  - Edge Drop Handler (Quick Add)

#### ConfigurationPanel.tsx
**Pfad:** `components/studio/ConfigurationPanel.tsx`

- **Verantwortung:** Node-spezifische Einstellungen
- **Dynamisches Rendering:** Je nach Node-Typ werden unterschiedliche Konfigurationen angezeigt
- **Komponenten:**
  - `VariableInput` (mit Expression Editor)
  - `ModelSelector` (GPT-4, Claude, etc.)
  - `SystemPromptBuilder`
  - `ConditionGroupBuilder`
  - `ParameterMapper`
  - `DatabaseQueryConfig`
  - `WebhookConfig`

### 2.3 State Management

#### Zustand Store (usePipelineStore)

```typescript
// store/usePipelineStore.ts
interface PipelineStore {
  // Debug Mode (Flight Recorder)
  isDebugMode: boolean;
  currentRun: ExecutionRun | null;
  runs: ExecutionRun[];
  selectedNodeId: string | null;

  // Actions
  enterDebugMode: (run: ExecutionRun) => void;
  exitDebugMode: () => void;
  setSelectedNode: (nodeId: string | null) => void;
  addRun: (run: ExecutionRun) => void;
}
```

#### React Flow State

```typescript
// Nodes State (React Flow)
const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);

// Edges State
const [edges, setEdges, onEdgesChange] = useEdgesState([]);

// Node Data Structure
interface NodeData {
  label: string;
  moduleId: string;
  config: ModuleConfig;
  status?: 'idle' | 'running' | 'success' | 'error';
  output?: any;
}
```

### 2.4 Custom Hooks

| Hook | Datei | Funktion |
|------|-------|----------|
| `useExecutionStreamV2` | `hooks/useExecutionStreamV2.ts` | WebSocket-basiertes Execution Streaming |
| `useExpressionPreview` | `components/studio/expression-editor/` | Echtzeit-Variable-Evaluation |
| `useTheme` | `lib/contexts/ThemeContext.tsx` | Dark/Light Mode Support |
| `usePipelineStore` | `components/pipelines/store/` | Flight Recorder State |

---

## 3. Backend-Architektur

### 3.1 Service-Übersicht

```
server/services/
├── WorkflowExecutionEngineV2.ts    # Haupt-Orchestrator
├── WorkflowExecutors.ts            # Database/Webhook Executor
├── VariableService.ts              # Variable Resolution
├── BudgetService.ts                # Token/Cost Tracking
├── WorkflowCostEstimator.ts        # Pre-Execution Schätzung
├── PipelineContextManager.ts       # Redis-basierter Context
├── WorkflowVersionService.ts       # Version History
├── HubSpotWorkflowNodes.ts         # CRM Integration
├── FlightRecorderIntegration.ts    # Debug/Tracing
│
├── executors/                      # Node-spezifische Executors
│   ├── ConditionExecutorV2.ts      # If/Then/Else Logic
│   ├── ContextAwareLLMExecutor.ts  # GPT-4 Integration
│   ├── EmailExecutorV2.ts          # Email Sending
│   ├── HumanApprovalExecutorV2.ts  # Approval Workflows
│   ├── LoopExecutorV2.ts           # Iteration/Mapping
│   └── DataTransformExecutorV2.ts  # Data Transformation
│
├── storage/
│   └── HybridNodeLogService.ts     # Execution Logging (DB + Blob)
│
└── workflow/
    └── SuspensionService.ts        # Human-in-the-Loop State
```

### 3.2 WorkflowExecutionEngineV2

**Pfad:** `server/services/WorkflowExecutionEngineV2.ts`

#### Core Responsibilities

1. **Workflow Parsing:** Nodes & Edges aus React Flow Format
2. **Execution Order:** Topologische Sortierung
3. **Variable Resolution:** `{{path.to.value}}` Syntax
4. **Per-Node Execution:** Executor Pattern
5. **Error Handling:** Retry Logic, OnError Policies
6. **State Management:** ExecutionState Objekt
7. **Real-Time Updates:** Socket.IO Events
8. **Budget Tracking:** Token Counting & Cost
9. **Suspension:** Human Approval Workflow

#### Execution Flow

```
execute(workflowId, input, options)
    │
    ├── 1. Load Workflow from DB
    │
    ├── 2. Create ExecutionState
    │   {
    │     global: { timestamp, userId, workflowId },
    │     nodes: {},
    │     variables: {},
    │     trigger: input
    │   }
    │
    ├── 3. Topological Sort (Nodes)
    │
    ├── 4. For Each Node (in order):
    │   │
    │   ├── a. Resolve Variables ({{...}})
    │   ├── b. Get Executor for Node Type
    │   ├── c. Execute Node
    │   ├── d. Handle Retry (if error)
    │   ├── e. Store Output in State
    │   ├── f. Emit Socket Event
    │   └── g. Log to Database
    │
    ├── 5. Handle Suspension (if approval needed)
    │
    └── 6. Return Final State
```

#### Executor Interface

```typescript
interface INodeExecutor {
  nodeType: string;
  execute(input: NodeExecutorInput): Promise<NodeExecutorOutput>;
}

interface NodeExecutorInput {
  nodeId: string;
  nodeType: string;
  config: any;
  input: any;
  context: ExecutionContext;
  state: ExecutionState;
}

interface NodeExecutorOutput {
  success: boolean;
  output: any;
  error?: string;
  tokensUsed?: number;
  costUsd?: number;
  metadata?: Record<string, any>;
}
```

### 3.3 VariableService

**Pfad:** `server/services/VariableService.ts`

#### Variable Resolution Patterns

| Pattern | Beispiel | Beschreibung |
|---------|----------|--------------|
| Standard | `{{nodeId.output.field}}` | Node Output Access |
| n8n-Style | `{{$json.field}}` | Current Item Data |
| n8n-Node | `{{$node["Name"].json.field}}` | Specific Node Output |
| n8n-Input | `{{$input.first()}}` | First Input Item |
| n8n-Items | `{{$items[0]}}` | Array Index Access |
| System | `{{$itemIndex}}` | Current Loop Index |
| Trigger | `{{trigger.payload.field}}` | Trigger Input Data |
| Global | `{{global.varName}}` | User-defined Variables |

#### Resolution Pipeline

```typescript
function resolveVariables(input: any, state: ExecutionState): any {
  // 1. Detect {{...}} patterns
  // 2. Parse path (e.g., "nodeId.output.field")
  // 3. Lookup in ExecutionState
  // 4. Handle nested objects/arrays
  // 5. Return resolved value (preserves type)
}
```

### 3.4 Registered Executors

| Executor | Node Type | Funktion |
|----------|-----------|----------|
| `ContextAwareLLMExecutor` | `skill-*` | GPT-4/Claude Calls |
| `ConditionExecutorV2` | `logic-condition` | If/Then/Else Branching |
| `LoopExecutorV2` | `logic-loop` | Iteration über Arrays |
| `EmailExecutorV2` | `action-email` | Email Senden |
| `HumanApprovalExecutorV2` | `action-approval` | Manuelles Approval |
| `DatabaseQueryNodeExecutor` | `action-database` | SQL Queries |
| `WebhookNodeExecutor` | `trigger-webhook` | Webhook Empfang |
| `HubSpotCreateContactExecutor` | `action-hubspot-create` | CRM Contact |
| `HubSpotUpdateDealExecutor` | `action-hubspot-deal` | CRM Deal Update |
| `HubSpotSearchContactsExecutor` | `action-hubspot-search` | CRM Search |

---

## 4. Datenbank-Schema

### 4.1 Haupt-Tabellen

#### workflows

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Workflow Data (React Flow)
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  viewport JSONB DEFAULT '{"x":0,"y":0,"zoom":1}',

  -- Status
  status workflow_status DEFAULT 'draft',  -- draft, active, archived
  visibility workflow_visibility DEFAULT 'private',  -- private, team, public

  -- Template Features
  is_template BOOLEAN DEFAULT FALSE,
  template_category template_category,  -- customer-support, data-analysis, etc.
  complexity template_complexity,  -- beginner, intermediate, advanced
  roi_badge VARCHAR(100),
  business_benefit TEXT,

  -- Deployment
  is_published BOOLEAN DEFAULT FALSE,
  webhook_secret VARCHAR(64),
  published_version INTEGER DEFAULT 0,
  published_nodes JSONB,
  published_edges JSONB,
  live_status VARCHAR(20) DEFAULT 'inactive',

  -- Ownership
  user_id VARCHAR(255) NOT NULL,
  workspace_id VARCHAR(255),

  -- Stats
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### workflow_executions

```sql
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id),

  -- Execution Data
  input JSONB,
  output JSONB,
  status execution_status DEFAULT 'pending',  -- pending, running, success, error, suspended
  logs JSONB DEFAULT '[]',

  -- Suspension State (für Human Approval)
  suspended_state JSONB,  -- Serialized state für Resume
  resume_token VARCHAR(64),  -- Security token

  -- Metrics
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  duration_ms INTEGER,

  -- Context
  user_id VARCHAR(255),
  is_test_run BOOLEAN DEFAULT FALSE,

  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### workflow_node_logs

```sql
CREATE TABLE workflow_node_logs (
  id UUID PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES workflow_executions(id),

  -- Node Info
  node_id VARCHAR(100) NOT NULL,
  node_type VARCHAR(100) NOT NULL,
  node_label VARCHAR(255),

  -- Execution Data
  input JSONB,
  output JSONB,
  status node_log_status,  -- started, running, success, error, skipped
  error_message TEXT,

  -- Metrics
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  duration_ms INTEGER,

  -- n8n-Style Item Logs
  item_executions JSONB,  -- Per-item execution details

  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### workflow_versions

```sql
CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id),

  -- Version Info
  version INTEGER NOT NULL,
  name VARCHAR(255),
  change_description TEXT,

  -- Snapshot
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  viewport JSONB,

  -- Metadata
  created_by VARCHAR(255),
  is_published BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Beziehungen

```
workflows (1) ────────────────── (N) workflow_executions
     │                                      │
     │                                      │
     └── (1) ────── (N) workflow_versions   └── (1) ── (N) workflow_node_logs
                                            │
                                            └── (1) ── (N) workflow_approval_requests
```

---

## 5. API-Schnittstellen

### 5.1 Workflow CRUD

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| `GET` | `/api/workflows` | Liste aller Workflows |
| `POST` | `/api/workflows` | Neuen Workflow erstellen |
| `GET` | `/api/workflows/[id]` | Workflow Details |
| `PUT` | `/api/workflows/[id]` | Workflow aktualisieren |
| `DELETE` | `/api/workflows/[id]` | Workflow löschen |

### 5.2 Execution APIs

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| `POST` | `/api/workflows/[id]/execute` | Workflow ausführen |
| `GET` | `/api/workflows/[id]/execute` | Execution Status |
| `POST` | `/api/workflows/[id]/deploy` | Workflow publishen |
| `GET` | `/api/workflows/executions/recent` | Letzte Ausführungen |
| `GET` | `/api/workflows/executions/[id]/steps` | Node-Level Logs |
| `GET` | `/api/workflows/executions/[id]/logs` | Detail-Logs |

### 5.3 Approval APIs

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| `GET` | `/api/workflows/approvals` | Pending Approvals |
| `POST` | `/api/workflows/executions/[id]/approve` | Approval erteilen |
| `POST` | `/api/workflows/executions/[id]/cancel` | Execution abbrechen |

### 5.4 Version Control

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| `GET` | `/api/pipelines/[id]/versions` | Version History |
| `POST` | `/api/pipelines/[id]/versions/restore` | Version wiederherstellen |
| `POST` | `/api/pipelines/[id]/versions/rollback` | Rollback durchführen |

### 5.5 Request/Response Beispiele

#### Execute Workflow

```typescript
// POST /api/workflows/[id]/execute
// Request
{
  "input": {
    "customer_email": "test@example.com",
    "message": "Help with order #123"
  },
  "async": true  // Optional: Background execution
}

// Response
{
  "executionId": "exec_abc123",
  "status": "running",
  "websocketChannel": "workflow:exec_abc123"
}
```

#### Execution Complete (Socket Event)

```typescript
// Socket Event: workflow:update
{
  "type": "workflow-complete",
  "executionId": "exec_abc123",
  "workflowId": "wf_xyz",
  "state": {
    "global": { "timestamp": 1704067200000 },
    "nodes": {
      "node_1": { "output": { "response": "..." }, "status": "success" },
      "node_2": { "output": { "email_sent": true }, "status": "success" }
    },
    "variables": {},
    "trigger": { "customer_email": "test@example.com" }
  },
  "totalDurationMs": 3542,
  "totalCost": 0.0024
}
```

---

## 6. Datenfluss & Execution

### 6.1 Frontend → Backend Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VisualCanvas (React Flow)                                       │
│       │                                                          │
│       ├── User: Drag & Drop Node                                 │
│       ├── User: Connect Nodes                                    │
│       └── User: Configure Node (ConfigurationPanel)              │
│                     │                                            │
│                     ▼                                            │
│  nodes[] / edges[] State Update                                  │
│                     │                                            │
│                     ▼                                            │
│  Save Button Click ─────────────────────────────────────────────┼──► PUT /api/workflows/[id]
│                                                                  │
│  Execute Button Click ──────────────────────────────────────────┼──► POST /api/workflows/[id]/execute
│                     │                                            │
│                     ▼                                            │
│  useExecutionStreamV2 ◄──── WebSocket: workflow:update           │
│       │                                                          │
│       ├── Update node.status (running/success/error)             │
│       ├── Update PreviewPanel                                    │
│       └── Update DataContextPanel                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  POST /api/workflows/[id]/execute                                │
│       │                                                          │
│       ▼                                                          │
│  WorkflowExecutionEngineV2.execute()                             │
│       │                                                          │
│       ├── 1. Load Workflow from DB                               │
│       ├── 2. Create ExecutionState                               │
│       ├── 3. Topological Sort                                    │
│       │                                                          │
│       └── 4. For Each Node:                                      │
│            │                                                     │
│            ├── a. resolveVariables(config, state)                │
│            │         │                                           │
│            │         └── VariableService                         │
│            │                                                     │
│            ├── b. getExecutor(nodeType)                          │
│            │         │                                           │
│            │         └── ExecutorRegistry                        │
│            │                                                     │
│            ├── c. executor.execute(input)                        │
│            │         │                                           │
│            │         ├── LLM Call (OpenAI)                       │
│            │         ├── Database Query                          │
│            │         ├── Email Send                              │
│            │         └── etc.                                    │
│            │                                                     │
│            ├── d. storeNodeOutput(state, nodeId, output)         │
│            │                                                     │
│            ├── e. emitSocketEvent(node-complete)                 │
│            │                                                     │
│            └── f. hybridNodeLogService.logNodeSuccess()          │
│                                                                  │
│       ▼                                                          │
│  Return ExecutionResult                                          │
│       │                                                          │
│       └──► emitSocketEvent(workflow-complete)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 ExecutionState Struktur

```typescript
interface ExecutionState {
  // Global Context
  global: {
    timestamp: number;
    userId: string;
    workflowId: string;
    executionId: string;
  };

  // Per-Node Outputs
  nodes: {
    [nodeId: string]: {
      input: any;
      output: any;
      startedAt: string;
      completedAt: string;
      status: 'success' | 'error' | 'skipped';
      tokensUsed?: number;
      costUsd?: number;
    };
  };

  // User-defined Variables
  variables: {
    [varName: string]: any;
  };

  // Original Trigger Input
  trigger: {
    [key: string]: any;
  };

  // n8n-Style Items (für Loop Processing)
  items?: WorkflowItem[];
  currentItemIndex?: number;
}
```

### 6.3 Variable Resolution Beispiel

```typescript
// Input Config (vor Resolution)
{
  "to": "{{trigger.customer_email}}",
  "subject": "Re: {{nodes.analyze.output.summary}}",
  "body": "Dear {{$json.customer_name}},\n\n{{nodes.generate_response.output.text}}"
}

// ExecutionState
{
  "trigger": { "customer_email": "john@example.com" },
  "nodes": {
    "analyze": { "output": { "summary": "Order inquiry" } },
    "generate_response": { "output": { "text": "Thank you for your inquiry..." } }
  },
  "items": [{ "json": { "customer_name": "John Doe" } }]
}

// Nach Resolution
{
  "to": "john@example.com",
  "subject": "Re: Order inquiry",
  "body": "Dear John Doe,\n\nThank you for your inquiry..."
}
```

---

## 7. Modul-System

### 7.1 Modul-Kategorien

| Kategorie | Beschreibung | Icon |
|-----------|--------------|------|
| **Skill** | AI-gestützte Verarbeitung | 🧠 Brain |
| **Action** | Aktive Operationen (Email, DB) | ⚡ Zap |
| **Trigger** | Workflow-Starter (Webhook, Schedule) | 🎯 Target |
| **Logic** | Kontrollfluss (If, Loop, Switch) | 🔀 GitBranch |
| **Integration** | Externe Services (HubSpot, Slack) | 🔌 Plug |

### 7.2 Verfügbare Module

#### Skill Modules (AI)

| ID | Name | Model | Beschreibung |
|----|------|-------|--------------|
| `skill-data-analysis` | Data Analysis | GPT-4 | Datenanalyse & Insights |
| `skill-customer-support` | Customer Support | GPT-4 | Kundenservice-Responses |
| `skill-content-generation` | Content Generation | GPT-4 | Texterstellung |
| `skill-code-review` | Code Review | GPT-4 | Code-Analyse |
| `skill-research` | Research & Synthesis | GPT-4 | Recherche |
| `skill-web-search` | Web Search | - | Live Web-Suche |

#### Action Modules

| ID | Name | Beschreibung |
|----|------|--------------|
| `action-send-email` | Send Email | SMTP Email Versand |
| `action-slack-message` | Slack Message | Slack Nachricht |
| `action-update-database` | Database Query | SQL Query Ausführung |
| `action-human-approval` | Human Approval | Manuelles Approval |
| `action-hubspot-create` | HubSpot Create Contact | CRM Contact erstellen |
| `action-hubspot-update` | HubSpot Update Deal | CRM Deal aktualisieren |

#### Trigger Modules

| ID | Name | Beschreibung |
|----|------|--------------|
| `trigger-manual` | Manual Start | Manueller Start |
| `trigger-webhook` | Webhook | HTTP Webhook Empfang |
| `trigger-schedule` | Schedule | Cron-basierter Start |
| `trigger-email` | Email Received | Bei Email-Eingang |

#### Logic Modules

| ID | Name | Beschreibung |
|----|------|--------------|
| `logic-condition` | If/Then/Else | Bedingte Verzweigung |
| `logic-loop` | Loop | Iteration über Arrays |
| `logic-switch` | Switch | Multi-Pfad Routing |
| `logic-delay` | Delay | Zeitverzögerung |

### 7.3 Modul-Konfiguration

```typescript
interface ModuleTemplate {
  id: string;
  category: 'skill' | 'action' | 'trigger' | 'logic';
  type: string;
  name: string;
  description: string;
  icon: string;  // Lucide Icon Name
  color: string;  // Hex Color

  defaultConfig: {
    // Category-spezifische Defaults
    model?: 'gpt-4' | 'claude-3';
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };

  inputs: ModulePort[];
  outputs: ModulePort[];
}

interface ModulePort {
  id: string;
  name: string;
  type: 'data' | 'trigger' | 'action';
  required: boolean;
}
```

---

## 8. Architektur-Patterns

### 8.1 Design Patterns

| Pattern | Implementierung | Beispiel |
|---------|-----------------|----------|
| **Executor Pattern** | `INodeExecutor` Interface | `EmailExecutorV2`, `ConditionExecutorV2` |
| **Service Layer** | Zentrale Business Logic | `WorkflowExecutionEngineV2` |
| **Observer Pattern** | Socket.IO Events | Real-time Updates |
| **Factory Pattern** | Executor Registry | `getExecutor(nodeType)` |
| **State Pattern** | ExecutionState | Shared Context |
| **Builder Pattern** | ConfigurationPanel | Dynamic UI Building |
| **Repository Pattern** | Drizzle ORM | Database Access |
| **Strategy Pattern** | Error Handling | `onError: 'stop' | 'continue'` |

### 8.2 Frontend Patterns

```typescript
// Compound Components Pattern (ConfigurationPanel)
<ConfigurationPanel>
  <ConfigurationPanel.Header />
  <ConfigurationPanel.Body>
    {nodeType === 'skill' && <SkillConfig />}
    {nodeType === 'action-email' && <EmailConfig />}
    {nodeType === 'logic-condition' && <ConditionConfig />}
  </ConfigurationPanel.Body>
</ConfigurationPanel>

// Render Props (VariableInput)
<VariableInput
  value={value}
  onChange={setValue}
  renderPreview={(resolved) => <PreviewBox value={resolved} />}
/>

// Custom Hook Pattern
const { messages, streaming, sendMessage } = useAgentChat(agentId);
const { result, isEvaluating } = useExpressionPreview(expression, context);
```

### 8.3 Backend Patterns

```typescript
// Executor Pattern
class EmailExecutorV2 implements INodeExecutor {
  nodeType = 'action-email';

  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    // 1. Validate config
    // 2. Resolve variables
    // 3. Send email
    // 4. Return result
  }
}

// Factory Pattern
const executorRegistry = new Map<string, INodeExecutor>();
executorRegistry.set('action-email', new EmailExecutorV2());

function getExecutor(nodeType: string): INodeExecutor {
  return executorRegistry.get(nodeType) || new GenericExecutor();
}
```

### 8.4 Error Handling

```typescript
// Custom Error Types
class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public nodeId?: string,
    public isRecoverable: boolean = false
  ) {
    super(message);
  }
}

class NodeExecutionError extends WorkflowError {}
class VariableResolutionError extends WorkflowError {}
class BudgetExceededError extends WorkflowError {}
class TimeoutError extends WorkflowError {}

// Retry Logic
interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

async function executeWithRetry(
  fn: () => Promise<any>,
  policy: RetryPolicy
): Promise<any> {
  let attempt = 0;
  while (attempt < policy.maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error)) throw error;
      await sleep(calculateBackoff(attempt, policy));
      attempt++;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 9. Integration Points

### 9.1 AI/LLM Integration

```typescript
// ContextAwareLLMExecutor
class ContextAwareLLMExecutor implements INodeExecutor {
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { config, context, state } = input;

    // Build messages from config
    const messages = [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: resolvedInput }
    ];

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: config.model || 'gpt-4-turbo',
      messages,
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 2000,
    });

    return {
      success: true,
      output: response.choices[0].message.content,
      tokensUsed: response.usage.total_tokens,
      costUsd: calculateCost(response.usage)
    };
  }
}
```

### 9.2 External Service Integrations

| Service | Executor | API |
|---------|----------|-----|
| **OpenAI** | ContextAwareLLMExecutor | Chat Completions |
| **HubSpot** | HubSpotWorkflowNodes | Contacts, Deals API |
| **Gmail** | EmailExecutorV2 | SMTP / Gmail API |
| **Slack** | SlackExecutor | Webhooks API |
| **Webhooks** | WebhookNodeExecutor | Custom HTTP |
| **Database** | DatabaseQueryNodeExecutor | PostgreSQL |

### 9.3 Real-Time Updates

```typescript
// Socket.IO Event Emission
emitWorkflowUpdate(userId, {
  type: 'node-complete',
  nodeId: node.id,
  nodeName: node.data.label,
  output: result.output,
  durationMs: elapsed,
  timestamp: new Date().toISOString()
});

// Frontend Subscription
const socket = io(BACKEND_URL);
socket.on(`workflow:${executionId}`, (event) => {
  switch (event.type) {
    case 'node-start':
      setNodes(nodes => updateNodeStatus(nodes, event.nodeId, 'running'));
      break;
    case 'node-complete':
      setNodes(nodes => updateNodeStatus(nodes, event.nodeId, 'success'));
      break;
    case 'workflow-complete':
      setExecutionResult(event.state);
      break;
  }
});
```

### 9.4 Flight Recorder (Debug Mode)

```typescript
// Recording Execution
flightRecorder.startRecording(executionId);
flightRecorder.recordNodeExecution(nodeId, input, output, duration);
flightRecorder.stopRecording();

// Playback in Frontend
const { isDebugMode, currentRun, selectedNodeId } = usePipelineStore();

// Time-Travel: Inspect any node's input/output
const nodeExecution = currentRun.steps.find(s => s.nodeId === selectedNodeId);
<DataContextPanel
  executionState={nodeExecution.stateSnapshot}
  highlightPath={selectedPath}
/>
```

---

## Zusammenfassung

Das **Flowent AI Studio** ist ein ausgereiftes, enterprise-fähiges Workflow-Automatisierungssystem mit:

- **Visuellem Editor:** React Flow-basiert mit Drag-and-Drop
- **Modularem Node-System:** 25+ vordefinierte Module in 5 Kategorien
- **Leistungsfähiger Execution Engine:** Variable Resolution, Retry Logic, Budget Tracking
- **Echtzeit-Feedback:** Socket.IO für Live-Updates
- **Enterprise Features:** Version Control, Human Approval, Audit Logging
- **Erweiterbarkeit:** Executor Pattern für Custom Nodes

Die Architektur folgt bewährten Patterns (Service Layer, Observer, Factory) und ist für horizontale Skalierung vorbereitet.
