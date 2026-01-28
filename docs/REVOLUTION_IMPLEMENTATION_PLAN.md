# 🚀 Revolution AI-Agent-System - Implementierungsplan

## 📊 Status Quo - Was bereits existiert

### ✅ Vollständig implementiert

#### **Datenbank-Schemas**
- ✅ `schema-workflows.ts` - Workflows, Executions, Versions, Shares
- ✅ `schema-integrations.ts` - OAuth Connections, Settings, Usage Logs
- ✅ `schema-custom-agents.ts` - Custom Agents, Knowledge Base, Actions, Embeddings
- ✅ `schema-custom-tools.ts` - Custom Tool Registry
- ✅ `schema-connections.ts` - Database Connections

#### **Backend Services**
- ✅ `WorkflowExecutionEngine.ts` - Node-by-node Workflow Execution
- ✅ `WorkflowExecutors.ts` - Trigger, LLM, Conditions, API-Call, Database, Webhook Executors
- ✅ `WorkflowSchedulerService.ts` - Cron-basierte Scheduling
- ✅ `GmailOAuthService.ts` - Gmail OAuth Flow & Email Sending
- ✅ `GoogleCalendarService.ts` - Google Calendar Integration
- ✅ `CustomToolRegistry.ts` - Tool Management
- ✅ `AgentBuilderService.ts` - Agent Creation
- ✅ `ActionExecutorService.ts` - Action Execution
- ✅ `IntegratedAgentService.ts` - Agent Orchestration

#### **API-Endpoints**
- ✅ `GET/POST /api/workflows` - Workflow CRUD
- ✅ `POST /api/workflows/:id/execute` - Workflow Execution
- ✅ `GET /api/workflow-executions` - Execution Logs
- ✅ `GET/POST /api/agents/custom` - Custom Agent CRUD
- ✅ `GET /api/integrations` - Integration Management
- ✅ `POST /api/custom-tools` - Tool Management

---

## 🔴 Was fehlt - Implementierungsbedarf

### **Phase 1 - Core Integrationen (Priorität: KRITISCH)**

#### 1. HubSpot OAuth Integration
**Datei:** `server/services/HubSpotOAuthService.ts`

```typescript
export class HubSpotOAuthService {
  // OAuth Flow
  getAuthUrl(userId: string): string
  handleCallback(code: string, userId: string): Promise<{success: boolean}>

  // CRM Operations
  async createContact(data: ContactData): Promise<Contact>
  async updateContact(id: string, data: Partial<ContactData>): Promise<Contact>
  async createDeal(data: DealData): Promise<Deal>
  async updateDeal(id: string, data: Partial<DealData>): Promise<Deal>
  async createTicket(data: TicketData): Promise<Ticket>
  async searchContacts(query: string): Promise<Contact[]>
}
```

**Status:** ❌ Nicht implementiert
**Aufwand:** ~6 Stunden
**Dependencies:** HubSpot API Client, OAuth Credentials

---

#### 2. Salesforce OAuth Integration
**Datei:** `server/services/SalesforceOAuthService.ts`

```typescript
export class SalesforceOAuthService {
  // OAuth Flow
  getAuthUrl(userId: string): string
  handleCallback(code: string, userId: string): Promise<{success: boolean}>

  // CRM Operations
  async createLead(data: LeadData): Promise<Lead>
  async updateLead(id: string, data: Partial<LeadData>): Promise<Lead>
  async createOpportunity(data: OpportunityData): Promise<Opportunity>
  async query(soql: string): Promise<SalesforceRecord[]>
}
```

**Status:** ❌ Nicht implementiert
**Aufwand:** ~6 Stunden
**Dependencies:** JSForce Library, OAuth Credentials

---

#### 3. WhatsApp Business API Integration
**Datei:** `server/services/WhatsAppBusinessService.ts`

```typescript
export class WhatsAppBusinessService {
  async sendMessage(to: string, message: string): Promise<MessageResponse>
  async sendTemplate(to: string, templateName: string, params: any[]): Promise<MessageResponse>
  webhookHandler(payload: WhatsAppWebhook): Promise<void>
}
```

**Status:** ❌ Nicht implementiert
**Aufwand:** ~4 Stunden
**Dependencies:** WhatsApp Business API Credentials

---

### **Phase 2 - Workflow-Engine-Erweiterungen (Priorität: HOCH)**

#### 4. Webhook-Trigger-System
**Datei:** `server/services/WebhookTriggerService.ts`

**Fehlende Features:**
- ❌ Webhook-URL-Generierung pro Workflow
- ❌ Webhook-Authentifizierung (API-Keys, HMAC-Signatur)
- ❌ Webhook-Queue für hohe Last
- ❌ Webhook-Replay-Mechanismus

