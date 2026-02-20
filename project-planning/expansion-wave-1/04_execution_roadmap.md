# Flowent Execution Roadmap — 7 Batches

> **Version:** 1.0.0
> **Stand:** 15.02.2026
> **Umfang:** 70 Agenten in 7 Batches a 10 Agenten
> **Strategie:** Priorisierung nach Business Value und technischer Komplexitaet

---

## Uebersicht

| Batch | Cluster | Prioritaet | Critical Agents | Abhaengigkeiten |
| --- | --- | --- | --- | --- |
| 1 | Dev-Team | 1 (Hoechste) | 2 | Keine (Fundament) |
| 2 | Finance & Compliance | 2 | 8 | Batch 1 (Error Handling) |
| 3 | Real Estate & Construction | 3 | 3 | Batch 2 (Waehrungsformat) |
| 4 | Sales & Revenue | 4 | 3 | Batch 1 (CRM Integration) |
| 5 | HR & People Operations | 5 | 1 | Batch 2 (Compliance) |
| 6 | Marketing & Brand | 6 | 1 | Batch 4 (Funnel Daten) |
| 7 | Medical Admin | 7 | 2 | Batch 2 (Abrechnungslogik) |

---

## Batch 1: The Dev-Team (Prioritaet 1 — Fundament)

> **Warum zuerst?** Diese Agenten verbessern unsere eigene Entwicklungsqualitaet. Sie sind die Basis, auf der alle weiteren Batches aufbauen.

| ID | Agent | Komplexitaet | Geschaetzter Aufwand |
| --- | --- | --- | --- |
| 01 | Bug Hunter | Mittel | Log-Parsing, Pattern-Matching |
| 02 | Code Refactorer | Hoch | AST-Analyse, Code-Transformation |
| 03 | Security Pentester | Hoch | OWASP Top 10, API-Scanning |
| 04 | API Documenter | Mittel | OpenAPI 3.0 Spec Generation |
| 05 | Unit Test Writer | Hoch | Jest/Vitest, Coverage-Analyse |
| 06 | UX Auditor | Mittel | WCAG 2.1, Heuristiken |
| 07 | SQL Optimizer | Hoch | Query-Plan-Analyse, Index-Empfehlung |
| 08 | Gitkeeper | Mittel | Merge-Strategien, Conflict Resolution |
| 09 | Dependency Watchdog | Mittel | CVE-Datenbank, Semver-Analyse |
| 10 | DevOps Orchestrator | Hoch | CI/CD Pipeline-Generierung |

**Abnahmekriterien Batch 1:**

- Alle 10 Agenten erreichen mindestens Quality Gate Score 8
- Zod-Schemas fuer alle Input/Output definiert
- Error Handling nach Enterprise Standard
- Integration in bestehendes Agent-Chat-System (`/agents/{id}/chat`)

---

## Batch 2: Finance & Compliance (Prioritaet 2 — High Value)

> **Warum Prioritaet 2?** Hoechster Business Value. 8 von 10 Agenten sind "Critical". DACH-Compliance ist das Alleinstellungsmerkmal.

| ID | Agent | Komplexitaet | Geschaetzter Aufwand |
| --- | --- | --- | --- |
| 21 | DATEV Export Agent | Hoch | CSV-Spec, Kontenrahmen SKR03/04 |
| 22 | Reisekosten Pruefer | Hoch | Aktuelle Pauschalen, BMF-Schreiben |
| 23 | GoBD Archivator | Hoch | Revisionssichere Ablage, Verfahrensdoku |
| 24 | Rechnungseingang OCR | Hoch | IBAN-Extraktion, Datumserkennung |
| 25 | Mahnwesen Automat | Mittel | 3-Stufen-Prozess, Fristen |
| 26 | Cashflow Forecaster | Hoch | Liquiditaetsplanung, Szenario-Analyse |
| 27 | USt-ID Validator | Mittel | EU-VIES-Pruefung, Pruefsummen |
| 28 | Spesen Detektiv | Mittel | Muster-Erkennung, Anomalien |
| 29 | Skonto Optimierer | Niedrig | Zahlungsziel-Berechnung |
| 30 | Kreditkarten Matcher | Mittel | Beleg-Zuordnung, Fuzzy-Matching |

**Abnahmekriterien Batch 2:**

- GoBD-konforme Ausgabeformate
- DATEV-kompatible CSV-Exporte
- Waehrungsformate: EUR X.XXX,XX durchgaengig
- Steuerrechtliche Hinweise wo relevant
- Quality Gate Score >= 9 fuer alle Critical Agents

---

## Batch 3: Real Estate & Construction (Prioritaet 3 — Vertical)

