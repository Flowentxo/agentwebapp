# FLOWENT AI AGENT WEBAPP - UMFASSENDE SYSTEMANALYSE

**Version:** 3.0.0 (SINTRA.AI v3)
**Analysedatum:** 01. Januar 2026
**Dokument:** Vollständige Architektur- und Funktionalitätsanalyse

---

## INHALTSVERZEICHNIS

1. [Executive Summary](#1-executive-summary)
2. [Technologie-Stack](#2-technologie-stack)
3. [Frontend-Architektur](#3-frontend-architektur)
4. [Backend-Architektur](#4-backend-architektur)
5. [AI-Agent-System](#5-ai-agent-system)
6. [Workflow & Pipeline System](#6-workflow--pipeline-system)
7. [Integrationen & Externe Services](#7-integrationen--externe-services)
8. [Datenbank-Architektur](#8-datenbank-architektur)
9. [Authentifizierung & Sicherheit](#9-authentifizierung--sicherheit)
10. [Real-Time Features](#10-real-time-features)
11. [Enterprise Features](#11-enterprise-features)
12. [Deployment & Konfiguration](#12-deployment--konfiguration)
13. [Stärken & Verbesserungspotenzial](#13-stärken--verbesserungspotenzial)

---

## 1. EXECUTIVE SUMMARY

Die **Flowent AI Agent Webapp** ist eine produktionsreife, Multi-Tenant Enterprise-Plattform für KI-gestützte Automatisierung. Das System bietet:

| Metrik | Wert |
|--------|------|
| **API-Endpunkte** | 380+ Routes |
| **Backend-Services** | 87 Services |
| **Datenbank-Tabellen** | 37+ Tabellen |
| **AI-Agents** | 22 Agents (15 Core + 7 Motion) |
| **Integrationen** | 45+ Provider |
| **Node-Typen (Workflows)** | 25+ Typen |

### Kernfunktionen:
- ✅ 22 spezialisierte AI-Agents mit eigenen Persönlichkeiten
- ✅ Visual Workflow Builder mit DAG-Execution
- ✅ Streaming-Responses für bessere UX
- ✅ Multi-Agent-Collaboration
- ✅ Enterprise Security (2FA, WebAuthn, Audit-Logs)
- ✅ Budget-Management mit Forecasting
- ✅ RAG-System mit pgvector
- ✅ 45+ Integrationen (Gmail, HubSpot, Slack, etc.)
- ✅ Real-Time Updates via Socket.IO
- ✅ Human-in-the-Loop Approval Workflows

---

## 2. TECHNOLOGIE-STACK

### 2.1 Übersicht

| Ebene | Technologie | Details |
|-------|-------------|---------|
| **Frontend** | Next.js 14 (App Router) | React 18, TypeScript, Port 3000 |
| **Backend** | Express.js + Next.js API | Port 4000 (Express), API Routes integriert |
| **Database** | PostgreSQL + pgvector | Drizzle ORM, Vektor-Embeddings |
| **Cache** | Redis | Sessions, Embeddings, Job Queue |
| **AI/LLM** | OpenAI GPT-4o-mini | Streaming, Tool Calling |
| **Real-Time** | Socket.IO | WebSocket-Kommunikation |
| **Auth** | JWT + Sessions | 2FA, WebAuthn, OAuth 2.0 |

### 2.2 Wichtige Dependencies

```
Frontend:
- next: 14.2.35
- react: ^18.3.1
- zustand: ^5.0.8 (State Management)
- @tanstack/react-query: ^5.62.13
- framer-motion: ^11.18.2
- @xyflow/react: ^12.9.3 (Workflow Builder)
- tailwindcss: ^3.4.1

Backend:
- express: ^4.18.2
- openai: ^4.104.0
- drizzle-orm: 0.41.0
- socket.io: ^4.8.1
- bullmq: ^5.63.2 (Job Queue)
- ioredis: ^5.8.2
```

---

## 3. FRONTEND-ARCHITEKTUR

### 3.1 App Router Struktur

```
app/
├── layout.tsx              → Root Layout + Providers
├── page.tsx                → Redirect zu /login oder /dashboard
├── providers.tsx           → Global Providers (Query, Theme, Toast)
├── login/                  → Apple-Design Login mit WebAuthn
├── register/               → Registrierung mit Passwort-Stärke
├── (app)/                  → Protected Route Group
│   ├── layout.tsx          → WorkspaceProvider
│   ├── inbox/              → Split-View Inbox System
│   ├── settings/           → Settings mit Tabs (Server Component)
│   └── (dashboard)/        → Shell Layout (Sidebar + Topbar)
│       ├── layout.tsx      → Client-Side Shell
│       ├── agents/         → Agent-Verwaltung
│       │   ├── browse/     → Agent-Browser
│       │   ├── create/     → Agent-Erstellung (39KB Wizard)
│       │   ├── [id]/chat/  → Agent-Chat Interface
│       │   └── marketplace/→ Agent Marketplace
│       ├── admin/          → Admin-Dashboard
│       ├── analytics/      → Analytics-Dashboards
│       ├── budget/         → Budget-Management
│       ├── brain/          → Brain AI Interface
│       ├── pipelines/      → Workflow Pipelines
│       └── (fullscreen)/   → Immersive Layout
```

### 3.2 State Management

**Zustand Stores:**
| Store | Zweck | Persistenz |
|-------|-------|------------|
| `chatStore` | Context-aware Chat-Handoff | sessionStorage |
| `useDashboardStore` | Dashboard-State (Agents, Metrics) | localStorage |
| `useUI` | Command Palette State | - |
| `useSession` | User Session (Admin/Member) | - |

**React Context:**
| Context | Zweck | Storage Key |
|---------|-------|-------------|
| `ThemeContext` | Dark/Light/System Mode | `flowent-theme` |
| `WorkspaceContext` | Multi-Workspace Management | `currentWorkspaceId` |
| `ShellContext` | Sidebar State | `ui.sidebarCollapsed` |

### 3.3 UI-Komponenten (90+ Komponenten)

**Shell-Komponenten:**
- `Sidebar.tsx` (366 Zeilen) - Hauptnavigation mit Collapse
- `Topbar.tsx` (200 Zeilen) - Breadcrumb + Command Palette
- `CommandPaletteOverlay.tsx` - Cmd+K Suche
- `GlobalShortcutsProvider.tsx` - Keyboard Shortcuts

**Feature-Komponenten:**
- `components/agents/` - Chat Interface, Agent Cards
- `components/brain/` - 40+ Brain AI Komponenten
- `components/dashboard/` - 20+ Dashboard Widgets
- `components/studio/` - Visual Workflow Builder
- `components/inbox/` - Inbox System mit Threads
- `components/budget/` - Enterprise Budget Features

### 3.4 Design System

**CSS-Architektur:**
- `globals.css` (1,467 Zeilen) - Design Tokens + Resets
- 34 spezialisierte CSS-Dateien
- Tailwind CSS mit Custom Konfiguration

**Design Tokens:**
```css
:root {
  --bg: 240 6% 8%;           /* Dark Background */
  --accent: 262 83% 68%;     /* Violet Primary */
  --text: 0 0% 98%;          /* White Text */
  --r: 16px;                 /* Border Radius */
  --blur: 8px;               /* Backdrop Blur */
}
```

---

## 4. BACKEND-ARCHITEKTUR

### 4.1 API-Endpunkte (380+ Routes)

| Kategorie | Endpunkte | Beschreibung |
|-----------|-----------|--------------|
| **Auth** | 25+ | Login, 2FA, OAuth, WebAuthn, Sessions |
| **Agents** | 50+ | CRUD, Chat, Marketplace, Custom Agents |
| **Brain AI** | 30+ | Query, Search, Upload, Knowledge Graph |
| **Workflows** | 35+ | CRUD, Execution, Schedules, Approvals |
| **Admin** | 40+ | Analytics, Audit, Security, Monitoring |
| **Integrations** | 25+ | OAuth, Gmail, HubSpot, Slack |
| **Budget** | 15+ | Alerts, Charts, Insights, Enterprise |

### 4.2 Express Server (Port 4000)

**Middleware-Stack:**
1. CORS (localhost:3000-3004, sintra.ai)
2. Body Parsing (10MB Limit)
3. Cookie Parsing
4. Helmet.js (Security Headers)
5. Rate Limiting (Global + Login)
6. Error Handling

**System-Initialisierung:**
```
1. Environment Variables laden
2. HTTP Server erstellen
3. Socket.IO initialisieren
4. API Routes registrieren
5. Tool Executors initialisieren
6. Job Queue starten (BullMQ)
7. Agent Manager initialisieren (12 Agents)
8. Automation Scheduler starten
9. Predictive Context Engine starten
10. Listen auf Port 4000
```

### 4.3 Service Layer (87 Services)

**AI & LLM Services:**
- `OpenAIService.ts` - Chat, Streaming, Function Calling
- `UnifiedAIService.ts` - Provider Abstraktion
- `AITelemetryService.ts` - Token Tracking, Cost Calculation

**Agent Services:**
- `AgentManager.ts` - Lifecycle für alle 12 Agents
- `AgentBuilderService.ts` - Guided Agent Creation
- `MultiAgentCommunicationService.ts` - Coordination

**Workflow Services:**
- `WorkflowExecutionEngine.ts` - Base Engine
- `WorkflowExecutionEngineV2.ts` - Enhanced Version
- `WorkflowCostEstimator.ts` - Cost Prediction

**Integration Services:**
- `GmailOAuthService.ts` - Gmail OAuth
- `HubSpotAdapter.ts` - HubSpot API
- `GoogleCalendarService.ts` - Calendar Integration

---

## 5. AI-AGENT-SYSTEM

### 5.1 Core Agents (15 Agents)

| Agent | ID | Rolle | Farbe | Spezialisierung |
|-------|-----|-------|-------|-----------------|
| **Dexter** | `dexter` | Financial Analyst | Blue | ROI, Forecasting, P&L |
| **Cassie** | `cassie` | Customer Support | Green | Tickets, FAQ, Resolution |
| **Emmie** | `emmie` | Email Manager | Purple | Gmail, Templates, Campaigns |
| **Kai** | `kai` | Code Assistant | Green | Code Review, Debugging |
| **Lex** | `lex` | Legal Advisor | Slate | Contracts, Compliance |
| **Finn** | `finn` | Finance Expert | Emerald | Budget, Investment |
| **Aura** | `aura` | Brand Strategist | Pink | Workflow Orchestration |
| **Nova** | `nova` | Research & Insights | Cyan | Market Analysis |
| **Vera** | `vera` | Security | Red | Audits, Compliance |
| **Ari** | `ari` | Automation | Indigo | Workflow Design |
| **Omni** | `omni` | Orchestrator | Violet | Multi-Agent Coordination |
| **Buddy** | `buddy` | Budget Assistant | Amber | Cost Monitoring |
| **Vince** | `vince` | Video Producer | Orange | Storyboarding |
| **Milo** | `milo` | Motion Designer | Purple | Animations |
| **Echo** | `echo` | Voice & Audio | Sky Blue | Transcription, Podcasts |

### 5.2 Motion Agents (Enterprise - 7 Agents)

| Agent | ID | Kategorie | Credit Multiplier |
|-------|-----|-----------|-------------------|
| **Alfred** | `alfred` | Operations | 1.0x |
| **Suki** | `suki` | Marketing | 1.2x |
| **Millie** | `millie` | Operations | 1.0x |
| **Chip** | `chip` | Sales | 1.1x |
| **Dot** | `dot` | HR | 1.0x |
| **Clide** | `clide` | Support | 1.0x |
| **Spec** | `spec` | Research | 1.3x |

### 5.3 Agent Tools

**Dexter Tools (8):**
- RevenueAnalyzer, ForecastEngine, FinancialReports
- CustomerAnalytics, CRMInsights, ROI Calculator

**Emmie Tools (19):**
- Gmail: search, read, send, reply, draft, archive, label, trash
- Batch: archive, trash, label, mark_read
- AI: summarize_inbox, extract_action_items, generate_reply

**Buddy Tools (6):**
- get_wallet_status, get_spending_analysis
- check_forecast, propose_optimization
- apply_limit_change, confirm_action

### 5.4 Agent Architektur

```
lib/agents/
├── personas.ts          → Agent-Definitionen (15 Agents)
├── prompts.ts           → System-Prompts (33KB)
├── agent-loader.ts      → Unified Loader
├── collaboration-engine.ts → Multi-Agent

server/agents/
├── base/                → BaseAgent Klasse
├── dexter/              → Finanz-Tools
├── emmie/               → Gmail-Tools
├── buddy/               → Budget-Tools
└── [weitere]/           → Agent-spezifisch
```

---

## 6. WORKFLOW & PIPELINE SYSTEM

### 6.1 Execution Engine

**Architektur:**
- DAG-basierte Execution (Directed Acyclic Graph)
- WorkflowExecutionEngineV2 (aktuelle Version)
- Variable Resolution ({{path.to.value}})
- Budget Tracking pro Node
- Socket.IO Real-Time Updates

### 6.2 Node-Typen (25+)

**Control Flow:**
| Node | Executor | Features |
|------|----------|----------|
| Trigger | TriggerExecutorV2 | Manual, Webhook, Schedule |
| Condition | ConditionExecutorV2 | AI Fallback für komplexe Bedingungen |
| Loop | LoopExecutorV2 | Array Iteration mit State |
| Approval | HumanApprovalExecutorV2 | HITL Workflow |

**AI/LLM:**
| Node | Executor | Features |
|------|----------|----------|
| AI Agent | ContextAwareLLMExecutor | Budget Tracked, Streaming |
| Transform | DataTransformExecutorV2 | Custom JavaScript |
| Set Variable | SetVariableExecutorV2 | State Update |

**Actions:**
| Node | Executor | Features |
|------|----------|----------|
| API Call | APICallExecutor | GET/POST/PUT/DELETE |
| Database | DatabaseQueryNodeExecutor | SQL Execution |
| Email | EmailExecutorV2 | SMTP via Nodemailer |
| Webhook | WebhookNodeExecutor | HTTP POST |
| Web Search | WebSearchExecutor | Brave, DuckDuckGo, Google |

**HubSpot:**
- hubspot-create-contact
- hubspot-update-deal
- hubspot-add-note
- hubspot-search-contacts

### 6.3 Human-in-the-Loop (HITL)

**Approval Flow:**
1. Approval Node → Creates `workflowApprovalRequests`
2. WorkflowSuspendedError → Halts Execution
3. Inbox Notification → User Alert
4. User Decision → Approve/Reject
5. Resume Workflow → Continues from Suspension

### 6.4 Variable System

```typescript
// Unterstützte Syntax:
{{variableName}}           // Einfache Variable
{{trigger.payload.data}}   // Nested Path
{{nodeId.outputField}}     // Node Output
{{array.0.property}}       // Array Access
```

---

## 7. INTEGRATIONEN & EXTERNE SERVICES

### 7.1 OAuth Provider (45+)

**Google Workspace:**
- Gmail (readonly, send, modify)
- Calendar (events, readonly)
- Drive (files, readonly)
- Contacts, Tasks, Sheets, Analytics

**Microsoft 365:**
- Outlook Mail, Calendar, OneDrive

**CRM:**
- HubSpot (Contacts, Deals, Companies, Tickets)
- Salesforce (API Access)
- Pipedrive (Deals, Contacts, Activities)

**Social Media:**
- LinkedIn, Twitter/X, Instagram
- Facebook, TikTok, YouTube

**Finance:**
- Stripe, PayPal, QuickBooks, Xero

**Productivity:**
- Slack, Notion, Dropbox

### 7.2 OAuth Security

- PKCE (Proof Key for Code Exchange)
- AES-256-GCM Token Encryption
- CSRF Protection via State Parameter
- Automatic Token Refresh (5-min Buffer)

### 7.3 Webhook System

- SHA-256 Secret Hashing
- IP Whitelist Filtering
- Rate Limiting pro Webhook
- Execution Logging & Audit Trail

---

## 8. DATENBANK-ARCHITEKTUR

### 8.1 Technologie

- **PostgreSQL** mit pgvector Extension
- **Drizzle ORM** für Type-Safe Queries
- **Connection Pool:** 20 Connections (konfigurierbar)

### 8.2 Schema-Übersicht (37+ Tabellen)

**Core:**
```
users, sessions, mfa_secrets, api_keys, audit_logs
```

**Agents:**
```
agents, agentMessages, agentRatings, customAgents
```

**Knowledge:**
```
knowledgeBases, kbEntries, kbChunks (pgvector), kbRevisions
```

**Workflows:**
```
workflows, workflowNodes, workflowEdges
workflowExecutions, workflowNodeLogs, workflowApprovalRequests
```

**Budget:**
```
userBudgets, budgetUsageHistory, budgetAlerts
costCenters, budgetProjects, budgetForecasts
```

**Integrations:**
```
integrationConnections, integrationSyncLogs
oauthTokens, webhooks, webhookEvents
```

---

## 9. AUTHENTIFIZIERUNG & SICHERHEIT

### 9.1 Auth-Stack

| Methode | Implementation |
|---------|----------------|
| **Session** | JWT in HttpOnly Cookies (7 Tage TTL) |
| **2FA/MFA** | TOTP mit QR-Code Setup |
| **WebAuthn** | Biometric/FIDO2 Passkeys |
| **OAuth 2.0** | Google, Microsoft, Slack, HubSpot, GitHub |
| **API Keys** | Scoped Keys mit Rotation |

### 9.2 Rate Limiting

| Limiter | Konfiguration |
|---------|---------------|
| Global (Severe) | 100 req/15 min |
| API | 60 req/min per IP |
| Login | 5 attempts/5 min |

### 9.3 Security Features

- Helmet.js Security Headers
- CSRF Token Validation
- Device Fingerprinting
- Sudo Mode für Admin Tasks
- Audit Logging für alle Aktionen

---

## 10. REAL-TIME FEATURES

### 10.1 Socket.IO Namespaces

| Namespace | Zweck |
|-----------|-------|
| `/` | Default (User, Workflow, Agent) |
| `/v1` | Frontend Compatibility |
| `/pipelines` | Pipeline Execution |

### 10.2 Events

```typescript
// Workflow
workflow:update, execution:update

// Agent
agent:activity, activity:update

// Email & Notifications
email:update, notification

// Analytics
analytics:update, metrics:update (5-sec interval)

// Pipelines
step:started, step:completed, step:failed
workflow:complete, node:suspended
```

---

## 11. ENTERPRISE FEATURES

### 11.1 Multi-Workspace

- Workspace Context für alle Operationen
- Workspace-spezifische Permissions
- Workspace Switching mit Page Reload

### 11.2 Budget Management

- Token/Cost Limits pro User
- Forecasting mit Linear Regression
- Proaktive Alerts bei Threshold
- Cost Center Allocation

### 11.3 Admin Dashboard

- System Health Monitoring
- User Management & Roles
- AI Usage Analytics
- Security Event Logs
- Execution Traces

### 11.4 Audit & Compliance

- Vollständige Audit Trails
- DSGVO-Ready Data Export
- Role-Based Access Control (RBAC)
- Session Management

---

## 12. DEPLOYMENT & KONFIGURATION

### 12.1 Ports

| Service | Port |
|---------|------|
| Frontend (Next.js) | 3000 |
| Backend (Express) | 4000 |
| PostgreSQL | 5432 |
| Redis | 6379 |

### 12.2 Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
CLERK_SECRET_KEY=sk_...
ENCRYPTION_KEY=... (64 hex chars)

# AI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Redis
REDIS_URL=redis://...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_PORT=4000
```

### 12.3 Start Commands

```bash
# Development (All Services)
npm run dev:all

# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend

# Worker
npm run worker:dev
```

---

## 13. STÄRKEN & VERBESSERUNGSPOTENZIAL

### 13.1 Stärken

| Bereich | Bewertung |
|---------|-----------|
| **Architektur** | ⭐⭐⭐⭐⭐ - Klare Trennung, Skalierbar |
| **Agent System** | ⭐⭐⭐⭐⭐ - 22 spezialisierte Agents |
| **Workflow Engine** | ⭐⭐⭐⭐⭐ - Production-grade DAG |
| **Security** | ⭐⭐⭐⭐⭐ - Enterprise-Level |
| **Integrationen** | ⭐⭐⭐⭐⭐ - 45+ Provider |
| **Real-Time** | ⭐⭐⭐⭐⭐ - Socket.IO überall |
| **UI/UX** | ⭐⭐⭐⭐⭐ - Polished Design System |

### 13.2 Verbesserungspotenzial

| Bereich | Empfehlung |
|---------|------------|
| **Error Messages** | Benutzerfreundlichere Fehlermeldungen |
| **Documentation** | OpenAPI Docs vervollständigen |
| **Testing** | E2E Tests für kritische Flows |
| **Memory** | Längere Conversation History (>8K Tokens) |
| **Caching** | Redis Caching für häufige Queries |
| **Monitoring** | APM Integration (Datadog, NewRelic) |

---

## ANHANG: KRITISCHE DATEIEN

| Bereich | Pfad |
|---------|------|
| **App Entry** | `app/layout.tsx` |
| **Providers** | `app/providers.tsx` |
| **Backend Entry** | `server/index.ts` |
| **DB Connection** | `lib/db/connection.ts` |
| **Auth Session** | `lib/auth/session.ts` |
| **OpenAI Service** | `lib/ai/openai-service.ts` |
| **Agent Personas** | `lib/agents/personas.ts` |
| **Agent Prompts** | `lib/agents/prompts.ts` |
| **Workflow Engine** | `server/services/WorkflowExecutionEngineV2.ts` |
| **Budget Service** | `server/services/BudgetService.ts` |
| **Sidebar** | `components/shell/Sidebar.tsx` |

---

**Erstellt mit Claude Code**
**Flowent AI Agent Webapp v3.0.0**
