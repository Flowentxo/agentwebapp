# Flowent AI Agent System - Vollständiger Implementierungsplan

## Übersicht

Dieses Dokument beschreibt den vollständigen Plan zum Ausbau aller Funktionen des Flowent AI Agent Systems. Die Priorisierung basiert auf Business Value, technischer Abhängigkeit und User Impact.

**Aktueller Stand:** ~80% Feature-Complete
**Ziel:** 100% Production-Ready Enterprise Platform

---

## Phase 0: Kritische Fixes (Sofort)

### 0.1 WebSocket/Real-time Verbindung reparieren
**Status:** 🔴 Kritisch - Blockiert mehrere Features
**Geschätzter Aufwand:** 1-2 Tage

**Problem:**
- WebSocket-Verbindung zu `/v1` Namespace schlägt fehl
- `ActivitySocketContext` und `emailWebSocket` können nicht verbinden
- Fehler: "Invalid namespace"

**Lösung:**
```typescript
// server/socket.ts - Namespace korrekt registrieren
const v1Namespace = io.of('/v1');

v1Namespace.on('connection', (socket) => {
  console.log('[SOCKET] Client connected to /v1');

  socket.on('subscribe:activity', (userId) => {
    socket.join(`user:${userId}`);
  });

  socket.on('subscribe:workflow', (workflowId) => {
    socket.join(`workflow:${workflowId}`);
  });

  socket.on('disconnect', () => {
    console.log('[SOCKET] Client disconnected');
  });
});
```

**Dateien zu ändern:**
- `server/socket.ts` - Namespace-Handler hinzufügen
- `server/index.ts` - Socket.io korrekt initialisieren
- `components/shell/ActivitySocketContext.tsx` - Error Handling verbessern
- `lib/integrations/emailWebSocket.ts` - Reconnection Logic

**Akzeptanzkriterien:**
- [ ] WebSocket-Verbindung zu `/v1` erfolgreich
- [ ] Keine Console-Errors mehr
- [ ] Reconnection bei Verbindungsabbruch
- [ ] Activity-Updates werden live angezeigt

---

### 0.2 Pipeline/Execution Tab hinzufügen
**Status:** 🔴 Kritisch - User erwartet dieses Feature
**Geschätzter Aufwand:** 2-3 Tage

**Problem:**
- Pipeline-Tab fehlt in Navigation
- Keine Execution-Visualisierung vorhanden

**Lösung:**

1. **Neue Seite erstellen:** `/app/(app)/pipelines/page.tsx`
```typescript
// Features:
// - Live Workflow Executions anzeigen
// - Schritt-für-Schritt Visualisierung
// - Error Debugging
// - Performance Metrics pro Step
```

2. **Sidebar-Navigation erweitern:**
```typescript
// components/shell/SidebarNew.tsx
{
  name: "Pipelines",
  href: "/pipelines",
  icon: GitBranch,
  badge: activeExecutions > 0 ? activeExecutions : undefined
}
```

3. **Execution Viewer Komponente:**
```typescript
// components/pipelines/ExecutionViewer.tsx
// - Node-Graph Visualisierung
// - Status pro Node (pending, running, completed, failed)
// - Logs pro Step
// - Timing Information
```

**Dateien zu erstellen:**
- `app/(app)/pipelines/page.tsx`
- `app/(app)/pipelines/[id]/page.tsx`
- `components/pipelines/ExecutionViewer.tsx`
- `components/pipelines/PipelineCard.tsx`
- `components/pipelines/StepDetails.tsx`
- `lib/api/pipelines-api.ts`

**API Endpoints:**
- `GET /api/pipelines` - Liste aller Pipelines
- `GET /api/pipelines/[id]` - Pipeline Details
- `GET /api/pipelines/[id]/executions` - Execution History
- `POST /api/pipelines/[id]/run` - Pipeline starten
- `WebSocket: pipeline:status` - Live Updates

---

## Phase 1: Core Features vervollständigen (Woche 1-2)

### 1.1 Agent System Komplettierung
**Status:** 🟡 75% Complete
**Geschätzter Aufwand:** 3-4 Tage

**Fehlende Agents implementieren:**

