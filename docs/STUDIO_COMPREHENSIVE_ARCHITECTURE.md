# VISUAL AGENT STUDIO - Umfassende Architektur-Analyse

> **Erstellt mit 6 Skills:** architecture-coding-standards, api-integration, react-component-generator, state-management, testing-guidelines, deployment-config

---

## 1. EXECUTIVE SUMMARY

Das **Visual Agent Studio** ist ein visueller Workflow-Builder für AI-Automatisierungen. Es ermöglicht Benutzern, komplexe AI-Agenten per Drag-and-Drop zu erstellen, zu testen und in Produktion zu deployen.

### Kernfähigkeiten
- Visueller Node-Graph-Editor (React Flow)
- Guided Mode (Wizard) + Advanced Mode (Canvas-first)
- Real-time Workflow-Execution mit Socket.IO
- Human-in-the-Loop (HITL) Approvals
- Flight Recorder (Time-Travel Debugging)
- Version Control & Deployment Pipeline
- Budget/Cost Tracking per Node

---

## 2. FRONTEND-ARCHITEKTUR (UI/Component Skill)

### 2.1 Komponenten-Hierarchie

```
VisualAgentStudio.tsx (Root)
├── Header Controls
│   ├── Mode Switch (Guided/Advanced)
│   ├── Save/Publish Buttons
│   └── Menu (History, Tools, Connections)
│
├── Main Canvas Area
│   ├── VisualCanvas.tsx (React Flow Canvas)
│   │   ├── CustomNode.tsx (Node Renderer)
│   │   │   ├── NodeCostBadge.tsx
│   │   │   └── Execution Status Indicators
│   │   └── Edge Connections
│   │
│   └── ModulePalette.tsx (Drag Source)
│
├── Right Sidebar (Context-dependent)
│   ├── ConfigurationPanel.tsx (Node Config)
│   ├── ActionConfigPanel.tsx (Action Settings)
│   ├── VariablePanel.tsx (Variables)
│   ├── DataContextPanel.tsx (Data Flow Debug)
│   └── NodeSettingsPanel.tsx (Retry/Timeout)
│
├── Bottom Panel
│   ├── PreviewPanel.tsx (Live Test)
│   │   └── Mock Execution Engine
│   └── ExecutionTimeline.tsx
│
└── Dialogs/Modals
    ├── TemplateDialog.tsx → TemplateGallery
    ├── SaveDialog.tsx
    ├── SaveAsTemplateDialog.tsx
    ├── ConnectionsDialog.tsx
    ├── ToolRegistry.tsx
    ├── WorkflowVersionHistory.tsx
    └── ExecutionDetailModal.tsx
```

### 2.2 Haupt-Komponenten

| Komponente | Pfad | Zweck |
|------------|------|-------|
| `VisualAgentStudio.tsx` | `components/studio/` | Root-Orchestrator für das gesamte Studio |
| `VisualCanvas.tsx` | `components/studio/` | React Flow Canvas mit Drag-and-Drop |
| `CustomNode.tsx` | `components/studio/` | Node-Renderer mit Status-Visualisierung |
| `ConfigurationPanel.tsx` | `components/studio/` | Rechte Sidebar für Node-Konfiguration |
| `PreviewPanel.tsx` | `components/studio/` | Live-Test-Umgebung mit Mock-Engine |
| `VariablePanel.tsx` | `components/studio/` | Variable-Definition & Management |

### 2.3 Node-Typen

```typescript
type ModuleCategory = 'skill' | 'action' | 'integration' | 'trigger' | 'logic';

// Skill-Typen
type SkillType = 'data-analysis' | 'customer-support' | 'content-generation'
               | 'code-review' | 'research' | 'planning';

// Action-Typen
type ActionType = 'send-email' | 'send-slack-message' | 'create-task'
                | 'update-database' | 'run-analysis' | 'generate-report';

// Integration-Typen
type IntegrationType = 'email' | 'slack' | 'calendar' | 'crm' | 'database' | 'api';

// Trigger-Typen
type TriggerType = 'time-based' | 'event-based' | 'manual' | 'webhook' | 'email-received';

// Logic-Typen
type LogicType = 'condition' | 'loop' | 'switch' | 'delay';
```

### 2.4 Spezial-Komponenten

#### Flight Recorder (Phase 13)
```
RunHistorySidebar.tsx    → Execution History Browser
RunHeader.tsx            → Run Details Header
StepDetailsPanel.tsx     → Step-by-Step Analysis
ApprovalRequestCard.tsx  → HITL Approval UI
```

