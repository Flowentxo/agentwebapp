# 🚀 COLLABORATION LAB V2 - SPRINT WORKFLOW GUIDE

Vollständiges PowerShell-Workflow-System für systematische Implementation der Collaboration Lab V2.

---

## 📁 DATEIEN ÜBERSICHT

### Sprint Management:
- **`SPRINT_WORKFLOW.md`** - Vollständige Checkliste aller Tasks
- **`SPRINT_JOURNAL.md`** - Auto-generiertes Logbuch (wird erstellt beim ersten Start)
- **`COLLABORATION_LAB_ANALYSIS.md`** - Ausführliche Analyse des aktuellen Stands

### PowerShell Scripts:
- **`scripts/quick-start.ps1`** - 🚀 One-Command Start (empfohlen)
- **`scripts/sprint-automation.ps1`** - Vollständiges Menü-System
- **`scripts/api-test-suite.ps1`** - API Testing Tools
- **`scripts/stop-all.ps1`** - Alle Services stoppen

---

## 🎯 QUICK START (Empfohlen für Anfang)

### 1. Starte die Entwicklungsumgebung:

```powershell
cd C:\Users\luis\Desktop\Flowent-AI-Agent
.\scripts\quick-start.ps1
```

**Was passiert:**
1. ✅ Prerequisites werden geprüft
2. ✅ Alte Prozesse werden beendet
3. ✅ PostgreSQL & Redis werden gestartet
4. ✅ Frontend & Backend werden gestartet
5. ✅ Browser öffnet automatisch `/agents/collaborate`

### 2. Während der Entwicklung:

Öffne ein neues PowerShell-Fenster:

```powershell
# Sprint-Tools (Menü-System)
.\scripts\sprint-automation.ps1

# Oder API-Tests
.\scripts\api-test-suite.ps1
```

### 3. Am Ende des Tages:

```powershell
.\scripts\stop-all.ps1
```

---

## 📋 WORKFLOW FÜR SPRINT 1

### Schritt 1: Feature-Branch erstellen

```powershell
# Option A: Mit Sprint-Tool
.\scripts\sprint-automation.ps1
# Wähle Option 8, dann eingeben: sprint1-backend-foundation

# Option B: Manuell
git checkout main
git pull origin main
git checkout -b feature/sprint1-backend-foundation
```

### Schritt 2: Entwicklung

1. **Öffne `SPRINT_WORKFLOW.md` im Editor**
   - Zeigt alle Tasks für Sprint 1
   - Checklist zum Abhaken

2. **Wähle ersten Task** (z.B. "Database Schema erstellen")

3. **Implementiere**:
   - Erstelle die Dateien (z.B. `lib/db/schema-collaborations.ts`)
   - Schreibe Code
   - Teste im Browser (Tab refresh)

4. **Markiere als erledigt**:
   ```powershell
   # Mit Tool:
   .\scripts\sprint-automation.ps1
   # Option 10: Update Sprint Checklist
   # Eingabe: "collaborations Tabelle erstellen"

   # Oder manuell in SPRINT_WORKFLOW.md:
   # [ ] → [x]
   ```

### Schritt 3: Testing

```powershell
# API Tests ausführen
.\scripts\api-test-suite.ps1
# Wähle Option 1: Run All Tests

# Oder spezifische Tests:
# Option 4: Test Collaboration Endpoints
# Option 5: Test Agent Selection
# Option 6: Test Performance
```

### Schritt 4: Commit & Push

```powershell
# Option A: Mit Tool
.\scripts\sprint-automation.ps1
# Option 9: Complete Feature
# Eingabe: "Sprint1: Database schema und basic API routes implementiert"

# Option B: Manuell
git add .
git commit -m "Sprint1: Database schema und basic API routes implementiert"
git push origin feature/sprint1-backend-foundation
```

### Schritt 5: Fortschritt überprüfen

```powershell
.\scripts\sprint-automation.ps1
# Option 11: Show Sprint Status

# Zeigt:
# Total Tasks: 150
# Completed: 15
# Remaining: 135
# Progress: 10%
```

---