> **Warum Prioritaet 3?** Starkes Vertical mit hohem Umsatzpotenzial im DACH-Raum. VOB-Konformitaet als Differenzierungsmerkmal.

| ID | Agent | Komplexitaet | Geschaetzter Aufwand |
| --- | --- | --- | --- |
| 31 | Aufmass Rechner | Mittel | DIN 277, Flaechenberechnung |
| 32 | Baustellen Tagebuch | Mittel | Voice-to-Text, Protokoll-Format |
| 33 | Material Besteller | Niedrig | Preisanfrage-Templates |
| 34 | Maengelruegen Manager | Hoch | VOB/B Fristen, Rechtskonform |
| 35 | Bauzeiten Waechter | Hoch | GANTT-Abgleich, Verzoegerungsanalyse |
| 36 | Expose Texter | Niedrig | Immobilien-Beschreibung, SEO |
| 37 | Mietvertrag Creator | Hoch | BGB/MietR, Wohnraum vs. Gewerbe |
| 38 | Nebenkosten Abrechner | Hoch | HeizKV, Verteilerschluessel |
| 39 | Sanierungs Rechner | Mittel | Kostenschaetzung nach DIN 276 |
| 40 | Objekt Bewerter | Hoch | Vergleichswert, Ertragswert, Sachwert |

**Abnahmekriterien Batch 3:**

- VOB-Referenzen korrekt zitiert
- DIN-Normen korrekt angewendet
- Flaechenberechnungen nach DIN 277
- Mietrechtliche Unterscheidung Wohnraum/Gewerbe korrekt
- Quality Gate Score >= 8

---

## Batch 4: Sales & Revenue Engine (Prioritaet 4)

> **Warum Prioritaet 4?** Direkte Umsatzrelevanz, aber abhaengig von funktionierendem CRM-System.

| ID | Agent | Komplexitaet | Geschaetzter Aufwand |
| --- | --- | --- | --- |
| 11 | Lead Qualifier | Mittel | BANT-Framework, Scoring |
| 12 | Cold Email Personalizer | Mittel | Personalisierung, Templates |
| 13 | Objection Handler | Mittel | Einwandbehandlung, Gesprächsleitfaden |
| 14 | Tender Scout | Hoch | Ausschreibungs-Parsing, Bewertung |
| 15 | Upsell Spotter | Mittel | Cross-Selling Mustererkennung |
| 16 | Meeting Prep | Niedrig | Kunden-Briefing, Agenda |
| 17 | Competitor Analyst | Hoch | Marktbeobachtung, SWOT |
| 18 | Proposal Generator | Hoch | DIN 5008, Angebotsstruktur |
| 19 | CRM Hygienist | Mittel | Datenbereinigung, Duplikat-Erkennung |
| 20 | LinkedIn Authority | Mittel | B2B Content, Thought Leadership |

**Abnahmekriterien Batch 4:**

- DIN 5008 fuer alle Geschaeftsdokumente
- DSGVO-konforme Cold-Email-Personalisierung
- Kein aggressiver oder draengender Ton
- Quality Gate Score >= 8

---

## Batch 5: HR & People Operations (Prioritaet 5)

> **Warum Prioritaet 5?** Wichtig fuer Skalierung, aber weniger umsatzrelevant als Sales/Finance.

| ID | Agent | Komplexitaet | Geschaetzter Aufwand |
| --- | --- | --- | --- |
| 41 | Stellenanzeigen Optimierer | Mittel | AGG-Konformitaet, m/w/d |
| 42 | Bewerber Screener | Hoch | Skill-Matching, Bias-Vermeidung |
| 43 | Arbeitszeugnis Decoder | Hoch | Zeugnissprache, Noten 1-6 |
| 44 | Onboarding Guide | Niedrig | Einarbeitungsplan, Checkliste |
| 45 | Urlaubs Planer | Mittel | Team-Kapazitaet, BUrlG |
| 46 | Krankmeldung Erfasser | Niedrig | Attest-Verwaltung, Fristen |
| 47 | Skill Gap Analyst | Mittel | Kompetenzmatrix, Schulungsbedarf |
| 48 | Gehalts Benchmark | Hoch | Marktvergleich, Tarifvertraege |
| 49 | Shift Planner | Hoch | ArbZG-konform, Schichtmodelle |
| 50 | Exit Interviewer | Niedrig | Strukturierte Fragen, Auswertung |

**Abnahmekriterien Batch 5:**

- AGG-konforme Stellenanzeigen (diskriminierungsfrei)
- ArbZG-konforme Schichtplanung
- Keine Bias in Bewerber-Screening
- Quality Gate Score >= 8

---

## Batch 6: Marketing & Brand (Prioritaet 6 — B2B Focus)