| Agent | Rolle | Status | Priorität |
|-------|-------|--------|-----------|
| Nova | Research & Insights | Persona vorhanden | Hoch |
| Ari | Creative Director | Persona vorhanden | Mittel |
| Echo | Voice & Transcription | Persona vorhanden | Niedrig |
| Vera | Data Visualization | Persona vorhanden | Mittel |
| Omni | Universal Assistant | Persona vorhanden | Niedrig |

**Für jeden Agent:**
```
/lib/agents/[name]/
├── [Name]Agent.ts        # Haupt-Agent Klasse
├── tools/
│   ├── index.ts          # Tool-Definitionen
│   └── [tool-name].ts    # Spezifische Tools
├── prompts.ts            # System-Prompts
└── index.ts              # Export
```

**Nova (Research Agent) - Beispiel:**
```typescript
// lib/agents/nova/NovaAgent.ts
export class NovaAgent extends BaseAgent {
  tools = [
    new WebSearchTool(),
    new DocumentAnalysisTool(),
    new SummaryGeneratorTool(),
    new CitationManagerTool(),
    new TrendAnalysisTool()
  ];

  systemPrompt = `Du bist Nova, ein Research & Insights Spezialist...`;
}
```

**Dateien zu erstellen:**
- `lib/agents/nova/NovaAgent.ts`
- `lib/agents/nova/tools/web-search.ts`
- `lib/agents/nova/tools/document-analysis.ts`
- `lib/agents/ari/AriAgent.ts`
- `lib/agents/vera/VeraAgent.ts`
- `server/agents/nova/NovaAgent.ts`
- `server/agents/ari/AriAgent.ts`
- `server/agents/vera/VeraAgent.ts`

---

### 1.2 Workflow Execution Visualisierung
**Status:** 🟡 70% Complete
**Geschätzter Aufwand:** 3-4 Tage

**Fehlende Features:**

1. **Live Execution Viewer**
```typescript
// components/workflows/LiveExecutionViewer.tsx
interface ExecutionViewerProps {
  workflowId: string;
  executionId: string;
}

// Features:
// - React Flow Graph mit Live-Status
// - Node-Highlighting während Execution
// - Log-Stream pro Node
// - Error-Highlighting mit Stack Trace
// - Retry-Button für fehlgeschlagene Steps
```

2. **Execution Timeline**
```typescript
// components/workflows/ExecutionTimeline.tsx
// - Gantt-Chart Ansicht
// - Duration pro Step
// - Parallel vs Sequential Visualization
// - Bottleneck-Identifikation
```

3. **Debug Panel**
```typescript
// components/workflows/DebugPanel.tsx
// - Input/Output pro Step
// - Variable Inspector
// - Breakpoint Support (für Development)
// - Step-by-Step Execution
```

**API Erweiterungen:**
```typescript
// app/api/workflows/[id]/executions/[executionId]/route.ts
GET  /executions/[id] - Execution Details mit Steps
GET  /executions/[id]/logs - Step Logs
POST /executions/[id]/retry - Retry Failed Step
POST /executions/[id]/cancel - Cancel Running Execution
```

---

### 1.3 Knowledge Graph Visualisierung
**Status:** 🟡 Grundstruktur vorhanden
**Geschätzter Aufwand:** 2-3 Tage

**Aktuelle Komponente:** `components/brain/KnowledgeGraph.tsx`

**Erweiterungen:**

1. **Interaktive Graph-Visualisierung**
```typescript
// Bibliothek: react-force-graph-2d oder vis-network

interface KnowledgeGraphProps {
  entries: KnowledgeEntry[];
  relationships: Relationship[];
  onNodeClick: (node: GraphNode) => void;
  onEdgeClick: (edge: GraphEdge) => void;
}

// Features:
// - Zoom & Pan
// - Node-Clustering nach Kategorie
// - Edge-Labels (Beziehungstyp)
// - Search & Highlight
// - Minimap
```

2. **Relationship-Editor**
```typescript
// components/brain/RelationshipEditor.tsx
// - Drag & Drop Verbindungen erstellen
// - Beziehungstypen auswählen
// - Bidirektionale Links
// - Hierarchien definieren
```

