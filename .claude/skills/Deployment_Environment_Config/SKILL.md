---
name: deployment-config
version: 1.0
category: "Deployment / Environment / Config"
purpose: "Setup-Fehler vermeiden: Env-Variablen, Build, Deployment-Ziele und Feature-Flags sauber definieren und reproduzierbar machen."
---

# Skill: deployment-config (Deployment / Environment / Config)

👉 **Spart Debug-Hölle**  
Fehler entstehen oft nicht im Code, sondern im **Setup**: fehlende Variablen, falsche Secrets, andere Build-Flags, Drift zwischen Staging & Prod, unterschiedliche Laufzeit-Umgebungen.

Diese Skill-Anleitung hilft dabei, **Deployment, Environment und Konfiguration** eines Projekts systematisch zu erfassen, zu standardisieren und zu dokumentieren.

---

## Wann einsetzen (Trigger)

Nutze diesen Skill, wenn …

- „Works on my machine“ auftaucht
- Deployments sporadisch fehlschlagen oder sich zwischen Umgebungen unterscheiden
- Konfigurationswerte in mehreren Orten dupliziert sind (CI, Docker, App, Helm, .env)
- Secrets versehentlich im Repo landen könnten
- Feature-Flags unklar sind oder ohne Kill-Switch deployed werden
- es keine klare Doku gibt, welche Env-Variablen in **dev/staging/prod** benötigt werden

---

## Ziele des Skills

1. **Env-Variablen** sauber erfassen, validieren und dokumentieren (inkl. Secrets-Handling).
2. **Build-Prozess** reproduzierbar machen (CI identisch zu lokal, deterministisch, lockfiles).
3. **Deployment-Ziele** definieren (Docker/K8s/Serverless/VM), inklusive Health Checks & Rollback.
4. **Feature-Flags** etablieren/strukturieren (Defaults, Rollout, Kill-Switch, Ownership).
5. **Runbook** für Debugging & Betrieb erstellen (wo loggen, welche Checks, typische Fehler).

---

## Inputs (was du brauchst)

- Repository (Code + Config)
- Zielplattform(en): z. B. Docker, Kubernetes, Vercel, AWS, GCP, Azure, VM
- Umgebungen: local, dev, staging, prod (oder eure Benennung)
- CI/CD-System: GitHub Actions, GitLab CI, Jenkins, CircleCI, …
- Secret-Manager: z. B. AWS SSM/Secrets Manager, GCP Secret Manager, Vault, Doppler, 1Password, …

---

## Outputs (Artefakte, die am Ende existieren sollten)

Minimal sinnvoll:

- `.env.example` oder `config/example.env` (ohne Secrets, nur Platzhalter)
- `ENVIRONMENT.md` oder `docs/deployment-config.md` mit:
  - Env-Variablen-Inventory (Tabelle)
  - Build-Schritte (lokal & CI)
  - Deployment-Architektur und Ziele
  - Feature-Flags-Übersicht + Standards
  - Troubleshooting/Runbook

Optional (je nach Stack):

- Validierung (z. B. `zod`, `pydantic`, `envalid`, `dotenv-safe`) inkl. Schema
- Dockerfile/Compose, Helm Chart, K8s Manifeste, Terraform/Pulumi, Render/Vercel Config
- CI-Workflow(s) inkl. Cache, Artifact-Handling, Smoke Tests, Rollback Strategie

---

# Vorgehen (Schritt-für-Schritt)

## 1) Projekt- und Setup-Discovery

**Ziel:** Verstehen, wie das Projekt gebaut und betrieben wird, bevor du Änderungen machst.

Suche nach typischen Dateien:

- App: `package.json`, `pyproject.toml`, `go.mod`, `pom.xml`, `Gemfile`, …
- Env: `.env*`, `config.*`, `settings.*`, `appsettings.json`, `values.yaml`
- Container: `Dockerfile`, `docker-compose.yml`
- Infra: `helm/`, `k8s/`, `terraform/`, `pulumi/`, `cloudformation/`
- CI: `.github/workflows/*`, `.gitlab-ci.yml`, `Jenkinsfile`
- Docs: `README.md`, `docs/*`, `runbook*`

**Ergebnis:** Eine kurze Übersicht:
- Runtime (Node/Python/Go/Java/…)
- Startkommando
- Buildkommando
- Deploymentziel(e)
- Woher kommen Konfig/Secrets?

---

## 2) Env-Variablen inventarisieren

**Ziel:** Alle Konfig-Schlüssel einmal zentral erfassen, statt über Code/CI/Infra verteilt.

