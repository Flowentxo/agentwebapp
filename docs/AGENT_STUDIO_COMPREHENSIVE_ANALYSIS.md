# Agent Studio - Umfassende Analyse

## Inhaltsverzeichnis
1. [Executive Summary](#executive-summary)
2. [Architektur-Übersicht](#architektur-übersicht)
3. [Frontend-Komponenten](#frontend-komponenten)
4. [Backend-APIs](#backend-apis)
5. [Workflow-Execution-Engine](#workflow-execution-engine)
6. [Module Library & Node Types](#module-library--node-types)
7. [Real-Time Features](#real-time-features)
8. [Aktuelle Funktionalität](#aktuelle-funktionalität)
9. [Fehlende Features & Verbesserungen](#fehlende-features--verbesserungen)
10. [Empfohlene Entwicklungsroadmap](#empfohlene-entwicklungsroadmap)

---

## Executive Summary

Das **Agent Studio** ist ein visueller Workflow-Builder zur Erstellung von AI-Agent-Pipelines. Es ermöglicht Benutzern, komplexe Automatisierungen durch Drag-and-Drop von Modulen zu erstellen und diese miteinander zu verbinden.

### Technologie-Stack
| Bereich | Technologie |
|---------|-------------|
| **Canvas** | React Flow (reactflow) |
| **State Management** | React Hooks (useState, useCallback, useMemo) |
| **Animation** | Framer Motion |
| **Backend** | Next.js API Routes + Express.js |
| **Job Queue** | BullMQ (Redis-basiert) |
| **Real-Time** | Socket.IO |
| **Datenbank** | PostgreSQL (Drizzle ORM) |

### Status
- **Funktionsfähig**: ✅ Grundlegende Studio-Funktionalität
- **In Entwicklung**: 🔄 HITL (Human-in-the-Loop) Approvals
- **Benötigt Verbesserung**: ⚠️ Template-System, Module Library UI

---

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AGENT STUDIO                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐   ┌─────────────────┐   ┌─────────────────────┐   │
│  │   Module    │   │  Visual Canvas  │   │  Configuration     │   │
│  │   Library   │──▶│  (React Flow)   │──▶│  Panel             │   │
│  │   (Sidebar) │   │                 │   │                     │   │
│  └─────────────┘   └────────┬────────┘   └─────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Preview Panel                             │   │
│  │   ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐  │   │
│  │   │ Simulation   │  │ Live Execution  │  │ Cost          │  │   │
│  │   │ Mode         │  │ Mode            │  │ Projection    │  │   │
│  │   └──────────────┘  └─────────────────┘  └───────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ /api/pipelines │  │ /api/workflows  │  │ Socket.IO           │  │
│  │ - CRUD         │  │ - Execute       │  │ - Real-time Updates │  │
│  │ - Execute      │  │ - Status        │  │ - Progress Events   │  │
│  │ - Templates    │  │ - Approve       │  │                     │  │
│  └───────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │
│          │                    │                       │             │
│          └──────────┬─────────┴───────────────────────┘             │
│                     ▼                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Workflow Execution Engine                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │   │
│  │  │ Node       │  │ Budget     │  │ HITL Approval        │   │   │
│  │  │ Executors  │  │ Guard      │  │ System               │   │   │
│  │  └────────────┘  └────────────┘  └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    BullMQ Job Queue                          │   │
│  │   - Async Pipeline Execution                                 │   │
│  │   - Job Priority                                             │   │
│  │   - Resume/Cancel Support                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Frontend-Komponenten

### Haupt-Komponenten

#### 1. VisualAgentStudio.tsx (~1000 Zeilen)
**Pfad**: `components/studio/VisualAgentStudio.tsx`

Der zentrale Container für das gesamte Studio mit:
- **Dual-Mode Interface**: `guided` (Wizard) und `advanced` (Canvas-first)
- **State Management**: Nodes, Edges, UI-States, Execution State
- **Integration mit V2 Execution Stream**

```typescript
// Kernstruktur
type Mode = 'guided' | 'advanced';

// Hauptzustände
const [nodes, setNodes, onNodesChange] = useNodesState([]);
const [edges, setEdges, onEdgesChange] = useEdgesState([]);
const [mode, setMode] = useState<Mode>('guided');
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
```

**Key Features**:
- 3-Schritt Guided Mode (Was soll passieren? → Workflow bauen → Testen & speichern)
- Module Library mit Use-Case Gruppierung (Sales/CRM, Support, Automation, DevTools)
- Template-System mit vorkonfigurierten Workflows
- Live-Execution mit Data Context Panel

#### 2. VisualCanvas.tsx (~360 Zeilen)
**Pfad**: `components/studio/VisualCanvas.tsx`

React Flow Canvas-Wrapper mit:
- Drag & Drop für neue Nodes
- Connection Handling
- Custom Node Types (`custom`, `database-query`, `webhook`)
- Toolbar (Marketplace, Templates, Variables, Connections, Tools, Save)

```typescript
const nodeTypes = useMemo<NodeTypes>(() => ({
  custom: CustomNode,
  'database-query': DatabaseQueryNode,
  webhook: WebhookNode
}), []);
```

#### 3. CustomNode.tsx (~138 Zeilen)
**Pfad**: `components/studio/CustomNode.tsx`

Visuelle Darstellung von Workflow-Modulen:
- Icon-Mapping (Brain, MessageSquare, FileText, Code2, etc.)
- Status-Indikator (Active/Inactive)
- Cost Badge für teure Operationen
- Handles für Input/Output Connections

#### 4. ConfigurationPanel.tsx (~635 Zeilen)
**Pfad**: `components/studio/ConfigurationPanel.tsx`

Property Editor für ausgewählte Nodes:
- **Basic Settings**: Enabled Toggle, Label, Description
- **Advanced Settings**: Model Selection, Temperature, Max Tokens, System Prompt
- **Web Search Settings**: Query, Provider, Number of Results
- **Condition Logic**: Condition Group Builder, True/False Branches
- **Database Query**: SQL Editor, Connection Selection
- **Webhook Config**: URL, Method, Headers, Body

#### 5. PreviewPanel.tsx (~850 Zeilen)
**Pfad**: `components/studio/PreviewPanel.tsx`

Test-Execution Panel mit:
- **Dual Execution Mode**: Simulation (lokal) vs. Live (Backend)
- **Cost Projection**: Min/Max/Avg Kosten, Budget Status
- **View Modes**: Timeline vs. Logs
- **Test Cases**: JSON Input Editor

#### 6. DataContextPanel.tsx (~660 Zeilen)
**Pfad**: `components/studio/panels/DataContextPanel.tsx`

Live-Execution State Viewer:
- Global Context (userId, workspaceId, timestamp)
- Trigger Data
- Node Outputs mit JSON Tree Viewer
- Variables
- Execution Logs
- Copy-to-Clipboard für Variable Paths (`{{nodeId.output.field}}`)

---

### Zusätzliche Studio-Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| `AgentStudio.tsx` | Alternative Agent-Konfiguration (Name, Icon, Capabilities) |
| `AgentConfigPanel.tsx` | Agent-Einstellungen (Model, Temperature, etc.) |
| `AgentPreviewPanel.tsx` | Chat-Preview für Agent-Tests |
| `ConditionGroupBuilder.tsx` | Visual Condition Logic Builder |
| `DatabaseQueryConfig.tsx` | SQL Query Konfiguration |
| `WebhookConfig.tsx` | Webhook-Einstellungen |
| `ModelSelector.tsx` | AI Model Auswahl mit Pricing |
| `SystemPromptBuilder.tsx` | Prompt Templates |
| `ParameterMapper.tsx` | Variable → Parameter Mapping |
| `VariablePanel.tsx` | Workflow-Variablen Editor |
| `TemplateGallery.tsx` | Gespeicherte Workflow-Templates |
| `TemplateMarketplace.tsx` | Community Templates |
| `ToolRegistry.tsx` | Custom Tool Management |
| `ConnectionsDialog.tsx` | Database & API Connections |
| `WorkflowVersionHistory.tsx` | Versions-Rollback |
| `ExecutionTimeline.tsx` | Visual Execution Flow |
| `ApprovalRequestCard.tsx` | HITL Approval UI |

---

## Backend-APIs

### Pipeline APIs (`/api/pipelines/`)

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/pipelines` | GET | Liste aller Pipelines mit Execution Status |
| `/api/pipelines` | POST | Neue Pipeline erstellen |
| `/api/pipelines/[id]` | GET/PATCH/DELETE | Pipeline CRUD |
| `/api/pipelines/[id]/execute` | POST | Pipeline ausführen (BullMQ Queue) |
| `/api/pipelines/[id]/execute` | GET | Execution Status abrufen |
| `/api/pipelines/[id]/execute` | PUT | Suspended Execution fortsetzen |
| `/api/pipelines/[id]/execute` | DELETE | Execution abbrechen |
| `/api/pipelines/[id]/approve` | POST | HITL Approval |
| `/api/pipelines/[id]/schedule` | POST/GET/DELETE | Scheduling |
| `/api/pipelines/[id]/webhooks` | POST/GET | Webhook Triggers |
| `/api/pipelines/templates` | GET | Template Liste |
| `/api/pipelines/templates/clone` | POST | Template klonen |
| `/api/pipelines/generate` | POST | AI-generierte Pipeline |
| `/api/pipelines/analytics` | GET | Pipeline Analytics |
| `/api/pipelines/context/[executionId]` | GET | Execution Context |

### Workflow APIs (`/api/workflows/`)

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/workflows/[workflowId]/execute` | POST | Workflow ausführen (sync/async) |
| `/api/workflows/[workflowId]/execute` | GET | Job Status abrufen |
| `/api/workflows/[workflowId]/deploy` | POST | Workflow deployen |
| `/api/workflows/estimate` | POST | Kosten-Schätzung |
| `/api/workflows/approvals` | GET | Pending Approvals |
| `/api/workflows/executions/recent` | GET | Letzte Executions |
| `/api/workflows/executions/[id]/approve` | POST | Approval erteilen |
| `/api/workflows/executions/[id]/cancel` | POST | Execution abbrechen |
| `/api/workflows/executions/[id]/logs` | GET | Execution Logs |

---

## Workflow-Execution-Engine

### WorkflowExecutionEngine.ts

**Pfad**: `server/services/WorkflowExecutionEngine.ts`

Der Kern der Workflow-Ausführung mit:

#### Execution Context
```typescript
interface ExecutionContext {
  executionId: string;
  workflowId: string;
  userId: string;
  isTest: boolean;
  startTime: number;
  variables: Record<string, any>;
  nodeOutputs: Map<string, any>;
  logs: ExecutionLog[];
  status: 'pending' | 'running' | 'success' | 'error' | 'suspended';
  currentNodeId: string | null;
  totalCostIncurred: number;
  budgetCheckEnabled: boolean;
  suspendedAtNodeId?: string;
  approvalRequestId?: string;
}
```

#### Node Executors

| Executor | Beschreibung |
|----------|--------------|
| `DatabaseQueryNodeExecutor` | SQL-Queries gegen konfigurierte Datenbanken |
| `WebhookNodeExecutor` | HTTP-Requests (GET, POST, PUT, DELETE) |
| `OpenAILLMExecutor` | GPT-4 Completions |
| `ContextAwareLLMExecutor` | LLM mit Pipeline Context |
| `HubSpotCreateContactExecutor` | HubSpot Contact erstellen |
| `HubSpotUpdateDealExecutor` | HubSpot Deal aktualisieren |
| `HubSpotAddNoteExecutor` | HubSpot Note hinzufügen |
| `HubSpotSearchContactsExecutor` | HubSpot Contacts suchen |
| `actionEmailHandler` | E-Mail senden |

#### Budget Guard
```typescript
// Vor jeder Node-Execution
const estimatedCost = workflowCostEstimator.estimateNodeCost(node);
const budgetCheck = await budgetService.canExecute(userId, estimatedCost);

if (!budgetCheck.allowed) {
  throw new BudgetExceededError(nodeId, estimatedCost, budgetCheck.remainingBudget);
}
```

#### Node Log Service
- Logging von Start/Success/Error pro Node
- Speicherung in `workflow_node_logs` Tabelle
- Token-Tracking und Cost-Tracking

---

## Module Library & Node Types

### Kategorien

#### 1. Skill Modules
| Module | Icon | Beschreibung |
|--------|------|--------------|
| Data Analysis | Brain | Datenanalyse & Insights |
| Customer Support | MessageSquare | Kundenanfragen beantworten |
| Content Generation | FileText | Content erstellen |
| Code Review | Code2 | Code analysieren |
| Research & Synthesis | Search | Recherche & Zusammenfassung |
| Web Search | Search | Internet-Suche |

#### 2. Action Modules
| Module | Icon | Beschreibung |
|--------|------|--------------|
| Send Email | Mail | E-Mail senden |
| Slack Message | Slack | Slack Nachricht |
| Database Query | Database | SQL Query |
| Webhook | Webhook | HTTP Request |
| Calendar Event | Calendar | Termin erstellen |

#### 3. Logic Modules
| Module | Icon | Beschreibung |
|--------|------|--------------|
| Condition | GitBranch | If/Else Verzweigung |
| Loop | Repeat | Iteration |
| Delay | Timer | Wartezeit |
| Human Approval | UserCheck | HITL Genehmigung |

#### 4. Trigger Modules
| Module | Icon | Beschreibung |
|--------|------|--------------|
| Manual | Zap | Manueller Start |
| Scheduled | Clock | Cron-basiert |
| Webhook | Webhook | HTTP Trigger |

---

## Real-Time Features

### useExecutionStreamV2 Hook
**Pfad**: `hooks/useExecutionStreamV2.ts`

```typescript
interface ExecutionState {
  global: {
    userId: string;
    userEmail?: string;
    workspaceId?: string;
    isTest: boolean;
    timestamp: number;
  };
  trigger: Record<string, unknown>;
  nodes: Record<string, NodeState>;
  variables: Record<string, unknown>;
}

interface NodeState {
  output: unknown;
  meta: {
    status: 'pending' | 'running' | 'completed' | 'error';
    startedAt?: number;
    completedAt?: number;
    durationMs?: number;
    error?: string;
  };
}
```

### Socket.IO Events
- `execution:${executionId}` - Execution-spezifische Updates
- `workflow:${workflowId}` - Workflow-weite Updates
- `workflow:progress` - Progress Events (0-100%)
- `workflow:node_completed` - Node-Completion Events
- `workflow:approval_required` - HITL Approval Request

---

## Aktuelle Funktionalität

### ✅ Vollständig implementiert

1. **Visual Workflow Builder**
   - Drag & Drop Canvas
   - Node-Connections
   - Zoom/Pan Controls
   - MiniMap

2. **Node Configuration**
   - Basic Settings
   - Advanced LLM Settings
   - Database Query Config
   - Webhook Config

3. **Workflow Execution**
   - Synchrone Execution (Testing)
   - Asynchrone Execution (BullMQ)
   - Budget Guard
   - Per-Node Logging

4. **Real-Time Updates**
   - Progress Tracking
   - Node Status
   - Error Display

5. **Save/Load**
   - Workflow CRUD
   - Version History
   - Rollback

### 🔄 Teilweise implementiert

1. **Guided Mode**
   - 3-Schritt Wizard vorhanden
   - Template-Loading basic
   - ⚠️ Keine echten Templates geladen

2. **Template System**
   - Gallery UI vorhanden
   - Marketplace UI vorhanden
   - ⚠️ Wenige echte Templates

3. **HITL Approvals**
   - ApprovalRequestCard UI vorhanden
   - Backend Support vorhanden
   - ⚠️ End-to-End Flow nicht getestet

### ❌ Nicht implementiert / Fehlend

1. **Module Library UI**
   - Nur statische Library Groups
   - Kein Drag aus Library auf Canvas
   - Keine Suche funktionsfähig

2. **Variable System**
   - UI vorhanden
   - ⚠️ Runtime-Binding unvollständig

3. **Custom Tools**
   - Registry UI vorhanden
   - ⚠️ Tool-Execution nicht implementiert

4. **Connections**
   - Dialog vorhanden
   - ⚠️ Connection-Test nicht implementiert

---

## Fehlende Features & Verbesserungen

### Priorität 1: Kritisch

| Feature | Status | Aufwand |
|---------|--------|---------|
| Drag & Drop aus Module Library | ❌ | 2-3 Stunden |
| Module Library Search | ❌ | 1-2 Stunden |
| Template-System mit echten Daten | ⚠️ | 3-4 Stunden |
| Variable Binding Runtime | ⚠️ | 4-6 Stunden |

### Priorität 2: Wichtig

| Feature | Status | Aufwand |
|---------|--------|---------|
| Custom Tool Execution | ❌ | 4-6 Stunden |
| Connection Testing | ❌ | 2-3 Stunden |
| Improved Error Handling | ⚠️ | 2-3 Stunden |
| Execution Replay | ❌ | 4-6 Stunden |

### Priorität 3: Nice-to-have

| Feature | Status | Aufwand |
|---------|--------|---------|
| AI Pipeline Generator | ⚠️ | 6-8 Stunden |
| Analytics Dashboard | ⚠️ | 4-6 Stunden |
| Team Collaboration | ❌ | 8-12 Stunden |
| Export/Import | ❌ | 2-3 Stunden |

---

## Empfohlene Entwicklungsroadmap

### Phase 1: Module Library Fix (1-2 Tage)

1. **Drag & Drop aus Library implementieren**
   - `onDragStart` Handler in Library Items
   - DataTransfer mit Module-Daten
   - Drop-Handler bereits in VisualCanvas vorhanden

2. **Library Search aktivieren**
   - Search State bereits vorhanden
   - Filter-Logik implementieren

3. **Use-Case Templates laden**
   - API Endpoint für Templates
   - Template Preview
   - One-Click Deploy

### Phase 2: Variable System (2-3 Tage)

1. **Variable Resolution Engine**
   - `{{nodeId.output.field}}` Parser
   - Runtime Context Injection
   - Type Validation

2. **Variable Autocomplete**
   - Graph-basierte Suggestions
   - Upstream Node Outputs
   - Type Hints

### Phase 3: Execution Improvements (2-3 Tage)

1. **Node-to-Node Data Flow**
   - Output Mapping
   - Input Transformation
   - Error Propagation

2. **Conditional Execution**
   - Condition Evaluation
   - Branch Selection
   - Parallel Execution Support

3. **Loop Support**
   - Iterator Pattern
   - Break Conditions
   - Accumulator Variables

### Phase 4: Advanced Features (3-5 Tage)

1. **Custom Tool Runtime**
   - Sandboxed JS Execution
   - Tool Parameter Binding
   - Output Capture

2. **HITL End-to-End**
   - Email Notifications
   - Approval Dashboard
   - Timeout Handling

3. **Analytics & Insights**
   - Execution History
   - Cost Trends
   - Performance Metrics

---

## Zusammenfassung

Das Agent Studio ist ein gut strukturiertes System mit solider Grundlage:

### Stärken
- ✅ Saubere React Flow Integration
- ✅ Flexible Node-Type System
- ✅ Robuste Backend-Architektur
- ✅ Budget Guard & Cost Tracking
- ✅ Real-Time Updates

### Schwächen
- ⚠️ Module Library Drag & Drop nicht funktional
- ⚠️ Template-System unvollständig
- ⚠️ Variable Binding Runtime fehlt
- ⚠️ Custom Tools nicht ausführbar

### Empfehlung

Fokus auf **Phase 1** (Module Library Fix) da dies die grundlegende Benutzerinteraktion ermöglicht. Ohne funktionales Drag & Drop aus der Library ist das Studio nur eingeschränkt nutzbar.

---

*Erstellt am: 2026-01-01*
*Version: 1.0.0*
