# Flowent AI Agent System - Umfassende Architektur-Analyse

**Datum:** Januar 2026
**Version:** 3.0.0
**Status:** Production-Ready Enterprise Platform

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Projekt-Übersicht](#2-projekt-übersicht)
3. [Backend-Architektur](#3-backend-architektur)
4. [Frontend-Architektur](#4-frontend-architektur)
5. [Datenbank & Persistenz](#5-datenbank--persistenz)
6. [AI-Agent-System](#6-ai-agent-system)
7. [Brain AI (RAG-Engine)](#7-brain-ai-rag-engine)
8. [Sicherheits-Architektur](#8-sicherheits-architektur)
9. [Integration-System](#9-integration-system)
10. [Real-Time & Streaming](#10-real-time--streaming)
11. [Performance & Skalierung](#11-performance--skalierung)
12. [Deployment & DevOps](#12-deployment--devops)
13. [Funktionalitäts-Matrix](#13-funktionalitäts-matrix)
14. [Architektur-Entscheidungen](#14-architektur-entscheidungen)
15. [Empfehlungen & Roadmap](#15-empfehlungen--roadmap)

---

## 1. Executive Summary

### Was ist Flowent AI?

Flowent AI ist eine **Enterprise-Grade Multi-Agent AI-Plattform**, die es Unternehmen ermöglicht:

- **15 spezialisierte AI-Agenten** für verschiedene Geschäftsbereiche einzusetzen
- **Visuelle Workflow-Automatisierung** mit Node-basiertem Pipeline-Editor
- **RAG-basierte Wissensverwaltung** mit semantischer Suche
- **Echtzeit-Kommunikation** mit Streaming-Responses
- **Enterprise-Security** mit MFA, RBAC und Audit-Logging

### Technologie-Stack

| Schicht | Technologie |
|---------|-------------|
| **Frontend** | Next.js 14.2, React 18.3, TypeScript 5.7 |
| **Backend** | Express.js 4.21, Node.js 20+ |
| **Datenbank** | PostgreSQL 16 + pgvector, Redis 7+ |
| **AI/ML** | OpenAI GPT-4, Anthropic Claude, Google Gemini |
| **Real-Time** | Socket.IO 4.8, Server-Sent Events |
| **ORM** | Drizzle ORM 0.41, Prisma 7.2 |

### Ports & Services

| Service | Port | Beschreibung |
|---------|------|--------------|
| Frontend (Next.js) | 3000 | React-Anwendung |
| Backend (Express) | 4000 | API-Server |
| PostgreSQL | 5432 | Primäre Datenbank |
| Redis | 6379 | Cache & Sessions |
| WebSocket | 4000 | Real-Time Events |

---

## 2. Projekt-Übersicht

### Verzeichnisstruktur

```
AIAgentwebapp/
├── app/                          # Next.js 14 App Router
│   ├── (app)/                    # Geschützte Routes mit Shell
│   │   ├── (dashboard)/          # Dashboard-Bereich
│   │   │   ├── dashboard/        # Haupt-Dashboard
│   │   │   ├── agents/           # Agent-Verwaltung
│   │   │   ├── brain/            # Brain AI System
│   │   │   ├── pipelines/        # Pipeline Studio
│   │   │   ├── workflows/        # Workflow-Editor
│   │   │   ├── budget/           # Budget-Tracking
│   │   │   ├── analytics/        # System-Analytics
│   │   │   ├── admin/            # Admin-Panel
│   │   │   ├── settings/         # Einstellungen
│   │   │   ├── integrations/     # Integrationen
│   │   │   └── knowledge/        # Wissensdatenbank
│   │   └── inbox/                # Inbox-System
│   ├── (fullscreen)/             # Vollbild-Layouts
│   │   └── studio/               # Visual Pipeline Studio
│   ├── api/                      # API-Routes (50+ Endpoints)
│   └── login/, register/         # Auth-Seiten
├── components/                   # React-Komponenten (439 Dateien)
│   ├── ui/                       # Base UI (26 Komponenten)
│   ├── studio/                   # Pipeline-Editor (56 Dateien)
│   ├── brain/                    # Brain AI UI (46 Dateien)
│   ├── dashboard/                # Dashboard-Widgets (35+ Dateien)
│   ├── admin/                    # Admin-Panel (20+ Dateien)
│   ├── agents/                   # Agent-Chat & Verwaltung
│   ├── shell/                    # Navigation (Sidebar, Topbar)
│   └── settings/                 # Einstellungs-UI
├── server/                       # Express.js Backend
│   ├── index.ts                  # Server-Entry
│   ├── app.ts                    # Express-Konfiguration
│   ├── routes/                   # API-Router
│   ├── services/                 # Business-Logic (30+ Services)
│   ├── agents/                   # Agent-Implementierungen
│   └── middleware/               # Auth, Rate-Limiting
├── lib/                          # Shared Libraries
│   ├── agents/                   # Agent-Definitionen & Tools
│   ├── ai/                       # OpenAI Service Layer
│   ├── auth/                     # Authentication
│   ├── brain/                    # Brain AI Engine
│   ├── db/                       # Datenbank-Schema (Drizzle)
│   ├── integrations/             # Integration-Adapter
│   └── utils/                    # Utilities
├── store/                        # Zustand State Management
├── prisma/                       # Prisma Schema
├── docker/                       # Docker-Konfiguration
└── scripts/                      # Build & Migration Scripts
```

### Statistiken

| Metrik | Wert |
|--------|------|
| TypeScript-Dateien | 800+ |
| React-Komponenten | 439 |
| API-Endpoints | 50+ |
| Datenbank-Tabellen | 60+ |
| AI-Agenten | 15 |
| Integrationen | 12+ |

---

## 3. Backend-Architektur

### 3.1 Server-Konfiguration

**Entry Point:** `server/index.ts`

```typescript
// Server-Initialisierung
1. HTTP Server (Node.js native)
2. Express App mit Middleware
3. Socket.IO für Real-Time
4. Service-Initialisierung:
   - Tool Executors
   - Job Queue (BullMQ)
   - Agent Manager (15 Agents)
   - Brain AI Engine
   - Workflow Engine
```

**Express Middleware Stack (`server/app.ts`):**

```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4000', 'https://sintra.ai'],
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: { /* Strict CSP */ },
  xFrameOptions: 'DENY',
  hsts: { maxAge: 31536000, preload: true }
}));
app.use(cookieParser());
app.use(rateLimit({ /* Abuse Prevention */ }));
app.use(requestTimeout(20000)); // 20s Standard
```

### 3.2 Service-Layer

**Kern-Services (`server/services/`):**

| Service | Verantwortung |
|---------|---------------|
| `AgentManager` | Orchestrierung aller 15 AI-Agenten |
| `ChatService` | Konversations-Handling |
| `OpenAIService` | GPT-4 API Integration |
| `BudgetService` | Kosten-Tracking & Limits |
| `WorkflowExecutionEngine` | Pipeline-Ausführung |
| `JobQueueService` | Background Jobs (BullMQ) |
| `SecurityEventService` | Audit-Logging |
| `RateLimitService` | API-Throttling |
| `GmailOAuthService` | Email-Automatisierung |
| `HubSpotAdapter` | CRM-Integration |
| `WebhookService` | Webhook-Management |

### 3.3 API-Struktur

```
/api
├── /agents
│   ├── GET    /                    # Liste aller Agents
│   ├── GET    /:id                 # Agent-Details
│   ├── POST   /:id/chat            # Chat mit Agent (Streaming)
│   ├── GET    /:id/chat            # Chat-Historie
│   └── POST   /custom              # Custom Agent erstellen
├── /auth
│   ├── POST   /login               # Login
│   ├── POST   /logout              # Logout
│   ├── POST   /register            # Registrierung
│   ├── POST   /verify-email        # Email-Verifizierung
│   ├── POST   /2fa/*               # MFA-Endpoints
│   └── POST   /webauthn/*          # Passkey-Support
├── /brain
│   ├── POST   /query               # Wissensabfrage
│   ├── POST   /upload              # Dokument-Upload
│   ├── GET    /search              # Semantische Suche
│   ├── GET    /metrics             # Usage-Metriken
│   └── GET    /knowledge/*         # Knowledge Base
├── /workflows
│   ├── GET    /                    # Alle Workflows
│   ├── POST   /                    # Workflow erstellen
│   ├── POST   /:id/execute         # Workflow ausführen
│   └── GET    /executions          # Ausführungs-Historie
├── /integrations
│   ├── GET    /                    # Aktive Integrationen
│   ├── POST   /connect             # Integration verbinden
│   ├── POST   /disconnect          # Integration trennen
│   └── GET    /callback/*          # OAuth Callbacks
├── /admin
│   ├── GET    /analytics/*         # System-Analytics
│   ├── GET    /audit               # Audit-Logs
│   ├── GET    /security/*          # Security-Dashboard
│   └── GET    /system/health       # Health-Checks
└── /budget
    ├── GET    /                    # Budget-Übersicht
    ├── POST   /alerts              # Budget-Alerts
    └── GET    /history             # Kosten-Historie
```

---

## 4. Frontend-Architektur

### 4.1 Next.js App Router

**Route-Gruppen:**

```
app/
├── (app)                    # Geschützte Routes
│   ├── (dashboard)          # Mit Sidebar-Layout
│   │   ├── dashboard/       # Haupt-Dashboard
│   │   ├── agents/          # Agent-Verwaltung
│   │   ├── brain/           # Brain AI Interface
│   │   ├── pipelines/       # Pipeline-Builder
│   │   └── ...
│   └── inbox/               # Standalone (ohne Sidebar)
├── (fullscreen)             # Vollbild-Layout
│   └── studio/              # Visual Editor
└── login/, register/        # Öffentliche Routes
```

### 4.2 State Management (Zustand)

**Store-Organisation:**

```typescript
// store/useDashboardStore.ts (90KB - Haupt-Store)
const useDashboardStore = create(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // Dashboard State
        metrics: { ... },
        agents: [ ... ],

        // Knowledge State (Slice)
        ...createKnowledgeSlice(set, get),

        // Pipeline State (Slice)
        ...createPipelineSlice(set, get),

        // UI State
        modals: { ... },
        toasts: [ ... ],
      })),
      { name: 'flowent-dashboard' }
    )
  )
);
```

**Weitere Stores:**
- `chatStore.ts` - Chat-Nachrichten & Konversationen
- `agents.ts` - Agent-Registry
- `session.ts` - User-Session
- `ui.ts` - Globaler UI-State

### 4.3 Komponenten-Hierarchie

**Shell-Layout:**

```
<ShellLayout>
  ├── <Sidebar>
  │   ├── Logo
  │   ├── NavigationSections>
  │   │   ├── Übersicht (Dashboard)
  │   │   ├── Agents (Inbox, Pipeline Studio)
  │   │   ├── Automatisierung (Pipelines, Integrations, Brain)
  │   │   └── Management (Analytics, Budget, Admin)
  │   └── <WorkspaceSwitcher />
  ├── <Topbar>
  │   ├── Breadcrumbs
  │   ├── Search
  │   ├── ThemeToggle
  │   └── UserMenu
  └── <MainContent>
      └── {children}
```

### 4.4 Design System

**CSS-Architektur:**

```css
/* Unified Design System */
:root {
  /* Farben */
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 0%);
  --primary: hsl(210 100% 50%);
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;

  /* Surfaces */
  --surface-0: 255 255 255;
  --surface-1: 249 250 251;
  --surface-2: 243 244 246;

  /* Spacing & Radius */
  --radius: 0.5rem;
}

.dark {
  --background: hsl(222 47% 11%);
  --foreground: hsl(210 40% 96%);
  --surface-0: 10 10 11;
}
```

**UI-Komponenten (Radix UI basiert):**

| Komponente | Beschreibung |
|------------|--------------|
| `Button` | Primary, Secondary, Ghost, Destructive |
| `Card` | Container mit Schatten & Radius |
| `Dialog` | Modale Dialoge |
| `DropdownMenu` | Kontextmenüs |
| `Table` | Daten-Tabellen |
| `Toast` | Benachrichtigungen (Sonner) |
| `Command` | Command Palette |

---

## 5. Datenbank & Persistenz

### 5.1 Datenbank-Konfiguration

**PostgreSQL mit pgvector:**

```typescript
// lib/db/connection.ts
const pool = postgres(DATABASE_URL, {
  max: 20,                    // Pool-Größe
  idle_timeout: 30,           // 30s Idle
  connect_timeout: 10,        // 10s Connect
});

// pgvector aktivieren
await sql`CREATE EXTENSION IF NOT EXISTS vector`;
```

### 5.2 Schema-Übersicht (60+ Tabellen)

**Authentifizierung & Benutzer:**

```sql
-- Benutzer
users (
  id, email, password_hash, avatar, bio,
  mfa_enabled, recovery_codes,
  theme, locale, timezone,
  created_at, updated_at
)

-- Sessions
sessions (
  id, user_id, token_hash, device_info,
  ip_address, expires_at, revoked
)

-- MFA & Passkeys
user_passkeys (
  id, user_id, credential_id, public_key,
  counter, device_type, created_at
)
```

**Knowledge Base (RAG):**

```sql
-- Wissensdatenbanken
knowledge_bases (
  id, name, slug, visibility,
  workspace_id, created_at
)

-- Einträge
kb_entries (
  id, kb_id, title, status,
  tags[], editors[], created_at
)

-- Chunks mit Vektoren (1536-dimensional)
kb_chunks (
  id, entry_id, content,
  embedding vector(1536),     -- pgvector
  heading, section, tokens,
  HNSW INDEX (embedding)      -- Schnelle Suche
)
```

**Brain AI Module:**

```sql
-- Dokumente
brain_documents (
  id, workspace_id, content, content_hash,
  embedding vector(1536), source_type,
  access_level, search_vector tsvector
)

-- Kontexte
brain_contexts (
  id, user_id, session_id,
  messages jsonb, summary, intent,
  entities[], sentiment, topics[],
  embedding vector(1536), relevance_score
)

-- Learnings
brain_learnings (
  id, workspace_id, pattern, insight,
  confidence, evidence_count, impact,
  validated_by_human
)
```

**Agenten & Ausführungen:**

```sql
-- Agent-Konversationen
agent_conversations (
  id, agent_id, user_id, workspace_id,
  messages jsonb[], total_tokens,
  created_at, updated_at
)

-- Tool-Ausführungen
agent_executions (
  id, agent_id, user_id, tool_name,
  input jsonb, output jsonb, status,
  execution_time_ms, tokens_used, cost
)
```

**Workflows & Pipelines:**

```sql
-- Workflows
workflows (
  id, name, nodes jsonb, edges jsonb,
  status, visibility, template_category,
  downloads, rating, created_at
)

-- Ausführungen
workflow_executions (
  id, workflow_id, status,
  step_results jsonb,
  total_tokens, total_cost,
  started_at, completed_at
)
```

**Integrationen:**

```sql
-- OAuth-Verbindungen
integrations (
  id, user_id, provider, service,
  access_token_encrypted, refresh_token_encrypted,
  scopes[], status, connected_account_email,
  webhook_url, webhook_secret
)

-- Sync-Logs
integration_sync_logs (
  id, integration_id, sync_type,
  entity_type, records_processed,
  records_created, records_failed,
  sync_cursor, completed_at
)
```

### 5.3 Redis-Caching

```typescript
// lib/redis/connection.ts
const redis = new Redis({
  host: REDIS_HOST,
  port: 6379,
  password: REDIS_PASSWORD,
  tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Cache-Patterns
brain:embedding:{hash}     // 24h TTL
brain:session:{id}         // 2h TTL
brain:query:{hash}         // 1h TTL
```

---

## 6. AI-Agent-System

### 6.1 Agent-Übersicht (15 Agenten)

| Agent | Rolle | Kategorie | Farbe | Status |
|-------|-------|-----------|-------|--------|
| **Dexter** | Financial Analyst | Analytics | #3B82F6 | Active |
| **Cassie** | Customer Support | Support | #10B981 | Active |
| **Emmie** | Email Manager | Communication | #8B5CF6 | Active |
| **Aura** | Brand Strategist | Creative | #EC4899 | Active |
| **Kai** | Code Assistant | Development | #10B981 | Active |
| **Lex** | Legal Advisor | Legal | #64748B | Active |
| **Finn** | Finance Expert | Finance | #059669 | Active |
| **Nova** | Research & Insights | Research | #06B6D4 | Active |
| **Vince** | Video Producer | Motion | #F97316 | Beta |
| **Milo** | Motion Designer | Motion | #A855F7 | Beta |
| **Ari** | AI Automation | Automation | #6366F1 | Active |
| **Vera** | Security & Compliance | Security | #DC2626 | Active |
| **Echo** | Voice & Audio | Audio | #0EA5E9 | Beta |
| **Omni** | Multi-Agent Orchestrator | Meta | #7C3AED | Active |
| **Buddy** | Financial Intelligence | Finance | #F59E0B | Active |

### 6.2 Agent-Architektur

**Klassenstruktur:**

```typescript
// lib/agents/base/BaseAgent.ts
abstract class BaseAgent {
  protected tools: Map<string, AgentTool>;

  abstract getSystemPrompt(): string;
  abstract handleChat(input: ChatInput): Promise<ChatResponse>;

  registerTools(): void { /* ... */ }
  executeTool(name: string, input: any): Promise<any> { /* ... */ }
  getAvailableTools(): AgentTool[] { /* ... */ }
}

// Spezialisierte Agenten
class DexterAgent extends BaseAgent {
  // Financial Analysis Tools
  tools = {
    'analyze_revenue': analyzeRevenueTool,
    'forecast_financials': forecastTool,
    'generate_pnl_report': pnlReportTool,
    'calculate_roi': roiCalculatorTool,
  }
}

class CassieAgent extends BaseAgent {
  // Customer Support Tools
  tools = {
    'manage_tickets': ticketManagerTool,
    'analyze_sentiment': sentimentTool,
    'generate_response': responseGeneratorTool,
  }
}

// Generic Agent für restliche 11 Agenten
class GenericAgent extends BaseAgent {
  constructor(persona: AgentPersona) {
    this.persona = persona;
    this.systemPrompt = getAgentSystemPrompt(persona);
  }
}
```

### 6.3 Tool-Access-Control

**Berechtigungs-System:**

```typescript
// lib/agents/tool-access-control.ts
const agentToolPermissions: AgentToolPermissions[] = [
  {
    agentId: 'cassie',
    allowedTools: [
      'hubspot-create-contact',
      'hubspot-update-contact',
      'email-send',
      'email-draft',
      'ai-sentiment',
      'ai-response-generate',
    ],
    restrictions: {
      'hubspot-create-contact': { maxCallsPerMinute: 10 },
      'email-send': { requiresApproval: true },
    },
  },
  {
    agentId: 'dexter',
    allowedTools: [
      'database-query',
      'analytics-generate',
      'report-create',
      'forecast-generate',
      'ai-analysis',
    ],
    restrictions: {
      'database-query': { readOnly: true },
    },
  },
  // ... weitere 13 Agenten
];

// Validierung
function canAgentUseTool(agentId: string, toolId: string): boolean;
function validateToolExecution(agentId: string, toolId: string): ValidationResult;
```

### 6.4 Agent Manager

```typescript
// server/services/AgentManager.ts
class AgentManager {
  private static instance: AgentManager;
  private agents: Map<string, BaseAgent> = new Map();

  async initializeAll(): Promise<void> {
    // Spezialisierte Agenten
    this.agents.set('dexter', new DexterAgent());
    this.agents.set('cassie', new CassieAgent());
    this.agents.set('emmie', new EmmieAgent());
    this.agents.set('aura', new AuraAgent());

    // Generische Agenten (11)
    const genericIds = ['kai', 'lex', 'finn', 'nova', ...];
    for (const id of genericIds) {
      const agent = createGenericAgent(id);
      if (agent) this.agents.set(id, agent);
    }
  }

  getAgent(id: string): BaseAgent | undefined;
  getAllAgents(): Map<string, BaseAgent>;
  getAgentHealth(id: string): HealthStatus;
}
```

---

## 7. Brain AI (RAG-Engine)

### 7.1 Architektur-Übersicht

```
Brain AI System
├── EmbeddingService          # Vektor-Generierung (1536-dim)
├── ChunkingService           # Dokument-Chunking
├── KnowledgeIndexer          # Indizierung & Storage
├── EnhancedRAG               # Query + Retrieval + Reranking
├── ModelRouter               # GPT-4 vs Gemini Routing
├── ContextManager            # Session-Kontext
├── AIWriter                  # Content-Generierung
├── StandupGenerator          # Meeting-Zusammenfassungen
└── RedisCache                # Hot Data Layer
```

### 7.2 RAG-Pipeline

**Ingestion Flow:**

```
Dokument Upload
    ↓
DocumentProcessor
    ↓ (PDF, URL, Text parsing)
ChunkingService
    ↓ (Semantic Chunking, ~500 Tokens/Chunk)
EmbeddingService
    ↓ (OpenAI ada-002, 1536 dimensions)
KnowledgeIndexer
    ↓ (PostgreSQL pgvector)
HNSW Index
```

**Query Flow:**

```
User Query
    ↓
Query Embedding
    ↓
Similarity Search (pgvector)
    ↓
Top-K Retrieval
    ↓
Re-Ranking (Relevance Scoring)
    ↓
Context Assembly
    ↓
LLM Response Generation
    ↓
Answer + Sources
```

### 7.3 Model Router

```typescript
// lib/brain/ModelRouter.ts
class ModelRouter {
  async routeQuery(query: string, context: any): Promise<ModelChoice> {
    const analysis = analyzeTask(query);

    if (analysis.complexity === 'high' || analysis.requiresReasoning) {
      return { model: 'gpt-4-turbo', reason: 'Complex reasoning' };
    }

    if (analysis.type === 'simple_lookup') {
      return { model: 'gemini-flash', reason: 'Fast, cost-effective' };
    }

    return { model: 'gpt-4o-mini', reason: 'Balanced' };
  }
}
```

---

## 8. Sicherheits-Architektur

### 8.1 Authentifizierung

**Multi-Layer Auth:**

```
Login Request
    ↓
Rate Limiting (IP-based)
    ↓
Credential Validation
    ↓
MFA Challenge (if enabled)
    ↓ (TOTP / WebAuthn)
JWT Token Generation
    ↓
Session Creation
    ↓
Secure Cookie (HttpOnly, Secure, SameSite)
```

**Unterstützte Methoden:**
- Password-based Login (bcrypt)
- Email Verification
- TOTP 2FA (Google Authenticator)
- WebAuthn/Passkeys (FIDO2)
- OAuth 2.0 (Google, GitHub, Slack)
- Sudo Mode (Re-Auth für sensible Ops)

### 8.2 Authorization (RBAC)

```typescript
// Rollen-Hierarchie
const roles = {
  'admin': ['*'],                    // Alle Rechte
  'editor': ['read', 'write', 'execute'],
  'reviewer': ['read', 'comment'],
  'user': ['read', 'execute_own'],
};

// Route-Protection
middleware.protect(['admin', 'editor']);

// Tool-Level RBAC
function canAgentUseTool(agentId, toolId, userRole): boolean;
```

### 8.3 Security Headers

```typescript
// Production Headers
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.openai.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  xFrameOptions: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});
```

### 8.4 Audit-Logging

```sql
-- Alle sicherheitsrelevanten Aktionen
audit_logs (
  id, user_id, action, resource,
  ip_address, user_agent,
  old_values jsonb, new_values jsonb,
  created_at
)

-- Action Types:
-- AUTH_LOGIN, AUTH_LOGOUT, AUTH_FAILED
-- PASSWORD_CHANGE, MFA_ENABLE, MFA_DISABLE
-- DEVICE_TRUST, DEVICE_REVOKE
-- PROFILE_UPDATE, ROLE_CHANGE
-- DATA_ACCESS, DATA_EXPORT
```

---

## 9. Integration-System

### 9.1 Unterstützte Integrationen

| Kategorie | Integration | Auth-Methode | Status |
|-----------|-------------|--------------|--------|
| **Email** | Gmail | OAuth 2.0 | Active |
| | Outlook | OAuth 2.0 | Active |
| | Resend | API Key | Active |
| **Chat** | Slack | OAuth 2.0 | Active |
| | Telnyx | API Key | Active |
| **CRM** | HubSpot | OAuth 2.0 | Active |
| | Salesforce | OAuth 2.0 | Active |
| **Storage** | Google Drive | OAuth 2.0 | Active |
| | Google Sheets | OAuth 2.0 | Active |
| **Search** | Tavily | API Key | Active |
| **Payments** | Stripe | API Key | Active |
| **Monitoring** | Sentry | DSN | Active |

### 9.2 Integration-Architektur

```typescript
// lib/integrations/IntegrationHub.ts
class IntegrationHub {
  private adapters: Map<string, IntegrationAdapter> = new Map();

  constructor() {
    this.adapters.set('gmail', new GmailAdapter());
    this.adapters.set('hubspot', new HubSpotAdapter());
    this.adapters.set('slack', new SlackAdapter());
    this.adapters.set('salesforce', new SalesforceAdapter());
  }

  async connect(provider: string, userId: string): Promise<AuthUrl>;
  async handleCallback(provider: string, code: string): Promise<Integration>;
  async refreshToken(integrationId: string): Promise<void>;
  async executeAction(integrationId: string, action: string, params: any): Promise<Result>;
}
```

### 9.3 OAuth Flow

```
1. User klickt "Connect Gmail"
    ↓
2. GET /api/oauth/google/initiate
    ↓
3. Redirect zu Google Consent Screen
    ↓
4. User autorisiert Scopes
    ↓
5. Callback: GET /api/oauth/google/callback?code=xxx
    ↓
6. Token Exchange (code → access_token, refresh_token)
    ↓
7. Tokens verschlüsselt in DB speichern
    ↓
8. Integration aktiviert
```

---

## 10. Real-Time & Streaming

### 10.1 Server-Sent Events (Chat Streaming)

```typescript
// API Route: POST /api/agents/:id/chat
export async function POST(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generateAgentResponseStream(agent, message)) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
        );
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
      );
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### 10.2 Socket.IO Events

```typescript
// server/socket.ts
const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:3000'] },
});

// Agent Chat Events
io.on('connection', (socket) => {
  socket.on('agent:chat:start', handleChatStart);
  socket.on('agent:chat:message', handleMessage);
  socket.on('agent:tool:call', handleToolCall);

  // Workflow Events
  socket.on('workflow:execute', handleWorkflowExecute);
  socket.on('workflow:step:complete', handleStepComplete);

  // Activity Events
  socket.on('activity:subscribe', handleActivitySubscribe);
});

// Emit Functions
export function emitAgentChatMessage(event: AgentChatMessageEvent);
export function emitAgentChatStream(event: AgentChatStreamEvent);
export function emitAgentToolCall(event: AgentToolCallEvent);
export function emitAgentThinking(agentId: string, isThinking: boolean);
```

### 10.3 Frontend Consumption

```typescript
// hooks/useAgentChat.ts
function useAgentChat(agentId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState('');

  const sendMessage = async (content: string) => {
    const response = await fetch(`/api/agents/${agentId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const data = JSON.parse(chunk.slice(6)); // Remove "data: "

      if (data.chunk) {
        setStreaming(prev => prev + data.chunk);
      }
      if (data.done) {
        setMessages(prev => [...prev, { role: 'assistant', content: streaming }]);
        setStreaming('');
      }
    }
  };

  return { messages, streaming, sendMessage };
}
```

---

## 11. Performance & Skalierung

### 11.1 Frontend-Optimierungen

| Optimierung | Implementierung |
|-------------|-----------------|
| **Code Splitting** | Route-basiert (Next.js automatisch) |
| **Lazy Loading** | React.lazy für schwere Komponenten |
| **Image Optimization** | next/image mit WebP/AVIF |
| **Caching** | React Query (1min stale, 5min GC) |
| **Virtualization** | React Window für lange Listen |

### 11.2 Backend-Optimierungen

| Optimierung | Implementierung |
|-------------|-----------------|
| **Connection Pooling** | 20 DB-Connections |
| **Redis Caching** | Sessions, Embeddings, Queries |
| **Rate Limiting** | IP + User-based |
| **Job Queue** | BullMQ für Background Tasks |
| **Streaming** | SSE statt Polling |

### 11.3 Datenbank-Optimierungen

```sql
-- HNSW Index für Vektor-Suche (O(log n))
CREATE INDEX idx_kb_chunks_embedding
ON kb_chunks USING hnsw (embedding vector_cosine_ops);

-- Composite Indexes für häufige Queries
CREATE INDEX idx_agent_messages_lookup
ON agent_messages (agent_id, user_id, created_at DESC);

-- Full-Text Search
CREATE INDEX idx_brain_docs_search
ON brain_documents USING gin (search_vector);
```

---

## 12. Deployment & DevOps

### 12.1 Docker Setup

```dockerfile
# Dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000 4000
CMD ["node", "server.js"]
```

### 12.2 Environment Variables

```bash
# Core
NODE_ENV=production
PORT=3000
BACKEND_PORT=4000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379

# AI Models
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
ANTHROPIC_API_KEY=sk-ant-...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
HUBSPOT_CLIENT_ID=...

# Security
JWT_SECRET=...
ENCRYPTION_KEY=...

# Monitoring
SENTRY_DSN=https://...
```

### 12.3 Scripts

```bash
# Development
npm run dev              # Frontend + Backend concurrent
npm run dev:frontend     # Nur Next.js
npm run dev:backend      # Nur Express

# Production
npm run build           # Next.js Build
npm run start           # Production Start

# Database
npm run db:generate     # Drizzle Migrations generieren
npm run db:migrate      # Migrations ausführen
npm run db:studio       # Drizzle Studio UI

# Testing
npm run test:unit       # Vitest
npm run test:e2e        # Playwright
```

---

## 13. Funktionalitäts-Matrix

### 13.1 Agent-Fähigkeiten

| Fähigkeit | Dexter | Cassie | Emmie | Aura | Kai | Lex | Finn |
|-----------|:------:|:------:|:-----:|:----:|:---:|:---:|:----:|
| Chat | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Streaming | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tool Execution | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Knowledge Base | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Financial Analysis | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Email Drafting | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Code Generation | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Legal Research | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| CRM Integration | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 13.2 Feature-Status

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Multi-Agent Chat | ✅ Complete | 15 Agenten mit Streaming |
| Visual Pipeline Editor | ✅ Complete | React Flow basiert |
| Knowledge Base (RAG) | ✅ Complete | pgvector + Semantic Search |
| OAuth Integrations | ✅ Complete | Gmail, HubSpot, Slack |
| Budget Tracking | ✅ Complete | Token + Cost Monitoring |
| Admin Dashboard | ✅ Complete | Analytics, Audit, Security |
| MFA/WebAuthn | ✅ Complete | TOTP + Passkeys |
| Real-Time Streaming | ✅ Complete | SSE + Socket.IO |
| Workflow Execution | ✅ Complete | Node-basierte Pipelines |
| Team Collaboration | 🚧 In Progress | Workspace Sharing |
| Multi-Tenant | ✅ Complete | Workspace-based Isolation |

---

## 14. Architektur-Entscheidungen

### 14.1 Warum Dual-Server?

**Entscheidung:** Next.js (Port 3000) + Express (Port 4000)

**Begründung:**
- **Separation of Concerns:** Frontend und Backend unabhängig skalierbar
- **API Reusability:** Backend kann von Mobile Apps genutzt werden
- **Development Speed:** Teams können parallel arbeiten
- **Deployment Flexibility:** Verschiedene Container/Services

### 14.2 Warum Drizzle + Prisma?

**Entscheidung:** Beide ORMs parallel

**Begründung:**
- **Drizzle:** Leichtgewichtig, TypeScript-first, gute pgvector-Unterstützung
- **Prisma:** Bessere Relations, Schema-Introspection, Migrations
- **Pragmatismus:** Graduelle Migration, beste Features von beiden

### 14.3 Warum RAG statt Fine-Tuning?

**Entscheidung:** Retrieval-Augmented Generation

**Begründung:**
- **Aktualität:** Wissen kann ohne Retraining aktualisiert werden
- **Kosten:** Kein teures Fine-Tuning erforderlich
- **Kontrolle:** Quellen sind nachvollziehbar
- **Compliance:** Daten bleiben in eigener Infrastruktur

### 14.4 Warum pgvector statt Pinecone/Weaviate?

**Entscheidung:** PostgreSQL mit pgvector Extension

**Begründung:**
- **Simplicity:** Keine zusätzliche Infrastruktur
- **Kosten:** Keine separaten Vector-DB-Kosten
- **Consistency:** Transaktionale Konsistenz mit relationalen Daten
- **Performance:** HNSW-Index für schnelle Suche

---

## 15. Empfehlungen & Roadmap

### 15.1 Kurzfristig (1-2 Wochen)

1. **Schema-Konsolidierung:** Drizzle als primäres ORM, Prisma deprecaten
2. **Test-Coverage erhöhen:** Unit + E2E Tests für kritische Pfade
3. **Error-Boundary verbessern:** Bessere User-Feedback bei Fehlern
4. **Logging-Standardisierung:** Strukturiertes Logging (JSON)

### 15.2 Mittelfristig (1-2 Monate)

1. **Multi-Tenant RBAC:** Feingranulare Berechtigungen pro Workspace
2. **Agent Marketplace:** Sharing von Custom Agents
3. **Advanced Analytics:** Detaillierte Usage-Dashboards
4. **Mobile App:** React Native oder PWA

### 15.3 Langfristig (3-6 Monate)

1. **Self-Hosted Option:** Docker Compose für On-Premise
2. **Enterprise SSO:** SAML/OIDC Integration
3. **Agent Training:** Custom Fine-Tuning Interface
4. **Multi-Language:** i18n für globale Märkte

---

## Anhang

### A. Glossar

| Begriff | Definition |
|---------|------------|
| **Agent** | AI-Assistent mit spezifischer Persona und Tools |
| **Brain AI** | RAG-basiertes Wissenssystem |
| **Pipeline** | Visuelle Workflow-Automatisierung |
| **Tool** | Ausführbare Funktion eines Agents |
| **Workspace** | Isolierter Tenant-Bereich |
| **RAG** | Retrieval-Augmented Generation |
| **pgvector** | PostgreSQL Extension für Vektoren |
| **HNSW** | Hierarchical Navigable Small World (Index) |

### B. Wichtige Dateipfade

```
# Backend
server/index.ts                    # Server Entry
server/services/AgentManager.ts    # Agent Orchestration
lib/ai/openai-service.ts          # OpenAI Integration
lib/db/schema.ts                   # Haupt-Schema

# Frontend
app/(app)/layout.tsx               # Shell Layout
app/providers.tsx                  # React Providers
components/studio/                 # Pipeline Editor
components/brain/                  # Brain AI UI
store/useDashboardStore.ts        # Main Store

# Konfiguration
.env.local                         # Environment
tailwind.config.ts                 # Design Tokens
next.config.js                     # Next.js Config
```

### C. Kontakt & Support

- **Repository:** AIAgentwebapp
- **Version:** 3.0.0
- **Maintainer:** Development Team
- **Dokumentation:** /docs

---

*Erstellt: Januar 2026*
*Letzte Aktualisierung: Januar 2026*
