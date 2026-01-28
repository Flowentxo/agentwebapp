# Flowent AI Agent Webapp - Vollständige Projektanalyse

**Erstellungsdatum:** 28. Dezember 2025
**Version:** 3.0.0
**Projektname:** SINTRA.AI / Flowent AI Agent System

---

## Executive Summary

Die **Flowent AI Agent Webapp** ist ein hochmodernes **Multi-Agent AI-System** mit einer Full-Stack-Architektur. Das System verbindet ein Next.js 14 Frontend mit einem Express.js Backend, PostgreSQL-Datenbank (Supabase), optionalem Redis-Caching und Socket.IO für Echtzeit-Kommunikation.

### Kennzahlen

| Metrik | Wert |
|--------|------|
| TypeScript-Dateien | ~500+ |
| React-Komponenten | ~570+ |
| Backend-Services | 70+ |
| Aktive AI-Agents | 4 |
| Datenbank-Schemas | 20+ |
| API-Endpoints | 100+ |

---

## 1. Systemarchitektur

### 1.1 High-Level Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                         │
│                      Port 3000                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   App       │  │  Components │  │   Hooks     │              │
│  │   Router    │  │   (570+)    │  │   & State   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                    HTTP REST + WebSocket (Socket.IO)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                          │
│                      Port 4000                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Routes    │  │  Services   │  │  Middleware │              │
│  │   & APIs    │  │   (70+)     │  │  (Auth/Sec) │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              AI AGENT SYSTEM                             │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │    │
│  │  │ Dexter  │ │ Cassie  │ │  Emmie  │ │  Aura   │        │    │
│  │  │ Finance │ │ Support │ │  Email  │ │  Brand  │        │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              BRAIN AI SYSTEM                             │    │
│  │  Memory Store │ Context Sync │ RAG │ Embeddings         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────┐           │
│  │    PostgreSQL       │      │      Redis          │           │
│  │    (Supabase)       │      │   (Optional)        │           │
│  │                     │      │                     │           │
│  │  • Users & Auth     │      │  • Session Cache    │           │
│  │  • Agents & Chats   │      │  • Memory Cache     │           │
│  │  • Workflows        │      │  • Rate Limiting    │           │
│  │  • Brain Memory     │      │  • Job Queue        │           │
│  │  • Knowledge Base   │      │                     │           │
│  │  • Integrations     │      │                     │           │
│  └─────────────────────┘      └─────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ OpenAI  │ │ Google  │ │ HubSpot │ │  Slack  │ │ Resend  │   │
│  │ GPT-4   │ │ OAuth   │ │   CRM   │ │   API   │ │  Email  │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Port-Konfiguration

| Service | Port | Beschreibung |
|---------|------|--------------|
| Frontend (Next.js) | 3000 | React UI, SSR/SSG |
| Backend (Express) | 4000 | REST API, WebSocket |
| PostgreSQL | 5432 | Datenbank (Cloud: Supabase) |
| Redis | 6379 | Cache/Sessions (optional) |

---

## 2. Projektstruktur