### 2.1 Quellen finden
- Code: Suche nach `process.env`, `os.environ`, `ENV[...]`, `getenv`, `config("...")`
- CI: Secrets/Vars in Workflows
- Infra: Helm values, K8s Secrets/ConfigMaps, Terraform vars
- Dokumentation: README/Runbooks

### 2.2 Klassifizieren
Für jede Variable:

- **Name** (z. B. `DATABASE_URL`)
- **Typ** (string/int/bool/json/list)
- **Scope** (build-time vs runtime)
- **Umgebungen** (local/dev/staging/prod)
- **Default** (falls erlaubt)
- **Secret?** (ja/nein)
- **Beispielwert** (maskiert/placeholder)
- **Validierung** (Regex/enum/range)
- **Owner** (Team/Service)

### 2.3 Dokumentations-Template (Tabelle)

> Tipp: Diese Tabelle gehört in `ENVIRONMENT.md` und wird zur „Source of Truth“.

| Variable | Zweck | Typ | Required | Default | Secret | Beispiel | Wo gesetzt |
|---|---|---|---:|---|---:|---|---|
| `DATABASE_URL` | DB Connection | string(url) | ✅ | – | ✅ | `postgres://***` | Secret Manager |
| `PORT` | HTTP Port | int | ✅ | `3000` | ❌ | `3000` | Runtime/Container |
| `FEATURE_X_ENABLED` | Rollout Feature X | bool | ❌ | `false` | ❌ | `false` | Config |

---

## 3) Env-Validierung erzwingen

**Ziel:** Fehler früh und eindeutig machen (Startup-Fail fast), statt später „komisch“ zu crashen.

Empfehlungen:

- Beim Start der App **alle benötigten Variablen prüfen**
- Lesbare Fehlermeldungen: „Missing ENV VAR: …“
- Optional: unterschiedliche Anforderungen je Environment (prod strenger)

Beispiele (konzeptionell):

- Node: `zod`/`envalid`/`dotenv-safe`
- Python: `pydantic-settings`
- Go: `envconfig`
- Java: Spring `@ConfigurationProperties` + Validation

**Wichtig:** Niemals Secrets in Logs ausgeben. Bei Debug nur „present/not present“.

---

## 4) Build-Prozess standardisieren

**Ziel:** Reproduzierbare Builds, identisch in CI und lokal.

Checklist:

- Lockfiles vorhanden und genutzt (`package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`, …)
- Build ist **deterministisch** (keine „latest“ ohne Pinning)
- Versions-Pinning für:
  - Node/Python/Java/Go Version
  - Base Images (`node:20-alpine` statt `node:latest`)
- Artifacts klar definiert:
  - Was wird gebaut? (z. B. `dist/`, binary, image)
  - Wo landet das Artifact?
- Caching in CI (Dependencies, Docker layers)

### „Build-Time vs Runtime“-Trennung
- Build-time Vars: beeinflussen Bundling/Compilation (z. B. `NEXT_PUBLIC_*`)
- Runtime Vars: werden beim Start gelesen (z. B. `DATABASE_URL`)

➡️ Vermeide, dass Secrets in Build-Schritten in statische Bundles geraten.

---

## 5) Deployment-Ziele definieren

**Ziel:** Klarer Zielpfad: wohin deployen wir, wie sieht der Start aus, wie prüfen wir Health?

### 5.1 Typische Ziele
- **Docker** (ein Image, mehrere Environments)
- **Kubernetes** (Deployments, Services, Ingress, ConfigMaps/Secrets)
- **Serverless** (AWS Lambda, Cloud Functions)
- **PaaS** (Vercel, Render, Fly.io, Heroku-ähnlich)
- **VM/Bare Metal** (systemd, nginx, reverse proxy)

### 5.2 Standard-Checks
- **Health Endpoint**: `/healthz` oder `/readyz`
- **Startup-Probe**: App startet innerhalb X Sekunden
- **Readiness/Liveness** (besonders K8s)
- **DB Migration Strategy** (vor/nach Deploy, backward-compatible)
- **Rollback-Plan** (Image Tag zurück, previous release, feature flag kill switch)

### 5.3 Minimaler Deployment-Runbook Abschnitt
- „Wie deployen?“ (Befehl/Workflow)
- „Wie verifiziere ich?“ (Health, Logs, KPIs)
- „Wie rolle ich zurück?“ (Schritte + erwartete Dauer/Impact)
- „Wo sind Logs/Monitoring?“ (Links/Commands)

---