#### Condition Builder
```
ConditionPanel.tsx       → Main Condition UI
ConditionGroupBuilder.tsx → AND/OR Groups
ConditionRuleEditor.tsx  → Single Rule Editor
```

---

## 3. BACKEND/API-LAYER (API-Integration Skill)

### 3.1 API-Endpunkte

#### Workflow Execution
| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| POST | `/api/workflows/[workflowId]/execute` | Workflow ausführen (sync/async) |
| GET | `/api/workflows/executions/recent` | Letzte Ausführungen |
| GET | `/api/workflows/executions/[id]/logs` | Per-Node Logs |
| GET | `/api/workflows/executions/[id]/steps` | Execution Steps Timeline |
| POST | `/api/workflows/executions/[id]/approve` | HITL Approval |
| POST | `/api/workflows/executions/[id]/cancel` | Execution abbrechen |

#### Workflow Management
| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| POST | `/api/workflows/[workflowId]/deploy` | In Produktion deployen |
| POST | `/api/workflows/estimate` | Kosten-Schätzung vor Ausführung |
| GET | `/api/workflows/approvals` | Pending Approvals |

### 3.2 Request/Response-Formate

#### Execute Workflow
```typescript
// POST /api/workflows/{workflowId}/execute
// Query: ?async=true (BullMQ Queue) | ?async=false (sync)

interface ExecuteRequest {
  triggerData: Record<string, any>;  // Eingabedaten
  isTest?: boolean;                   // Test-Modus (default: true)
  variables?: Record<string, any>;    // Zusätzliche Variablen
  priority?: number;                  // 0-10 für async
  delay?: number;                     // Verzögerung in ms
}

interface ExecuteResponse {
  executionId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'suspended';
  // ... weitere Felder
}
```

### 3.3 Service Layer

```
server/services/
├── WorkflowExecutionEngine.ts      → V1 Engine
├── WorkflowExecutionEngineV2.ts    → V2 mit Shared State
├── WorkflowCostEstimator.ts        → Kosten-Berechnung
├── WorkflowSchedulerService.ts     → Cron-Scheduling
├── WorkflowVersionService.ts       → Version Control
├── VariableService.ts              → Variable Resolution
├── BudgetService.ts                → Budget Enforcement
├── PipelineContextManager.ts       → Context zwischen Nodes
│
├── executors/                      → Node-Executors
│   ├── ConditionExecutorV2.ts
│   ├── ContextAwareLLMExecutor.ts
│   ├── EmailExecutorV2.ts
│   ├── HumanApprovalExecutorV2.ts
│   ├── LoopExecutorV2.ts
│   └── DataTransformExecutorV2.ts
│
├── workflow/
│   └── SuspensionService.ts        → HITL State Snapshots
│
└── storage/
    └── HybridNodeLogService.ts     → DB + Flight Recorder
```

### 3.4 Execution Flow

```
User Click "Run"
    ↓
API: POST /api/workflows/{id}/execute
    ↓
WorkflowExecutionEngineV2.execute()
    ├── createInitialState()
    ├── for each node (topological order):
    │   ├── resolveVariables({{...}} syntax)
    │   ├── executorRegistry[nodeType].execute()
    │   │   ├── Budget Check (BudgetService)
    │   │   ├── Execute Node Logic
    │   │   ├── Handle Retries (RetryPolicy)
    │   │   └── Store Output (storeNodeOutput)
    │   ├── Log to DB (workflowNodeLogs)
    │   ├── Emit Socket Events (node-start, node-complete)
    │   └── Handle HITL Suspension
    └── Return ExecutionResult
    ↓
Socket.IO → Frontend (Real-time Updates)
```

---

## 4. STATE MANAGEMENT (State-Management Skill)

### 4.1 Zustand Stores

#### Pipeline Store (`usePipelineStore.ts`)
```typescript
interface PipelineState {
  // Canvas State
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  viewport: Viewport;

  // Execution State
  nodeStatuses: Map<string, NodeExecutionStatus>;
  nodeOutputs: Map<string, NodeExecutionOutput>;
  currentExecutionId: string | null;

  // Flight Recorder (Debug Mode)
  isDebugMode: boolean;
  currentRun: WorkflowRun | null;
  executionSteps: ExecutionStep[];
  selectedNodeId: string | null;

  // Actions
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  setNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  enterDebugMode: (run: WorkflowRun) => void;
  exitDebugMode: () => void;
}
```

### 4.2 Custom Hooks

