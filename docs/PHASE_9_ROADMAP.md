# 🔄 PHASE 9: WORKFLOW INTEGRATION - ROADMAP

## 🎯 Ziel

**Enhanced Custom Tools Integration im Workflow-System**

Custom Tools nahtlos in das Workflow-System integrieren und die fehlenden Executor-Typen (Database Query, Webhook) vollständig implementieren, sodass Benutzer leistungsstarke, visuelle Workflows mit Custom Tools erstellen können.

---

## ✅ Aktueller Status (aus Analyse)

### Was bereits existiert:

#### Backend:
- ✅ **CustomToolExecutor** - Registriert als 'custom' Node-Type
- ✅ **WorkflowExecutionEngine** - 8 Executors (trigger, llm-agent, data-transform, condition, api-call, web-search, output, custom)
- ✅ **CustomToolRegistry** - CRUD für Custom Tools
- ✅ **CodeExecutorService** - VM2 Sandbox mit Security
- ✅ **APIConnectorService** - REST/GraphQL API Calls
- ⚠️ **DatabaseQueryExecutor** - Placeholder only
- ⚠️ **WebhookExecutor** - Placeholder only

#### Frontend:
- ✅ **VisualCanvas** - React Flow Workflow Builder
- ✅ **ModulePalette** - Zeigt Custom Tools an
- ✅ **ToolRegistry** - Browse & Test Custom Tools
- ⚠️ Parameter Mapping UI fehlt
- ⚠️ Real-time Execution Monitoring fehlt

#### Database:
- ✅ workflows, workflowExecutions, workflowShares Tables
- ✅ customTools, toolExecutionLogs Tables
- ✅ apiConnectors, codeSnippets, credentials Tables

---

## 🚀 Phase 9 - Implementierungs-Plan

### **Track 1: Enhanced UI Integration** (High Priority)

#### 1.1 ModulePalette Enhancement
**Ziel:** Custom Tools besser visualisieren und kategorisieren

**Tasks:**
- [ ] Custom Tools mit Icons anzeigen (basierend auf Tool-Typ)
- [ ] Tool-Kategorien im Palette (Utility, Data, Transformation, Validation)
- [ ] Tool-Beschreibung als Tooltip
- [ ] Drag-and-Drop Optimierung
- [ ] Recent/Favorite Tools Section

**Files:**
- `components/studio/ModulePalette.tsx`

#### 1.2 Parameter Mapping UI
**Ziel:** Visuelle Verbindung von Node Outputs zu Tool Inputs

**Tasks:**
- [ ] Parameter Mapping Dialog erstellen
- [ ] Visual Node Output → Tool Input Connector
- [ ] Type Validation Display (string → string ok, object → string error)
- [ ] Default Values UI
- [ ] Expression Builder (für berechnete Werte)

**Files:**
- `components/studio/ParameterMappingDialog.tsx` (neu)
- `components/studio/VisualCanvas.tsx` (update)

#### 1.3 Node Configuration Panel
**Ziel:** Tool-Parameter direkt im Node konfigurieren

**Tasks:**
- [ ] Side Panel für Node Configuration
- [ ] Dynamic Parameter Inputs (basierend auf Tool Schema)
- [ ] Validation Feedback
- [ ] Save/Cancel Actions

**Files:**
- `components/studio/NodeConfigPanel.tsx` (neu)

---

### **Track 2: Missing Executors** (High Priority)

#### 2.1 Database Query Executor
**Ziel:** Vollständige Implementierung von Database Queries

**Features:**
- [ ] PostgreSQL Support
- [ ] MySQL Support
- [ ] MongoDB Support (optional)
- [ ] Query Builder UI
- [ ] Result Pagination
- [ ] Connection Pooling
- [ ] Query Timeout Protection
- [ ] SQL Injection Prevention

**Files:**
- `server/services/DatabaseQueryExecutor.ts` (neu)
- `lib/db/schema-custom-tools.ts` (update - add queries table)
- `server/routes/custom-tools.ts` (add database query routes)

**Schema:**
```typescript
export const databaseQueries = pgTable('database_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  toolId: uuid('tool_id').references(() => customTools.id),
  name: varchar('name', { length: 100 }).notNull(),
  connectionId: uuid('connection_id').references(() => databaseConnections.id),
  query: text('query').notNull(),
  queryType: varchar('query_type', { length: 20 }), // SELECT, INSERT, UPDATE, DELETE
  parameters: jsonb('parameters').default([]),
  resultFormat: varchar('result_format', { length: 20 }).default('json'),
  timeout: integer('timeout').default(30000),
  createdAt: timestamp('created_at').defaultNow(),
});
```