3. **Graph Analytics**
```typescript
// - Zentrale Knoten identifizieren
// - Cluster-Analyse
// - Verwaiste Einträge finden
// - Verbindungsstärke visualisieren
```

---

## Phase 2: Integrationen erweitern (Woche 2-3)

### 2.1 Salesforce Integration
**Status:** 🔴 Nicht implementiert
**Geschätzter Aufwand:** 4-5 Tage

**Struktur:**
```
/lib/integrations/salesforce/
├── SalesforceOAuthService.ts
├── SalesforceAdapter.ts
├── SalesforceWorkflowNodes.ts
└── types.ts

/app/api/oauth/salesforce/
├── authorize/route.ts
├── callback/route.ts
└── refresh/route.ts
```

**Features:**
- OAuth 2.0 Flow
- Contacts, Leads, Opportunities Sync
- Account Management
- Custom Object Support
- Bulk API für große Datenmengen
- Webhook-Handler für Real-time Updates

**Database Schema:**
```typescript
// lib/db/schema-salesforce.ts
export const salesforceConnections = pgTable('salesforce_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull(),
  instanceUrl: varchar('instance_url').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  // ...
});
```

---

### 2.2 Slack Integration
**Status:** 🔴 Nicht implementiert
**Geschätzter Aufwand:** 3-4 Tage

**Features:**
- Bot Installation via OAuth
- Channel-Nachrichten senden/empfangen
- Slash Commands für Agents
- Interactive Messages (Buttons, Modals)
- Event Subscriptions (Mentions, Reactions)

**Use Cases:**
- Agent-Antworten in Slack posten
- Workflow-Trigger aus Slack
- Notifications bei wichtigen Events
- Team-Collaboration Integration

**Struktur:**
```
/lib/integrations/slack/
├── SlackOAuthService.ts
├── SlackBotService.ts
├── SlackEventHandler.ts
├── SlackWorkflowNodes.ts
└── types.ts

/app/api/integrations/slack/
├── oauth/route.ts
├── events/route.ts
├── commands/route.ts
└── interactions/route.ts
```

---

### 2.3 Microsoft 365 Integration
**Status:** 🔴 Nicht implementiert
**Geschätzter Aufwand:** 4-5 Tage

**Komponenten:**
- **Outlook:** Email-Integration (Alternative zu Gmail)
- **Teams:** Chat & Collaboration
- **OneDrive:** File Storage
- **SharePoint:** Document Management
- **Calendar:** Terminverwaltung

**Priorität:** Hoch für Enterprise-Kunden

---

### 2.4 Integration Hub UI
**Status:** 🟡 Basis vorhanden
**Geschätzter Aufwand:** 2-3 Tage

**Aktuelle Seite:** `/app/(app)/integrations/page.tsx`

**Erweiterungen:**
```typescript
// components/integrations/IntegrationHub.tsx

// Features:
// 1. Integration Catalog
//    - Kategorien (CRM, Communication, Storage, etc.)
//    - Suchfunktion
//    - Beliebte Integrationen
//    - Coming Soon Badges

// 2. Connection Manager
//    - Status aller Verbindungen
//    - Last Sync Zeit
//    - Error-Handling mit Retry
//    - Disconnect mit Confirmation

// 3. Sync Configuration
//    - Sync-Intervall einstellen
//    - Feld-Mapping konfigurieren
//    - Filter für Sync-Daten
//    - Konflikt-Resolution

// 4. Activity Log
//    - Sync-History
//    - Error-Log
//    - Data Transfer Volume
```

---

## Phase 3: Agent Studio & Marketplace (Woche 3-4)

### 3.1 Agent Studio Vervollständigung
**Status:** 🟡 60% Complete
**Geschätzter Aufwand:** 4-5 Tage

**Aktuelle Komponenten:**
- `components/studio/VisualAgentStudio.tsx`
- `components/studio/ConfigurationPanel.tsx`
- `components/studio/ToolRegistry.tsx`

**Fehlende Features:**