```
AIAgentwebapp/
│
├── app/                          # Next.js 14 App Router
│   ├── (app)/                    # Authentifizierte Routen
│   │   ├── agents/               # Agent-Management
│   │   │   ├── [id]/             # Agent-Detail & Chat
│   │   │   ├── browse/           # Agent-Übersicht
│   │   │   └── my-agents/        # Eigene Agents
│   │   ├── dashboard/            # Haupt-Dashboard
│   │   ├── brain/                # Brain AI Interface
│   │   ├── pipelines/            # Workflow-Pipelines
│   │   ├── analytics/            # Analysen & Reports
│   │   ├── integrations/         # Externe Integrationen
│   │   ├── settings/             # Einstellungen
│   │   ├── admin/                # Admin-Panel
│   │   └── revolution/           # Agent Factory
│   ├── api/                      # Next.js API Routes (Proxy)
│   ├── login/                    # Login-Seite
│   ├── register/                 # Registrierung
│   ├── verify-email/             # E-Mail-Verifizierung
│   ├── layout.tsx                # Root Layout
│   ├── page.tsx                  # Landing Page
│   └── globals.css               # Globale Styles
│
├── server/                       # Express.js Backend
│   ├── index.ts                  # Server Entry Point
│   ├── app.ts                    # Express App Config
│   ├── socket.ts                 # Socket.IO Setup
│   ├── routes.ts                 # Route Registration
│   ├── routes/                   # API Route Handlers
│   │   └── analytics.ts
│   ├── services/                 # Business Logic (70+ Services)
│   │   ├── AgentManager.ts
│   │   ├── OpenAIService.ts
│   │   ├── BrainAIService.ts
│   │   ├── WorkflowExecutionEngine.ts
│   │   ├── JobQueueService.ts
│   │   ├── UserService.ts
│   │   └── ... (65+ weitere)
│   ├── agents/                   # Agent Implementierungen
│   │   └── emmie/
│   └── brain/                    # Brain AI Core
│       ├── BrainAI.ts
│       ├── MemoryStoreV2.ts
│       └── ContextSyncV2.ts
│
├── lib/                          # Shared Libraries
│   ├── db/                       # Datenbank & ORM
│   │   ├── connection.ts         # DB Connection
│   │   ├── schema.ts             # Haupt-Schema
│   │   ├── schema-*.ts           # Domain Schemas (20+)
│   │   └── migrate.ts            # Migration Runner
│   ├── agents/                   # Agent System
│   │   ├── personas.ts           # Agent-Definitionen
│   │   ├── prompts.ts            # System Prompts
│   │   ├── dexter/               # Dexter Tools
│   │   ├── cassie/               # Cassie Tools
│   │   ├── emmie/                # Emmie Tools
│   │   └── aura/                 # Aura Tools
│   ├── brain/                    # Brain AI Utilities
│   │   ├── RedisCache.ts
│   │   ├── EnhancedRAG.ts
│   │   └── index.ts
│   ├── auth/                     # Authentifizierung
│   │   ├── session.ts
│   │   ├── crypto.ts
│   │   ├── jwt-middleware.ts
│   │   └── rateLimit.ts
│   ├── ai/                       # AI Services
│   │   ├── openai-service.ts
│   │   └── fallback-config.ts
│   └── integrations/             # Integration Hub
│       ├── IntegrationHub.ts
│       └── providers/
│
├── components/                   # React Components (570+)
│   ├── agents/                   # Agent UI
│   │   └── chat/                 # Chat Interface
│   ├── brain/                    # Brain AI Components
│   ├── dashboard/                # Dashboard Widgets
│   ├── shell/                    # Layout (Sidebar, Topbar)
│   ├── studio/                   # Workflow Studio
│   ├── settings/                 # Settings Components
│   ├── admin/                    # Admin Components
│   └── ui/                       # UI Primitives
│
├── hooks/                        # React Hooks
├── store/                        # Zustand Stores
├── types/                        # TypeScript Types
├── migrations/                   # SQL Migrations
├── prisma/                       # Prisma Schema
├── scripts/                      # Utility Scripts
├── tests/                        # Test Suites
├── public/                       # Static Assets
│
├── package.json                  # Dependencies
├── next.config.js                # Next.js Config
├── tailwind.config.ts            # Tailwind Config
├── tsconfig.json                 # TypeScript Config
├── drizzle.config.ts             # Drizzle ORM Config
└── .env.local                    # Environment Variables
```

---

## 3. Frontend-Architektur

### 3.1 Technologie-Stack

| Technologie | Version | Zweck |
|-------------|---------|-------|
| Next.js | 14.2.35 | React Framework (App Router) |
| React | 18.3.1 | UI Library |
| TypeScript | 5.x | Type Safety |
| Tailwind CSS | 3.4.1 | Utility-First CSS |
| Zustand | 5.0.8 | State Management |
| React Query | 5.x | Data Fetching & Caching |
| Socket.IO Client | 4.8.3 | Real-time Communication |
| Framer Motion | 11.18.2 | Animationen |
| React Flow | 11.11.4 | Workflow Visualization |
| Recharts | 3.3.0 | Charts & Graphs |
| Lucide React | 0.468 | Icons |

### 3.2 Hauptseiten & Routen