#### 2.2 Webhook Executor
**Ziel:** Vollständige Implementierung von Webhooks

**Features:**
- [ ] Webhook URL Configuration
- [ ] HTTP Method Selection (POST, PUT, GET, DELETE)
- [ ] Headers Configuration
- [ ] Payload Template (JSON, Form-Data, XML)
- [ ] Authentication (Bearer, Basic, OAuth)
- [ ] Retry Logic with Exponential Backoff
- [ ] Response Validation
- [ ] Webhook Testing

**Files:**
- `server/services/WebhookExecutor.ts` (neu)
- `lib/db/schema-custom-tools.ts` (update - add webhooks table)
- `server/routes/custom-tools.ts` (add webhook routes)

**Schema:**
```typescript
export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  toolId: uuid('tool_id').references(() => customTools.id),
  name: varchar('name', { length: 100 }).notNull(),
  url: text('url').notNull(),
  method: varchar('method', { length: 10 }).default('POST'),
  headers: jsonb('headers').default({}),
  payloadTemplate: text('payload_template'),
  authType: varchar('auth_type', { length: 20 }),
  authConfig: jsonb('auth_config'),
  retryConfig: jsonb('retry_config').default({ maxRetries: 3, backoff: 'exponential' }),
  timeout: integer('timeout').default(10000),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

### **Track 3: Real-time Monitoring** (Medium Priority)

#### 3.1 Live Execution Updates
**Ziel:** Real-time Feedback während Workflow Execution

**Features:**
- [ ] WebSocket Connection für Live Updates
- [ ] Node Execution Progress (pending → running → success/error)
- [ ] Visual Node State Updates (färbige Borders)
- [ ] Execution Logs Stream
- [ ] Performance Metrics (duration per node)

**Files:**
- `server/services/WorkflowExecutionEngine.ts` (add WebSocket emits)
- `components/studio/VisualCanvas.tsx` (add WebSocket listener)
- `lib/hooks/useWorkflowExecution.ts` (neu)

#### 3.2 Execution History Viewer
**Ziel:** Vergangene Executions analysieren

**Features:**
- [ ] Execution List mit Filter (success, error, date range)
- [ ] Execution Detail View
- [ ] Node-by-Node Execution Timeline
- [ ] Input/Output Inspector
- [ ] Error Stack Traces
- [ ] Replay Execution (mit gleichen Inputs)

**Files:**
- `components/studio/ExecutionHistory.tsx` (neu)
- `components/studio/ExecutionDetailView.tsx` (neu)

---

### **Track 4: Advanced Features** (Low Priority)

#### 4.1 Tool Chaining Helper
**Ziel:** Einfacheres Verketten mehrerer Tools

**Features:**
- [ ] Auto-suggest kompatible Tools (Output Type → Input Type matching)
- [ ] Chain Templates (häufige Tool-Kombinationen)
- [ ] Batch Tool Creation (mehrere Tools auf einmal)

#### 4.2 Workflow Templates
**Ziel:** Vorgefertigte Workflows mit Custom Tools

**Features:**
- [ ] Template Gallery
- [ ] Template Categories (Data Processing, API Integration, Automation)
- [ ] Template Customization
- [ ] Import/Export Templates

#### 4.3 Error Recovery
**Ziel:** Automatische Fehlerbehandlung

**Features:**
- [ ] Retry Failed Nodes (mit configurable retry count)
- [ ] Fallback Nodes (wenn Node fehlschlägt)
- [ ] Error Notifications (Email, Slack, etc.)

---

## 📋 Implementation Priority

### **Sprint 1: Core Executors** (Week 1)
1. ✅ Workflow Analysis (Complete)
2. 🔄 Database Query Executor Implementation
3. 🔄 Webhook Executor Implementation
4. 🔄 Testing & Validation

### **Sprint 2: Enhanced UI** (Week 2)
1. ModulePalette Enhancement
2. Parameter Mapping UI
3. Node Configuration Panel
4. UI Testing

### **Sprint 3: Monitoring** (Week 3)
1. WebSocket Integration
2. Live Execution Updates
3. Execution History Viewer
4. Performance Optimization

### **Sprint 4: Polish & Launch** (Week 4)
1. Error Recovery Features
2. Workflow Templates
3. Documentation
4. User Testing
5. Production Deployment

---

## 🎯 Success Criteria

### Must-Have (Phase 9 Complete):
- ✅ Database Query Executor funktioniert (PostgreSQL minimum)
- ✅ Webhook Executor funktioniert (POST/GET minimum)
- ✅ Custom Tools erscheinen korrekt im ModulePalette
- ✅ Parameter Mapping funktioniert (visual + validation)
- ✅ Real-time Execution Monitoring zeigt Live-Progress
- ✅ Execution History speichert alle Executions
- ✅ End-to-End Test: Workflow mit 3+ Custom Tools

### Nice-to-Have (Future Phases):
- Tool Chaining Helper
- Workflow Templates Gallery
- Advanced Error Recovery
- Multi-Database Support (MySQL, MongoDB)
- OAuth Support für Webhooks

---

## 📊 Technical Architecture

### Data Flow:
```
User creates Workflow in Visual Builder
    ↓