1. **Agent Testing Interface**
```typescript
// components/studio/AgentTester.tsx
interface AgentTesterProps {
  agentConfig: AgentConfiguration;
}

// Features:
// - Live Chat mit Draft-Agent
// - Tool-Aufruf Visualisierung
// - Response Quality Scoring
// - A/B Testing zwischen Versionen
// - Performance Benchmarks
```

2. **Version Management**
```typescript
// components/studio/VersionManager.tsx
// - Versionsliste mit Diff-View
// - Rollback zu früherer Version
// - Version-Tags (stable, beta, dev)
// - Changelog Generator
```

3. **Template System**
```typescript
// components/studio/TemplateSelector.tsx
// - Vorgefertigte Agent-Templates
// - Kategorien (Support, Sales, Analytics, etc.)
// - One-Click Deployment
// - Customization Wizard
```

4. **Knowledge Attachment**
```typescript
// components/studio/KnowledgeAttacher.tsx
// - Knowledge Base auswählen
// - Specific Entries auswählen
// - Auto-RAG Konfiguration
// - Embedding-Vorschau
```

---

### 3.2 Agent Marketplace
**Status:** 🔴 Grundstruktur vorhanden, nicht funktional
**Geschätzter Aufwand:** 5-6 Tage

**Seite:** `/app/(app)/agents/marketplace/page.tsx`

**Vollständige Implementation:**

1. **Marketplace Frontend**
```typescript
// app/(app)/agents/marketplace/page.tsx

// Sections:
// - Featured Agents (Kuratiert)
// - Categories (Support, Sales, Dev, Creative, etc.)
// - Recently Added
// - Most Popular
// - Search & Filter
```

2. **Agent Details Page**
```typescript
// app/(app)/agents/marketplace/[id]/page.tsx

// Inhalte:
// - Agent-Beschreibung & Demo
// - Screenshots/Videos
// - Capabilities Liste
// - User Reviews & Ratings
// - Pricing (Free/Premium)
// - Install Button
// - Version History
```

3. **Publisher Portal**
```typescript
// app/(app)/agents/publish/page.tsx

// Features:
// - Agent zur Veröffentlichung einreichen
// - Dokumentation hinzufügen
// - Pricing festlegen
// - Analytics Dashboard
// - Revenue Tracking
```

4. **Backend APIs**
```typescript
// app/api/marketplace/
// GET  /agents - Liste mit Pagination & Filter
// GET  /agents/[id] - Details
// POST /agents/[id]/install - Installation
// POST /agents/[id]/review - Review abgeben
// GET  /agents/[id]/reviews - Reviews lesen
// POST /publish - Agent veröffentlichen
// GET  /publisher/analytics - Publisher Stats
```

5. **Database Schema**
```typescript
// lib/db/schema-marketplace.ts
export const marketplaceAgents = pgTable('marketplace_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: varchar('publisher_id').notNull(),
  name: varchar('name').notNull(),
  description: text('description'),
  category: varchar('category'),
  pricing: varchar('pricing'), // 'free' | 'premium' | 'enterprise'
  price: numeric('price'),
  installCount: integer('install_count').default(0),
  rating: numeric('rating'),
  reviewCount: integer('review_count').default(0),
  status: varchar('status'), // 'draft' | 'pending' | 'published' | 'rejected'
  agentConfig: jsonb('agent_config'),
  screenshots: jsonb('screenshots'),
  createdAt: timestamp('created_at').defaultNow(),
  publishedAt: timestamp('published_at'),
});

export const marketplaceReviews = pgTable('marketplace_reviews', {
  // ...
});

export const marketplaceInstallations = pgTable('marketplace_installations', {
  // ...
});
```

---

## Phase 4: Enterprise Features (Woche 4-5)

### 4.1 Two-Factor Authentication (2FA)
**Status:** 🟡 Backend vorhanden, Frontend fehlt
**Geschätzter Aufwand:** 2-3 Tage

**Backend (bereits implementiert):**
- `app/api/settings/security/2fa/route.ts`
- `app/api/settings/security/2fa/backup-codes/route.ts`

**Frontend zu implementieren:**

1. **2FA Setup Wizard**
```typescript
// components/settings/TwoFactorSetup.tsx

// Steps:
// 1. QR-Code anzeigen (TOTP)
// 2. Authenticator App scannen
// 3. Verifizierungscode eingeben
// 4. Backup-Codes anzeigen & speichern
// 5. Bestätigung
```

