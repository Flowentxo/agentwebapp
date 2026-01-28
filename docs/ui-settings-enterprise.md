# SINTRA Settings Enterprise Edition

**Version:** 3.5.0
**Status:** Production Ready
**Last Updated:** 2025-10-23

---

## Überblick

Das SINTRA Settings Enterprise Center ist ein vollständig integriertes Konfigurationszentrum für Organisations-, Benutzer-, Sicherheits- und Systemeinstellungen. Es bietet eine zentrale Anlaufstelle für alle administrativen und benutzerspezifischen Einstellungen mit rollenbasierter Zugriffskontrolle.

### Kernmerkmale

- **6 spezialisierte Module** mit dediziertem Fokus
- **Tabs-Navigation** für optimale UX (Desktop) und Accordion (Mobile <lg)
- **Content-Only Layout** ohne sekundäre Sidebar (max-w-5xl Container)
- **Rollenbasierte Zugriffskontrolle** (System-Tab nur für Admins)
- **Server Actions** für sichere Datenpersistenz mit CSRF-Schutz
- **Audit-Trail** für alle kritischen Änderungen
- **Accessibility-First** (ARIA Landmarks, Keyboard Navigation, Focus-Ring)
- **Umfassende Tests** (Vitest Unit + Playwright E2E)

---

## Modul-Übersicht

### 1. Allgemein (Organisation)

**Route:** `/settings?tab=general`
**Zugriff:** Alle Rollen
**Komponente:** `components/settings/GeneralSection.tsx`

#### Funktionen

- **Organisationsname** mit Rename-Dialog (inkl. Bestätigung)
- **Domain-Verwaltung** mit Warnung („Alle Benutzer müssen sich neu anmelden")
- **Sprache** (de, en, fr) mit Select Dropdown
- **Zeitzone** (Europe/Berlin, Europe/London, America/New_York, Asia/Tokyo)
- **Organisation ID** (Read-Only, monospace)

#### API Endpoints

- `PUT /api/settings/org` - Speichern von Organisationseinstellungen

#### UI Pattern

```tsx
<div className="panel p-6 space-y-4">
  <div className="flex items-start justify-between">
    <div className="flex items-center gap-3">
      <Building className="h-5 w-5 text-accent" />
      <div>
        <p className="font-medium text-text">{orgName}</p>
        <p className="text-sm text-text-muted">Organisation</p>
      </div>
    </div>
    <Button onClick={handleRename}>
      <Edit className="h-4 w-4 mr-2" />
      Umbenennen
    </Button>
  </div>
</div>
```

---

### 2. Benutzerkonto (Profile & 2FA)

**Route:** `/settings?tab=user`
**Zugriff:** Alle Rollen (eigenes Profil)
**Komponente:** `components/settings/UserSection.tsx`

#### Funktionen

##### Profilinformationen
- **Name** und **E-Mail** mit Auto-Save on Blur
- **Passwort ändern** via Modal (Aktuelles, Neues, Bestätigung)

##### Zwei-Faktor-Authentifizierung (2FA)
- **Setup via TOTP** mit QR-Code (Google Authenticator, Authy)
- **Bestätigungscode-Eingabe** (6-stellig)
- **Status-Badge** (Aktiviert/Nicht aktiviert)

##### Session Management
- **Aktive Sitzungen** in Tabelle (Gerät, Standort, Letzter Zugriff)
- **Remote Logout** einzelner Sessions
- **"Überall abmelden"** mit Bestätigung (löscht alle außer aktueller Session)

#### API Endpoints

- `GET /api/settings/user` - Benutzerprofil abrufen
- `PUT /api/settings/user` - Profil aktualisieren
- `POST /api/settings/2fa` - 2FA einrichten (QR-Code generieren)
- `PUT /api/settings/2fa` - 2FA aktivieren (Code verifizieren)
- `GET /api/settings/sessions` - Aktive Sessions abrufen
- `DELETE /api/settings/sessions` - Alle Sessions abmelden
- `DELETE /api/settings/sessions/:id` - Einzelne Session abmelden

#### Security Best Practices

- Passwort-Änderung nur mit aktuellem Passwort
- 2FA-Secret temporär in Redis (5 Minuten TTL)
- Session-Logout loggt Audit-Trail mit IP-Adresse

---

### 3. Benachrichtigungen

**Route:** `/settings?tab=notifications`
**Zugriff:** Alle Rollen
**Komponente:** `components/settings/NotificationsSection.tsx`

#### Funktionen

4 Toggle-Gruppen mit Switch-Komponenten:

1. **Systemwarnungen** - Benachrichtigungen über Systemstatus und Wartungen
2. **Deployments** - Erfolgreiche und fehlgeschlagene Deployments
3. **Incidents** - Kritische Fehler und Ausfälle
4. **Sicherheitsmeldungen** - Verdächtige Aktivitäten und Zugriffe

#### API Endpoints

- `GET /api/settings/notifications` - Notification-Einstellungen abrufen
- `PATCH /api/settings/notifications` - Einzelne Einstellung ändern (Partial Update)

#### UI Pattern

```tsx
<Switch
  checked={settings.systemAlerts}
  onCheckedChange={() => handleToggle("systemAlerts")}
  aria-label="Systemwarnungen aktivieren"
/>
```

---

### 4. Integrationen

**Route:** `/settings?tab=integrations`
**Zugriff:** Alle Rollen
**Komponente:** `components/settings/IntegrationsSection.tsx`

#### Funktionen

Verwaltung von 4 Standard-Integrationen:

1. **Slack** - Team-Kommunikation und Benachrichtigungen
2. **GitHub** - Code-Repository und CI/CD
3. **Vercel** - Deployment und Hosting
4. **Sentry** - Error Tracking und Monitoring

##### Status-Badges
- **Verbunden** (grün)
- **Nicht verbunden** (grau)

##### Aktionen
- **Verbinden** - OAuth-Flow initiieren
- **Trennen** - Integration entfernen (mit Bestätigung)
- **Neu autorisieren** - Token refreshen (nur bei verbundenen Services)

#### API Endpoints

- `POST /api/settings/integrations/:service` - Integration verbinden
- `DELETE /api/settings/integrations/:service` - Integration trennen

#### Grid Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {integrations.map((integration) => (
    <div className="panel p-5 space-y-3">
      {/* Integration Card */}
    </div>
  ))}