| Route | Komponente | Funktion |
|-------|------------|----------|
| `/` | Landing Page | Marketing & Onboarding |
| `/login` | LoginPage | Benutzer-Login |
| `/register` | RegisterPage | Registrierung |
| `/dashboard` | DashboardPage | Haupt-Übersicht |
| `/agents/browse` | AgentBrowsePage | Agent-Katalog |
| `/agents/[id]/chat` | ChatPage | Agent-Chat |
| `/brain` | BrainPage | Brain AI Interface |
| `/pipelines` | PipelinesPage | Workflow Builder |
| `/analytics` | AnalyticsPage | Berichte & Metriken |
| `/integrations` | IntegrationsPage | OAuth & Verbindungen |
| `/settings` | SettingsPage | Benutzer-Einstellungen |
| `/admin` | AdminPage | System-Administration |

### 3.3 Key Components

#### Layout Components
```typescript
// Shell Components
Sidebar.tsx          // Haupt-Navigation
Topbar.tsx           // Header mit Suche
NavItem.tsx          // Navigation Links
UserProfileBox.tsx   // User Avatar & Menu
```

#### Agent Components
```typescript
// Chat Interface
ChatInterface.tsx    // Haupt-Chat-Container
MessageCard.tsx      // Einzelne Nachricht
ToolConfirmation.tsx // Tool-Ausführung bestätigen
```

#### Brain Components
```typescript
KnowledgeGraph.tsx         // Wissens-Visualisierung
KnowledgeLibrary.tsx       // Dokument-Bibliothek
PredictiveContextEngine.tsx // Context-Vorhersage
BrainChat.tsx              // Brain AI Chat
```

#### Workflow Components
```typescript
VisualAgentStudio.tsx // No-Code Workflow Builder
ConfigurationPanel.tsx // Node-Konfiguration
PreviewPanel.tsx      // Workflow-Vorschau
```

---

## 4. Backend-Architektur

### 4.1 Technologie-Stack

| Technologie | Version | Zweck |
|-------------|---------|-------|
| Express.js | 4.18.2 | Web Framework |
| Node.js | 20+ | Runtime |
| TypeScript | 5.x | Type Safety |
| Drizzle ORM | 0.41.0 | Database Abstraction |
| PostgreSQL | 15+ | Primary Database |
| Redis | 5.9.0 | Caching (Optional) |
| Socket.IO | 4.8.1 | WebSockets |
| BullMQ | 5.63.2 | Job Queue |
| Helmet | 8.1.0 | Security Headers |
| Winston | 3.x | Logging |

### 4.2 Server Initialisierung

```typescript
// server/index.ts - Startup Flow

1. Environment Variables laden (.env.local)
2. Express App initialisieren
3. Middleware registrieren (CORS, Helmet, Rate Limiting)
4. Socket.IO initialisieren
5. Routes registrieren
6. Services initialisieren:
   - Brain AI
   - Agent Manager (4 Agents)
   - Job Queue
   - Workflow Engine
7. Scheduler starten:
   - Automation Scheduler
   - Prediction Scheduler
8. Server auf Port 4000 starten
```

### 4.3 Service-Übersicht (70+ Services)

#### Agent Services
| Service | Datei | Funktion |
|---------|-------|----------|
| AgentManager | `AgentManager.ts` | Zentrale Agent-Orchestrierung |
| AgentBuilderService | `AgentBuilderService.ts` | Agent-Erstellung |
| ChatService | `ChatService.ts` | Chat-Management |

#### AI Services
| Service | Datei | Funktion |
|---------|-------|----------|
| OpenAIService | `OpenAIService.ts` | GPT-4 API Integration |
| OpenAICollaborationService | `OpenAICollaborationService.ts` | Multi-Agent Collaboration |
| VectorEmbeddingService | `VectorEmbeddingService.ts` | Embedding-Generierung |

#### Brain AI Services
| Service | Datei | Funktion |
|---------|-------|----------|
| BrainAI | `BrainAI.ts` | Core Brain Logic |
| MemoryStoreV2 | `MemoryStoreV2.ts` | Persistente Speicherung |
| ContextSyncV2 | `ContextSyncV2.ts` | Context-Synchronisation |

