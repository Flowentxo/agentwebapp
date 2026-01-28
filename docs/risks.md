# Top-Risiken & Gegenmaßnahmen

## 1. OAuth & API Limits
**Risiko**: Externe APIs (Google, Slack) haben Rate-Limits und Token-Expiry.
**Gegenmaßnahmen**:
- Backoff/Retry-Strategie
- Quota-Monitoring
- Circuit-Breaker-Pattern
- Token-Refresh automatisiert

---

## 2. RAG-Qualität
**Risiko**: Knowledge-Antworten ungenau oder ohne Quellen.
**Gegenmaßnahmen**:
- Eval mit Golden-Dataset (Zitate-Check)
- User-Feedback-Loop
- Embedding-Caching
- Hybrid-Search (Keyword + Semantic)

---

## 3. Multi-Tenancy
**Risiko**: Data-Leakage zwischen Workspaces.
**Gegenmaßnahmen**:
- Row-Level-Security (RLS) Policies
- E2E-Tests pro Workspace
- Penetration-Tests vor Launch
- Audit-Logs für alle Zugriffe

---

## 4. Scheduler/Queues
**Risiko**: Jobs verloren bei Server-Restart, Duplikate bei Retry.
**Gegenmaßnahmen**:
- Persistent-Queue (Bull mit Redis)
- Dead-Letter-Queue
- Idempotenz-Keys
- Health-Checks für Queue-Status

---

## 5. Datenschutz/PII
**Risiko**: Sensitive Daten in Logs, unverschlüsselten Uploads, OAuth-Tokens.
**Gegenmaßnahmen**:
- Scopes minimieren (OAuth)
- Verschlüsselung-at-rest (Tokens, Knowledge)
- PII-Scrubbing in Logs
- GDPR-konforme DPA (Data Processing Agreement)
