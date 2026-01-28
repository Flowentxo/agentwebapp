# API Key Management System

## Übersicht

Das SINTRA.AI API Key Management System ermöglicht sichere Authentifizierung und Autorisierung externer Zugriffe auf die API. Es bietet:

- 🔐 **Sichere Key-Generierung** mit bcrypt-Hashing
- 🎯 **Granulare Berechtigungen** (Scopes)
- 📊 **Audit-Logging** aller API-Aktivitäten
- ⏱️ **Rate Limiting** pro API Key
- 🔄 **Key Rotation** für erhöhte Sicherheit
- 🛡️ **Row-Level Security** (RLS) in PostgreSQL

---

## Schnellstart

### 1. Datenbank-Migration ausführen

```bash
npm run db:push
```

Dies erstellt folgende Tabellen:
- `api_keys` - Schlüsselspeicherung (gehashed)
- `api_key_usage_logs` - Nutzungsprotokoll
- `api_key_audit_events` - Audit-Trail

### 2. API Key erstellen (POST /api/api-keys)

```bash
curl -X POST http://localhost:3000/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "name": "Production API Key",
    "scopes": ["agents:read", "agents:execute"],
    "environment": "production",
    "expiresInDays": 90,
    "rateLimit": 1000
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "⚠️ IMPORTANT: Save this API key now. You won't be able to see it again!",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Production API Key",
    "secret": "flwnt_live_a3f5b8c9d2e1f4g7h8i9j0k1l2m3n4o5",
    "prefix": "flwnt_live_a3f5b8",
    "scopes": ["agents:read", "agents:execute"],
    "environment": "production",
    "expiresAt": "2025-02-23T10:30:00.000Z",
    "createdAt": "2024-11-25T10:30:00.000Z"
  }
}
```

⚠️ **WICHTIG:** Das `secret` wird nur einmal angezeigt! Sofort sicher speichern.

### 3. API Key verwenden

**Option A: Authorization Header (empfohlen)**

```bash
curl -X GET http://localhost:3000/api/v1/agents \
  -H "Authorization: Bearer flwnt_live_a3f5b8c9d2e1f4g7h8i9j0k1l2m3n4o5"
```

**Option B: X-API-Key Header**

```bash
curl -X GET http://localhost:3000/api/v1/agents \
  -H "X-API-Key: flwnt_live_a3f5b8c9d2e1f4g7h8i9j0k1l2m3n4o5"
```

---

## API Endpoints

### Key Management

#### Alle Keys auflisten

```http
GET /api/api-keys
Authorization: Session Cookie
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Production API Key",
      "prefix": "flwnt_live_a3f5b8",
      "scopes": ["agents:read"],
      "environment": "production",
      "isActive": true,
      "expiresAt": "2025-02-23T10:30:00.000Z",
      "lastUsedAt": "2024-11-25T14:20:00.000Z",
      "usageCount": 1247,
      "rateLimit": 1000,
      "createdAt": "2024-11-25T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 3,
    "active": 2
  }
}
```

#### Key Details abrufen

```http
GET /api/api-keys/{id}
Authorization: Session Cookie
```

#### Key aktualisieren

```http
PATCH /api/api-keys/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "scopes": ["agents:read", "agents:write"],
  "expiresInDays": 180,
  "rateLimit": 2000
}
```

#### Key widerrufen (revoke)

```http
DELETE /api/api-keys/{id}?reason=Security+audit
```

#### Key rotieren (neues Secret generieren)

```http
POST /api/api-keys/{id}/rotate
```

**Response:** Neues `secret` - nur einmalig sichtbar!

---

### Audit & Monitoring

#### Usage Logs abrufen

```http
GET /api/api-keys/{id}/logs?limit=100&days=7
```

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "method": "GET",
        "endpoint": "/api/v1/agents",
        "statusCode": 200,
        "ipAddress": "203.0.113.42",
        "responseTime": 145,
        "createdAt": "2024-11-25T14:20:00.000Z"
      }
    ],
    "statistics": {
      "totalRequests": 1247,
      "successfulRequests": 1230,
      "failedRequests": 17,
      "avgResponseTime": 156,
      "totalTokensUsed": 45000
    },
    "endpointStats": [
      {
        "endpoint": "/api/v1/agents",
        "count": 850,
        "avgResponseTime": 120
      }
    ]
  }
}
```

#### Audit Events abrufen

```http
GET /api/api-keys/{id}/audit?limit=50
```

Zeigt administrative Aktionen (created, revoked, updated, rotated).

---

## Scopes (Berechtigungen)

### Verfügbare Scopes

```typescript
// Agent Operations
"agents:read"         // Agent-Details und Status abrufen
"agents:write"        // Agents erstellen/bearbeiten
"agents:execute"      // Agent-Tasks ausführen

