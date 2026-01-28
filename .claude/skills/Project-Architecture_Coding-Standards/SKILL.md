# Skill: Project Architecture / Coding Standards (absolut #1)

**Zielgruppe:** Claude Code (oder jedes Coding‑Agent‑Setup)  
**Priorität:** 🔥 P0 — Muss bei *jedem* Code‑Output beachtet werden  
**Skill-ID:** `architecture-coding-standards`  
**Version:** 1.0  
**Letztes Update:** 2026-01-03

---

## 0) Warum dieser Skill (Kontext & Nutzen)

Ohne feste Architektur‑ und Standardregeln schreibt ein Agent zwar oft „funktionierenden“ Code – aber im falschen Ordner, mit falschen Patterns, mit inkonsistenten Namings oder mit unkontrolliertem State.

**Dieser Skill erzwingt daher:**
- konsistente Ablage („Wo kommt was hin?“)
- klare Layer-/Boundary-Regeln (Import-Richtungen, Verantwortlichkeiten)
- erlaubte vs. verbotene Patterns
- Naming‑Conventions (Dateien, Ordner, Typen, Komponenten, Tests)
- State‑Management‑Regeln (Frontend und Backend)

---

## 1) Geltungsbereich

Diese Regeln gelten für:
- neue Features, Bugfixes, Refactorings
- neue Dateien/Ordner
- Änderungen an bestehenden Modulen
- Tests, Utilities, Configs und Dokumentation

**Hard Rule:** Wenn das bestehende Projekt abweichende Standards hat, dann **hat das Projekt Vorrang**.  
In dem Fall gilt: **„Existing conventions > persönliche Vorlieben“**.

---

## 2) Golden Rules (nicht verhandelbar)

1. **Erst orientieren, dann bauen.**  
   Vor dem Schreiben von neuem Code: bestehende Struktur, Patterns und Namings im Repo prüfen und nachahmen.

2. **Minimaler Eingriff.**  
   Änderungen klein halten, keine großflächigen Umstrukturierungen ohne explizite Anforderung.

3. **Single Source of Truth.**  
   Kein doppeltes State‑Halten (z.B. Serverstate zusätzlich im Global Store). Kein Copy‑Paste von Logik über mehrere Orte.

4. **Klare Verantwortlichkeiten pro Layer/Modul.**  
   UI ≠ Business Logik ≠ Datenzugriff.

5. **Keine Layer‑Leaks.**  
   Höhere Layer dürfen niedrigere nutzen – niemals andersrum.

6. **Keine neuen Framework-/Pattern-Einführungen ohne Request.**  
   Kein „wir führen jetzt X ein“, wenn es nicht schon im Projekt existiert oder explizit gewünscht ist.

---

## 3) Referenz-Architektur (Default) – und wie du sie anpasst

> Falls das Projekt **keine** klar erkennbare Architektur vorgibt, nutze diese Default‑Struktur.  
> Falls eine Struktur existiert (Monorepo, Next.js App Router, NestJS, Django, etc.), **passe die Regeln an das vorgefundene Layout an**.

### 3.1 Default: Layered / Clean-ish Structure

```
src/
  app/              # App-Startpunkte, Router, DI/Composition Root, Framework Glue
  domain/           # Domänenmodelle, Policies, Value Objects, pure Business-Regeln
  application/      # Use-Cases, Services, Orchestrierung, Transaktionen, DTOs
  infrastructure/   # DB/HTTP Clients, Repos, Implementierungen, Provider
  ui/               # UI Komponenten, Views/Pages (falls nicht in app/)
  shared/           # Querschnitt: Logging, Utils, Types, Config, Guards
  tests/            # Test-Utilities, Fixtures (oder __tests__)
```