2. **2FA Login Flow**
```typescript
// components/auth/TwoFactorPrompt.tsx
// - Nach Passwort-Login
// - TOTP Code Eingabe
// - "Remember this device" Option
// - Backup Code Alternative
```

3. **2FA Management**
```typescript
// In SecuritySection.tsx
// - 2FA Status anzeigen
// - Disable mit Bestätigung
// - Backup Codes regenerieren
// - Backup Codes downloaden
```

---

### 4.2 SSO/SAML Support
**Status:** 🔴 Nicht implementiert
**Geschätzter Aufwand:** 4-5 Tage

**Features:**
- SAML 2.0 Identity Provider Support
- Okta, Azure AD, OneLogin Integration
- Just-in-Time User Provisioning
- Group/Role Mapping
- Single Logout

**Implementation:**
```typescript
// lib/auth/saml/
├── SAMLService.ts
├── SAMLMetadataParser.ts
├── SAMLResponseValidator.ts
└── types.ts

// app/api/auth/saml/
├── metadata/route.ts    // SP Metadata
├── login/route.ts       // Initiate SSO
├── callback/route.ts    // Process SAML Response
└── logout/route.ts      // SLO
```

---

### 4.3 Advanced Admin Dashboard
**Status:** 🟡 80% Complete
**Geschätzter Aufwand:** 3-4 Tage

**Fehlende Features:**

1. **User Behavior Analytics**
```typescript
// components/admin/UserAnalytics.tsx

// Metriken:
// - Active Users (DAU/WAU/MAU)
// - Session Duration
// - Feature Usage Heatmap
// - User Journey Analysis
// - Retention Curves
// - Churn Prediction
```

2. **Custom Report Builder**
```typescript
// components/admin/ReportBuilder.tsx

// Features:
// - Drag & Drop Report Designer
// - Vordefinierte Widgets
// - Custom SQL Queries (für Admins)
// - Export zu PDF/Excel
// - Scheduled Reports via Email
```

3. **Policy Management UI**
```typescript
// components/admin/PolicyManager.tsx

// Features:
// - RBAC Policy Editor
// - Permission Matrix
// - Role Templates
// - Audit Trail
// - Policy Testing (Dry-Run)
```

4. **User Permission Management**
```typescript
// components/admin/UserPermissions.tsx

// Features:
// - User Role Assignment
// - Custom Permission Sets
// - Workspace-Level Permissions
// - Resource-Level Access Control
// - Bulk Permission Updates
```

---

### 4.4 Team Collaboration
**Status:** 🟡 Schema vorhanden, UI fehlt
**Geschätzter Aufwand:** 4-5 Tage

**Database Schema vorhanden:** `lib/db/schema-teams.ts`

**Frontend zu implementieren:**

1. **Team Management**
```typescript
// app/(app)/teams/page.tsx

// Features:
// - Team erstellen/bearbeiten/löschen
// - Mitglieder einladen
// - Rollen zuweisen (Owner, Admin, Member, Viewer)
// - Team Settings
```

2. **Shared Workspaces**
```typescript
// components/workspaces/SharedWorkspace.tsx

// Features:
// - Workspace mit Team teilen
// - Zugriffsrechte pro Workspace
// - Activity Feed
// - Kommentare & Diskussionen
```

3. **Real-time Collaboration**
```typescript
// components/collaboration/
├── PresenceIndicator.tsx   // Wer ist online?
├── CursorOverlay.tsx       // Live Cursor anderer User
├── CommentThread.tsx       // Inline Kommentare
├── ChangeNotification.tsx  // Änderungsbenachrichtigungen
└── ConflictResolver.tsx    // Konflikt-Auflösung
```

---

## Phase 5: Performance & Skalierung (Woche 5-6)

### 5.1 Caching Strategie
**Status:** 🟡 Basis vorhanden (Redis)
**Geschätzter Aufwand:** 2-3 Tage

**Erweiterungen:**