// Knowledge Base
"knowledge:read"      // Knowledge Base durchsuchen
"knowledge:write"     // Dokumente erstellen/aktualisieren
"knowledge:delete"    // Dokumente löschen

// Workflows
"workflows:read"      // Workflows anzeigen
"workflows:write"     // Workflows erstellen/bearbeiten
"workflows:execute"   // Workflows ausführen

// Analytics
"analytics:read"      // Analytics-Daten abrufen

// Webhooks
"webhooks:read"       // Webhook-Konfigurationen anzeigen
"webhooks:write"      // Webhooks erstellen/bearbeiten

// Administration (vorsichtig verwenden!)
"admin:users"         // User-Verwaltung
"admin:settings"      // System-Einstellungen
"admin:api_keys"      // API-Key-Verwaltung
```

### Scope-Presets

```typescript
// Read-Only (sicherer Zugriff)
["agents:read", "knowledge:read", "workflows:read", "analytics:read"]

// Full Access (alle Berechtigungen)
[...alle Scopes...]

// Agent Admin
["agents:read", "agents:write", "agents:execute"]

// Knowledge Admin
["knowledge:read", "knowledge:write", "knowledge:delete"]
```

### Scopes abrufen

```http
GET /api/api-keys/scopes
```

Gibt alle verfügbaren Scopes mit Beschreibungen zurück.

---

## Sicherheit

### Key-Format

```
sk_{environment}_{32_random_chars}

Beispiele:
- flwnt_live_a3f5b8c9d2e1f4g7h8i9j0k1l2m3n4o5   (Production)
- sk_dev_x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6   (Development)
- flwnt_test_p9q8r7s6t5u4v3w2x1y0z9a8b7c6d5e4  (Test)
```

### Hashing

- **Algorithmus:** bcrypt (10 Runden)
- **Speicherung:** Nur Hash in Datenbank
- **Lookup:** Via Prefix (erste 16 Zeichen)

### Row-Level Security (RLS)

Automatische Policies:

```sql
-- User sehen nur ihre eigenen Keys
CREATE POLICY api_keys_select_own
  ON api_keys FOR SELECT
  USING (user_id = current_setting('app.current_user_id'));

-- Admins sehen alle Keys
CREATE POLICY api_keys_admin_all
  ON api_keys FOR ALL
  USING (current_setting('app.current_user_role') = 'admin');
```

### IP-Whitelist (optional)

```json
{
  "name": "Restricted Key",
  "scopes": ["agents:read"],
  "ipWhitelist": ["203.0.113.0/24", "198.51.100.42"]
}
```

---

## Rate Limiting

### Standard-Limits

- **Default:** 1000 Anfragen/Stunde
- **Maximum:** 10.000 Anfragen/Stunde
- **Tracking:** In-Memory Cache (Redis in Production empfohlen)

### Response Headers

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Reset: 2024-11-25T15:00:00.000Z

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again later.",
  "resetAt": "2024-11-25T15:00:00.000Z"
}
```

### Empfehlungen

- Development Keys: 100-500 req/h
- Production Keys: 1000-5000 req/h
- Batch Processing: 5000-10000 req/h

---

## Best Practices

### ✅ Do's

1. **Key Rotation**
   - Rotiere Keys alle 90 Tage
   - Nach Sicherheitsvorfällen sofort rotieren
   - `POST /api/api-keys/{id}/rotate`

2. **Least Privilege**
   - Nur benötigte Scopes vergeben
   - Separate Keys für verschiedene Anwendungen

3. **Monitoring**
   - Usage Logs regelmäßig prüfen
   - Ungewöhnliche Aktivitäten überwachen
   - Audit Events für Compliance

4. **Expiration**
   - Setze immer ein Ablaufdatum
   - Max. 365 Tage
   - Kurzlebige Keys für Tests (7-30 Tage)

### ❌ Don'ts