| Hook | Datei | Zweck |
|------|-------|-------|
| `useWorkflowRun` | `hooks/useWorkflowRun.ts` | Polling für Execution Status |
| `useExecutionStreamV2` | `hooks/useExecutionStreamV2.ts` | WebSocket-basiertes Streaming |
| `useWorkflowActions` | `lib/hooks/useWorkflowActions.ts` | HITL Approval Actions |

### 4.3 State-Klassifizierung

| State-Typ | Beispiel | Speicherort |
|-----------|----------|-------------|
| **Local UI** | `selectedNode`, `showConfig` | `useState` in VisualAgentStudio |
| **Global UI** | `isDebugMode`, `currentRun` | Zustand (`usePipelineStore`) |
| **Server State** | Workflow Definition, Executions | PostgreSQL via API |
| **Real-time State** | Execution Progress, Node Status | Socket.IO + Zustand |
| **Derived State** | `nodeNames` Map | `useMemo` |

### 4.4 Data Flow Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                        UNIDIRECTIONAL FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Action → Event Handler → Store Action → State Update       │
│       ↓                                                          │
│  Component Re-render ← useSelector/useStore                      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                        SERVER SYNC                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  API Call → Server Response → Update Store → UI Update           │
│                     ↓                                            │
│  Socket.IO Event → Update Store → UI Update (Real-time)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. DATENBANK-SCHEMA (Architecture Skill)

### 5.1 Core Tables

```sql
-- Workflows (Haupttabelle)
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]',     -- React Flow Nodes
  edges JSONB NOT NULL DEFAULT '[]',     -- React Flow Edges
  viewport JSONB,                         -- Canvas Viewport
  status workflow_status DEFAULT 'draft', -- draft/active/archived
  visibility workflow_visibility,         -- private/team/public
  user_id VARCHAR(255) NOT NULL,
  workspace_id VARCHAR(255),
  -- Deployment Fields
  is_published BOOLEAN DEFAULT FALSE,
  webhook_secret VARCHAR(64),
  published_version INTEGER DEFAULT 0,
  published_nodes JSONB,
  published_edges JSONB,
  -- Enterprise Template Fields
  is_template BOOLEAN DEFAULT FALSE,
  template_category template_category,
  complexity template_complexity,
  download_count INTEGER DEFAULT 0,
  rating NUMERIC(2,1),
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Executions
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  user_id VARCHAR(255) NOT NULL,
  status execution_status,  -- pending/running/success/error/suspended
  trigger_data JSONB,
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  suspended_state JSONB,  -- State Snapshot für HITL Resume
  total_cost NUMERIC(10,6),
  total_tokens INTEGER
);

-- Per-Node Execution Logs
CREATE TABLE workflow_node_logs (
  id UUID PRIMARY KEY,
  execution_id UUID REFERENCES workflow_executions(id),
  node_id VARCHAR(100) NOT NULL,
  node_type VARCHAR(50),
  status VARCHAR(20),
  input JSONB,
  output JSONB,
  error TEXT,
  duration_ms INTEGER,
  tokens_used INTEGER,
  cost NUMERIC(10,6),
  retry_attempt INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- HITL Approval Requests
CREATE TABLE workflow_approval_requests (
  id UUID PRIMARY KEY,
  execution_id UUID REFERENCES workflow_executions(id),
  node_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending/approved/rejected
  context JSONB,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Entity Relationships

```
workflows
  ├── 1:N → workflow_executions
  │         ├── 1:N → workflow_node_logs
  │         └── 1:N → workflow_approval_requests
  ├── 1:N → workflow_versions
  └── 1:N → workflow_shares
```

---

## 6. TYPE DEFINITIONS (Architecture Skill)

### 6.1 Core Types (`lib/studio/types.ts`)

```typescript
// Module System
interface ModuleTemplate {
  id: string;
  category: ModuleCategory;
  type: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultConfig: Partial<ModuleConfig>;
  inputs: ModulePort[];
  outputs: ModulePort[];
}

// Workflow Structure
interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: Date;
  updatedAt: Date;
}

// Template System (Unified)
interface FlowentTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  nodes: Node[];
  edges: Edge[];
  requirements?: TemplateRequirement[];
  roiBadge?: string;
  businessBenefit?: string;
}

// Custom Tools
interface CustomTool {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  code: string;
  createdAt: Date;
}
```

### 6.2 Execution Types (`types/execution.ts`)

```typescript
interface ExecutionState {
  global: Record<string, any>;
  nodes: Record<string, NodeState>;
  variables: Record<string, any>;
  trigger: TriggerData;
}