## 🛠️ SPRINT-AUTOMATION TOOL (Vollständiges Menü)

```powershell
.\scripts\sprint-automation.ps1
```

### Verfügbare Optionen:

| Option | Funktion |
|--------|----------|
| 1 | Prerequisites prüfen |
| 2 | Dev Servers starten (Frontend + Backend) |
| 3 | Dev Servers stoppen |
| 4 | Database Services starten (PostgreSQL + Redis) |
| 5 | Database Migration ausführen |
| 6 | Database Studio öffnen (Drizzle) |
| 7 | API Endpoint testen |
| 8 | Feature-Branch erstellen |
| 9 | Feature committen & pushen |
| 10 | Sprint Checklist updaten |
| 11 | Sprint Status anzeigen |
| 12 | Collaboration Lab im Browser öffnen |
| Q | Beenden |

---

## 🧪 API TEST SUITE

```powershell
.\scripts\api-test-suite.ps1
```

### Test Suites:

1. **Health Endpoints** - Backend erreichbar?
2. **Auth Flow** - Login funktioniert?
3. **Collaboration Endpoints** - Alle CRUD Operations
4. **Agent Selection** - Intelligente Agent-Auswahl
5. **Performance** - Response Times < 3s?

### Beispiel Output:

```
Testing: POST http://localhost:4000/api/collaborations/start
✅ SUCCESS
{
  "id": "collab-123",
  "status": "planning",
  "selectedAgents": [
    { "id": "dexter", "name": "Dexter", "relevance": 0.95 }
  ]
}
```

---

## 📊 SPRINT JOURNAL

Alle Aktionen werden automatisch geloggt in `SPRINT_JOURNAL.md`:

```markdown
# 📝 SPRINT JOURNAL

[2025-11-13 15:30:22] [INFO] Prerequisites checked
[2025-11-13 15:30:45] [SUCCESS] Dev servers started successfully
[2025-11-13 15:31:10] [SUCCESS] Database migration completed
[2025-11-13 15:45:30] [SUCCESS] Task completed: Database schema erstellen
[2025-11-13 16:20:15] [SUCCESS] Feature completed and pushed!
```

---

## 🎯 TYPISCHER TAGESABLAUF

### Morgen (9:00):

```powershell
# Start Everything
.\scripts\quick-start.ps1

# Browser öffnet automatisch: http://localhost:3000/agents/collaborate
```

### Vormittag (9:15 - 12:00):

```powershell
# Sprint-Tool im Hintergrund
.\scripts\sprint-automation.ps1

# Tasks aus SPRINT_WORKFLOW.md abarbeiten:
# - Code schreiben
# - Im Browser testen (F5 refresh)
# - Checklist abhaken
# - Commit nach jedem Feature
```

### Mittag (12:00):

```powershell
# Fortschritt prüfen
.\scripts\sprint-automation.ps1
# Option 11: Show Sprint Status

# Output:
# Progress: 15% (23/150 tasks completed)
```

### Nachmittag (13:00 - 17:00):

```powershell
# Weiter entwickeln
# Regelmäßig testen:
.\scripts\api-test-suite.ps1
# Option 1: Run All Tests
```

### Abend (17:00):

```powershell
# Letzter Commit
.\scripts\sprint-automation.ps1
# Option 9: Complete Feature

# Alle Services stoppen
.\scripts\stop-all.ps1

# Sprint Journal reviewen
code SPRINT_JOURNAL.md
```

---

## 🔍 DEBUGGING TIPPS

### Problem: Backend startet nicht

```powershell
# Check Logs im Dev-Server Fenster
# Oder manuell starten:
cd C:\Users\luis\Desktop\Flowent-AI-Agent
npm run dev:backend
```

### Problem: API Tests schlagen fehl

```powershell
# Prüfe ob Backend läuft:
Invoke-RestMethod -Uri "http://localhost:4000/api/health"

# Prüfe Logs:
# Im Dev-Server Fenster oder:
docker logs crm-postgres
docker logs crm-redis
```

### Problem: Frontend zeigt Fehler

```powershell
# Browser DevTools öffnen (F12)
# Console Tab
# Network Tab (API Calls)

# Frontend neu builden:
npm run build
```