> **Warum Prioritaet 6?** Unterstuetzend fuer Sales, aber nicht kritisch fuer Kernbetrieb.

| ID | Agent | Komplexitaet | Geschaetzter Aufwand |
| --- | --- | --- | --- |
| 51 | SEO Strategist | Mittel | Keyword-Recherche, Cluster-Bildung |
| 52 | Whitepaper Wizard | Hoch | Lead-Magnet, Fachcontent |
| 53 | Newsletter Curator | Niedrig | Branchen-News, Zusammenfassung |
| 54 | Crisis Manager | Hoch | PR-Krisenreaktion, Statements |
| 55 | Ad Copy B2B | Mittel | LinkedIn Ads, Zeichenlimits |
| 56 | Case Study Writer | Mittel | Erfolgsgeschichten-Struktur |
| 57 | Webinar Architect | Niedrig | Ablaufplaene, Moderationsleitfaden |
| 58 | Press Release Bot | Mittel | Pressemitteilung, DIN 5008 |
| 59 | Review Manager | Niedrig | Bewertungs-Antworten |
| 60 | Funnel Architect | Hoch | Conversion-Pfade, A/B-Test |

**Abnahmekriterien Batch 6:**

- B2B-Tonalitaet (nicht B2C)
- DIN 5008 fuer Pressemitteilungen
- SEO: Aktuelle Best Practices
- Quality Gate Score >= 8

---

## Batch 7: Medical Admin (Prioritaet 7 — Reguliert)

> **Warum zuletzt?** Hoechste regulatorische Anforderungen. Erfordert maximale Reife der Plattform. KEINE Diagnosen — nur administrative Unterstuetzung.

| ID | Agent | Komplexitaet | Geschaetzter Aufwand |
| --- | --- | --- | --- |
| 61 | Arztbrief Assistent | Hoch | Diktat-Verarbeitung, Briefstruktur |
| 62 | ICD-10 Coder | Hoch | Diagnose-zu-Code Mapping |
| 63 | Termin Optimierer | Mittel | Praxis-Auslastung, Kapazitaet |
| 64 | Pflege Doku Helfer | Mittel | Berichtswesen, Pflegeplanung |
| 65 | Rezept Management | Mittel | Wiederholungsrezepte, Pruefung |
| 66 | Laborwert Erklaerer | Mittel | Patientenverstaendliche Erklaerung |
| 67 | Abrechnungs Helfer | Hoch | GOAe-Ziffern, EBM-Katalog |
| 68 | Hygiene Planer | Niedrig | Reinigungs-Protokolle, Checklisten |
| 69 | Inventar Manager | Niedrig | Medikamenten-Bestand, Mindesthaltbarkeit |
| 70 | Patienten Info Bot | Niedrig | FAQ, Aufklaerungsboegen |

**Abnahmekriterien Batch 7:**

- KEINE Diagnosestellung (nur administrative Unterstuetzung)
- Disclaimer bei jedem medizinischen Kontext
- ICD-10-GM (deutsche Modifikation, nicht WHO-Version)
- GOAe-Ziffern aktuell und korrekt
- DSGVO-Konformitaet besonders streng (Gesundheitsdaten = Art. 9 DSGVO)
- Quality Gate Score >= 9 fuer alle Agenten

---

## Zusammenfassung Timeline

```
Batch 1: Dev-Team           ████████████  [NAECHSTER SCHRITT]
Batch 2: Finance            ░░░░████████████
Batch 3: Real Estate        ░░░░░░░░████████████
Batch 4: Sales              ░░░░░░░░░░░░████████████
Batch 5: HR                 ░░░░░░░░░░░░░░░░████████████
Batch 6: Marketing          ░░░░░░░░░░░░░░░░░░░░████████████
Batch 7: Medical            ░░░░░░░░░░░░░░░░░░░░░░░░████████████
```

---

## Naechster Schritt

**Batch 1 starten:** Implementierung der 10 Dev-Team Agenten.

Reihenfolge innerhalb Batch 1:

1. Bug Hunter (ID 01) — Einfachster Einstieg, sofort nutzbar
2. Dependency Watchdog (ID 09) — Critical, Security-relevant
3. Unit Test Writer (ID 05) — Verbessert Qualitaet aller folgenden Agenten
4. API Documenter (ID 04) — Dokumentation fuer Integration
5. Gitkeeper (ID 08) — Workflow-Verbesserung
6. SQL Optimizer (ID 07) — Performance-Grundlage
7. UX Auditor (ID 06) — Frontend-Qualitaet
8. Code Refactorer (ID 02) — Hohe Komplexitaet
9. Security Pentester (ID 03) — Hohe Komplexitaet, Critical
10. DevOps Orchestrator (ID 10) — Hoechste Komplexitaet, zum Schluss