#### Workflow Services
| Service | Datei | Funktion |
|---------|-------|----------|
| WorkflowExecutionEngine | `WorkflowExecutionEngine.ts` | Workflow-Ausführung |
| JobQueueService | `JobQueueService.ts` | Background Jobs |

#### Integration Services
| Service | Datei | Funktion |
|---------|-------|----------|
| GoogleCalendarService | `GoogleCalendarService.ts` | Kalender-Sync |
| GmailOAuthService | `GmailOAuthService.ts` | E-Mail-Integration |
| HubSpotAdapter | `HubSpotAdapter.ts` | CRM-Verbindung |

### 4.4 API Endpoints

#### Authentication
```
POST   /api/auth/login          - Benutzer-Login
POST   /api/auth/logout         - Logout
POST   /api/auth/register       - Registrierung
POST   /api/auth/verify-email   - E-Mail-Verifizierung
POST   /api/auth/resend-verification - Code erneut senden
```

#### Agents
```
GET    /api/agents              - Alle Agents abrufen
GET    /api/agents/:id          - Agent-Details
POST   /api/agents/:id/chat     - Chat-Nachricht senden
GET    /api/agents/:id/history  - Chat-Verlauf
```

#### Brain AI
```
POST   /api/brain/query         - Brain abfragen
GET    /api/brain/metrics       - Brain-Metriken
POST   /api/brain/upload        - Dokument hochladen
GET    /api/brain/knowledge     - Knowledge Base
```

#### Workflows
```
GET    /api/workflows           - Alle Workflows
POST   /api/workflows           - Workflow erstellen
PUT    /api/workflows/:id       - Workflow aktualisieren
POST   /api/workflows/:id/execute - Workflow ausführen
```

#### Integrations
```
GET    /api/integrations        - Aktive Integrationen
POST   /api/integrations/connect - Integration verbinden
DELETE /api/integrations/:id    - Integration trennen
GET    /api/oauth/google/initiate - OAuth starten
GET    /api/oauth/google/callback - OAuth Callback
```

---

## 5. AI Agent System

### 5.1 Aktive Agents

Das System verwendet 4 spezialisierte AI-Agents:

#### Dexter - Financial Analyst
```typescript
{
  id: "dexter",
  name: "Dexter",
  role: "Financial Analyst",
  color: "#3B82F6",  // Blue
  icon: "BarChart3",
  model: "gpt-4o-mini",

  specialties: [
    "Financial Data Analysis",
    "ROI Calculations",
    "Sales Forecasting",
    "P&L Analysis",
    "Cash Flow Management"
  ],

  tools: [
    "roi-calculator",
    "pnl-calculator",
    "cash-flow-calculator",
    "break-even-calculator",
    "balance-sheet-generator",
    "sales-forecaster"
  ]
}
```

#### Cassie - Customer Support
```typescript
{
  id: "cassie",
  name: "Cassie",
  role: "Customer Support Specialist",
  color: "#10B981",  // Green
  icon: "Headphones",
  model: "gpt-4o-mini",

  specialties: [
    "Ticket Management",
    "Issue Resolution",
    "FAQ Generation",
    "Customer Sentiment Analysis"
  ],

  tools: [
    "ticket-manager",
    "sentiment-analyzer",
    "response-generator",
    "knowledge-base-search"
  ]
}
```

#### Emmie - Email Manager
```typescript
{
  id: "emmie",
  name: "Emmie",
  role: "Email & Communication Manager",
  color: "#8B5CF6",  // Purple
  icon: "Mail",
  model: "gpt-4o-mini",

  specialties: [
    "Email Automation",
    "Campaign Management",
    "Template Creation",
    "Follow-up Sequences"
  ],

  integrations: [
    "Gmail OAuth",
    "Email Templates",
    "Scheduling"
  ]
}
```

#### Aura - Brand Strategist
```typescript
{
  id: "aura",
  name: "Aura",
  role: "Brand & Workflow Strategist",
  color: "#EC4899",  // Pink
  icon: "Sparkles",
  model: "gpt-4o-mini",

  specialties: [
    "Brand Identity",
    "Positioning Strategy",
    "Messaging Frameworks",
    "Workflow Orchestration"
  ]
}
```