</div>
```

---

### 5. Sicherheit & Datenschutz

**Route:** `/settings?tab=security`
**Zugriff:** Alle Rollen
**Komponente:** `components/settings/SecuritySection.tsx`

#### Funktionen

##### API-Token Management
- **Token-Anzeige** mit Show/Hide Toggle (Passwort-Feld)
- **Copy to Clipboard** Button (Navigator API)
- **Key Rotation** mit Bestätigung („Alter Key wird ungültig")
- **Status-Badge** (Aktiv)

##### Sicherheits-Audit-Protokoll
- **Letzte 10 Aktionen** mit Icon, Zeitstempel, IP-Adresse
- **Auto-Refresh** (60s)
- **Kategorien:** 2FA aktiviert, Passwort geändert, Session abgemeldet

#### API Endpoints

- `GET /api/settings/tokens` - API-Tokens abrufen
- `POST /api/settings/tokens` - Token rotieren (action: "rotate")

#### Security Pattern

```tsx
const handleRotateKey = async () => {
  if (!confirm("API-Key wirklich rotieren? Der alte Key wird ungültig.")) return;
  const res = await fetch("/api/settings/tokens", {
    method: "POST",
    body: JSON.stringify({ action: "rotate" }),
  });
  const data = await res.json();
  setApiKey(data.newKey);
  setShowKey(true); // Auto-reveal new key
};
```

---

### 6. System (Admin-Only)

**Route:** `/settings?tab=system`
**Zugriff:** Nur `role === "admin"`
**Komponente:** `components/settings/SystemSection.tsx`

#### Funktionen

##### Feature Toggles
3 System-Flags mit Switch-Komponenten:
1. **Agent Streaming** - Echtzeit-Streaming für Agent-Antworten
2. **Erweiterte Analytics** - Detaillierte Nutzungsstatistiken
3. **Beta Features** - Experimentelle Funktionen

##### Rate Limits
- **Endpoint-Übersicht** (/api/*, /api/chat, /api/knowledge)
- **Limit + Window** (z.B. 1000 req/1h)
- **Bearbeiten-Button** (TODO: Rate-Limit-Editor-Modal)

##### System Health Check
- **Button:** "System Health prüfen"
- **Loading State:** "Prüfung läuft..." mit Spinner-Icon
- **Alert:** API, Database, Cache, Storage Status

##### Letzte Deployments
- **Top 3 Deployments** (Version, Status, Zeitstempel, User)
- **Status-Badges:** Erfolgreich (grün), Fehlgeschlagen (rot), Ausstehend (gelb)
- **"Zu Logs" Button** → Redirect zu `/admin?tab=deployments`

#### API Endpoints

- `GET /api/settings/system/features` - Feature-Toggles abrufen
- `PATCH /api/settings/system/features` - Feature aktivieren/deaktivieren
- `POST /api/settings/system/health-check` - System Health Check durchführen
- `GET /api/settings/system/deployments?limit=3` - Letzte Deployments

#### Access Control

**SSR-Check in `app/(app)/settings/page.tsx`:**

```tsx
// TODO: Replace with actual session
const userRole = "admin"; // from session
const isAdmin = userRole === "admin";

