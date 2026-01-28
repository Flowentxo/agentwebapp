# SINTRA Admin Panel - Enterprise Edition

## Überblick

Das SINTRA Admin Panel wurde zu einer **Enterprise-Version** überarbeitet mit Fokus auf:
- **Sicherheit & Zugriffskontrolle**
- **Benutzer-, Rollen- und Berechtigungsmanagement**
- **Deployment-Verwaltung mit Rollback**
- **Audit-Trail für alle Systemaktionen**
- **Echtzeit-Sicherheitsüberwachung**

**Route**: `/admin`
**Layout**: Content-Only (keine sekundäre Sidebar)
**Zugriff**: Nur `role === "admin"`

---

## Module

### 1. Systemstatus

**Komponente**: `components/admin/system-status.tsx`

**Features**:
- ✅ Echtzeit-Health-Monitoring aller Services (API, Database, Cache, Storage)
- ✅ Farbcodierte Status-Anzeige (grün/gelb/rot)
- ✅ Latenz-Metriken pro Service
- ✅ Auto-Refresh alle 15 Sekunden
- ✅ Manuelle Health-Check-Trigger
- ✅ Direkter Link zu API-Logs

**API Endpoint**: `GET /api/admin/system/status`

**Response**:
```json
{
  "uptime": 3600,
  "uptimeFormatted": "1h 0m",
  "services": [
    {
      "name": "api",
      "status": "healthy",
      "latency": 25,
      "lastCheck": "2025-10-23T10:00:00Z"
    }
  ],
  "timestamp": "2025-10-23T10:00:00Z"
}
```

---

### 2. Benutzerverwaltung

**Komponente**: `components/admin/user-management.tsx`

**Features**:
- ✅ Vollständige CRUD-Operationen
- ✅ 4 Rollen: `admin`, `dev`, `ops`, `viewer`
- ✅ 3 Status: `active`, `inactive`, `locked`
- ✅ Rollenbasierte Berechtigungen sichtbar
- ✅ Audit-Trail bei jeder Änderung
- ✅ Letzter Login-Zeitpunkt
- ✅ Modal-Dialog für Bearbeitung

**Rollen & Berechtigungen**:

| Rolle | Berechtigungen |
|-------|----------------|
| `admin` | Vollzugriff, Benutzerverwaltung, Deployment, Audit-Logs |
| `dev` | Code-Zugriff, Logs lesen, API-Tests |
| `ops` | Deployment, Monitoring, Logs lesen |
| `viewer` | Nur Lesezugriff |

**API Endpoints**:
- `GET /api/admin/users` - Liste aller Benutzer
- `POST /api/admin/users` - Neuen Benutzer erstellen
- `PUT /api/admin/users/[id]` - Benutzer aktualisieren (erstellt Audit-Log)
- `DELETE /api/admin/users/[id]` - Benutzer deaktivieren (erstellt Audit-Log)

---

### 3. Deployments

**Komponente**: `components/admin/deployments.tsx`

**Features**:
- ✅ Aktive Version prominent angezeigt
- ✅ Deployment-Verlauf mit Status-Timeline
- ✅ Commit-Hash, Branch und Deployer sichtbar
- ✅ Health-Check-Status pro Deployment
- ✅ Rollback-Funktion für erfolgreiche Deployments
- ✅ Redeploy-Funktion
- ✅ Dauer-Anzeige

**Deployment-Status**:
- `success` - Grün, mit Check-Icon
- `failed` - Rot, mit X-Icon
- `rolled_back` - Gelb, mit Rollback-Icon
- `in_progress` - Blau, animiertes Clock-Icon

**API Endpoints**:
- `GET /api/admin/deploy/list` - Deployment-Historie und aktive Version
- `POST /api/admin/deploy/redeploy` - Deployment neu ausführen
- `POST /api/admin/deploy/rollback/[id]` - Rollback zu Version
- `POST /api/admin/deploy/health-check` - Health-Check nach Deployment

---

### 4. Audit-Logs

**Komponente**: `components/admin/audit-logs.tsx`

**Features**:
- ✅ Systemweites Aktivitätsprotokoll
- ✅ Filter nach Kategorie, Zeitraum, Benutzer
- ✅ Live-Update alle 60 Sekunden
- ✅ CSV-Export-Funktion
- ✅ IP-Adresse der Aktion
- ✅ Detaillierte Zusatzinformationen

**Kategorien**:
- `user` - Benutzeroperationen (Erstellen, Bearbeiten, Löschen, Rolle ändern)
- `deployment` - Deployments, Rollbacks, Redeployments
- `security` - Failed Logins, Force Logouts, Policy-Checks
- `system` - Systemkonfiguration, Health-Checks

**API Endpoints**:
- `GET /api/admin/audit?category={cat}&timeRange={range}&user={user}` - Gefilterte Logs
- `POST /api/admin/audit` - Neuen Audit-Eintrag erstellen (intern)