### 5.2 Agent Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER MESSAGE                              │
│            "Analysiere unsere Q4-Verkaufszahlen"            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  API ENDPOINT                                │
│            POST /api/agents/dexter/chat                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  AGENT MANAGER                               │
│  1. Agent validieren (Dexter aktiv?)                        │
│  2. Conversation History laden (letzte 10 Messages)         │
│  3. System Prompt zusammenstellen                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  OPENAI SERVICE                              │
│  Model: gpt-4o-mini                                         │
│  System: Dexter Persona + Tools                             │
│  Messages: History + User Input                             │
│  Stream: true                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  TOOL EXECUTION (Optional)                   │
│  Wenn Tool-Call erkannt:                                    │
│  → sales-forecaster.ts ausführen                            │
│  → Ergebnis an LLM zurückgeben                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  BRAIN MEMORY                                │
│  • Conversation speichern                                   │
│  • Tags: agent_id, user_id, topic                           │
│  • Importance Score berechnen                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  STREAMING RESPONSE                          │
│  Socket.IO → Frontend                                       │
│  Chunk für Chunk übertragen                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Brain AI System

### 6.1 Architektur-Übersicht

Brain AI ist das zentrale Wissens- und Gedächtnissystem:

```
┌─────────────────────────────────────────────────────────────┐
│                      BRAIN AI                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Memory    │  │   Context   │  │     RAG     │         │
│  │   Store     │  │    Sync     │  │   Pipeline  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                │                 │
│         ▼                ▼                ▼                 │
│  ┌─────────────────────────────────────────────────┐       │
│  │              PostgreSQL + pgvector               │       │
│  │  • brain_memories (Gedächtnis)                  │       │
│  │  • kb_chunks (Knowledge Base Chunks)            │       │
│  │  • kb_entries (Knowledge Base Einträge)         │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │              OpenAI Embeddings                   │       │
│  │  • text-embedding-3-small                       │       │
│  │  • 1536 Dimensionen                             │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Memory Store

```typescript
// MemoryStoreV2.ts

interface MemoryRecord {
  id: string;
  agentId: string;
  timestamp: string;
  context: any;
  embeddings?: number[];  // 1536-dim vector
  tags: string[];
  importance: number;     // 1-10
  expiresAt?: string;
}

// Funktionen
store(record: MemoryRecord)     // Speichern
query(filters: MemoryQuery)     // Abfragen
getStats()                      // Statistiken
cleanup()                       // Alte Einträge löschen
```

### 6.3 RAG Pipeline (Retrieval-Augmented Generation)

```
User Query: "Wie war der Umsatz im Q3?"
                    │
                    ▼
┌─────────────────────────────────────────┐
│           QUERY EXPANSION               │
│  • Synonyme hinzufügen                  │
│  • Kontext erweitern                    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           EMBEDDING GENERATION          │
│  OpenAI text-embedding-3-small          │
│  → 1536-dim Vector                      │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           VECTOR SEARCH                 │
│  pgvector HNSW Index                    │
│  Cosine Similarity                      │
│  Top-K Results (k=10)                   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           RERANKING                     │
│  Relevanz-Score berechnen               │
│  Duplikate entfernen                    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           CONTEXT ASSEMBLY              │
│  Relevante Chunks zusammenfügen         │
│  An LLM senden                          │
└─────────────────────────────────────────┘
```

### 6.4 Knowledge Base

```typescript
// Tabellen-Struktur

knowledge_bases {
  id: UUID
  name: VARCHAR(255)
  slug: VARCHAR(255)
  visibility: ENUM('org', 'private')
  created_by: VARCHAR(255)
}

kb_entries {
  id: UUID
  kb_id: UUID → knowledge_bases.id
  title: VARCHAR(500)
  status: ENUM('draft', 'in_review', 'published', 'archived')
  author_id: VARCHAR(255)
  tags: JSONB
  category: VARCHAR(255)
}

kb_revisions {
  id: UUID
  entry_id: UUID → kb_entries.id
  version: INTEGER
  content_md: TEXT
  content_html: TEXT
  source_type: ENUM('note', 'url', 'file')
  checksum: VARCHAR(64)
}