1. **Multi-Layer Caching**
```typescript
// lib/cache/CacheManager.ts

class CacheManager {
  // L1: In-Memory (LRU)
  private memoryCache = new LRUCache({ max: 1000 });

  // L2: Redis
  private redis = new Redis(process.env.REDIS_URL);

  async get<T>(key: string): Promise<T | null> {
    // Check L1 first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) return memoryResult as T;

    // Check L2
    const redisResult = await this.redis.get(key);
    if (redisResult) {
      this.memoryCache.set(key, JSON.parse(redisResult));
      return JSON.parse(redisResult);
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.memoryCache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

2. **Query Caching**
```typescript
// Automatic caching for expensive DB queries
// - Knowledge Base Searches
// - Agent Configurations
// - User Permissions
// - Feature Flags
```

3. **Response Caching**
```typescript
// API Response Caching mit ETags
// - Static Content
// - Selten ändernde Daten
// - CDN-Ready Headers
```

---

### 5.2 Database Optimierung
**Status:** 🟡 Indexing vorhanden
**Geschätzter Aufwand:** 2-3 Tage

**Optimierungen:**

1. **Query Performance**
```sql
-- Analyse langsamer Queries
EXPLAIN ANALYZE SELECT ...

-- Zusätzliche Indizes
CREATE INDEX CONCURRENTLY idx_brain_memories_user_embedding
  ON brain_memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Partitionierung für große Tabellen
ALTER TABLE workflow_executions
  PARTITION BY RANGE (created_at);
```

2. **Connection Pooling**
```typescript
// Optimiertes Connection Pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

3. **Read Replicas**
```typescript
// Lese-Operationen auf Replicas verteilen
const readDb = getDb('replica');
const writeDb = getDb('primary');
```

---

### 5.3 Background Job Optimization
**Status:** 🟡 JobQueueService vorhanden
**Geschätzter Aufwand:** 2-3 Tage

**Erweiterungen:**

1. **Job Prioritization**
```typescript
// Prioritäts-basierte Queue
enum JobPriority {
  CRITICAL = 1,  // Real-time User Actions
  HIGH = 2,      // Notifications
  NORMAL = 3,    // Background Sync
  LOW = 4,       // Analytics, Cleanup
}
```

2. **Job Monitoring Dashboard**
```typescript
// components/admin/JobMonitor.tsx

// Features:
// - Aktive Jobs
// - Queue-Länge pro Priorität
// - Failed Jobs mit Retry
// - Job Duration Histogramm
// - Worker Status
```

3. **Dead Letter Queue**
```typescript
// Handling für failed Jobs
// - Automatic Retry mit Exponential Backoff
// - Max Retry Limit
// - DLQ für permanent failed Jobs
// - Alert bei DLQ Threshold
```

---

## Phase 6: Monitoring & Observability (Woche 6-7)

### 6.1 Application Performance Monitoring (APM)
**Status:** 🟡 Basis Metrics vorhanden
**Geschätzter Aufwand:** 3-4 Tage

**Implementation:**

1. **Tracing Integration**
```typescript
// lib/monitoring/tracing.ts

// OpenTelemetry Setup
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});
```

2. **Custom Metrics**
```typescript
// lib/monitoring/metrics.ts

// Business Metrics
metrics.counter('agent_requests_total', { agent: 'dexter' });
metrics.histogram('response_time_seconds', { quantiles: [0.5, 0.9, 0.99] });
metrics.gauge('active_workflows', { status: 'running' });
metrics.counter('ai_tokens_used', { model: 'gpt-4' });
```

3. **Error Tracking**
```typescript
// lib/monitoring/errors.ts

// Sentry Integration
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

---

### 6.2 Logging Infrastructure
**Status:** 🟡 Console Logging vorhanden
**Geschätzter Aufwand:** 2-3 Tage

**Verbesserungen:**

1. **Structured Logging**
```typescript
// lib/logging/logger.ts

import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: ['password', 'token', 'apiKey'],
});

