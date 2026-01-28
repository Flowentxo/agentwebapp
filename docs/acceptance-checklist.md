# Acceptance-Checklist v1 (Go/No-Go für Launch)

## A11y & Performance
- [ ] **Lighthouse A11y ≥95** (Desktop + Mobile)
- [ ] **0 critical axe violations** (automated + manual)
- [ ] **TTFAS <1.2s** (Time To First Agent-Shown)

---

## UI/UX
- [ ] **StickySearch persistent**, `/` & `⌘K` Shortcut funktioniert
- [ ] **Helpers-Grid ≥8 Agents**, klare CTA je Card
- [ ] **Empty/Loading/Error States** für alle Listen

---

## Features
- [ ] **Agent-Run E2E** (Trigger → API → Logs → Status)
- [ ] **1 Automation produktiv**, History sichtbar, Retry funktioniert
- [ ] **Knowledge v1 mit Quellen** (Upload → Index → Query → Zitate)
- [ ] **Mind. 1 OAuth-Integration E2E nutzbar** (Connect → Use in Run)

---

## Collaboration
- [ ] **Workspace-Switch + Members** (basic RBAC: Owner/Member)

---

## Testing & Security
- [ ] **E2E-Tests grün** (Playwright, kritische Paths)
- [ ] **0 P0/P1 Bugs** (Jira/Linear)
- [ ] **Security-Scan passed** (OWASP ZAP, npm audit)

---

## Sign-Off

| Role | Name | Date | Decision |
|------|------|------|----------|
| Product Manager | __________ | __________ | ☐ GO ☐ NO-GO |
| Tech Lead | __________ | __________ | ☐ GO ☐ NO-GO |
| QA Lead | __________ | __________ | ☐ GO ☐ NO-GO |

**Final Decision**: ☐ GO | ☐ NO-GO
**Reason (if NO-GO)**: ________________________________