**Filter-Optionen**:
- Kategorie: all, user, deployment, security, system
- Zeitraum: 1h, 24h, 7d, 30d, all
- Benutzer: Dynamisch aus Logs generiert

---

### 5. Sicherheitsübersicht

**Komponente**: `components/admin/security-overview.tsx`

**Features**:
- ✅ Anzahl aktiver Sessions
- ✅ Anzahl aktiver Tokens
- ✅ Failed Logins-Counter (Alarm ab 10)
- ✅ Letzter Policy-Check mit Status und Timestamp
- ✅ Verdächtige Aktivitäten-Warnung
- ✅ "Force Logout All"-Funktion mit Confirmation
- ✅ Auto-Refresh alle 30 Sekunden

**Policy-Check-Status**:
- `passed` - Grünes Badge
- `failed` - Rotes Badge
- `warning` - Gelbes Badge mit Issue-Liste

**API Endpoints**:
- `GET /api/admin/security/overview` - Security-Status
- `POST /api/admin/security/force-logout` - Alle Sessions beenden

---

## Layout & Design

### Grid-Struktur

```typescript
<div className="space-y-6">
  {/* System Status - Full Width */}
  <section aria-label="System Status">
    <SystemStatus />
  </section>

  {/* User Management & Security - 2-Column Grid */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <UserManagement />
    <SecurityOverview />
  </div>

  {/* Deployments - Full Width */}
  <section aria-label="Deployments">
    <Deployments />
  </section>

  {/* Audit Logs - Full Width */}
  <section aria-label="Audit Logs">
    <AuditLogs />
  </section>
</div>
```

### Design Tokens

Alle Komponenten nutzen SINTRA Design Tokens:
- `.panel` - Hintergrund für Cards
- `.hairline-b` - Horizontale Trennlinien
- `.bg-surface-0`, `.bg-surface-1` - Oberflächen-Ebenen
- `.mono` - Monospace-Schrift für Commit-Hashes, IP-Adressen
- `.focus-ring` - Fokus-Stil für Accessibility

### Responsive

- **Desktop (≥lg)**: 2-Spalten-Grid für User Management + Security
- **Tablet (md)**: Gestapeltes Layout
- **Mobile (<md)**: Single Column, vollbreite Elemente

---

## Sicherheit & Compliance

### Zugriffskontrolle

**SSR-Check im Layout** (`app/(app)/admin/layout.tsx`):

```typescript
export default async function AdminLayout({ children }) {
  const cookieStore = cookies();
  const session = cookieStore.get("session");

  if (!session) {
    redirect("/login?redirect=/admin");
  }

  const user = await validateSession(session.value);

  if (!user || user.role !== "admin") {
    redirect("/dashboard?error=unauthorized");
  }

  return <section>{children}</section>;
}
```

### Audit-Trail

Jede kritische Aktion erzeugt automatisch einen Audit-Log-Eintrag:
- Benutzer erstellen/bearbeiten/löschen
- Rollenwechsel
- Deployment-Operationen
- Force Logouts
- Failed Login-Versuche

**Beispiel**:
```typescript
await fetch("/api/admin/audit", {
  method: "POST",
  body: JSON.stringify({
    user: currentUser.email,
    action: "Rolle geändert",
    target: targetUser.email,
    category: "user",
    details: `viewer → dev`,
    ipAddress: request.ip,
  }),
});
```

### Redaction & PII

**TODO**: Integration mit `lib/security/redact.ts` für:
- E-Mail-Adressen in Logs
- IP-Adressen (partial masking)
- Sensitive System-Details

---

## API-Routen