**Implementierung:**
```typescript
export class WebhookTriggerService {
  generateWebhookUrl(workflowId: string): Promise<WebhookConfig>
  registerWebhook(workflowId: string, config: WebhookConfig): Promise<void>
  handleIncomingWebhook(webhookId: string, payload: any): Promise<ExecutionResult>
  validateWebhookSignature(payload: any, signature: string): boolean
}
```

**Aufwand:** ~8 Stunden

---

#### 5. Schedule-Trigger mit Cron
**Datei:** `server/services/ScheduleTriggerService.ts`

**Status:** ⚠️ Teilweise implementiert
**Fehlend:**
- ❌ UI für Cron-Ausdruck-Builder
- ❌ Timezone-Support
- ❌ Missed-Run-Handling
- ❌ Schedule-Pause/Resume

**Aufwand:** ~4 Stunden

---

#### 6. Event-Trigger-System
**Datei:** `server/services/EventTriggerService.ts`

**Neue Features:**
```typescript
export class EventTriggerService {
  // Event-basierte Trigger (z.B. "Neuer Lead in HubSpot")
  registerEventListener(event: EventType, workflowId: string): Promise<void>
  emitEvent(event: Event): Promise<void>

  // Events:
  // - crm.contact.created
  // - crm.deal.updated
  // - email.received
  // - calendar.event.created
}
```

**Status:** ❌ Nicht implementiert
**Aufwand:** ~10 Stunden

---

### **Phase 3 - AI-Features (Priorität: HOCH)**

#### 7. Lead-Qualifizierung-Service
**Datei:** `server/services/LeadQualificationService.ts`

```typescript
export class LeadQualificationService {
  async qualifyLead(leadData: LeadData): Promise<QualificationResult> {
    // AI-basierte Bewertung nach:
    // - Budget (verfügbares Budget erkannt?)
    // - Authority (Entscheidungsbefugnis?)
    // - Need (konkreter Bedarf?)
    // - Timeline (Zeitrahmen für Kauf?)

    return {
      score: 0-100,
      bant: { budget: true, authority: true, need: true, timeline: true },
      reasoning: "AI-generierte Begründung",
      nextActions: ["E-Mail Follow-up", "Meeting buchen"]
    }
  }
}
```

**Status:** ❌ Nicht implementiert
**Aufwand:** ~6 Stunden

---

#### 8. Email-Generation-Service
**Datei:** `server/services/EmailGenerationService.ts`

```typescript
export class EmailGenerationService {
  async generateFollowUpEmail(context: EmailContext): Promise<GeneratedEmail> {
    // Context: Lead-Daten, vorherige Kommunikation, Ziel
    // Output: Personalisierte E-Mail mit Subject + Body
  }

  async generateMeetingRequest(context: MeetingContext): Promise<GeneratedEmail>
  async generateProposal(context: ProposalContext): Promise<GeneratedEmail>
}
```

**Status:** ❌ Nicht implementiert
**Aufwand:** ~5 Stunden

---

### **Phase 4 - Template-Engine (Priorität: MITTEL)**

#### 9. Variable-Replacement-Engine
**Datei:** `server/services/TemplateEngine.ts`

```typescript
export class TemplateEngine {
  render(template: string, variables: Record<string, any>): string {
    // Unterstützt:
    // - {{variable.path}} - Einfache Variablen
    // - {{name|"Default"}} - Fallback-Werte
    // - {{date|format:"DD.MM.YYYY"}} - Formatter
    // - {{#if premium}}VIP{{/if}} - Conditionals
  }
}
```

**Status:** ❌ Nicht implementiert
**Aufwand:** ~4 Stunden

---

### **Phase 5 - Dashboard & Monitoring (Priorität: MITTEL)**

#### 10. Real-Time Metrics Service
**Datei:** `server/services/MetricsService.ts`

```typescript
export class MetricsService {
  async getSystemHealth(): Promise<SystemHealthMetrics>
  async getAgentPerformance(agentId?: string): Promise<AgentPerformanceMetrics>
  async getWorkflowExecutionStats(timeRange: TimeRange): Promise<ExecutionStats>
  async getIntegrationStatus(): Promise<IntegrationStatusMap>
  async getCostTracking(userId: string): Promise<CostMetrics>
}
```

**Status:** ⚠️ Teilweise implementiert (Basic Metrics vorhanden)
**Fehlend:** Real-time WebSocket-Updates, Cost-Tracking
**Aufwand:** ~8 Stunden

---

### **Phase 6 - Security & Permissions (Priorität: HOCH)**