// Usage
logger.info({ userId, action: 'agent_chat', agentId }, 'User started chat');
```

2. **Log Aggregation**
```typescript
// Export zu:
// - Elasticsearch/Kibana
// - Datadog Logs
// - CloudWatch Logs
// - Loki/Grafana
```

3. **Audit Logging**
```typescript
// Alle sicherheitsrelevanten Aktionen loggen
// - User Logins
// - Permission Changes
// - Data Access
// - API Key Usage
// - Admin Actions
```

---

### 6.3 Alerting System
**Status:** 🔴 Nicht implementiert
**Geschätzter Aufwand:** 2-3 Tage

**Implementation:**

1. **Alert Definitions**
```typescript
// lib/monitoring/alerts.ts

const alerts = [
  {
    name: 'HighErrorRate',
    condition: 'error_rate > 5%',
    severity: 'critical',
    channels: ['pagerduty', 'slack'],
  },
  {
    name: 'SlowResponseTime',
    condition: 'p99_latency > 2s',
    severity: 'warning',
    channels: ['slack'],
  },
  {
    name: 'AIBudgetThreshold',
    condition: 'monthly_ai_cost > $1000',
    severity: 'warning',
    channels: ['email'],
  },
];
```

2. **Notification Channels**
```typescript
// lib/monitoring/notifications.ts

// Channels:
// - Email (SMTP)
// - Slack Webhook
// - PagerDuty
// - SMS (Twilio)
// - In-App Notifications
```

3. **Alert Dashboard**
```typescript
// components/admin/AlertDashboard.tsx

// Features:
// - Active Alerts
// - Alert History
// - Acknowledge/Resolve
// - Silence Rules
// - Escalation Policies
```

---

## Phase 7: Testing & Qualitätssicherung (Woche 7-8)

### 7.1 Unit Tests
**Status:** 🔴 Minimal
**Geschätzter Aufwand:** 4-5 Tage

**Test Coverage Ziele:**
- Services: 80%+
- Utilities: 90%+
- Critical Paths: 100%

**Frameworks:**
- Jest für Unit Tests
- React Testing Library für Components
- MSW für API Mocking

**Beispiel-Tests:**
```typescript
// tests/unit/services/BudgetService.test.ts
describe('BudgetService', () => {
  it('should calculate remaining budget correctly', async () => {
    const service = new BudgetService();
    const result = await service.getRemainingBudget('user-123');
    expect(result.remaining).toBeLessThanOrEqual(result.total);
  });

  it('should reject when budget exceeded', async () => {
    await expect(
      service.deductBudget('user-123', 1000000)
    ).rejects.toThrow('Budget exceeded');
  });
});
```

---

### 7.2 Integration Tests
**Status:** 🔴 Minimal
**Geschätzter Aufwand:** 3-4 Tage

**Test-Szenarien:**
```typescript
// tests/integration/

// 1. Agent Chat Flow
describe('Agent Chat Integration', () => {
  it('should complete full chat flow', async () => {
    // Create session
    // Send message
    // Verify streaming response
    // Check message persistence
  });
});

// 2. Workflow Execution
describe('Workflow Execution', () => {
  it('should execute multi-step workflow', async () => {
    // Create workflow
    // Trigger execution
    // Verify each step completion
    // Check final output
  });
});

// 3. Integration Sync
describe('HubSpot Integration', () => {
  it('should sync contacts bidirectionally', async () => {
    // Create contact locally
    // Trigger sync
    // Verify in HubSpot
    // Update in HubSpot
    // Verify local update
  });
});
```

---

### 7.3 E2E Tests
**Status:** 🟡 Playwright Setup vorhanden
**Geschätzter Aufwand:** 3-4 Tage

**Test-Szenarien:**
```typescript
// tests/e2e/

// 1. User Onboarding
test('complete user onboarding', async ({ page }) => {
  await page.goto('/register');
  await page.fill('[name="email"]', 'test@example.com');
  // ... complete registration
  // ... setup 2FA
  // ... create first agent
});

// 2. Agent Creation & Usage
test('create and use custom agent', async ({ page }) => {
  await page.goto('/agents/studio/create');
  // ... configure agent
  // ... add tools
  // ... test in preview
  // ... save and chat
});