kb_chunks {
  id: UUID
  revision_id: UUID → kb_revisions.id
  idx: INTEGER
  text: TEXT
  tokens: INTEGER
  embedding: VECTOR(1536)
  meta: JSONB
}
```

---

## 7. Datenbank-Schema

### 7.1 Haupt-Tabellen

#### Users & Authentication
```sql
users {
  id: VARCHAR(36) PRIMARY KEY
  email: VARCHAR(255) NOT NULL
  email_verified_at: TIMESTAMP
  password_hash: VARCHAR(255)
  display_name: VARCHAR(255)
  avatar_url: TEXT
  locale: VARCHAR(10) DEFAULT 'de-DE'
  timezone: VARCHAR(50) DEFAULT 'Europe/Berlin'
  theme: VARCHAR(10) DEFAULT 'system'
  mfa_enabled: BOOLEAN DEFAULT false
  mfa_secret: TEXT
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
}

sessions {
  id: VARCHAR(64) PRIMARY KEY
  user_id: VARCHAR(36) → users.id
  token_hash: VARCHAR(64)
  expires_at: TIMESTAMP
  device_info: JSONB
  ip_address: VARCHAR(45)
  created_at: TIMESTAMP
}

verification_tokens {
  id: UUID PRIMARY KEY
  user_id: VARCHAR(36)
  token_hash: VARCHAR(64)
  type: VARCHAR(20)  -- 'email', 'password_reset'
  expires_at: TIMESTAMP
  used_at: TIMESTAMP
}
```

#### Agents & Chat
```sql
agents {
  id: VARCHAR(50) PRIMARY KEY
  name: VARCHAR(100)
  role: VARCHAR(255)
  bio: TEXT
  specialties: JSONB
  color: VARCHAR(10)
  icon: VARCHAR(50)
  model: VARCHAR(50)
  is_active: BOOLEAN
  created_at: TIMESTAMP
}