interface NodeExecutorInput {
  nodeId: string;
  nodeType: string;
  config: Record<string, any>;
  state: ExecutionState;
  context: ExecutionContext;
}

interface NodeExecutorOutput {
  success: boolean;
  output?: any;
  error?: string;
  tokensUsed?: number;
  cost?: number;
  shouldSuspend?: boolean;  // For HITL
  suspensionData?: any;
}
```

### 6.3 Retry & Resilience Types (`types/workflow.ts`)

```typescript
interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

interface NodeSettings {
  retry?: RetryPolicy;
  timeoutMs?: number;
  isCritical?: boolean;
  onError?: 'stop' | 'continue';
}
```

---

## 7. VARIABLE RESOLUTION SYSTEM

### 7.1 Syntax

```
{{path.to.value}}

Beispiele:
- {{trigger.email}}           → Trigger Input
- {{steps.analyze.result}}    → Output von Node "analyze"
- {{env.API_KEY}}             → Environment Variable
- {{variables.customVar}}     → User-defined Variable
```

### 7.2 Resolution Flow

```typescript
// lib/studio/variable-resolver.ts
function resolveVariables(
  template: string | object,
  state: ExecutionState
): any {
  // 1. Parse {{...}} patterns
  // 2. Navigate to path in state
  // 3. Return resolved value (preserving types)
}
```

### 7.3 Variable Sources

| Prefix | Quelle | Beispiel |
|--------|--------|----------|
| `trigger.*` | Workflow Input | `{{trigger.payload.email}}` |
| `steps.*` | Node Outputs | `{{steps.llm_1.response}}` |
| `env.*` | Environment Vars | `{{env.OPENAI_KEY}}` |
| `variables.*` | User Variables | `{{variables.companyName}}` |
| `system.*` | System Values | `{{system.timestamp}}` |

---

## 8. TEST-COVERAGE ANALYSE (Testing Skill)

### 8.1 Aktuelle Test-Situation

```
tests/
├── unit/
│   ├── oauth/oauth-utilities.spec.ts
│   └── routing-group.guard.spec.ts
└── e2e/
    ├── agent-chat.spec.ts
    └── inbox.spec.ts
```

**WARNUNG:** Keine dedizierten Studio/Workflow-Tests gefunden!

### 8.2 Empfohlene Test-Strategie

#### Unit Tests (Kritisch)
```typescript
// lib/studio/__tests__/variable-resolver.test.ts
describe('VariableResolver', () => {
  it('resolves trigger variables', () => {});
  it('resolves step outputs', () => {});
  it('preserves object/array types', () => {});
  it('throws on missing required variables', () => {});
});

// lib/studio/__tests__/condition-evaluator.test.ts
describe('ConditionEvaluator', () => {
  it('evaluates simple conditions', () => {});
  it('handles AND/OR groups', () => {});
  it('compares strings/numbers correctly', () => {});
});
```

#### Component Tests (Empfohlen)
```typescript
// components/studio/__tests__/CustomNode.test.tsx
describe('<CustomNode />', () => {
  it('renders node label and icon', () => {});
  it('shows execution status indicator', () => {});
  it('displays cost badge when available', () => {});
  it('handles selection state', () => {});
});

// components/studio/__tests__/ConfigurationPanel.test.tsx
describe('<ConfigurationPanel />', () => {
  it('renders config fields for selected node', () => {});
  it('updates node config on change', () => {});
  it('validates required fields', () => {});
});
```

#### Integration Tests (Empfohlen)
```typescript
// __tests__/integration/workflow-execution.test.ts
describe('WorkflowExecution', () => {
  it('executes simple workflow end-to-end', async () => {});
  it('handles HITL suspension and resume', async () => {});
  it('applies retry policy on failure', async () => {});
  it('respects budget limits', async () => {});
});
```

### 8.3 Test-Prioritäten

| Priorität | Bereich | Begründung |
|-----------|---------|------------|
| P0 | VariableService | Kern der Execution |
| P0 | WorkflowExecutionEngineV2 | Geschäftskritisch |
| P1 | ConditionEvaluator | Logik-Entscheidungen |
| P1 | BudgetService | Kosten-Kontrolle |
| P2 | CustomNode | Haupt-UI-Element |
| P2 | ConfigurationPanel | User-Interaktion |

---

## 9. DEPLOYMENT & ENVIRONMENT (Deployment Skill)

### 9.1 Environment-Variablen

```bash
# .env.production.example (Auszug)