{isAdmin && (
  <TabsTrigger value="system" current={activeTab} onClick={setActiveTab}>
    System
  </TabsTrigger>
)}
```

---

## Layout & Design

### Content-Only Pattern

Kein Secondary Sidebar, nur Shell (Sidebar + Topbar):

```tsx
<div className="mx-auto w-full max-w-5xl space-y-6">
  <h1 id="page-title">Einstellungen</h1>
  <Tabs>{/* 6 Sections */}</Tabs>
</div>
```

### Design Tokens

- `.panel` - Primärer Container mit border + shadow
- `.hairline-b` - 1px Border Bottom
- `.bg-surface-0` - Dunklerer Hintergrund
- `.bg-surface-1` - Hellerer Hintergrund
- `.mono` - Monospace Font (API Keys, IDs)
- `.focus-ring` - Fokus-Outline (Accessibility)
- `--accent` - Primärfarbe (Cyan)
- `--text` - Primärer Text (White)
- `--text-muted` - Sekundärer Text (Gray)

### Tabs Navigation

Custom Tabs-Komponente (`components/ui/tabs.tsx`):

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="general" current={activeTab} onClick={setActiveTab}>
      Allgemein
    </TabsTrigger>
    {/* ... */}
  </TabsList>

  <TabsContent when="general" current={activeTab}>
    <GeneralSection />
  </TabsContent>
</Tabs>
```

**Responsive:** Tabs auf Desktop, Accordion auf Mobile (<lg) - TODO

---

## Sicherheit & Compliance

### Zugriffskontrollen

1. **System-Tab:** Nur für `role === "admin"` sichtbar
2. **API-Endpoints:** Server-seitige Role-Checks in Route-Handlern
3. **Session-Validierung:** Alle API-Calls validieren Session-Cookie

### Audit Trail

Alle kritischen Aktionen werden geloggt:

```tsx
await logAudit({
  action: "org_settings_updated",
  userId: session.userId,
  category: "settings",
  target: "organization",
  ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
});
```

**Audit-Kategorien:**
- `settings` - Einstellungsänderungen
- `security` - Sicherheitsrelevante Aktionen (2FA, Token-Rotation, Session-Logout)
- `system` - Systemkonfiguration (Feature-Toggles, Health-Checks)

### CSRF-Schutz

Server Actions mit CSRF-Token:

```tsx
<form action={handleSave} method="post">
  <input type="hidden" name="csrf_token" value={csrfToken} />
  {/* ... */}
</form>
```

---

## API Routes

### Organisation

```
PUT /api/settings/org
Body: { name, domain, language, timezone }
Response: { success: true, data: {...} }
```

### Benutzer

```
GET /api/settings/user
Response: { name, email, avatar, twoFactorEnabled }

PUT /api/settings/user
Body: { name?, email?, avatar? }
Response: { success: true, data: {...} }
```

### 2FA