agent_messages {
  id: UUID PRIMARY KEY
  agent_id: VARCHAR(50)
  user_id: VARCHAR(36)
  role: VARCHAR(20)  -- 'user', 'assistant'
  content: TEXT
  metadata: JSONB
  created_at: TIMESTAMP
}
```

#### Workflows
```sql
workflows {
  id: UUID PRIMARY KEY
  name: VARCHAR(255)
  description: TEXT
  nodes: JSONB
  edges: JSONB
  variables: JSONB
  is_active: BOOLEAN
  trigger_type: VARCHAR(50)
  schedule: VARCHAR(100)
  user_id: VARCHAR(36)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

workflow_executions {
  id: UUID PRIMARY KEY
  workflow_id: UUID → workflows.id
  status: ENUM('pending', 'running', 'completed', 'failed')
  trigger_type: VARCHAR(50)
  trigger_data: JSONB
  result: JSONB
  error: TEXT
  started_at: TIMESTAMP
  completed_at: TIMESTAMP
}
```

#### Integrations
```sql
integrations {
  id: UUID PRIMARY KEY
  user_id: VARCHAR(36)
  provider: VARCHAR(50)  -- 'google', 'hubspot', 'slack'
  type: VARCHAR(50)
  status: VARCHAR(20)
  config: JSONB
  access_token: TEXT
  refresh_token: TEXT
  token_expires_at: TIMESTAMP
  scopes: JSONB
  created_at: TIMESTAMP
}
```

### 7.2 Schema-Dateien

| Datei | Inhalt |
|-------|--------|
| `schema.ts` | Haupt-Schema (Users, Sessions, KB) |
| `schema-agents.ts` | Agent-Tabellen |
| `schema-workflows.ts` | Workflow-Tabellen |
| `schema-brain-memory.ts` | Brain Memory Tabellen |
| `schema-integrations-v2.ts` | Integration-Tabellen |
| `schema-webhooks.ts` | Webhook-Definitionen |
| `schema-budget-enterprise.ts` | Budget & Billing |
| `schema-admin-audit.ts` | Audit Logs |
| `schema-tool-logs.ts` | Tool Execution Logs |

---

## 8. Authentifizierung & Sicherheit

### 8.1 Auth Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                                │
└─────────────────────────────────────────────────────────────┘

1. User gibt E-Mail + Passwort ein
                    │
                    ▼
2. POST /api/auth/login
   • E-Mail validieren
   • Password Hash vergleichen (bcrypt)
                    │
                    ▼
3. Session erstellen
   • Token generieren (crypto.randomBytes)
   • Hash in DB speichern
   • Expiration setzen (7 Tage)
                    │
                    ▼
4. Cookies setzen
   • sintra_session_id (HTTP-only)
   • sintra_email_verified
                    │
                    ▼
5. Redirect zu /dashboard
```

### 8.2 Security Middleware

```typescript
// Helmet.js Configuration
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https://api.openai.com"]
    }
  },
  xFrameOptions: { action: 'deny' },
  hsts: { maxAge: 31536000 }
})

// Rate Limiting
- Login: 5 Versuche / 15 Minuten
- API: 100 Requests / Minute
- Abuse Detection: Auto-Block nach 10 Fehlversuchen
```

### 8.3 E-Mail-Verifizierung

```
1. Registrierung
   → Token generieren
   → E-Mail via Resend senden
   → Link: /verify-email?token=xxx

2. Verifizierung
   → Token validieren
   → email_verified_at setzen
   → Redirect zu /dashboard
```

---

## 9. Integrationen

### 9.1 OAuth 2.0 Integrationen

| Provider | Scopes | Funktionen |
|----------|--------|------------|
| **Google** | calendar, gmail, drive, sheets, tasks | Kalender-Sync, E-Mail-Lesen, Dateien |
| **HubSpot** | contacts, deals, notes | CRM-Daten |
| **Slack** | chat, users | Messaging |
| **Salesforce** | api, refresh_token | CRM-Sync |

### 9.2 API-Integrationen

| Service | SDK/Lib | Zweck |
|---------|---------|-------|
| **OpenAI** | openai@4.104 | GPT-4, Embeddings |
| **Google AI** | @google/generative-ai | Gemini (Fallback) |
| **Resend** | resend@4.2 | E-Mail-Versand |
| **Tavily** | tavily-js | Web-Suche |

### 9.3 Integration Hub

```typescript
// lib/integrations/IntegrationHub.ts

class IntegrationHub {
  // OAuth Flow
  initiateOAuth(provider: string, userId: string)
  handleCallback(provider: string, code: string)
  refreshToken(integrationId: string)

  // Token Management
  getAccessToken(userId: string, provider: string)
  revokeAccess(integrationId: string)

  // Status
  getStatus(userId: string): Integration[]
}
```

---

## 10. Workflow Engine

### 10.1 Node Types

| Node Type | Beschreibung |
|-----------|--------------|
| `trigger` | Start-Punkt (Manual, Webhook, Schedule) |
| `llm-agent` | AI Agent ausführen |
| `data-transform` | Daten transformieren |
| `condition` | If/Else Verzweigung |
| `api-call` | HTTP Request |
| `web-search` | Web-Suche via Tavily |
| `database-query` | SQL Query |
| `webhook` | Webhook senden |
| `output` | Ergebnis ausgeben |

### 10.2 Workflow Execution

```typescript
// WorkflowExecutionEngine.ts

class WorkflowExecutionEngine {
  // Executors registrieren
  registerExecutor(type: string, executor: NodeExecutor)

  // Workflow ausführen
  async execute(
    workflow: Workflow,
    triggerData: any
  ): Promise<ExecutionResult>

  // Node ausführen
  async executeNode(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeResult>
}
```

### 10.3 Beispiel-Workflow

```json
{
  "name": "Lead Processing",
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "data": { "triggerType": "webhook" }
    },
    {
      "id": "enrich-1",
      "type": "api-call",
      "data": {
        "url": "https://api.clearbit.com/v1/people/find",
        "method": "GET"
      }
    },
    {
      "id": "analyze-1",
      "type": "llm-agent",
      "data": {
        "agentId": "dexter",
        "prompt": "Analysiere diesen Lead: {{enriched_data}}"
      }
    },
    {
      "id": "notify-1",
      "type": "webhook",
      "data": {
        "url": "https://hooks.slack.com/...",
        "payload": { "text": "Neuer Lead analysiert" }
      }
    }
  ],
  "edges": [
    { "source": "trigger-1", "target": "enrich-1" },
    { "source": "enrich-1", "target": "analyze-1" },
    { "source": "analyze-1", "target": "notify-1" }
  ]
}
```

---

## 11. Real-Time Features

### 11.1 Socket.IO Events

| Event | Richtung | Beschreibung |
|-------|----------|--------------|
| `agent:thinking` | Server → Client | Agent verarbeitet |
| `agent:responding` | Server → Client | Streaming Response |
| `agent:complete` | Server → Client | Antwort fertig |
| `workflow:step` | Server → Client | Workflow-Fortschritt |
| `notification:new` | Server → Client | Neue Benachrichtigung |

### 11.2 Streaming Responses

```typescript
// Agent Response Streaming

// Backend
for await (const chunk of openai.stream()) {
  socket.emit('agent:responding', {
    agentId: 'dexter',
    chunk: chunk.content
  });
}

// Frontend
socket.on('agent:responding', (data) => {
  setStreamingMessage(prev => prev + data.chunk);
});
```

---

## 12. Environment Configuration

### 12.1 Required Variables

```bash
# Database (Required)
DATABASE_URL="postgresql://user:pass@host:5432/db"

# OpenAI (Required)
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"

# Email (Required)
RESEND_API_KEY="re_..."
EMAIL_FROM="Flowent <noreply@flowent.de>"

# App
APP_BASE_URL="http://localhost:3000"
NODE_ENV="development"
```

### 12.2 Optional Variables

```bash
# Redis (Optional - läuft ohne)
REDIS_URL="redis://localhost:6379"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# HubSpot (Optional)
HUBSPOT_CLIENT_ID="..."
HUBSPOT_CLIENT_SECRET="..."

# Monitoring (Optional)
SENTRY_DSN="..."
```

---

## 13. Deployment

### 13.1 Development

```bash
# Abhängigkeiten installieren
npm install

# Development Server starten
npm run dev

# Öffnet:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:4000
```

### 13.2 Production Build

```bash
# Build erstellen
npm run build

# Production starten
npm start
```

### 13.3 Docker

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000 4000
CMD ["npm", "start"]
```

---

## 14. Testing

### 14.1 Test-Suites

```bash
# Unit Tests
npm run test:unit

# API Tests
npm run test:api

# Smoke Tests
npm run test:smoke

# Rate Limiting Tests
npm run test:rate
```

### 14.2 Test-Struktur

```
tests/
├── unit/
│   ├── agents/
│   ├── services/
│   └── integrations/
├── e2e/
│   └── agent-chat.spec.ts
└── api/
    └── auth.spec.ts
```

---

## 15. Zusammenfassung

### Stärken

- **Moderne Architektur**: Next.js 14, Express.js, TypeScript
- **Skalierbar**: PostgreSQL, Redis, Job Queue
- **Sicher**: Helmet, Rate Limiting, JWT Auth
- **Real-time**: Socket.IO, Streaming Responses
- **AI-First**: GPT-4 Integration, RAG, Brain AI
- **Erweiterbar**: Modular Services, Integration Hub

### Aktive Features

| Feature | Status |
|---------|--------|
| Multi-Agent Chat | ✅ Aktiv |
| Brain AI (Memory, Context) | ✅ Aktiv |
| Workflow Builder | ✅ Aktiv |
| OAuth Integrationen | ✅ Aktiv |
| E-Mail-Verifizierung | ✅ Aktiv |
| Admin Dashboard | ✅ Aktiv |

### Technologie-Stack

```
Frontend:  Next.js 14, React 18, Tailwind, Zustand
Backend:   Express.js, Node.js 20+, TypeScript
Database:  PostgreSQL (Supabase), Drizzle ORM
Cache:     Redis (Optional)
AI:        OpenAI GPT-4o-mini, Embeddings
Real-time: Socket.IO
Email:     Resend
```

---

**Erstellt am:** 28. Dezember 2025
**Projekt-Version:** 3.0.0
**Dokumentations-Version:** 1.0