# AI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=4000
AI_MAX_RETRIES=3
AI_TIMEOUT_MS=30000

# Database
DATABASE_URL=postgresql://...

# Redis (für BullMQ Job Queue)
REDIS_URL=redis://...

# Server Ports
NEXT_PORT=3000
BACKEND_PORT=4000
```

### 9.2 Build & Deploy Prozess

```yaml
# cloudbuild.yaml / CI Pipeline
steps:
  - name: Install Dependencies
    run: pnpm install --frozen-lockfile

  - name: Type Check
    run: pnpm tsc --noEmit

  - name: Run Tests
    run: pnpm test

  - name: Build Next.js
    run: pnpm build
    env:
      - NEXT_PUBLIC_API_URL=${{ secrets.API_URL }}

  - name: Build Docker Image
    run: docker build -t flowent:${{ github.sha }} .

  - name: Deploy to Cloud Run
    run: gcloud run deploy flowent --image=...
```

### 9.3 Health Checks

```typescript
// /api/health/route.ts
GET /api/health → { status: 'ok', db: 'connected', redis: 'connected' }

// Kubernetes Probes
livenessProbe:
  httpGet: /api/health
  initialDelaySeconds: 30

readinessProbe:
  httpGet: /api/health/database
  initialDelaySeconds: 10
```

### 9.4 Feature Flags

| Flag | Default | Beschreibung |
|------|---------|--------------|
| `ENABLE_HITL_APPROVAL` | true | Human-in-the-Loop aktivieren |
| `ENABLE_FLIGHT_RECORDER` | true | Time-Travel Debugging |
| `ENABLE_BUDGET_ENFORCEMENT` | true | Kosten-Limits durchsetzen |
| `MAX_NODES_PER_WORKFLOW` | 50 | Node-Limit pro Workflow |

---

## 10. ARCHITEKTUR-PATTERNS (Architecture Skill)

### 10.1 Verwendete Patterns

| Pattern | Anwendung | Beispiel |
|---------|-----------|----------|
| **Observer** | Socket.IO Events | `emitWorkflowUpdate()` |
| **Strategy** | Node Executors | `INodeExecutor` Interface |
| **Factory** | Executor Registry | `executorRegistry[nodeType]` |
| **State Machine** | Execution Status | pending → running → success/error |
| **Repository** | Database Access | Drizzle ORM Queries |
| **Mediator** | PipelineContextManager | Context zwischen Nodes |

### 10.2 Code-Konventionen

```typescript
// Naming
- Components: PascalCase (VisualCanvas.tsx)
- Hooks: camelCase mit use-Prefix (useWorkflowRun.ts)
- Services: PascalCase mit -Service Suffix (BudgetService.ts)
- Types: PascalCase mit I-Prefix für Interfaces (INodeExecutor)

// File Structure
components/studio/
  ├── ComponentName.tsx      # Component
  ├── ComponentName.test.tsx # Tests (co-located)
  └── index.ts               # Barrel export

// Error Handling
- Typed Errors (WorkflowError, NodeExecutionError)
- Error Boundaries für UI
- Structured Logging (Winston)
```

### 10.3 Abhängigkeits-Graph

```
                    ┌─────────────────┐
                    │ VisualAgentStudio│
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │ VisualCanvas │  │ ConfigPanel  │  │ PreviewPanel │
   └──────┬───────┘  └──────────────┘  └──────┬───────┘
          │                                    │
          ▼                                    ▼
   ┌──────────────┐                    ┌──────────────┐
   │ usePipeline  │◄───────────────────│ useExecution │
   │    Store     │                    │   StreamV2   │
   └──────────────┘                    └──────┬───────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │  Socket.IO   │
                                       └──────┬───────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
             ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
             │  API Routes  │          │  Executors   │          │   Services   │
             └──────────────┘          └──────────────┘          └──────────────┘