**Kurz erklärt:**
- **domain**: *rein* fachlich, möglichst framework‑frei, deterministisch, gut testbar.
- **application**: Use‑Cases/Workflows, orchestriert domain + infra via Interfaces.
- **infrastructure**: konkrete Implementierungen (DB, HTTP, Queue, Filesystem).
- **app**: entrypoints, Routing, container wiring, config, composition root.
- **shared**: utilities, die wirklich mehrfach genutzt werden.

---

## 4) Wo kommt was hin? (Ablage-Regeln)

### 4.1 Entscheidungsbaum

**Frage 1:** Ist es fachliche Logik, die unabhängig von UI/DB existiert?  
→ **Ja:** `src/domain/**`

**Frage 2:** Orchestriert es Schritte (Use Case), ruft Repos/APIs, validiert Inputs?  
→ **Ja:** `src/application/**`

**Frage 3:** Spricht es mit externen Systemen (DB, API, Queue, Cache, FS)?  
→ **Ja:** `src/infrastructure/**`

**Frage 4:** Ist es Framework-/App-Wiring (Routes, Server Start, Providers, DI)?  
→ **Ja:** `src/app/**`

**Frage 5:** Ist es UI (Components, Pages, Screens) ohne Fachkern?  
→ **Ja:** `src/ui/**` (oder Framework-üblich z.B. `app/`/`pages/` bei Next.js)

**Frage 6:** Ist es wirklich generisch (z.B. `formatDate`, `assertNever`), und wird mehrfach verwendet?  
→ **Ja:** `src/shared/**`  
→ **Nein:** bleib in Feature-/Layer‑Nähe (nicht vorschnell nach `shared/` schieben).

### 4.2 Typische Artefakte → Zielordner

- **Entities / Value Objects / Domain Errors:** `src/domain/`
- **Use Cases / Commands / Queries / Interactors:** `src/application/`
- **Repository Interfaces:** *Interfaces in* `src/application/` oder `src/domain/` (projektabhängig), Implementierung in `src/infrastructure/`
- **HTTP/DB Clients:** `src/infrastructure/clients/`
- **DB Migrations / Schema:** `src/infrastructure/db/` (oder Projektstandard)
- **Controllers/Routes:** `src/app/routes/` oder Framework-standard (z.B. `app/api/` bei Next.js)
- **UI Components / Pages:** `src/ui/` oder Framework-standard
- **Tests:** neben dem Modul (`*.test.ts`) oder `__tests__/` – konsistent im Projekt

---

## 5) Boundary- & Import-Regeln (Layering)

### 5.1 Erlaubte Import-Richtung (Default)

✅ `app` → `application` → `domain`  
✅ `app` → `infrastructure` (für wiring)  
✅ `application` → `domain`  
✅ `infrastructure` → `domain` (z.B. mapper)  
✅ `ui` → `application` (z.B. use-case calls) und `shared`

❌ `domain` → irgendwas anderes (kein infra, kein app, kein ui)  
❌ `application` → `app`  
❌ `application` → konkrete `infrastructure` Implementierungen (nur über Interfaces/Ports)  
❌ `ui` → `infrastructure` (UI darf nicht direkt DB/HTTP Clients instanziieren)

### 5.2 Ports & Adapter (wenn nötig)

Wenn `application` externe Dinge braucht (DB, HTTP, Filesystem), dann:
- definiere ein **Port/Interface** in `application` (oder `domain`),
- implementiere das Interface in `infrastructure`,
- **injecte** die Implementierung im Composition Root (`app`).

---

## 6) Erlaubte & verbotene Patterns

### 6.1 Erlaubt (Preferred)

- **Pure Functions** in `domain` (deterministisch, ohne Side Effects)
- **Dependency Inversion** über Interfaces/Ports
- **Composition over Inheritance**
- **Small Modules** (Single Responsibility)
- **Explicit DTO Mapping** zwischen Layern (keine „leaky“ Datenstrukturen)
- **Feature-local helpers** statt sofort `shared/` zu befüllen
- **Result/Outcome Pattern** (z.B. `Ok/Err`) oder klare Error-Strategie (siehe unten)