// 3. Workflow Builder
test('build and execute workflow', async ({ page }) => {
  await page.goto('/workflows');
  // ... create workflow
  // ... add nodes
  // ... configure triggers
  // ... execute and verify
});
```

---

## Phase 8: Dokumentation (Laufend)

### 8.1 API Dokumentation
**Status:** 🟡 OpenAPI Spec vorhanden
**Geschätzter Aufwand:** 2-3 Tage

**Verbesserungen:**
- Swagger UI Integration
- Request/Response Beispiele
- Authentication Flow Dokumentation
- Rate Limit Dokumentation
- Error Code Reference

---

### 8.2 Developer Documentation
**Status:** 🔴 Minimal
**Geschätzter Aufwand:** 3-4 Tage

**Zu erstellen:**
```
/docs/
├── getting-started/
│   ├── installation.md
│   ├── configuration.md
│   └── first-agent.md
├── guides/
│   ├── creating-agents.md
│   ├── building-workflows.md
│   ├── integrations.md
│   └── custom-tools.md
├── api/
│   ├── authentication.md
│   ├── agents.md
│   ├── workflows.md
│   └── knowledge.md
├── architecture/
│   ├── overview.md
│   ├── database.md
│   └── services.md
└── deployment/
    ├── docker.md
    ├── cloud-run.md
    └── kubernetes.md
```

---

### 8.3 User Documentation
**Status:** 🔴 Nicht vorhanden
**Geschätzter Aufwand:** 3-4 Tage

**Zu erstellen:**
- In-App Help Center
- Feature Guides mit Screenshots
- Video Tutorials
- FAQ Section
- Troubleshooting Guide

---

## Zusammenfassung & Timeline

| Phase | Beschreibung | Aufwand | Priorität |
|-------|-------------|---------|-----------|
| **Phase 0** | Kritische Fixes (WebSocket, Pipeline) | 3-5 Tage | 🔴 Kritisch |
| **Phase 1** | Core Features (Agents, Workflows, KB) | 10-14 Tage | 🔴 Hoch |
| **Phase 2** | Integrationen (Salesforce, Slack, MS365) | 12-15 Tage | 🟡 Mittel |
| **Phase 3** | Agent Studio & Marketplace | 9-11 Tage | 🟡 Mittel |
| **Phase 4** | Enterprise (2FA, SSO, Teams) | 13-17 Tage | 🟡 Mittel |
| **Phase 5** | Performance & Skalierung | 6-9 Tage | 🟢 Niedrig |
| **Phase 6** | Monitoring & Observability | 7-10 Tage | 🟢 Niedrig |
| **Phase 7** | Testing & QA | 10-13 Tage | 🟡 Mittel |
| **Phase 8** | Dokumentation | 8-11 Tage | 🟢 Laufend |

**Gesamtaufwand:** ~78-105 Arbeitstage

---

## Empfohlene Reihenfolge

### Sprint 1 (2 Wochen)
1. ✅ Phase 0: Kritische Fixes
2. ✅ Phase 1.1: Agent System Komplettierung
3. ✅ Phase 1.2: Workflow Execution Visualisierung

### Sprint 2 (2 Wochen)
4. Phase 1.3: Knowledge Graph
5. Phase 3.1: Agent Studio
6. Phase 4.1: 2FA Implementation

### Sprint 3 (2 Wochen)
7. Phase 2.1: Salesforce Integration
8. Phase 2.2: Slack Integration
9. Phase 2.4: Integration Hub UI

### Sprint 4 (2 Wochen)
10. Phase 3.2: Agent Marketplace
11. Phase 4.3: Advanced Admin
12. Phase 4.4: Team Collaboration

### Sprint 5 (2 Wochen)
13. Phase 5: Performance
14. Phase 6: Monitoring
15. Phase 7: Testing

### Laufend
- Phase 8: Dokumentation

---

## Nächste Schritte

1. **Sofort beginnen mit Phase 0** - WebSocket Fix und Pipeline Tab
2. **Team-Kapazität planen** - Wer arbeitet an welcher Phase?
3. **Stakeholder-Review** - Prioritäten mit Business abstimmen
4. **Sprint Planning** - Detaillierte Tasks pro Sprint erstellen

---

*Dokument erstellt: 2025-01-XX*
*Version: 1.0*
*Autor: Claude Code*
