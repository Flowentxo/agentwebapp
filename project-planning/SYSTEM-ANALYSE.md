# Flowent AI Agent System - Vollständige Systemanalyse

> Stand: Februar 2026 | Version: 2.0.0+

---

## Inhaltsverzeichnis

1. [Architektur-Übersicht](#1-architektur-übersicht)
2. [Frontend-Architektur](#2-frontend-architektur)
3. [Backend-Architektur](#3-backend-architektur)
4. [AI-Agent-System](#4-ai-agent-system)
5. [Pipeline/Workflow-System](#5-pipelineworkflow-system)
6. [Inbox & Messaging](#6-inbox--messaging)
7. [Datenbank-Schicht](#7-datenbank-schicht)
8. [Authentifizierung & Sicherheit](#8-authentifizierung--sicherheit)
9. [Echtzeit-Kommunikation](#9-echtzeit-kommunikation)
10. [AI-Service-Layer](#10-ai-service-layer)
11. [Spezial-Agenten](#11-spezial-agenten)
12. [Settings & Konfiguration](#12-settings--konfiguration)
13. [Error-Handling](#13-error-handling)
14. [Datenfluss-Diagramme](#14-datenfluss-diagramme)
15. [Technologie-Stack](#15-technologie-stack)

---

## 1. Architektur-Übersicht

### Systemlandschaft

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Inbox    │  │  Agents  │  │ Pipelines│  │  Brain/       │   │
│  │  (Chat)   │  │  (Chat)  │  │ (Editor) │  │  Knowledge   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │             │                │            │
│  ┌────┴──────────────┴─────────────┴────────────────┴────────┐  │
│  │           Zustand Stores + React Query Cache              │  │
│  └────┬──────────────┬─────────────┬────────────────┬────────┘  │
└───────┼──────────────┼─────────────┼────────────────┼───────────┘
        │ REST/SSE     │ Socket.IO   │ REST           │ REST
        ▼              ▼             ▼                ▼
┌───────────────────────────────────────────────────────────────┐
│              NEXT.JS API ROUTES (Port 3000)                   │
│  /api/agents/[id]/chat  │  /api/pipelines/*  │  /api/inbox/* │
│  /api/workspaces/*      │  /api/sentinel/*   │  /api/auth/*  │
└────────────┬────────────────────────┬─────────────────────────┘
             │                        │
             ▼                        ▼
┌─────────────────────┐   ┌─────────────────────────────────────┐
│   EXPRESS BACKEND    │   │          EXTERNE SERVICES           │
│    (Port 4000)       │   │                                     │
│  ┌───────────────┐   │   │  ┌──────────┐  ┌──────────────┐   │
│  │ AgentManager  │   │   │  │  OpenAI   │  │  Gmail API   │   │
│  │ RoutingService│   │   │  │  GPT-5    │  │  (OAuth 2.0) │   │
│  │ BrainAI       │   │   │  └──────────┘  └──────────────┘   │
│  │ Socket.IO     │   │   │  ┌──────────┐  ┌──────────────┐   │
│  │ BullMQ Jobs   │   │   │  │ Firecrawl│  │  HubSpot     │   │
│  └───────────────┘   │   │  │ (Scraper)│  │  (CRM)       │   │
└──────────┬───────────┘   │  └──────────┘  └──────────────┘   │
           │               └─────────────────────────────────────┘
           ▼
┌─────────────────────────────┐
│     POSTGRESQL + pgvector   │
│  ┌────────┐  ┌───────────┐  │
│  │ Drizzle│  │ Embeddings│  │
│  │  ORM   │  │  (1536d)  │  │
│  └────────┘  └───────────┘  │
└─────────────────────────────┘
```

### Ports & Services

| Service | Port | Technologie |
|---------|------|-------------|
| Frontend (Next.js) | 3000 | Next.js 14 App Router |
| Backend (Express) | 4000 | Express.js + Socket.IO |
| Datenbank | 5432 | PostgreSQL + pgvector |
| Redis (optional) | 6379 | Session-Cache, BullMQ |

---

## 2. Frontend-Architektur

### 2.1 App Router Routing-Baum

```
app/
├── layout.tsx                      # Root: Providers, ErrorBoundary
├── providers.tsx                   # QueryClient, Theme, Session, Toast
├── globals.css                     # Tailwind + Vicy Design Tokens
├── login/page.tsx                  # Login
├── register/page.tsx               # Registrierung
│
└── (app)/                          # Geschützte Routen
    ├── layout.tsx                  # WorkspaceProvider
    │
    ├── (classic)/                  # Dashboard-Shell (VicySidebar)
    │   ├── layout.tsx              # ShellProvider, InboxSocket, VicySidebar, CommandPalette
    │   │
    │   ├── inbox/                  # AI-Inbox (Zwei-Spalten)
    │   │   ├── layout.tsx          # ChatSidebar + ChatInterface
    │   │   ├── page.tsx            # Landing mit VicyOmnibar
    │   │   └── [threadId]/page.tsx # Thread-Detailansicht
    │   │
    │   ├── agents/
    │   │   ├── browse/page.tsx     # Agent-Katalog (Suche + Filter)
    │   │   ├── [id]/chat/page.tsx  # Agent-Chat mit Streaming
    │   │   ├── [id]/page.tsx       # Agent-Detail/Übersicht
    │   │   ├── [id]/configure/     # 6-Schritt Konfigurations-Wizard
    │   │   ├── property-sentinel/  # Immobilien-Agent (Agent 39)
    │   │   └── marketplace/        # Agent-Marktplatz
    │   │
    │   ├── pipelines/
    │   │   ├── layout.tsx          # PipelineSidebar + Hauptbereich
    │   │   ├── page.tsx            # Landing mit Wizard-Trigger
    │   │   ├── [id]/page.tsx       # Pipeline-Cockpit (Live-Ausführung)
    │   │   └── [id]/editor/page.tsx # Visueller Pipeline-Editor
    │   │
    │   ├── studio/page.tsx         # Workflow-Studio (immersiv)
    │   └── brain/page.tsx          # Wissens-Dashboard
    │
    ├── (next)/                     # Vicy v4 Layout-Gruppe
    │   └── v4/page.tsx             # Omnibar-zentriertes Interface
    │
    └── settings/
        ├── layout.tsx              # Minimal-Layout mit Zurück-Navigation
        ├── page.tsx                # Allgemeine Einstellungen
        ├── integrations/           # Gmail, Slack, etc.
        └── workspaces/             # Workspace-Verwaltung
```

### 2.2 Layout-Hierarchie & Provider-Verschachtelung

```
RootLayout
  └─ Providers (QueryClient, Theme, Session, Toast, Shortcuts)
      └─ ErrorBoundary
          └─ AppLayout (WorkspaceProvider)
              └─ DashboardLayout (ShellProvider, InboxSocket)
                  ├─ VicySidebar (56px Icon-Rail)
                  ├─ CommandPalette (Cmd+K)
                  └─ <main> (Children)
                      ├─ InboxLayout (ChatSidebar + ChatInterface)
                      ├─ PipelineLayout (PipelineSidebar + Canvas)
                      └─ SettingsLayout (BackNav + Inhalt)
```

### 2.3 State Management (Zustand Stores)

| Store | Datei | Verantwortung |
|-------|-------|---------------|
| **useSession** | `store/session.ts` | Auth-State (user, isLoading, isAuthenticated) |
| **useDashboardStore** | `store/useDashboardStore.ts` | Dashboard-Gesamtstate (105KB, mehrere Slices) |
| **usePipelineStore** | `components/pipelines/store/usePipelineStore.ts` | Pipeline-Editor, Ausführung, Debug, Validierung |
| **useInboxStore** | `lib/stores/useInboxStore.ts` | Inbox-UI (Sidebar, Artifact-Panel, Routing-Feedback) |
| **sentinelStore** | `store/sentinelStore.ts` | Property Sentinel (Profile, Listings) |
| **chatStore** | `store/chatStore.ts` | Chat-Nachrichten, Threads, Streaming-Status |

**Middleware-Stack:** `devtools` + `subscribeWithSelector` + `persist` (localStorage)

### 2.4 Design-System

**Ansatz:** Tailwind CSS + CSS Custom Properties + Vicy Theme

```
Themes:
├── Light Mode  → Slate/Indigo Palette
├── Dark Mode   → Tiefe Grautöne, leuchtende Akzente
└── Vicy Theme  → Schwarz (#0a0c14) + Violett (#8b5cf6)
    ├── --vicy-bg: rgba(10, 12, 20, 0.98)
    ├── --vicy-border: rgba(255, 255, 255, 0.06)
    └── Glasmorphismus + Mesh-Gradienten
```

**UI-Komponenten:** Shadcn/ui (50+ Primitives) + Custom Components

### 2.5 Navigation

**VicySidebar** (Icon-Rail, 56px):
| Icon | Route | Titel |
|------|-------|-------|
| Inbox | `/inbox` | Zentrale |
| Compass | `/agents/browse` | Agenten |
| Workflow | `/studio` | Studio |
| GitBranch | `/pipelines` | Pipelines |
| Brain | `/brain` | Wissen |
| Settings | `/settings` | Einstellungen |

**CommandPalette** (Cmd/Ctrl+K): Fuzzy-Suche über Navigation, Aktionen, Hilfe

**Immersive Routen** (kein Padding, overflow: hidden):
`/inbox`, `/agents/integrations`, `/agents/property-sentinel`, `/studio`, `/pipelines`

---

## 3. Backend-Architektur

### 3.1 Express-Server (Port 4000)

**Startup-Sequenz** (`server/index.ts`):
1. Umgebungsvariablen laden
2. Express + CORS + Security Headers
3. Alle API-Routen registrieren
4. Socket.IO initialisieren
5. Services starten:
   - AgentManager (15 Agenten)
   - ToolExecutorRegistry
   - JobQueueService (BullMQ)
   - AutomationScheduler
   - PredictionScheduler (Brain AI)
   - WorkflowCleanupWorker
   - LogRetentionWorker

### 3.2 Express-Routen (`server/routes/`)

**Kern-Routen:**
| Bereich | Route | Funktion |
|---------|-------|----------|
| Auth | `/api/auth-v2/*` | Login, Register, Token-Refresh, OAuth |
| Agenten | `/api/unified-agents/*` | Agent-CRUD, einheitliches Interface |
| Brain | `/api/brain/*` | Kontextspeicher, RAG, prädiktive Analyse |
| Workflows | `/api/workflows/*` | Pipeline-CRUD, Ausführung |
| Chat | `/api/chat/*` | Chat-Service mit Tool-Support |
| Multi-Agent | `/api/multi-agent/*` | Agent-Routing, Delegation |
| Teams | `/api/teams/*` | Team-basierte Orchestrierung |
| Custom Tools | `/api/custom-tools/*` | Benutzerdefinierte Tools |
| Integrationen | `/api/integrations/*` | OAuth (Gmail, Slack, Stripe) |
| DB-Connections | `/api/db-connections/*` | Externe Datenbank-Anbindungen |

**Admin-Routen:**
| Route | Funktion |
|-------|----------|
| `/admin/analytics/*` | Dashboard, Kosten, Nutzung |
| `/admin/prompts/*` | Prompt-Verwaltung mit Versionierung |
| `/admin/security/*` | Sicherheitsrichtlinien, Audit |
| `/admin/system/*` | Health-Check, System-Status |

### 3.3 Service-Architektur (`server/services/`)

```
server/services/
├── Agent-Management
│   ├── AgentManager.ts           # Singleton: 15 Agenten initialisieren
│   ├── AgentService.ts           # Agent-Lifecycle & Kommunikation
│   ├── AgentBuilderService.ts    # Custom Agent-Erstellung
│   ├── AgentMemoryService.ts     # pgvector Embedding-Speicher
│   └── AgentMetricsService.ts    # Performance-Tracking
│
├── AI & Reasoning
│   ├── UnifiedAIService.ts       # OpenAI Chat Completions
│   ├── RoutingService.ts         # Intent-basiertes Agent-Routing
│   ├── AITelemetryService.ts     # Kosten & Latenz (Fire-and-Forget)
│   └── AIAgentService.ts         # Kern-Agent-Ausführung
│
├── Brain AI
│   ├── BrainAI.ts                # Kontextspeicher, prädiktive Engine
│   ├── MemoryStoreV2.ts          # Memory-Persistenz
│   └── ContextSyncV2.ts          # Kontext-Synchronisation
│
├── Workflow & Automation
│   ├── workflow/
│   │   ├── WorkflowGenerator.ts  # AI-basierte Pipeline-Generierung
│   │   ├── WorkflowValidator.ts  # Validierung + HPA-Injektion
│   │   └── PipelineModifier.ts   # Runtime-Pipeline-Updates
│   ├── ActionExecutorService.ts  # Aktionsausführung mit HITL
│   └── AutomationScheduler.ts    # Geplante Automatisierungen
│
├── Tools & Integration
│   ├── CustomToolRegistry.ts     # Tool-Verwaltung
│   ├── ToolExecutorRegistry.ts   # Tool-Ausführung
│   └── APIConnectorService.ts    # REST-API-Anbindungen
│
├── Kosten & Budget
│   ├── CostTrackingService.ts    # Kosten-Aggregation
│   ├── BudgetService.ts          # Budget-Verwaltung
│   └── CostOptimizationService.ts # Kosten-Analyse
│
└── Background Workers
    ├── JobQueueService.ts        # BullMQ-Queue
    ├── WorkflowCleanupWorker.ts  # Zombie-Erkennung
    └── LogRetentionWorker.ts     # Log-Bereinigung (7-90 Tage)
```

---

## 4. AI-Agent-System

### 4.1 Agent-Übersicht (17 + 6 Agenten)

#### Kern-Agenten (17 integriert)

| ID | Name | Rolle | Kategorie | Farbe | Tools |
|----|------|-------|-----------|-------|-------|
| dexter | Dexter | Financial Analyst & Data Expert | Data | #3B82F6 | data-export, analyze-trends, spreadsheet-update |
| cassie | Cassie | Customer Support | Support | #10B981 | hubspot-create-contact, hubspot-update-deal |
| emmie | Emmie | Email Manager | Operations | #8B5CF6 | gmail_search, gmail_send, gmail_reply (13+ Tools) |
| aura | Aura | Brand Strategist | Marketing | #EC4899 | create-brand-audit, schedule-campaign |
| kai | Kai | Code Assistant | Technical | #10B981 | code-review, debug-code, suggest-refactor |
| lex | Lex | Legal Advisor | Operations | #64748B | analyze_contract, generate_legal_doc |
| finn | Finn | Finance Expert | Data | #059669 | forecast-cash-flow, optimize-budget |
| nova | Nova | Research & Insights | Data | #06B6D4 | web-search, competitive-analysis |
| vince | Vince | Video Producer | Motion | #F97316 | create-concept, generate-storyboard |
| milo | Milo | Motion Designer | Motion | #A855F7 | create-animation, design-transition |
| ari | Ari | AI Automation Specialist | AI & Auto | #6366F1 | create-automation, schedule-workflow |
| vera | Vera | Security & Compliance | Operations | #DC2626 | security-audit, risk-assessment |
| echo | Echo | Voice & Audio Assistant | Creative | #0EA5E9 | transcribe-audio, generate-podcast |
| omni | Omni | Multi-Agent Orchestrator | AI & Auto | #7C3AED | delegate_to_agent, decompose_task, synthesize_results |
| buddy | Buddy | Financial Intelligence | Data & Analytics | #F59E0B | get_wallet_status, get_spending_analysis |
| tenant-communicator | Tenant Comm. | Mieterkommunikation | Operations | #047857 | notice_generator, deadline_calculator |
| property-sentinel | Property Sentinel | Immobilien-Überwachung | Data & Analytics | #92400E | search_manager, market_radar, deal_qualifier |

#### Radikale Agenten (6 Bonus-Persönlichkeiten)

| ID | Name | Motto | Stil |
|----|------|-------|------|
| CHAOS | Chaos | "Ordnung ist der Feind der Innovation" | Disruptiv |
| APEX | Apex | "Gut genug ist nicht gut genug" | Perfektionistisch |
| REBEL | Rebel | "Warum akzeptierst du das?" | Hinterfragend |
| PHOENIX | Phoenix | "Aus der Asche entstehen Revolutionen" | Transformativ |
| ORACLE | Oracle | "Ich sage dir, was niemand sonst sagt" | Brutal ehrlich |
| TITAN | Titan | "Emotionen sind Störgeräusche" | Hyperlogisch |

### 4.2 Agent-Prompt-System

**Datei:** `lib/agents/prompts.ts` (1.112 Zeilen)

```typescript
export async function getAgentSystemPrompt(
  agent: AgentPersona,
  userId?: string
): Promise<string>
```

**Prompt-Generierung (Priorität):**
1. Custom-Prompts aus Datenbank prüfen (benutzerdefiniert)
2. Agent-spezifischen System-Prompt laden (13 Agenten haben Detailprompts)
3. Spezialbhandlung: Emmie bekommt Gmail-Kontext, Buddy bekommt Finanz-Additions
4. Memory-Enhancement: `enhancePromptWithMemory()` fügt vergangene Interaktionen hinzu
5. Fallback: Generischer Prompt aus Persona-Daten

### 4.3 Tool-System

**Verzeichnisstruktur pro Agent:**
```
lib/agents/{agent-name}/tools/
├── {agent-name}-tools.ts    # OpenAI Tool-Definitionen (JSON Schema)
├── tool-executor.ts         # Ausführungslogik
└── index.ts                 # Exports
```

**Tool-Ausführung:**
```typescript
async function executeTool(
  toolName: string,
  args: Record<string, any>,
  context: { userId: string; workspaceId?: string; sessionId?: string }
): Promise<ToolResult>
```

**Tool-Gating (Control Panel):**
| Kategorie | Beschreibung |
|-----------|-------------|
| `web_search` | Externe Websuche |
| `email_access` | Gmail-Integration |
| `database_read` | Datenbank-Leseoperationen |
| `database_write` | Datenbank-Schreiboperationen |
| `code_execution` | Code-Interpreter |
| `file_access` | Dokument-/PDF-Zugriff |

Jedes Tool wird nur ausgeführt, wenn es im Control Panel aktiviert ist.

### 4.4 Omni-Orchestrator (Multi-Agent-System)

**Aufgaben:**
1. **delegate_to_agent** — Delegiert Aufgaben an Spezial-Agenten
2. **decompose_task** — Zerlegt komplexe Aufgaben in Teilaufgaben
3. **synthesize_results** — Kombiniert Ergebnisse mehrerer Agenten
4. **search_agent_memories** — Durchsucht agentenübergreifende Erinnerungen

**Orchestrierungsmuster:**
```
User: "Analysiere Q4-Umsätze, erstelle einen Vertrag und plane Marketing"
  ↓
Omni.decompose_task()
  ├─ Teilaufgabe 1: "Q4-Analyse" → DEXTER (analyze-trends)
  ├─ Teilaufgabe 2: "Vertragsentwurf" → LEX (generate_legal_doc)
  └─ Teilaufgabe 3: "Marketing-Strategie" → AURA (create-brand-audit)
  ↓
Omni.synthesize_results()
  └─ Vereinheitlichte Antwort
```

### 4.5 Agent-Chat-Flow (Komplett)

```
┌──────────── FRONTEND ─────────────┐
│ User tippt Nachricht               │
│ → ChatComposer.tsx (Enter/Button)  │
│ → fetch POST /api/agents/{id}/chat │
│ → SSE-Stream lesen & rendern       │
└────────────┬───────────────────────┘
             │
┌────────────▼────────────── API ROUTE ─────────────────────────┐
│ app/api/agents/[id]/chat/route.ts (1.048 Zeilen)              │
│                                                                │
│  1. Auth-Validierung (JWT)                                     │
│  2. Input-Validierung (Zod)                                    │
│  3. Prompt-Injection-Schutz (sanitizeInput)                    │
│  4. Rate-Limit-Prüfung                                        │
│  5. Budget-Prüfung (Token-Schätzung)                          │
│  6. Konversationsverlauf laden (letzte 10 Nachrichten)         │
│  7. Memory-Kontext abrufen (pgvector semantische Suche)        │
│  8. Agent-Typ bestimmen (agentic vs. standard)                 │
│  9. Tool-Auswahl & Gating (Control Panel)                      │
│ 10. SSE-Stream starten                                         │
│ 11. In Datenbank speichern                                     │
│ 12. Nutzung & Kosten tracken                                   │
└────────────────────────────────────────────────────────────────┘
```

**SSE-Events:**
| Event | Payload | Beschreibung |
|-------|---------|-------------|
| `chunk` | `{ chunk: "..." }` | Text-Token (streaming) |
| `toolCall` | `{ id, tool, args, result }` | Tool-Ausführung |
| `confirmationRequired` | `{ actionId, tool, description }` | HITL-Bestätigung nötig |
| `done` | `{ metrics: { tokens, costUsd, latencyMs } }` | Stream abgeschlossen |
| `error` | `{ error, type }` | Fehler aufgetreten |

### 4.6 Agent-Memory (pgvector)

```sql
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY,
  agent_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  memory TEXT NOT NULL,
  embedding vector(1536),        -- OpenAI Ada Embeddings
  memory_type VARCHAR(50),       -- 'conversation', 'preference', 'tool_result'
  tags JSONB,                    -- Durchsuchbare Tags
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- IVFFlat-Index für schnelle Vektorsuche
CREATE INDEX ON agent_memories USING ivfflat (embedding vector_cosine_ops);
```

**Automatische Speicherung:**
- Nach jeder Antwort > 100 Zeichen → Konversations-Insight speichern
- Tool-Ergebnisse → mit Tool-Name, Args, Erfolg loggen
- User-Präferenzen → aus Feedback extrahieren

**Abruf:**
- Top-5 semantisch ähnliche Erinnerungen vor jeder Antwort
- Gefiltert nach agent_id + userId
- Relevanz-Score + Access-Count für Ranking

---

## 5. Pipeline/Workflow-System

### 5.1 Überblick

Das Pipeline-System ermöglicht die visuelle Erstellung und Ausführung von Automatisierungs-Workflows mit AI-Agenten, Human-in-the-Loop-Genehmigungen und Echtzeit-Monitoring.

### 5.2 Pipeline-Store (Zustand)

**Datei:** `components/pipelines/store/usePipelineStore.ts`

**State-Bereiche:**

| Bereich | Felder | Beschreibung |
|---------|--------|-------------|
| Kern | pipelineId, nodes, edges, viewport, pipelineName, isDirty | Pipeline-Definition |
| Ausführung | executionId, isRunning, nodeStatus, nodeOutputs, executionError | Live-Ausführung |
| Debug | selectedRunId, runTrace, currentRun, runSummary, isDebugMode | Flight Recorder |
| Loop | selectedIteration, loopGroupData | Schleifen-Iteration |
| UI | templateDialogOpen, showExecutionPanel, showApprovalBar | UI-State |
| Validierung | lastConnectionError, workflowValidation | Verbindungsvalidierung |

**Node-Status-Typen:** `'pending' | 'running' | 'success' | 'error' | 'suspended' | 'skipped' | 'retrying' | 'continued'`

### 5.3 Pipeline-Editor

**Komponenten-Aufbau:**

```
PipelineEditor (Hauptcontainer)
├── ReactFlowProvider
│   └── PipelineEditorInner
│       ├── PipelineSidebar        # Komponentenbibliothek (links, ein-/ausblendbar)
│       ├── PipelineCanvas         # React Flow Canvas (Mitte)
│       │   ├── CustomNode         # Node-Renderer (Agenten, Trigger, Aktionen)
│       │   └── CustomEdge         # Kanten-Renderer
│       ├── PipelineToolbar        # Schwebendes Pill-Menü (Ausführen, Stopp, Speichern)
│       ├── NodeInspector          # Node-Konfiguration (rechts, kontextsensitiv)
│       ├── LiveExecutionSidebar   # Echtzeit-Logs (rechts, während Ausführung)
│       ├── ApprovalBar            # Genehmigungs-Leiste (unten)
│       ├── TriggerConfigPanel     # Trigger-Konfiguration (rechts)
│       └── TemplateGallery        # Template-Auswahl (Portal/Modal)
```

**Unterstützte Node-Typen:**

| Kategorie | Typen |
|-----------|-------|
| Trigger | Webhook, Schedule, Manual |
| Agenten | Dexter, Emmie, Cassie, Kai, Finn, Lex (mit individuellen Farben/Icons) |
| Aktionen | HTTP Request, Email, Database, Code, Slack, HubSpot |
| Logik | If/Else Condition, Filter |
| Spezial | Human Approval, Delay, Transform |

**Drag & Drop:** Sidebar → `dataTransfer.setData('application/reactflow', JSON)` → Canvas empfängt und erstellt Node

### 5.4 Pipeline-Cockpit (Live-Ausführung)

```
Pipeline-Cockpit ([id]/page.tsx)
├── CockpitCanvas              # Nur-Lese-Visualisierung
│   ├── Aktiver Node → Violettes Glühen
│   ├── Abgeschlossene Kanten → Grün animiert
│   └── Laufende Kanten → Violett fließend
├── CockpitSidebar             # Metadaten + Zusammenfassung
├── ActionDeck                 # Tinder-artige Swipe-Karten für Genehmigungen
│   ├── Rechts wischen → Genehmigen
│   ├── Links wischen → Ablehnen
│   └── Schwellenwert: 150px Drag-Distanz
├── GovernancePanel            # 3-Modi Governance
│   ├── Manuell (alle Genehmigungen manuell)
│   ├── KI-Assistiert (auto > 80%, auto-reject < 20%)
│   └── Autopilot (auto > 60%, auto-reject < 40%)
├── LivePulse                  # Animierter Heartbeat
├── AuditTrailPanel            # Chronologisches Audit-Log
├── TrainerMode                # Lernmodus mit Erklärungen
├── EmergencyStopButton        # Notfall-Stopp
└── ReasoningCard              # KI-Begründung + Konfidenz
```

### 5.5 Pipeline-Wizard (3-Schritt-Consultant-Flow)

**Schritt 1: PersonaStep** — Geschäftstyp wählen:
| Persona | Beispiel |
|---------|---------|
| Handwerksbetrieb | Lead-Nachverfolgung, Terminplanung |
| Immobilien | Lead-Qualifizierung, Objektverwaltung |
| Coach & Consultant | Onboarding, Content-Distribution |
| E-Commerce | Kundensupport, Bestellverarbeitung |
| Agentur | Projektmanagement, Reporting |
| Individuell | Freitext-Eingabe |

**Schritt 2: PainPointStep** — Schmerzpunkte auswählen (Multi-Select):
- Kategorien: Prozess, Vertrieb, Kunde, Daten, Kosten
- Jeder Schmerzpunkt hat Agent-Empfehlungen

**Schritt 3: StrategyStep** — KI generiert 3 maßgeschneiderte Strategien:
- Titel + Beschreibung
- Benötigte Agenten/Tools
- Geschätzte Kosten & Implementierungszeit
- Risikostufe

**Smart-Entry:** Bei > 15 Zeichen automatische Prompt-Analyse → überspringt Schritte

### 5.6 Pipeline-API-Endpunkte

| Endpunkt | Methode | Funktion |
|----------|---------|----------|
| `/api/pipelines` | GET | Alle Pipelines auflisten (Filter: status, limit, offset) |
| `/api/pipelines` | POST | Neue Pipeline erstellen |
| `/api/pipelines/{id}` | GET | Einzelne Pipeline laden |
| `/api/pipelines/{id}` | POST | Pipeline aktualisieren (Nodes, Edges, Name) |
| `/api/pipelines/{id}` | DELETE | Soft-Delete (status → 'archived') |
| `/api/pipelines/{id}/execute` | POST | Async-Ausführung (BullMQ, 202 Accepted) |
| `/api/pipelines/{id}/approve` | POST | HITL-Genehmigung/Ablehnung |
| `/api/pipelines/{id}/force-stop` | POST | Notfall-Stopp |
| `/api/pipelines/{id}/pause` | POST | Pause/Fortsetzen |
| `/api/pipelines/{id}/versions` | GET | Versionshistorie |
| `/api/pipelines/{id}/versions/restore` | POST | Version wiederherstellen |
| `/api/pipelines/generate` | POST | KI-Pipeline-Generierung (Persona + Schmerzpunkte) |
| `/api/pipelines/generate-strategy` | POST | Strategie-Vorschläge generieren |
| `/api/pipelines/analyze-prompt` | POST | Smart-Entry Prompt-Analyse |
| `/api/pipelines/templates` | GET | Template-Bibliothek |
| `/api/pipelines/templates/clone` | POST | Template klonen |

### 5.7 Workflow-Services (Server-seitig)

**WorkflowGenerator:** Empfängt User-Prompt → Sendet an OpenAI → Validiert JSON → Gibt React-Flow-kompatible Nodes/Edges zurück

**WorkflowValidator:** Erkennt risikoreiche Aktionen (Email, CRM, DB-Schreibvorgänge) → Injiziert automatisch HumanApprovalNodes davor

**Beispiel Auto-Injektion:**
```
VORHER:  Trigger → Email senden
NACHHER: Trigger → [Freigabe: Email] → Email senden
```

---

## 6. Inbox & Messaging

### 6.1 Inbox-Architektur

**Zwei-Spalten-Layout:**
```
┌──────────────────────────────────────────────────────┐
│  ChatSidebar (w-72)  │       ChatInterface           │
│  ┌────────────────┐  │  ┌────────────────────────┐   │
│  │ Suche          │  │  │ Agent-Header            │   │
│  │ Thread-Liste   │  │  │ MessageStream           │   │
│  │  ├─ Heute      │  │  │  ├─ User-Nachricht     │   │
│  │  ├─ Gestern    │  │  │  ├─ Agent-Antwort      │   │
│  │  └─ Letzte 7T  │  │  │  ├─ Tool-Call-Display  │   │
│  │                │  │  │  ├─ DelegationCard      │   │
│  │ [+ Neuer Chat] │  │  │  └─ ArtifactPanel      │   │
│  └────────────────┘  │  │ StickyComposer          │   │
│                      │  └────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 6.2 Inbox-Komponenten

| Komponente | Funktion |
|------------|----------|
| **ChatSidebar** | Thread-Liste, Suche, Batch-Operationen, Kontextmenü |
| **ChatInterface** | Haupt-Chat mit Streaming, Artifacts, Emmie-Features |
| **MessageStream** | Nachrichten rendern, Auto-Scroll, Typing-Indicator |
| **StickyComposer** | Textarea (auto-expand), Senden-Button |
| **MessageBubble** | Rollenbasiertes Styling (User/Agent) |
| **ArtifactPanel** | Code-/Dokument-Viewer (auto-öffnet bei neuen Artifacts) |
| **DelegationCard** | Sub-Agent-Status in Swarm-Modus |
| **NewChatModal** | Agent-Browser für neue Konversation |

### 6.3 Emmie Email-Agent

**Spezial-Komponenten:**
| Komponente | Funktion |
|------------|----------|
| EmailComposer | E-Mails verfassen mit KI-Verbesserung |
| EmmieTemplatePicker | Vorgefertigte E-Mail-Templates |
| InboxDashboard | Stats (ungelesen, markiert, wichtig) |
| EmailAnalytics | Top-Kontakte, Newsletter-Cleanup |
| EmmieCapabilityBar | Schnellzugriff (Verfassen, Templates, Dashboard) |

**Gmail-Tools:** `gmail_search`, `gmail_send`, `gmail_reply`, `gmail_archive`, `gmail_list_inbox` (13+ Tools)

### 6.4 Inbox-API

| Endpunkt | Methode | Funktion |
|----------|---------|----------|
| `/threads` | GET/POST | Threads auflisten/erstellen (Cursor-Pagination) |
| `/threads/{id}` | GET/PATCH/DELETE | Thread-Detail, Archivieren, Löschen |
| `/threads/{id}/messages` | GET/POST | Nachrichten abrufen/senden |
| `/threads/{id}/mark-read` | POST | Als gelesen markieren |
| `/artifacts/{id}` | GET/PUT/DELETE | Code-Artifacts verwalten |
| `/approvals/{id}/approve` | POST | HITL-Genehmigung |
| `/inbox/gmail/status` | GET | Gmail-Sync-Status |

**Pagination:** Cursor-basiert (Timestamps), nicht Offset-basiert

### 6.5 Agent-Routing

**RoutingService** (`server/services/RoutingService.ts`):
```
User-Nachricht → gpt-4o-mini Intent-Klassifikation → Agent-Auswahl
```

| Keyword-Bereich | Ziel-Agent |
|-----------------|-----------|
| Finanzen (Cashflow, ROI, P&L) | Dexter |
| Recht (Verträge, Compliance) | Lex |
| E-Mail | Emmie |
| Kundensupport (Tickets, FAQ) | Cassie |
| Code/Programmierung | Kai |
| Recherche/Marktanalyse | Nova |
| Automatisierung/Workflows | Ari |
| Sicherheit | Vera |
| Multi-Task/Unklar | Omni (Fallback) |

**Caching:** 5 Minuten TTL für ähnliche Anfragen

---

## 7. Datenbank-Schicht

### 7.1 Technologie

- **ORM:** Drizzle ORM
- **DB:** PostgreSQL mit pgvector-Extension
- **Primary Keys:** UUID (überall)
- **Embeddings:** 1536-dimensionale Vektoren (OpenAI Ada)

### 7.2 Schema-Übersicht

```
lib/db/
├── schema.ts                   # Users, Sessions, KnowledgeBases, KBEntries, KBChunks
├── schema-workflows.ts         # Workflows, WorkflowExecutions, WorkflowVersions
├── schema-inbox.ts             # InboxThreads, InboxMessages, ApprovalRequests, Artifacts
├── schema-agent-memory.ts      # AgentMemories (pgvector Embeddings)
├── schema-sentinel.ts          # SentinelSearchProfiles, SentinelSeenListings
├── schema-tenant-comms.ts      # Tenant Communication Logs
├── schema-agents.ts            # Agent-Definitionen, Capabilities
├── schema-custom-agents.ts     # Benutzerdefinierte Agenten
├── schema-custom-tools.ts      # Custom Tools & Execution Logs
├── schema-integrations*.ts     # OAuth-Verbindungen (Gmail, Slack)
├── schema-api-keys.ts          # API-Key-Verwaltung
├── schema-analytics.ts         # Analytics Events & Metriken
├── schema-admin-audit.ts       # Admin Audit Trails
├── schema-rbac.ts              # Role-Based Access Control
├── schema-teams.ts             # Team-Verwaltung
├── schema-prompts.ts           # Custom System-Prompts
└── schema-budget-enterprise.ts # Kosten-Tracking & Budgets
```

### 7.3 Kern-Tabellen

**`workflows`** (Pipelines):
```
id, userId, name, description, nodes (JSONB), edges (JSONB), viewport (JSONB),
status ('draft'|'active'|'archived'), isPublished, isTemplate,
version, executionCount, lastExecutedAt, createdAt, updatedAt
```

**`workflow_executions`**:
```
id, workflowId, status ('pending'|'running'|'success'|'error'|'suspended'),
startedAt, completedAt, error, isTest, createdAt
```

**`inbox_threads`**:
```
id, userId, workspaceId, subject, preview, agentId, agentName,
status ('active'|'suspended'|'completed'|'archived'),
priority ('low'|'medium'|'high'|'urgent'),
unreadCount, messageCount, lastMessageAt, createdAt
```

**`inbox_messages`**:
```
id, threadId, role ('user'|'agent'|'system'),
type ('text'|'approval_request'|'system_event'|'artifact'),
content, artifactId, isStreaming, metadata (JSONB), createdAt
```

**`agent_memories`**:
```
id, agentId, userId, memory, embedding (vector 1536),
memoryType, tags (JSONB), metadata (JSONB), createdAt
```

**`sentinel_search_profiles`**:
```
id, userId, name, locationFilters (JSONB), priceRange (JSONB),
portals (JSONB), scanIntervalMinutes, nextScanAt
```

**`sentinel_seen_listings`**:
```
id, profileId, portal, externalId,
UNIQUE(profileId, portal, externalId),  -- Dedup
title, url, price, aiScore, scoringReasoning
```

---

## 8. Authentifizierung & Sicherheit

### 8.1 Auth-Flow

```
Client-Request
  ↓
Middleware (middleware.ts, 352 Zeilen)
  ├─ Öffentliche Routen: /, /login, /register, /api/auth/*, /api/webhooks/*
  └─ Geschützte Routen → Session-Cookie prüfen
      ├─ Cookie vorhanden → JWT verifizieren → Weiterleiten
      └─ Cookie fehlt → Redirect zu /login?next=/pfad
```

### 8.2 Auth-Methoden

| Methode | Verwendung |
|---------|-----------|
| Session Cookie (`sintra.sid`) | Web-Frontend (primär) |
| JWT Bearer Token | API/Mobile |
| API Keys | Programmatischer Zugriff |
| OAuth 2.0 | Google, GitHub, Microsoft |
| WebAuthn/FIDO2 | Passwortlose Authentifizierung |
| 2FA/MFA | TOTP, SMS-Backup-Codes |

### 8.3 Security Headers

```
Content-Security-Policy: default-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 8.4 Rate-Limiting

- Allgemeine API: Konfigurierbar pro Route
- Login: Brute-Force-Schutz (loginLimiter)
- `/api/ask`: 5 Requests/Minute pro Client

---

## 9. Echtzeit-Kommunikation

### 9.1 Socket.IO-Architektur

**Server:** Express Backend (Port 4000)
```typescript
const io = new SocketIOServer(server, {
  cors: { origin: ['http://localhost:3000'] },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});
```

### 9.2 Event-Übersicht

**Workflow-Events:**
| Event | Richtung | Beschreibung |
|-------|----------|-------------|
| `workflow:started` | Server → Client | Ausführung begonnen |
| `workflow:step_started` | Server → Client | Schritt gestartet |
| `workflow:step_completed` | Server → Client | Schritt abgeschlossen |
| `workflow:step_failed` | Server → Client | Schritt fehlgeschlagen |
| `workflow:completed` | Server → Client | Workflow fertig |

**Inbox-Events:**
| Event | Richtung | Beschreibung |
|-------|----------|-------------|
| `message:new` | Server → Client | Neue Nachricht |
| `message:stream` | Server → Client | Streaming-Chunks |
| `thread:update` | Server → Client | Thread-Status geändert |
| `typing:start/stop` | Beide | Agent-Typing-Indicator |
| `agent:routed` | Server → Client | Agent gewechselt |
| `approval:update` | Server → Client | Genehmigung aufgelöst |

### 9.3 Client-Provider

**Datei:** `lib/socket/inbox-socket-provider.tsx` (501 Zeilen)

- **Singleton-Pattern** (verhindert Doppel-Verbindungen bei React Strict Mode)
- **200ms verzögertes Cleanup** (schützt vor Re-Mount-Problemen)
- **Auth:** JWT-Token via `getValidToken()`
- **Auto-Reconnect:** Bis 5 Versuche mit Backoff
- **React Query Auto-Invalidierung:** Socket-Events invalidieren Query-Cache

---

## 10. AI-Service-Layer

### 10.1 OpenAI-Service (`lib/ai/openai-service.ts`)

**Kern-Funktionen:**

```typescript
// Nicht-Streaming
generateAgentResponse(agent, message, history, model?, userId?)
  → { content, tokensUsed, tokensInput, tokensOutput, cost, model }

// Streaming (AsyncGenerator)
generateAgentResponseStream(agent, message, history, model?, ...)
  → yields string tokens

// Streaming mit Tool-Calling
streamWithTools({ systemPrompt, message, tools, toolExecutor, model, ... })
  → yields ToolCallEvents (text_chunk, tool_call_start, tool_call_result, done)
```

### 10.2 Modell-Konfiguration

| Modell | Verwendung | Besonderheiten |
|--------|-----------|----------------|
| gpt-5-mini | Primäres Agent-Modell (OPENAI_MODEL) | Kein custom temperature, max_completion_tokens |
| gpt-4o-mini | Routing-Service, schnelle Klassifikation | max_completion_tokens |
| gpt-4o | Property Sentinel Scoring | Unterstützt temperature |

**Wichtige Patterns:**
```typescript
// Token-Parameter
const key = model.includes('gpt-5') || model.includes('gpt-4o')
  ? 'max_completion_tokens' : 'max_tokens';

// Temperatur (gpt-5 unterstützt keine)
...(model.includes('gpt-5') ? {} : { temperature })

// Tool-Call-Erkennung (NIE nur finish_reason prüfen!)
if (choice.message.tool_calls?.length > 0) { /* tools vorhanden */ }
```

### 10.3 Telemetrie

```typescript
AITelemetryService.logTrace({
  provider: 'openai', model, requestType: 'chat',
  userId, agentId, promptTokens, completionTokens,
  responseTimeMs, status, metadata
}).catch(err => /* fire-and-forget */);
```

### 10.4 Kosten-Tracking

- Pro Nachricht: Input-Tokens + Output-Tokens → Kosten berechnen
- Pro User: Tägliche/monatliche Budgets
- Pro Workspace: Workspace-weite Limits
- Dashboard: Admin-Analytics mit CostTrendChart + LatencyChart

---

## 11. Spezial-Agenten

### 11.1 Property Sentinel (Agent 39)

**Zweck:** Immobilienmarkt-Überwachung mit automatischem Web-Scraping

**Konfiguration:**
- Max 5 Suchprofile pro User
- Max 50 Listings pro Scan
- Min 30 Minuten Scan-Intervall

**Unterstützte Portale:**
| Portal | Rendering |
|--------|----------|
| ImmobilienScout24 | JavaScript-Rendering (Firecrawl) |
| Immowelt | JavaScript-Rendering |
| eBay Kleinanzeigen | Standard |

**KI-Scoring (gpt-4o-mini):**
| Kriterium | Punkte |
|-----------|--------|
| Lage (Location Match) | 25 |
| Preis-Leistung | 25 |
| Rendite-Potenzial | 25 |
| Risiko-Bewertung | 25 |

**Red Flags (Abzüge):**
- Erbpacht: -15 | Sanierungsstau: -10 | Denkmalschutz: -10 | Schimmel: -8 | Lärmbelastung: -5

**Scan-Frequenzen:**
| Preset | Scans/Tag | Firecrawl-Credits/Tag |
|--------|-----------|----------------------|
| Stündlich | 24 | 240 |
| 6x Täglich | 6 | 60 |
| 3x Täglich | 3 | 30 |
| Täglich | 1 | 10 |

### 11.2 Tenant Communicator

**Zweck:** Mieterkommunikation für Immobilienverwaltung

**Tools:**
- `notice_generator` — Schreiben/Mieterhöhungen generieren
- `deadline_calculator` — Fristen berechnen
- `delivery_tracker` — Zustellungsnachverfolgung

### 11.3 Buddy (Financial Intelligence)

**Zweck:** Finanzübersicht und -optimierung

**Tools:**
- `get_wallet_status` — Kontostände
- `get_spending_analysis` — Ausgabenanalyse
- `check_forecast` — Cashflow-Prognose
- `propose_optimization` — Optimierungsvorschläge

**Spezial-Prompts:** `BUDDY_FINANCIAL_PROMPT_ADDITION` + `BUDDY_ACTION_PROMPT_ADDITION`

---

## 12. Settings & Konfiguration

### 12.1 Settings-Tabs

| Tab | Inhalt |
|-----|--------|
| Allgemein | App-Präferenzen |
| Integrationen | Gmail, Slack, Stripe anbinden |
| Persönlich | Name, Avatar, Profil |
| Sicherheit | Passwort, 2FA, Sessions |
| Präferenzen | Theme, Sprache, Benachrichtigungen |
| Datenschutz | Datennutzung, Analytics-Consent |
| API-Keys | Keys erstellen/verwalten |
| Passkeys | Passwortlose Auth |
| Workspaces | Multi-Workspace-Verwaltung |
| Audit | Aktivitäts-Log |
| System | Debug-Info, Cache leeren |
| Organisation | Team-Einstellungen |

### 12.2 Theme-System

3 Modi: Light, Dark, Vicy (Standard)
- `ThemeSelector` mit next-themes
- CSS Custom Properties für alle Farben
- Glasmorphismus-Effekte im Vicy-Theme

### 12.3 Workspace-System

**Datei:** `lib/contexts/workspace-context.tsx`

- Multi-Workspace-Support
- Default-Workspace als Fallback
- LocalStorage für aktive Workspace-ID
- CRUD-Operationen über `/api/workspaces`

---

## 13. Error-Handling

### 13.1 Error-Boundary-System

**ErrorBoundary** (`components/system/ErrorBoundary.tsx`, 488 Zeilen):

| Fehler-Typ | Erkennung | Aktion |
|------------|-----------|--------|
| Auth | 'token', '401', 'auth' | Stealth-Redirect zu /login |
| Network | 'fetch', 'connection' | Netzwerk-Fehler-UI |
| API | HTTP Status Codes | Retry-Vorschlag |
| Permission | '403', 'forbidden' | Berechtigungs-Hinweis |
| Validation | 'validation', 'invalid' | Eingabe-Korrektur |
| Server | '500', 'server' | Technischer Fehler |
| Component | React Component Stack | Fallback-UI |

**Recovery-Strategien:** Retry, Reload, Cache leeren, Zurück, Home

### 13.2 App-weite Error-Pages

- `app/error.tsx` — Root Error Boundary (Auth-Redirect)
- `app/(app)/error.tsx` — App-Level Error
- `app/(app)/(classic)/agents/error.tsx` — Agenten-spezifisch

---

## 14. Datenfluss-Diagramme

### 14.1 Agent-Chat (Komplett)

```
User tippt Nachricht
      │
      ▼
ChatComposer (Enter)
      │
      ▼
fetch POST /api/agents/{id}/chat ──────────────────────┐
      │                                                 │
      ▼                                                 ▼
  Frontend wartet auf SSE            API Route verarbeitet:
  setStreamingMessage(chunk)         1. Auth + Rate Limit
      │                              2. Letzte 10 Nachrichten laden
      │                              3. pgvector Memory-Suche (Top-5)
      │                              4. System-Prompt + Memory-Enhancement
      │                              5. Tool-Auswahl & Gating
      │                              6. OpenAI Stream starten
      │                                     │
      │                   ┌─────────────────┤
      │                   ▼                 ▼
      │            Text-Chunks         Tool-Calls
      │            { chunk: "..." }    { toolCall: {...} }
      │                   │                 │
      │                   │            Tool-Executor
      │                   │            (90s Timeout)
      │                   │                 │
      │                   │            Ergebnis → Zurück an OpenAI
      │                   │                 │
      │                   ▼                 │
      │              SSE-Stream ◄───────────┘
      │                   │
      ▼                   ▼
 MessageStream       { done: true, metrics }
 rendert live            │
      │                  ▼
      │           In DB speichern
      │           Telemetrie loggen
      │           Memory auto-speichern
      ▼
 Fertige Nachricht anzeigen
```

### 14.2 Pipeline-Ausführung

```
User klickt "Ausführen"
      │
      ▼
POST /api/pipelines/{id}/execute
      │
      ▼
BullMQ Job einreihen ──► 202 Accepted + executionId
      │
      ▼
WorkflowEngine verarbeitet Nodes sequentiell:
      │
      ├─ Node A (Trigger) → Auslösen
      │   └─ Socket: workflow:step_completed
      │
      ├─ Node B (Agent) → OpenAI-Call mit Tools
      │   ├─ Socket: workflow:step_started
      │   ├─ Tool-Ausführung (ggf. mehrfach)
      │   └─ Socket: workflow:step_completed
      │
      ├─ Node C (HumanApproval) → Pausiert!
      │   ├─ Socket: approval_needed
      │   ├─ ActionDeck zeigt Swipe-Karte
      │   ├─ User wischt rechts → POST /approve
      │   └─ Fortsetzen nach Genehmigung
      │
      ├─ Node D (Email senden) → Aktion ausführen
      │   └─ Socket: workflow:step_completed
      │
      └─ FERTIG
          └─ Socket: workflow:completed
```

### 14.3 Inbox-Echtzeit

```
User sendet Nachricht
      │
      ▼
POST /threads/{id}/messages
      │
      ▼
Express Backend:
  1. Nachricht in inbox_messages speichern
  2. RoutingService → Besten Agent wählen
  3. Agent-Chat aufrufen (Stream)
  4. Socket.IO Broadcast:
     ├─ typing:start → Client
     ├─ message:stream (Chunks) → Client
     └─ message:new (Fertig) → Client
      │
      ▼
Client-Socket-Listener:
  → React Query invalidieren
  → MessageStream re-rendert
  → Auto-Scroll nach unten
  → Typing-Indicator (5s Auto-Clear)
```

---

## 15. Technologie-Stack

### 15.1 Vollständiger Stack

| Schicht | Technologie |
|---------|-------------|
| **Frontend Framework** | Next.js 14 (App Router, RSC) |
| **UI Library** | React 18 |
| **Sprache** | TypeScript |
| **Styling** | Tailwind CSS + CSS Custom Properties |
| **UI Components** | Shadcn/ui (50+ Primitives) |
| **State Management** | Zustand v5 (mit persist, devtools, useShallow) |
| **Data Fetching** | React Query (TanStack Query) |
| **Visual Editor** | React Flow (@xyflow/react) |
| **Animationen** | Framer Motion |
| **Icons** | Lucide React |
| **Toasts** | Sonner |
| **Backend Framework** | Express.js |
| **Datenbank** | PostgreSQL + pgvector |
| **ORM** | Drizzle ORM |
| **Echtzeit** | Socket.IO |
| **Job Queue** | BullMQ (Redis) |
| **AI Provider** | OpenAI (gpt-5-mini, gpt-4o-mini, gpt-4o) |
| **Web Scraping** | Firecrawl API |
| **Auth** | JWT + Session Cookies + OAuth 2.0 + WebAuthn |
| **Theme** | next-themes |

### 15.2 Umgebungsvariablen (Kritisch)

```env
# AI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini
OPENAI_MAX_TOKENS=4096

# Datenbank
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Auth
JWT_SECRET=...
AUTH_COOKIE_NAME=sintra.sid

# Server
BACKEND_PORT=4000
FRONTEND_URL=http://localhost:3000

# Integrationen
FIRECRAWL_API_KEY=fc-...  (Property Sentinel)
```

### 15.3 Projektstruktur

```
AIAgentwebapp/
├── app/                    # Next.js App Router (Seiten + API-Routen)
│   ├── (app)/              # Geschützte App-Routen
│   ├── api/                # Next.js API-Endpunkte
│   └── login/register/     # Auth-Seiten
│
├── components/             # React-Komponenten
│   ├── agents/             # Agent-Chat & Verwaltung
│   ├── pipelines/          # Pipeline-Editor, Cockpit, Wizard
│   │   ├── editor/         # Canvas, Nodes, Toolbar
│   │   ├── cockpit/        # Live-Ausführung, Governance
│   │   ├── wizard/         # 3-Schritt-Consultant-Flow
│   │   ├── studio/         # Execution Inspector
│   │   └── store/          # usePipelineStore (Zustand)
│   ├── inbox/              # Inbox-Komponenten
│   │   └── emmie/          # Email-Manager-UI
│   ├── vicy/               # Vicy Shell (Sidebar, Omnibar)
│   ├── brain/              # Knowledge-System (45+ Komponenten)
│   ├── settings/           # Settings-UI
│   ├── shell/              # App-Shell (Context, Shortcuts)
│   ├── system/             # ErrorBoundary, WhiteScreenPrevention
│   ├── admin/              # Admin-Dashboard
│   └── ui/                 # Shadcn/ui Primitives
│
├── lib/                    # Shared Bibliotheken
│   ├── agents/             # Agent-Definitionen, Prompts, Tools
│   │   ├── {agent}/tools/  # Pro-Agent Tool-Definitionen
│   │   ├── personas.ts     # 17 Agent-Persona-Definitionen
│   │   ├── prompts.ts      # System-Prompt-Generator
│   │   └── agent-loader.ts # Unified Agent Loader
│   ├── ai/                 # OpenAI-Service (Streaming, Tools, Retry)
│   ├── db/                 # Drizzle Schemas (15+ Schema-Dateien)
│   ├── auth/               # JWT, Session, OAuth, WebAuthn
│   ├── design/             # Design Tokens
│   ├── contexts/           # React Contexts (Workspace)
│   ├── hooks/              # Custom Hooks (useInbox, etc.)
│   ├── socket/             # Socket.IO Client-Provider
│   ├── pipelines/          # Business-Personas, Pain-Points
│   └── stores/             # Zustand Stores (Inbox)
│
├── server/                 # Express Backend
│   ├── index.ts            # Server-Startup
│   ├── routes/             # 30+ Route-Dateien
│   ├── services/           # 40+ Service-Dateien
│   │   └── workflow/       # WorkflowGenerator, Validator, Modifier
│   ├── middleware/          # Auth, Rate-Limit, RBAC
│   └── utils/              # JWT, Helpers
│
├── store/                  # Frontend Zustand Stores
├── middleware.ts            # Next.js Edge Middleware (Auth, CSP)
└── project-planning/       # Architektur-Dokumentation
```

---

## Zusammenfassung

Das **Flowent AI Agent System** ist eine produktionsreife Multi-Agent-Plattform mit:

- **17 spezialisierte KI-Agenten** + 6 radikale Bonus-Persönlichkeiten
- **Visueller Pipeline-Editor** mit Drag & Drop, Live-Ausführung und Governance
- **Echtzeit-Messaging** über Socket.IO mit Streaming-Antworten
- **Human-in-the-Loop** Genehmigungen mit Swipe-basiertem ActionDeck
- **Semantische Erinnerungen** via pgvector für kontextbewusste Antworten
- **Multi-Agent-Orchestrierung** durch Omni mit Aufgaben-Zerlegung und Synthese
- **Property Sentinel** für automatische Immobilienmarkt-Überwachung
- **Gmail-Integration** über Emmie mit 13+ E-Mail-Tools
- **Enterprise-Features:** Kosten-Tracking, RBAC, Audit-Trails, Soft-Deletes, Versionierung
- **Robuste Infrastruktur:** PostgreSQL + pgvector, BullMQ Jobs, Retry-Logik, Error Recovery
