# Roadmap v1 (8–12 Wochen)

## Sprint 1 — Foundations & Dashboard Parity (UI/A11y)

### Deliverables
- Tokens konsolidieren
- Helpers-Grid (≥8 Agents)
- StickySearch
- Empty/Loading/Error States
- Playwright + axe-core Integration

### Metrics
- ✅ Lighthouse A11y ≥95
- ✅ 0 critical axe violations
- ✅ TTFAS <1.2s

### Risiken
- Dark-Theme-Kontraste
- Fokusführung in Modals

---

## Sprint 2 — Agents & Runs (API + Detail + Logs)

### Deliverables
- `/api/agents` CRUD
- `/api/runs` Execution-Engine
- Agent-Detail-Page
- Logs-Streaming (WebSocket)
- Seed-Daten
- „Run" end-to-end funktional

### Metrics
- ✅ E2E „Run" grün in CI
- ✅ Fehlerquote <1%

### Risiken
- Long-running Jobs
- Status-Polling/WebSocket-Stabilität

---

## Sprint 3 — Automations & Knowledge v1

### Deliverables
- `/automations` (List/Create/Edit)
- Scheduler-Integration (node-cron/Bull)
- Knowledge Upload + Index
- RAG-Injection in Agent-Context
- Quellen-Zitate im UI

### Metrics
- ✅ 1 produktive Automation
- ✅ RAG-Eval mit Zitaten ≥80%

### Risiken
- Rechte/Datenschutz bei Knowledge-Uploads
- Speicher-/Indexkosten (Pinecone/Weaviate)

---

## Sprint 4 — Integrationen & Workspaces Light

### Deliverables
- OAuth-Flow (z. B. Google + 1 Social)
- Connect/Disconnect UI
- Workspace-Switch
- Members + Rollen (Owner/Member)

### Metrics
- ✅ E2E Connect nutzbar
- ✅ 0 P0 Bugs

### Risiken
- OAuth-Flows (Token-Refresh, Expiry)
- Multi-Tenancy-Policies (Data-Leakage)