1. **Niemals:**
   - Keys in Code committen (git)
   - Keys in Logs ausgeben
   - Keys per E-Mail versenden
   - Einen Key für alle Umgebungen

2. **Vermeiden:**
   - Übermäßig breite Scopes (`admin:*`)
   - Keine Expiration
   - Keys in URL-Parametern
   - Hardcodierte Keys in Frontend-Code

---

## Integration in eigene Endpoints

### Middleware verwenden

```typescript
import { requireApiKey } from '@/lib/auth/api-key-middleware';
import { API_SCOPES } from '@/lib/db/schema-api-keys';

export const GET = requireApiKey(
  async (req) => {
    // req.apiKey ist verfügbar
    const { userId, scopes } = req.apiKey;

    return NextResponse.json({
      success: true,
      data: { /* ... */ }
    });
  },
  {
    requiredScopes: [API_SCOPES.AGENTS_READ],
    requireAllScopes: false, // mind. einer der Scopes
  }
);
```

### Manuelle Validierung

```typescript
import { withApiKeyAndRateLimit } from '@/lib/auth/api-key-middleware';

export async function POST(req: NextRequest) {
  const authResult = await withApiKeyAndRateLimit(req, {
    requiredScopes: [API_SCOPES.AGENTS_EXECUTE],
  });

  if (!authResult.authorized) {
    return authResult.error;
  }

  const { apiKey } = authResult;

  // Geschäftslogik...

  return NextResponse.json({ success: true });
}
```

---

## Troubleshooting

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "API key is required. Provide it via Authorization header..."
}
```

**Lösung:**
- Prüfe Header: `Authorization: Bearer flwnt_live_...`
- Oder: `X-API-Key: flwnt_live_...`

### 403 Forbidden (Insufficient permissions)

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions. Required scopes: agents:write"
}
```

**Lösung:**
- Key-Scopes erweitern via `PATCH /api/api-keys/{id}`

### 429 Too Many Requests

**Lösung:**
- Warte bis `resetAt` Zeitpunkt
- Erhöhe `rateLimit` für den Key
- Implementiere exponential backoff

### Key funktioniert nicht mehr

**Mögliche Ursachen:**
1. Key abgelaufen (`expiresAt` überschritten)
2. Key widerrufen (`isActive: false`)
3. Key rotiert (altes Secret ungültig)

**Lösung:**
- Prüfe Key-Status: `GET /api/api-keys/{id}`
- Erstelle neuen Key falls nötig

---

## Production Checklist

- [ ] Datenbank-Migration ausgeführt
- [ ] RLS-Policies aktiviert
- [ ] Rate Limiting konfiguriert
- [ ] Monitoring/Alerting eingerichtet
- [ ] Backup-Strategie für Keys definiert
- [ ] Key-Rotation-Policy festgelegt (z.B. 90 Tage)
- [ ] Audit-Log-Retention konfiguriert
- [ ] IP-Whitelists für kritische Keys
- [ ] Dokumentation für Entwickler erstellt
- [ ] Testabdeckung für API-Key-Flows

---

## Beispiel: Vollständiger Workflow

### 1. Development Key erstellen

```bash
curl -X POST http://localhost:3000/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION" \
  -d '{
    "name": "Dev Testing",
    "scopes": ["agents:read"],
    "environment": "development",
    "expiresInDays": 30,
    "rateLimit": 100
  }'
```

### 2. Key speichern

```bash
export SINTRA_API_KEY="sk_dev_..."
```

### 3. API aufrufen

```bash
curl -X GET http://localhost:3000/api/v1/agents \
  -H "Authorization: Bearer $SINTRA_API_KEY"
```

### 4. Usage prüfen

```bash
curl -X GET http://localhost:3000/api/api-keys/{id}/logs?days=1 \
  -H "Cookie: session=YOUR_SESSION"
```

### 5. Key widerrufen

```bash
curl -X DELETE http://localhost:3000/api/api-keys/{id}?reason=Testing+complete \
  -H "Cookie: session=YOUR_SESSION"
```

---

## Weiterführende Ressourcen

- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [bcrypt Best Practices](https://github.com/kelektiv/node.bcrypt.js#a-note-on-rounds)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

---

## Support

Bei Fragen oder Problemen:
- GitHub Issues: https://github.com/your-org/sintra/issues
- Dokumentation: https://docs.sintra.ai
- E-Mail: support@sintra.ai