### 6.2 Verboten (Hard No)

- **God-Modules**: eine Datei, die „alles kann“
- **Hidden Side Effects** in `domain` (z.B. HTTP Calls, DB Zugriff)
- **Tight Coupling**: `application` importiert konkrete infra Klassen
- **Cross-Feature Grab**: „mal eben“ Logik aus einem fremden Feature ziehen, statt klare Schnittstellen
- **Circular Dependencies**
- **State Duplication** (Serverstate + Global Store + Local State)
- **„Utils“-Müllhalde**: unstrukturierte `utils.ts` mit 1000 Zeilen

### 6.3 Barrel Files (`index.ts`) — Standardregel

- ✅ Erlaubt: **ein** `index.ts` pro Ordner als kontrollierter Exportpunkt
- ❌ Verboten: Barrel-Ketten über viele Ebenen, die Importpfade unklar machen
- ❌ Verboten: „Wildcard Re-Export“ von großen Subtrees ohne klare Grenzen

---

## 7) Naming-Conventions

> Wenn das Repo bereits andere Conventions nutzt, übernimm exakt diese.  
> Wenn nicht, nutze diese Default-Regeln.

### 7.1 Dateien & Ordner

- **Ordner:** `kebab-case/`
- **Dateien:** `kebab-case.ts` / `kebab-case.tsx`
- **React Komponenten-Dateien (wenn React):** `PascalCase.tsx` *oder* `kebab-case.tsx` – aber konsistent.
- **Tests:** `*.test.ts` / `*.spec.ts` (nicht mischen)
- **Mocks/Fixtures:** `*.fixture.ts`, `*.mock.ts` (konsistent)

### 7.2 Code Symbole

- **Variablen/Funktionen:** `camelCase`
- **Klassen/Types/Interfaces:** `PascalCase`
- **Konstanten:** `SCREAMING_SNAKE_CASE` (nur für echte Konstanten)
- **Boolean:** bevorzugt `isX`, `hasX`, `canX`, `shouldX`
- **Events/Handlers:** `handleX`, `onX` (UI), `emitX` (Eventbus)

### 7.3 Domänen-Namen

- Domänenbegriffe **immer fachlich** benennen, nicht technisch:  
  z.B. `Invoice`, `PaymentTerms`, `UserRegistration` statt `DataModel1`.

### 7.4 Imports

- Imports gruppieren:  
  1) externe libs  
  2) interne aliased paths (`@/...`)  
  3) relative imports  
- Keine ungenutzten Imports.
- Keine tiefen relativen Pfade (`../../../../`) wenn Aliases existieren.

---

## 8) State-Management-Regeln (entscheidend)

> Ziel: Vorhersehbarer State, keine doppelte Wahrheit, klare Side-Effect Grenzen.

### 8.1 Grundprinzipien

1. **Local State first.**  
   UI‑State, der nur eine Komponente betrifft → lokal halten.

2. **Server State ≠ Client State.**  
   Daten vom Server gehören in ein Server-State System (z.B. React Query, SWR) oder in eine klar gekapselte Data‑Layer‑Abstraktion.

3. **Global State ist die Ausnahme, nicht die Regel.**  
   Nutze globalen State nur für:
   - Auth Session/Identity (wenn nötig)
   - UI globale Toggles (Theme, Locale)
   - Cross-Page Wizard / Multi-Step Flow
   - echte App-weite Zustände, die nicht server‑abgeleitet sind

4. **Side Effects isolieren.**  
   Netzwerk/IO nur in:
   - `infrastructure` (Clients)  
   - `application` (Use Cases orchestrieren)  
   UI triggert nur Use Cases / Actions, nicht direkt low-level IO.

5. **Keine globalen Mutable Singletons** für Business-State.  
   Backend: pro Request/Job sauberer Scope; Frontend: kein „hidden cache“ außerhalb definierter Layer.