## 6) Feature-Flags einführen / strukturieren

**Ziel:** Risiken beim Deploy minimieren, Rollouts kontrollieren, schnelle Abschaltung ermöglichen.

### Regeln (Best Practices)
- Jedes risky Feature braucht **Flag + Kill-Switch**
- Flags haben:
  - **Owner**
  - **Default**
  - **Scope** (global / user-segment / percentage rollout)
  - **Ablaufdatum** (Flags werden wieder entfernt)
- Flags sind dokumentiert und auffindbar (kein Wildwuchs)

### Feature-Flag Spec Template

| Flag | Zweck | Default | Scope | Owner | Entfernen bis |
|---|---|---:|---|---|---|
| `feature.newCheckout` | Neuer Checkout Flow | off | 5% → 100% | Growth | 2026-03-31 |

---

## 7) Sicherheits- und Secret-Handling

**Ziel:** Keine Secrets in Git, keine Leaks in Logs, least privilege.

- Secrets **niemals** in `.env.example`
- Secrets gehören in:
  - Secret Manager (preferred)
  - CI Secret Store
  - K8s Secret (wenn nötig, idealerweise sealed/external secrets)
- Rotation: dokumentiere, wie man Keys rotiert
- Zugriff: wer darf Secrets sehen?
- Logging: Maskierung aktivieren, Debug nur lokal

---

## 8) Smoke Tests & Config Drift verhindern

**Ziel:** Setup-Probleme in Minuten finden.

Empfehlungen:

- Nach Deploy: Smoke Test (HTTP 200, DB connect, critical dependencies)
- Config-Drift vermeiden:
  - Gleiche Variable-Namen in allen Environments
  - „Config Contract“ (Schema) im Code
  - CI check: `.env.example` up-to-date, Schema vollständig
- Observability:
  - Request-ID, structured logs, error tracking

---

# Quick-Checkliste (zum Abhaken)

- [ ] `.env.example` existiert und enthält **alle** non-secret Keys
- [ ] Env-Schema/Validierung existiert (Startup fail fast)
- [ ] Secrets sind im Secret Manager/CI store, nicht im Repo
- [ ] Build ist pinned & reproduzierbar (Versionen, lockfiles, no latest)
- [ ] Deploymentziel(e) sind dokumentiert (inkl. Health & Rollback)
- [ ] Feature-Flags haben Owner/Default/Expiry
- [ ] Smoke Test nach Deploy ist definiert
- [ ] Runbook: Logs, Monitoring, häufige Fehler, Notfallmaßnahmen

---

# Typische „Claude Code“ Aufgabenformulierung (Prompt-Pattern)

Du kannst diese Skill-Anweisung als Arbeitsauftrag nutzen:

> **Aufgabe:** Erstelle/verbessere die Deployment-/Env-/Config-Struktur dieses Repos.  
> Liefere: `.env.example`, Env-Validierung im Code, Doku `ENVIRONMENT.md`, und ggf. CI/Container/Deployment-Manifeste.  
> Ziele: reproduzierbarer Build, klare Secrets-Strategie, Feature-Flags Standards, Smoke Tests & Rollback.

---

## Beispiel: Minimaler Deliverable-Plan

1. Env-Inventory erstellen (Tabelle) und in `ENVIRONMENT.md` schreiben  
2. `.env.example` generieren (Platzhalter, keine Secrets)  
3. Env-Validierung implementieren (Schema + klare Fehlermeldungen)  
4. Build-Doku: lokale Schritte + CI Schritte vereinheitlichen  
5. Deployment-Runbook: Deploy, Verify, Rollback, Logs/Monitoring  
6. Feature-Flag Registry anlegen (Tabelle + Konventionen)

---

## Anti-Patterns (vermeiden)

- Secrets in `.env` commiten oder im Build in statische Assets bundlen
- Unterschiedliche Variablennamen je Environment („DB_URL“ vs „DATABASE_URL“)
- „latest“ Images/Dependencies ohne Pinning
- Feature-Flags ohne Owner/Expiry (Flag-Friedhof)
- Deploy ohne Health/Readiness Checks
- „Fix“ durch manuelle Konfig-Änderungen ohne Dokumentation (Drift!)

---

## Fertig, wenn …

- Ein neuer Entwickler kann das Projekt lokal + in staging/prod starten, **ohne** Insiderwissen
- Env-Probleme sind innerhalb weniger Minuten erkennbar (validiert + dokumentiert)
- Deployments sind wiederholbar und rollback-fähig
- Feature-Risiken sind über Flags kontrollierbar