---

## 📈 FORTSCHRITTS-TRACKING

### Methode 1: Sprint Status Command

```powershell
.\scripts\sprint-automation.ps1
# Option 11

# Output:
# Total Tasks: 150
# Completed: 45
# Remaining: 105
# Progress: 30%
```

### Methode 2: Visual Studio Code

```
1. Öffne SPRINT_WORKFLOW.md
2. Suche nach: "- [x]" (abgehakte Tasks)
3. Suche nach: "- [ ]" (offene Tasks)
```

### Methode 3: Git Commits

```powershell
git log --oneline --graph --all

# Zeigt alle Feature-Branches und Commits
```

---

## 🚀 NÄCHSTE SCHRITTE

### Jetzt sofort (Setup):

1. ✅ Services starten: `.\scripts\quick-start.ps1`
2. ✅ Collaboration Lab im Browser öffnen
3. ✅ `SPRINT_WORKFLOW.md` öffnen
4. ✅ Feature-Branch erstellen: `feature/sprint1-backend-foundation`

### Sprint 1 - Woche 1:

1. Database Schema erstellen
2. Express Routes implementieren
3. OpenAI Service Layer
4. Frontend Freie Texteingabe
5. Basic Testing

### Sprint 1 - Woche 2:

1. SSE Streaming
2. Semantic Agent Selection
3. Context-Aware Messages
4. Performance Optimization

---

## 💡 PRO TIPPS

### 1. Zwei PowerShell-Fenster:

```
Fenster 1: Dev Servers (bleibt offen)
Fenster 2: Sprint Tools (für Commands)
```

### 2. Browser-Tabs:

```
Tab 1: http://localhost:3000/agents/collaborate (Testing)
Tab 2: http://localhost:3000 (Dashboard)
Tab 3: https://local.drizzle.studio (Database)
```

### 3. Editor-Setup:

```
VSCode Tab 1: SPRINT_WORKFLOW.md (Checklist)
VSCode Tab 2: Code Files
VSCode Tab 3: SPRINT_JOURNAL.md (Logs)
```

### 4. Git Best Practices:

```powershell
# Commit nach jedem Feature:
git add .
git commit -m "Feature: [Task Description]"

# Push am Ende des Tages:
git push origin feature/[branch-name]
```

### 5. Testing-Routine:

```powershell
# Nach jedem größeren Code-Change:
1. Browser refresh (F5)
2. Check Console (F12)
3. Run API Tests: .\scripts\api-test-suite.ps1
```

---

## 🆘 SUPPORT

### Bei Problemen:

1. **Check SPRINT_JOURNAL.md** - Logs durchsuchen
2. **Check Dev-Server Fenster** - Error Messages
3. **Browser DevTools** - Console & Network
4. **Run API Tests** - `.\scripts\api-test-suite.ps1`

### Häufige Fehler:

| Fehler | Lösung |
|--------|--------|
| Port 3000 already in use | `.\scripts\stop-all.ps1` |
| Database connection failed | `docker start crm-postgres` |
| Redis connection failed | `docker start crm-redis` |
| OpenAI API error | Check `.env.local` API Key |
| Frontend not loading | Clear cache (Ctrl+Shift+R) |

---

## 📚 RESSOURCEN

### Dokumentation:
- `COLLABORATION_LAB_ANALYSIS.md` - Vollständige Analyse
- `COLLABORATION_V2_PLAN.md` - Detaillierter Implementation Plan
- `SPRINT_WORKFLOW.md` - Task Checklist

### Code-Referenzen:
- `lib/agents/collaboration-engine.ts` - Aktuelle Engine
- `lib/agents/personas-revolutionary.ts` - Agent Personas
- `app/(app)/agents/collaborate/page.tsx` - Frontend Page

### APIs:
- Backend: http://localhost:4000/api
- Frontend: http://localhost:3000
- Database: http://localhost:5434 (PostgreSQL)
- Redis: http://localhost:6379

---

**Viel Erfolg beim Sprint! 🚀**

Bei Fragen oder Problemen: Check das Sprint Journal und die Logs.