```

---

## 11. KNOWN ISSUES & TECHNICAL DEBT

### 11.1 Fehlende Tests
- Keine Unit-Tests für `lib/studio/` Module
- Keine Integration-Tests für Workflow-Execution
- Keine E2E-Tests für Studio UI

### 11.2 Code-Qualität
- Einige TSX-Dateien > 1000 Zeilen (VisualAgentStudio.tsx)
- Duplizierte Logic zwischen V1 und V2 Engines
- Hardcoded Strings statt i18n

### 11.3 Performance
- Keine Memoization in CustomNode
- Keine Virtualisierung für große Node-Listen
- Socket.IO Events nicht debounced

---

## 12. EMPFEHLUNGEN

### Sofortige Prioritäten (P0)
1. Unit-Tests für VariableService und ConditionEvaluator schreiben
2. Error Boundaries um Canvas-Komponenten
3. Input-Validierung in API-Routen

### Mittelfristig (P1)
1. VisualAgentStudio.tsx in kleinere Module aufteilen
2. Workflow V1 Engine deprecaten
3. i18n-System implementieren

### Langfristig (P2)
1. Virtualisierung für > 100 Nodes
2. Offline-Support mit Service Worker
3. Collaborative Editing (CRDT)

---

## 13. ANHANG

### 13.1 Alle Studio-Komponenten

```
components/studio/
├── AgentConfigPanel.tsx
├── AgentPreviewPanel.tsx
├── AgentStudio.tsx
├── ApprovalRequestCard.tsx
├── ConditionGroupBuilder.tsx
├── ConditionPanel.tsx
├── ConditionRuleEditor.tsx
├── ConfigurationPanel.tsx
├── ConnectionCard.tsx
├── ConnectionsDialog.tsx
├── ConnectionsManager.tsx
├── CreateToolDialog.tsx
├── CustomNode.tsx
├── DatabaseQueryConfig.tsx
├── DatabaseQueryNode.tsx
├── ExecutionDetailModal.tsx
├── ExecutionHistory.tsx
├── ExecutionTimeline.tsx
├── ModelSelector.tsx
├── ModulePalette.tsx
├── ParameterMapper.tsx
├── PreviewPanel.tsx
├── PreviewPanel.SIMULATION.tsx
├── PublishWorkflowButton.tsx
├── RunHeader.tsx
├── RunHistorySidebar.tsx
├── SaveAsTemplateDialog.tsx
├── SaveDialog.tsx
├── StepDetailsPanel.tsx
├── SystemPromptBuilder.tsx
├── TemplateDialog.tsx
├── TemplateMarketplace.tsx
├── ToolRegistry.tsx
├── VariableCard.tsx
├── VariableEditor.tsx
├── VariableInput.tsx
├── VariablePanel.tsx
├── VisualAgentStudio.tsx
├── VisualCanvas.tsx
├── WebhookConfig.tsx
├── WebhookNode.tsx
├── WorkflowVersionHistory.tsx
├── header/
│   ├── DeploymentControls.tsx
│   └── VersionHistory.tsx
├── inputs/
│   ├── VariableInput.tsx
│   └── index.ts
├── nodes/
│   └── NodeCostBadge.tsx
├── panels/
│   ├── DataContextPanel.tsx
│   ├── INTEGRATION_EXAMPLE.tsx
│   ├── NodeSettingsPanel.tsx
│   └── index.ts
└── sidebar/
    ├── ActionConfigPanel.tsx
    ├── DynamicActionForm.tsx
    ├── VariablePicker.tsx
    └── index.ts
```

### 13.2 Alle API-Routen

```
app/api/workflows/
├── approvals/route.ts
├── estimate/route.ts
├── executions/
│   ├── recent/route.ts
│   └── [executionId]/
│       ├── approve/route.ts
│       ├── cancel/route.ts
│       ├── logs/route.ts
│       └── steps/route.ts
└── [workflowId]/
    ├── deploy/route.ts
    └── execute/route.ts
```

### 13.3 Alle Services

```
server/services/
├── WorkflowExecutionEngine.ts
├── WorkflowExecutionEngineV2.ts
├── WorkflowCostEstimator.ts
├── WorkflowSchedulerService.ts
├── WorkflowVersionService.ts
├── VariableService.ts
├── BudgetService.ts
├── PipelineContextManager.ts
├── HubSpotWorkflowNodes.ts
├── WorkflowExecutors.ts
├── FlightRecorderIntegration.ts
├── executors/
│   ├── ConditionExecutorV2.ts
│   ├── ContextAwareLLMExecutor.ts
│   ├── DataTransformExecutorV2.ts
│   ├── EmailExecutorV2.ts
│   ├── HumanApprovalExecutorV2.ts
│   └── LoopExecutorV2.ts
├── workflow/
│   └── SuspensionService.ts
└── storage/
    └── HybridNodeLogService.ts
```

---

*Dokumentation erstellt: 2026-01-03*
*Skills verwendet: architecture-coding-standards, api-integration, react-component-generator, state-management, testing-guidelines, deployment-config*