Adds Custom Tool Nodes from ModulePalette
    ↓
Configures Parameters via NodeConfigPanel
    ↓
Maps Node Outputs → Tool Inputs via ParameterMappingDialog
    ↓
Saves Workflow (nodes + edges + config)
    ↓
Executes Workflow via WorkflowExecutionEngine
    ↓
For each Custom Tool Node:
    ├── CustomToolExecutor gets tool config
    ├── Resolves parameters from previous node outputs
    ├── Validates parameter types
    ├── Executes tool (CodeExecutor, APIConnector, DatabaseQuery, Webhook)
    ├── Emits progress via WebSocket
    ├── Stores result in nodeOutputs
    └── Passes to next nodes
    ↓
Workflow Complete → Save execution record
    ↓
User reviews in Execution History
```

### WebSocket Events:
```typescript
// Server → Client
emit('workflow:execution:start', { executionId, workflowId })
emit('workflow:node:start', { executionId, nodeId, nodeName })
emit('workflow:node:complete', { executionId, nodeId, output, durationMs })
emit('workflow:node:error', { executionId, nodeId, error })
emit('workflow:execution:complete', { executionId, status, totalDurationMs })

// Client → Server
on('workflow:execute', { workflowId, input })
on('workflow:stop', { executionId })
```

---

## 🔒 Security Considerations

### Database Queries:
- ✅ Parameterized Queries (prevent SQL injection)
- ✅ Read-Only User Accounts (für SELECT queries)
- ✅ Query Timeout Limits
- ✅ Result Size Limits (max 10,000 rows)
- ✅ Query Validation (whitelist allowed operations)

### Webhooks:
- ✅ HTTPS Only (reject HTTP)
- ✅ Credential Encryption (AES-256)
- ✅ Rate Limiting (max 100 requests/minute)
- ✅ Timeout Protection (10s default)
- ✅ Response Size Limits (max 10 MB)

### Code Execution:
- ✅ VM2 Sandbox (already implemented)
- ✅ Worker Threads (isolation)
- ✅ Resource Limits (CPU, Memory)
- ✅ No Network Access from Code (unless explicitly allowed)

---

## 📈 Performance Targets

### Workflow Execution:
- **Simple Workflow** (3 nodes): < 500ms
- **Complex Workflow** (10+ nodes): < 3s
- **Database Query Node**: < 2s (with indexing)
- **Webhook Node**: < 5s (with timeout)
- **Code Execution Node**: < 1s

### Real-time Monitoring:
- **WebSocket Latency**: < 50ms
- **Node Progress Updates**: < 100ms
- **UI Responsiveness**: 60 FPS (no jank)

### Scalability:
- **Concurrent Workflows**: 100+ simultaneous
- **Nodes per Workflow**: 50+ nodes supported
- **Execution History**: 10,000+ records searchable

---

## 🎉 Expected Impact

### For Users:
- 🚀 **10x Productivity** - Visual workflow building vs. manual scripting
- 🎨 **No-Code Power** - Complex automation without coding
- 🔄 **Reusability** - Custom Tools wiederverwendbar in vielen Workflows
- 📊 **Transparency** - Live-Monitoring zeigt genau was passiert
- 🔒 **Security** - Sandboxed execution, encrypted credentials

### For Business:
- 💰 **Revenue** - Premium Feature für Enterprise Kunden
- 🏆 **Competitive Edge** - OpenAI Agent Builder-Level Features
- 📈 **User Retention** - Ecosystem Lock-in durch Custom Workflows
- 🌐 **Marketplace** - Basis für Tool/Workflow Marketplace (Phase 10)

### Technical Excellence:
- ✅ **Enterprise-Grade** - Production-ready Workflow System
- ✅ **Extensible** - Easy to add new executor types
- ✅ **Scalable** - Handles high concurrency
- ✅ **Observable** - Full execution visibility
- ✅ **Secure** - Multiple layers of security

---

**Let's build the future of AI Agent Workflows! 🚀**
