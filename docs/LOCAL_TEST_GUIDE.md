# 🧪 Lokaler Docker Test - Quick Guide

## Vorbereitung

**Stelle sicher, dass deine lokale Offline-Umgebung läuft:**

```powershell
# Prüfe ob Container laufen
docker ps --filter "name=sintra"
```

Du solltest sehen:
- `sintra-postgres-offline` (Port 5435)
- `sintra-redis-offline` (Port 6379)
- `sintra-mongo-offline` (Port 27017)
- `sintra-minio-offline` (Ports 9000/9001)

**Falls nicht:**
```powershell
docker compose -f docker/docker-compose.offline.yml up -d
```

---

## Test durchführen

### 1. Starte den Docker Test

```powershell
.\test-docker-local.ps1
```

**Was passiert:**
- Docker Image wird gebaut (~2-5 Minuten)
- Container startet auf Port 8080
- Verbindet sich mit deinen lokalen Datenbanken

### 2. Teste in einem NEUEN Terminal

```powershell
# Health Check
curl http://localhost:8080/api/ping

# Erwartete Antwort:
# {
#   "status": "ok",
#   "server": "DEXTER v2 - Multi-Agent System",
#   "timestamp": 1732234800
# }
```

### 3. Weitere Tests

```powershell
# Frontend (sollte Next.js App zeigen)
curl http://localhost:8080

# API Endpoints
curl http://localhost:8080/api/unified-agents/health
```

---

## Troubleshooting

### Container startet nicht

**Logs anzeigen:**
```powershell
docker logs <container-id>
```

**Häufige Probleme:**
- ❌ Datenbank nicht erreichbar → Prüfe ob Offline-Container laufen
- ❌ Port 8080 belegt → Stoppe anderen Service auf Port 8080
- ❌ Build-Fehler → Prüfe Dockerfile Syntax

### Container läuft, aber keine Antwort

```powershell
# Prüfe ob Container läuft
docker ps

# Prüfe Logs
docker logs <container-id>

# Prüfe Netzwerk
docker inspect <container-id> | grep IPAddress
```

---

## Wenn alles funktioniert

✅ **Container startet erfolgreich**  
✅ **`/api/ping` antwortet mit Status 200**  
✅ **Keine Fehler in den Logs**

→ **Dann kannst du zu Cloud Run deployen!**

Editiere `deploy-cloud-run.ps1` mit deinen **Cloud-Datenbanken** (nicht localhost!) und führe aus:

```powershell
.\deploy-cloud-run.ps1
```

---

## Wichtig für Cloud Run

⚠️ **Localhost funktioniert NICHT in Cloud Run!**

Für Cloud Run brauchst du:
- **PostgreSQL:** Cloud SQL, Supabase, oder öffentliche IP
- **Redis:** Redis Cloud, Upstash, oder öffentliche IP
- **MongoDB:** MongoDB Atlas oder öffentliche IP
- **MinIO:** Cloud Storage oder öffentliche IP

Ersetze in `deploy-cloud-run.ps1`:
- `host.docker.internal` → `your-cloud-db-host.com`
- Lokale Ports → Cloud Ports
- Lokale Credentials → Cloud Credentials