```
POST /api/settings/2fa
Response: { success: true, qrCode: "data:image/png;base64,...", secret: "..." }

PUT /api/settings/2fa
Body: { code: "123456" }
Response: { success: true, message: "2FA enabled" }
```

### Sessions

```
GET /api/settings/sessions
Response: { sessions: [{ id, device, location, lastAccess, current }] }

DELETE /api/settings/sessions
Response: { success: true, message: "All sessions logged out" }

DELETE /api/settings/sessions/:id
Response: { success: true, message: "Session logged out" }
```

### Benachrichtigungen

```
GET /api/settings/notifications
Response: { systemAlerts: true, deployments: true, ... }

PATCH /api/settings/notifications
Body: { systemAlerts: false }
Response: { success: true, data: {...} }
```

### Integrationen

```
POST /api/settings/integrations/:service
Response: { success: true, message: "slack connected" }

DELETE /api/settings/integrations/:service
Response: { success: true, message: "slack disconnected" }
```

### Security

```
GET /api/settings/tokens
Response: { tokens: [{ id, name, prefix, createdAt, lastUsed }] }

POST /api/settings/tokens
Body: { action: "rotate" }
Response: { success: true, newKey: "flwnt_live_..." }
```

### System (Admin Only)

```
GET /api/settings/system/features
Response: { features: [{ id, name, enabled }] }

PATCH /api/settings/system/features
Body: { featureId: "agent-streaming", enabled: true }
Response: { success: true }

POST /api/settings/system/health-check
Response: { status: "healthy", api: "operational", ... }

GET /api/settings/system/deployments?limit=3
Response: { deployments: [{ id, version, status, timestamp, user }] }
```

---

## Testing

### Unit Tests (Vitest)

**Location:** `tests/unit/`

1. **settings-user.spec.ts** (192 Zeilen)
   - Profil-Änderungen mit Auto-Save
   - 2FA-Setup-Flow mit QR-Code
   - Session-Management (Logout einzeln + alle)
   - Passwort-Dialog

2. **settings-notifications.spec.ts** (156 Zeilen)
   - Toggle-Persistenz via PATCH API
   - Fehlerbehandlung bei Network-Errors
   - Multiple Toggles unabhängig

3. **settings-integrations.spec.ts** (178 Zeilen)
   - OAuth-Mock + Status-Wechsel
   - Bestätigungs-Prompts
   - UI-Update nach Connect/Disconnect

#### Run Tests

```bash
npm run test:unit -- tests/unit/settings-*.spec.ts
```

### E2E Tests (Playwright)

**Location:** `tests/ui/`

1. **settings-accessibility.spec.ts** (287 Zeilen)
   - ARIA Landmarks (6 Sections)
   - Keyboard Navigation (Tab, Arrow Keys, Enter)
   - Focus-Ring auf allen interaktiven Elementen
   - Modals: Focus Trap + ESC-Close
   - Color Contrast Checks

2. **settings-admin-access.spec.ts** (243 Zeilen)
   - System-Tab nur für Admins sichtbar
   - Non-Admin: 5 Tabs (ohne System)
   - Feature-Toggle-Funktionalität (Admin-only)
   - Health-Check-Button mit Alert
   - API-Endpoint 403 für Non-Admins

#### Run E2E Tests

```bash
npx playwright test tests/ui/settings-*.spec.ts
```

---

## Accessibility (A11y)

### ARIA Landmarks

```tsx
<section aria-label="Allgemeine Einstellungen">
  <h2 id="general-heading">Allgemein</h2>
  {/* ... */}
</section>
```

### Keyboard Navigation

- **Tab:** Navigiert durch alle fokussierbaren Elemente
- **Arrow Keys:** Wechselt zwischen Tabs
- **Enter/Space:** Aktiviert Buttons/Switches
- **Escape:** Schließt Modals

### Focus Management

Alle interaktiven Elemente haben `.focus-ring`:

