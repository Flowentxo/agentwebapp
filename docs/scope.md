# Sintra-Parity — Scope v1

## Ziele

- **UI- und Funktions-Parität** zum öffentlichen Auftritt von Sintra (Helpers-Katalog, Automations, Brain AI/Knowledge, Integrations, Workspaces)
- **Klare Informationsarchitektur**, AA-konforme A11y, performante States
- **End-to-end lauffähige „Agent Run"-Kette** inkl. Logs und min. 1 produktiver Automation

## Nicht-Ziele (v1)

- Vollständiger Workflow-Builder mit komplexen Branches
- Dutzende Integrationen; wir starten mit 1–2
- Billing & Quotas nur als Vorbereitung, kein komplexes Entitlement

## Nutzer-Workflows (kurz)

1. **Helpers/Agents entdecken** → Details → Run → Logs
2. **Knowledge hinzufügen** → Agent nutzt RAG-Kontext
3. **Automation anlegen** → zeitgesteuert ausführen → History prüfen
4. **Integration verbinden** → in Run/Automation verwenden

## Akzeptanzkriterien (MVP)

- ✅ Lighthouse A11y ≥ 95; 0 critical axe-Verstöße
- ✅ Pro Agent-Card exakt 1 Primär-CTA; Sticky-Search immer sichtbar
- ✅ Run funktioniert end-to-end; Status/Logs sichtbar
- ✅ Mind. 1 Automation lauffähig (z. B. Social-Post planen)
- ✅ Knowledge v1: Antwort mit Quellenzitaten
- ✅ Mind. 1 Integration verbunden (OAuth), end-to-end nutzbar