### 8.2 Frontend (React/SPA) – Default Empfehlung

- **Local UI State:** `useState`, `useReducer` (komponentenlokal)
- **Server State:** React Query / SWR (wenn im Projekt vorhanden)
- **Global State:** Zustand/Redux/MobX **nur wenn vorhanden** und nach Projektstandard

**Hard Rules:**
- Keine Serverdaten manuell in Global Store kopieren (außer klar begründet + dokumentiert).
- Keine „derived state“ speichern, wenn man ihn berechnen kann.
- Complex Form State: lieber Formular-Library nach Projektstandard (z.B. React Hook Form), nicht selbst erfinden.

### 8.3 Backend (Node/Services) – Default Empfehlung

- Kein globaler Mutable State, der Request‑übergreifend „mitwächst“.
- Services/Use Cases sind **stateless** (oder verwalten State explizit über Datenbanken/Queues).
- Caching nur:
  - explizit (z.B. Redis) oder
  - klar begrenzte In‑Memory Caches mit TTL und dokumentiertem Zweck.

---

## 9) Error Handling & Validation (kurze Standardisierung)

> Fehlerstrategie muss konsistent sein, sonst wird Debugging teuer.

- **Domain Errors** in `domain` definieren (z.B. `InvalidEmailError`).
- `application` übersetzt Domain Errors in Use-Case Outcomes (z.B. `Result` / `Either`).
- `app`/Controller übersetzt Outcomes in HTTP Responses/UI Messages.

**Verboten:** „throw irgendwas irgendwo“, ohne klare Kette und Typisierung.

---

## 10) Checkliste für Claude Code (Pflicht vor dem finalen Output)

### 10.1 Vor dem Coding

- [ ] Gibt es bereits ein ähnliches Feature/Modul? → nachahmen
- [ ] Welcher Layer ist betroffen? (domain/application/infrastructure/app/ui/shared)
- [ ] Welche Dateien existieren schon, die du erweitern kannst statt neu zu erfinden?
- [ ] Welche Namings nutzt das Projekt?

### 10.2 Während dem Coding

- [ ] Abhängigkeiten verlaufen nur in erlaubter Richtung
- [ ] Kein neues Pattern ohne Grund/Request
- [ ] Keine doppelte State-Haltung
- [ ] Kleine, testbare Einheiten

### 10.3 Vor Abgabe

- [ ] Liegt jede Datei im richtigen Ordner?
- [ ] Sind Names & Exports konsistent?
- [ ] Keine Zyklen / keine Layer-Leaks
- [ ] Tests/Types/Docs angepasst (wenn relevant)

---

## 11) Mini-Beispiele (Mapping)

### Beispiel A: „Neue Business-Regel“

> „Ein Nutzer darf pro Tag max. 3 Aktionen durchführen.“

- `src/domain/policies/max-actions-per-day.ts` (pure rule)
- `src/application/use-cases/perform-action.ts` (orchestriert + nutzt policy)
- `src/infrastructure/repositories/action-repository.ts` (DB Zugriff)
- `src/app/routes/actions.ts` (HTTP Route / Controller)

### Beispiel B: „Neue UI-Komponente“

> „Ein Modal zur Bestätigung“

- `src/ui/components/confirm-modal/ConfirmModal.tsx`
- `src/ui/components/confirm-modal/confirm-modal.test.tsx` (falls Standard)
- Keine Businesslogik im Modal – nur Props + Callbacks

---

## 12) Kurzform (wenn du nur 10 Sekunden hast)

- **Ordner richtig wählen** → domain/application/infrastructure/app/ui/shared  
- **Imports nur nach unten** → domain importiert nichts  
- **Keine neuen Patterns** → Repo-Standard kopieren  
- **Naming konsistent** → keine Mischformen  
- **State sauber** → local first, server state getrennt, global nur selten

---