#### 11. Multi-Tenancy & RBAC
**Datei:** `server/middleware/rbac-middleware.ts`

**Fehlend:**
- ❌ Team-Isolation (Multi-Tenancy)
- ❌ Permissions-System (Wer darf was?)
- ❌ Workflow-Approval-System (für kritische Actions)
- ❌ Audit-Logs für Admin-Aktionen

**Aufwand:** ~10 Stunden

---

#### 12. Credential-Encryption
**Status:** ⚠️ Unklar (Prüfen ob OAuth-Tokens verschlüsselt gespeichert werden)
**Todo:** Implementiere AES-256-Verschlüsselung für alle `accessToken` in `oauthConnections`

**Aufwand:** ~3 Stunden

---

## 🎯 Priorisierter Implementierungsplan

### **Woche 1-2: MVP (Phase 1)**

#### Sprint 1 (Woche 1)
- [ ] **Tag 1-2:** HubSpot OAuth Service implementieren
- [ ] **Tag 3-4:** Salesforce OAuth Service implementieren
- [ ] **Tag 5:** API-Endpoints für Integrationen (`/api/integrations/hubspot/*`, `/api/integrations/salesforce/*`)

#### Sprint 2 (Woche 2)
- [ ] **Tag 1-2:** Webhook-Trigger-System implementieren
- [ ] **Tag 3:** Schedule-Trigger erweitern (Cron-UI, Timezone)
- [ ] **Tag 4-5:** Frontend-Integration: Agent-Erstellung mit echten API-Calls verbinden

**Deliverable:** Funktionierender Agent mit HubSpot-Integration, Webhook-Trigger, E-Mail-Versand

---

### **Woche 3-4: Core Features (Phase 2 + 3)**

#### Sprint 3 (Woche 3)
- [ ] **Tag 1-2:** Lead-Qualifizierung-Service (AI)
- [ ] **Tag 3-4:** Email-Generation-Service (AI)
- [ ] **Tag 5:** Event-Trigger-System (z.B. "Neuer Lead in HubSpot")

#### Sprint 4 (Woche 4)
- [ ] **Tag 1-2:** Template-Engine mit Variable-Replacement
- [ ] **Tag 3-4:** Workflow-Engine: Multi-Step-Actions + Error-Handling
- [ ] **Tag 5:** WhatsApp Business Integration

**Deliverable:** Vollständiger Workflow: Neuer Lead → AI-Qualifizierung → Follow-up-E-Mail → Meeting-Buchung

---

### **Woche 5-6: Production-Ready (Phase 4 + 5 + 6)**

#### Sprint 5 (Woche 5)
- [ ] **Tag 1-2:** Real-Time Metrics mit WebSocket
- [ ] **Tag 3:** Cost-Tracking-Service
- [ ] **Tag 4-5:** RBAC + Multi-Tenancy

#### Sprint 6 (Woche 6)
- [ ] **Tag 1-2:** Credential-Encryption + Security-Audit
- [ ] **Tag 3:** Execution-Logs UI verbessern
- [ ] **Tag 4-5:** Testing + Bug-Fixing
- [ ] **Tag 5:** Deployment-Pipeline (Cloud Run)

**Deliverable:** Produktionsreifes System auf Google Cloud

---

## 📋 Offene Entscheidungen

### **Technische Entscheidungen**
1. **HubSpot vs. Salesforce:** Welche CRM-Integration hat Priorität?
2. **AI-Model:** OpenAI GPT-4o oder Claude 3.5 Sonnet für Lead-Qualifizierung?
3. **Queue-System:** BullMQ (bereits vorhanden) oder Google Cloud Tasks?
4. **Deployment:** Cloud Run (serverless) oder GKE (Kubernetes)?

### **Business-Entscheidungen**
1. **Pricing:** Wie wird AI-Usage abgerechnet? (Pro Token, Pro Request, Flat-Fee?)
2. **Rate-Limits:** Wie viele Workflow-Executions pro User/Team?
3. **Free-Tier:** Welche Features sind kostenlos?

---

## ✅ Nächste Schritte

### **Sofort starten:**
1. **HubSpot OAuth Service implementieren** (höchste Priorität)
2. **Webhook-Trigger-System** (für externe Trigger)
3. **Frontend mit Backend verbinden** (Agent-Erstellung funktionsfähig machen)

### **Was brauchst du von mir?**
- Soll ich mit **HubSpot OAuth** beginnen?
- Soll ich ein **Starter-Template** für die Revolution-Page erstellen?
- Brauchst du **HubSpot API Credentials** (Client ID, Secret)?

---

**Bereit für Phase 1? Sag mir, womit ich anfangen soll! 🚀**