### Übersicht

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/admin/system/status` | GET | System-Health |
| `/api/admin/system/health-check` | POST | Manueller Health-Check |
| `/api/admin/users` | GET | Benutzer-Liste |
| `/api/admin/users` | POST | Benutzer erstellen |
| `/api/admin/users/[id]` | PUT | Benutzer aktualisieren |
| `/api/admin/users/[id]` | DELETE | Benutzer deaktivieren |
| `/api/admin/deploy/list` | GET | Deployment-Historie |
| `/api/admin/deploy/redeploy` | POST | Redeploy |
| `/api/admin/deploy/rollback/[id]` | POST | Rollback |
| `/api/admin/deploy/health-check` | POST | Post-Deployment Health-Check |
| `/api/admin/audit` | GET | Audit-Logs (gefiltert) |
| `/api/admin/audit` | POST | Audit-Eintrag erstellen |
| `/api/admin/security/overview` | GET | Security-Status |
| `/api/admin/security/force-logout` | POST | Alle Sessions beenden |

---

## Testing

### Unit Tests (Vitest)

**TODO**: Erstellen Sie folgende Tests:
- `tests/unit/admin-users.spec.ts` - User CRUD + Role Validation
- `tests/unit/admin-deployments.spec.ts` - Redeploy/Rollback Actions
- `tests/unit/admin-audit.spec.ts` - Audit Logging

**Beispiel-Test**:
```typescript
describe('User Management', () => {
  it('should only allow admin role to update users', async () => {
    const response = await updateUser({ role: 'dev' }, 'user-123');
    expect(response.status).toBe(403); // Forbidden
  });
});
```

### E2E Tests (Playwright)

**TODO**: Erstellen Sie folgende Tests:
- `tests/ui/admin-accessibility.spec.ts` - Keyboard Navigation, ARIA Labels
- `tests/ui/admin-permissions.spec.ts` - Zugriff nach Rolle
- `tests/ui/admin-live-refresh.spec.ts` - System-Status Polling

**Beispiel-Test**:
```typescript
test('should show system status with auto-refresh', async ({ page }) => {
  await page.goto('/admin');
  const cpuCard = page.locator('.panel:has-text("api")');
  await expect(cpuCard).toBeVisible();

  // Wait for auto-refresh (15s)
  await page.waitForTimeout(16000);
  // Verify data updated
});
```

---

## Migration von der alten Version

### Entfernte Features

❌ **CPU Auslastung** - Nicht admin-relevant
❌ **Memory-Metriken** - Nicht admin-relevant
❌ **Aktive Benutzer-Counter** - Jetzt in Security Overview als Sessions
❌ **Fehlerrate** - Jetzt in System Status als Service-Health

### Neue Features

✅ **Rollenverwaltung** mit 4 Rollen
✅ **Audit-Logs** mit CSV-Export
✅ **Deployment-Timeline** mit Rollback
✅ **Security Overview** mit Force Logout
✅ **Policy-Checks** mit Issue-Tracking

### Upgrade-Schritte

1. **API-Endpoints aktualisieren**:
   - Alte `/api/health` Response enthält jetzt keine CPU/Memory mehr
   - Neue `/api/admin/*` Endpoints integrieren

2. **Datenbank-Schema**:
   - Tabelle `audit_logs` für Audit-Trail
   - User-Tabelle um `role` und `status` erweitern

3. **Session-Validation**:
   - `validateSession()` Funktion im Layout implementieren
   - JWT-Token mit Role-Claim

4. **Tests aktualisieren**:
   - Alte CPU/Memory-Tests entfernen
   - Neue Enterprise-Feature-Tests hinzufügen

---

## Troubleshooting

### Issue: "403 Forbidden" beim Zugriff auf /admin

**Lösung**: Überprüfen Sie, ob der eingeloggte Benutzer die Rolle `admin` hat:
```sql
SELECT role FROM users WHERE email = 'your@email.com';
```

### Issue: Audit-Logs werden nicht erstellt

**Lösung**: Überprüfen Sie, ob der `/api/admin/audit` Endpoint erreichbar ist. Check Network-Tab im Browser.

### Issue: System Status zeigt "degraded"

**Lösung**: Triggern Sie einen manuellen Health-Check. Wenn Problem persistiert, überprüfen Sie Service-Logs.

### Issue: CSV-Export funktioniert nicht

**Lösung**: Browser-PopUp-Blocker könnte Download blockieren. Erlauben Sie Downloads für `localhost:3000`.

---

## Roadmap

### Phase 1 (Current) ✅
- Enterprise UI-Module
- API-Endpoints
- Basis-Sicherheit

### Phase 2 (Next)
- [ ] Echte Datenbank-Integration
- [ ] JWT-Session-Validation
- [ ] Redaction-Layer für PII
- [ ] Unit + E2E Tests
- [ ] CI/CD Integration

### Phase 3 (Future)
- [ ] Multi-Tenancy Support
- [ ] Advanced Audit-Filtering (Regex, Date-Range-Picker)
- [ ] Real-time WebSocket für Live-Updates
- [ ] Deployment-Scheduling
- [ ] Blue-Green Deployment Support

---

## Best Practices

### Audit-Logging

**Wann loggen?**
- ✅ Benutzer CRUD-Operationen
- ✅ Rollenwechsel
- ✅ Deployments & Rollbacks
- ✅ Security-Events (Failed Logins, Force Logouts)
- ❌ Nicht bei jedem API-Request (zu viel Noise)

**Was loggen?**
```typescript
{
  user: string,        // Wer hat die Aktion ausgeführt?
  action: string,      // Was wurde gemacht?
  target: string,      // Wer/Was war betroffen?
  category: string,    // Welche Kategorie?
  details?: string,    // Zusätzliche Infos
  ipAddress?: string,  // Von wo kam die Aktion?
}
```

### Security

**Checkliste**:
- [ ] SSR-Zugriffskontrolle im Layout
- [ ] JWT-Token-Validation
- [ ] Role-Based Access Control (RBAC)
- [ ] Audit-Trail für kritische Aktionen
- [ ] Rate-Limiting für Admin-APIs
- [ ] HTTPS im Production-Modus

---

**Letzte Aktualisierung**: 2025-10-23
**Version**: 4.0.0 (Enterprise Edition)
**Autor**: SINTRA Development Team