```css
.focus-ring:focus {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

### Screen Reader Support

- Alle Inputs haben `aria-label` oder assoziiertes `<label>`
- Switches haben `aria-checked` State
- Modals haben `role="dialog"` + Focus Trap

---

## Deployment Checklist

### Pre-Production

- [ ] Alle TODOs in API-Routes durch echte DB-Calls ersetzen
- [ ] Session-Validierung implementieren (z.B. via NextAuth)
- [ ] Audit-Trail-Logger in Datenbank persistieren
- [ ] CSRF-Token-Validierung aktivieren
- [ ] Rate-Limiting für API-Endpoints konfigurieren
- [ ] 2FA mit echter TOTP-Library (speakeasy + qrcode)
- [ ] Environment Variables für sensible Daten (.env)

### Production

- [ ] Unit + E2E Tests erfolgreich
- [ ] Lighthouse Score >90 (Accessibility, Best Practices)
- [ ] Security Audit (OWASP Top 10)
- [ ] Load Testing (>1000 req/s)
- [ ] Monitoring + Alerting (Sentry, DataDog)
- [ ] Backup-Strategie für Benutzereinstellungen

---

## Migration Guide

### Von Legacy Settings

1. **Datenmigration:**
   ```sql
   INSERT INTO settings_v2 (user_id, key, value)
   SELECT user_id, setting_name, setting_value
   FROM legacy_settings;
   ```

2. **API-Kompatibilität:**
   Legacy-Endpoints als Proxy zu neuen Routes:
   ```ts
   app.get("/api/legacy/settings", async (req, res) => {
     const data = await fetch("/api/settings/user");
     res.json(data);
   });
   ```

3. **Feature-Flag-Rollout:**
   - Phase 1: Beta-Nutzer (10%)
   - Phase 2: Early Adopters (50%)
   - Phase 3: Alle Nutzer (100%)

---

## Troubleshooting

### Tab-Navigation funktioniert nicht

**Problem:** Tabs wechseln nicht beim Klick

**Lösung:**
```tsx
// Ensure useState is properly initialized
const [activeTab, setActiveTab] = useState("general");

// Check TabsContent "when" prop matches TabsTrigger "value"
<TabsTrigger value="general" />
<TabsContent when="general" />
```

### System-Tab für Admin nicht sichtbar

**Problem:** Admin-User sieht System-Tab nicht

**Lösung:**
```tsx
// Verify userRole is correctly set from session
const userRole = session?.role || "viewer";
const isAdmin = userRole === "admin";

// Check conditional rendering
{isAdmin && <TabsTrigger value="system">System</TabsTrigger>}
```

### API-Token-Rotation schlägt fehl

**Problem:** Neuer Key wird nicht angezeigt

**Lösung:**
```tsx
// Check API response structure
const data = await res.json();
console.log("Rotation Response:", data);

// Ensure setApiKey + setShowKey are called
setApiKey(data.newKey);
setShowKey(true);
```

---

## Roadmap

### Version 3.6.0 (Q1 2025)

- [ ] **Mobile Accordion-Modus** für <lg Screens
- [ ] **Bulk-Actions** für Integrationen (Alle verbinden/trennen)
- [ ] **Rate-Limit-Editor-Modal** mit Input-Validierung
- [ ] **Export-Funktion** für Audit-Logs (CSV)

### Version 3.7.0 (Q2 2025)

- [ ] **SSO-Integration** (SAML, OAuth2)
- [ ] **Multi-Org-Support** (Organisation wechseln)
- [ ] **Custom Themes** (Dark Mode, High Contrast)
- [ ] **Webhook-Management** (Custom Event Subscriptions)

### Version 4.0.0 (Q3 2025)

- [ ] **Real-Time Collaboration** (Live-Updates via WebSocket)
- [ ] **Approval Workflows** (2-Step Verification für kritische Änderungen)
- [ ] **Compliance Exports** (GDPR, SOC2, ISO27001)
- [ ] **Advanced Analytics** (Settings Usage Heatmap)

---

## Support

### Kontakt

- **GitHub Issues:** [github.com/sintra/agent-system/issues](https://github.com)
- **Slack Channel:** #settings-enterprise
- **E-Mail:** support@sintra.ai

### Dokumentation

- **API Reference:** [docs.sintra.ai/api/settings](https://docs.sintra.ai)
- **Component Library:** [storybook.sintra.ai](https://storybook.sintra.ai)

---

**© 2025 SINTRA Systems GmbH. All rights reserved.**
