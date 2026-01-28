# 🎨 SINTRA Profile UI - Complete Implementation Guide

**Version**: 1.4.0
**Date**: 2025-10-24
**Status**: Architecture Complete | Tabs Implementation Required

---

## ✅ COMPLETED COMPONENTS

### 1. Core Architecture

**Files Created**:
- ✅ `lib/profile/client-utils.ts` - Utility functions (fetchJSON, formatters, validators)
- ✅ `hooks/useProfile.ts` - Profile data management hook
- ✅ `hooks/useToaster.ts` - Toast notifications hook
- ✅ `app/(app)/profile/page.tsx` - Server component with data loading
- ✅ `app/(app)/profile/profile.client.tsx` - Client shell with tab navigation
- ✅ `app/(app)/profile/tabs/OverviewTab.tsx` - Complete overview tab

### 2. Utility Functions (client-utils.ts)

```typescript
// Available utilities:
- fetchJSON<T>(url, init?) - Fetch with error handling
- formatRelativeTime(date) - "vor 2 Stunden"
- formatDate(date) - Absolute date formatting
- validateAvatarFile(file) - File validation for uploads
- createPreviewUrl(file) - Object URL for preview
- revokePreviewUrl(url) - Cleanup preview URL
- getCsrfToken() - CSRF token (currently stub)
- parseUserAgent(ua) - Parse browser/OS/device
- debounce(func, wait) - Debounce utility
- copyToClipboard(text) - Copy to clipboard
- downloadTextFile(text, filename) - Download as file
```

### 3. Hooks

**useProfile Hook**:
```typescript
const { data, loading, error, refresh, update } = useProfile(initialData);

// Methods:
- refresh() - Reload profile from API
- update(partial) - Update profile fields
```

**useToaster Hook**:
```typescript
const toast = useToaster();

// Methods:
- toast.success(title, description?)
- toast.error(title, description?)
- toast.info(title, description?)
- toast.warning(title, description?)
```

---

## ⏳ REMAINING IMPLEMENTATION

### Tab 2: Personal Tab

**File**: `app/(app)/profile/tabs/PersonalTab.tsx`

**Components Needed**:
1. **AvatarUploader** - Drag-drop avatar upload
2. **PersonalInfoForm** - Display name, bio, pronouns, location, job title

**Implementation Pattern**:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema } from '@/lib/profile/schemas';

export default function PersonalTab({ profile, onUpdate, loading }) {
  const form = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      displayName: profile.displayName,
      bio: profile.bio,
      pronouns: profile.pronouns,
      location: profile.location,
      orgTitle: profile.orgTitle,
    },
  });

  const onSubmit = async (data) => {
    try {
      await onUpdate(data);
      toast.success('Profil aktualisiert');
    } catch (err) {
      toast.error('Fehler beim Speichern', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <AvatarUploader currentUrl={profile.avatarUrl} onUpload={handleAvatarUpload} />
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </div>
  );
}
```

**Avatar Uploader Pattern**:
```typescript
const AvatarUploader = ({ currentUrl, onUpload }) => {
  const [preview, setPreview] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toast.error('Ungültige Datei', validation.error);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const result = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() },
        body: formData,
      });

      const json = await result.json();
      if (json.ok) {
        setPreview(json.data.avatarUrl);
        onUpload(json.data.avatarUrl);
        toast.success('Avatar hochgeladen');
      }
    } catch (err) {
      toast.error('Upload fehlgeschlagen', err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center space-x-6">
      <div className="relative">
        <img src={preview} className="w-24 h-24 rounded-full" />
        {uploading && <Spinner />}
      </div>
      <div>
        <input type="file" onChange={(e) => handleFile(e.target.files[0])} />
        <p className="text-sm text-gray-500">JPEG, PNG, WebP (max 5MB)</p>
      </div>
    </div>
  );
};
```

---

### Tab 3: Preferences Tab

**File**: `app/(app)/profile/tabs/PreferencesTab.tsx`

**Fields**:
- Locale (select)
- Timezone (select with search)
- Theme (radio: light/dark/system)
- Accessibility:
  - Reduce motion (toggle)
  - High contrast (toggle)
  - Font scale (slider 0.8-1.2)

**Implementation**:
```typescript
const PreferencesTab = ({ profile, onUpdate, loading }) => {
  const form = useForm({
    defaultValues: {
      locale: profile.locale,
      timezone: profile.timezone,
      theme: profile.theme,
      accessibility: profile.accessibility,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onUpdate)}>
      <div className="space-y-6">
        {/* Locale Select */}
        <FormField
          name="locale"
          label="Sprache"
          control={form.control}
          render={({ field }) => (
            <Select {...field}>
              <option value="de-DE">Deutsch</option>
              <option value="en-US">English</option>
            </Select>
          )}
        />

        {/* Timezone with search */}
        <FormField
          name="timezone"
          label="Zeitzone"
          control={form.control}
          render={({ field }) => (
            <Combobox
              {...field}
              options={timezones}
              searchable
            />
          )}
        />

        {/* Theme */}
        <RadioGroup value={form.watch('theme')} onValueChange={(v) => form.setValue('theme', v)}>
          <RadioGroupItem value="light">Hell</RadioGroupItem>
          <RadioGroupItem value="dark">Dunkel</RadioGroupItem>
          <RadioGroupItem value="system">System</RadioGroupItem>
        </RadioGroup>

        {/* Accessibility */}
        <div className="space-y-4">
          <Switch
            checked={form.watch('accessibility.reduceMotion')}
            onCheckedChange={(v) => form.setValue('accessibility.reduceMotion', v)}
            label="Animationen reduzieren"
          />

          <Switch
            checked={form.watch('accessibility.highContrast')}
            onCheckedChange={(v) => form.setValue('accessibility.highContrast', v)}
            label="Hoher Kontrast"
          />

          <Slider
            value={[form.watch('accessibility.fontScale')]}
            onValueChange={([v]) => form.setValue('accessibility.fontScale', v)}
            min={0.8}
            max={1.2}
            step={0.1}
            label="Schriftgröße"
          />
        </div>

        <Button type="submit" disabled={loading}>Speichern</Button>
      </div>
    </form>
  );
};
```

---

### Tab 4: Security Tab

**File**: `app/(app)/profile/tabs/SecurityTab.tsx`

**Components**:
1. **EmailChangeCard** - Request/confirm email change
2. **PasswordChangeDialog** - Change password (requires re-auth)
3. **MfaCard** - Setup/enable/disable MFA

**MFA Workflow**:
```typescript
const MfaCard = ({ profile, onRefresh }) => {
  const [step, setStep] = useState<'idle' | 'setup' | 'enable' | 'disable'>('idle');
  const [qrCode, setQrCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const handleSetup = async () => {
    setStep('setup');
    const result = await fetchJSON('/api/profile/mfa/setup', { method: 'POST' });
    setQrCode(result.qrCode);
    setStep('enable');
  };

  const handleEnable = async (code: string) => {
    const result = await fetchJSON('/api/profile/mfa/enable', {
      method: 'POST',
      headers: { 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({ code }),
    });
    setRecoveryCodes(result.recoveryCodes);
    toast.success('MFA aktiviert');
    onRefresh();
  };

  const handleDisable = async (password: string) => {
    await fetchJSON('/api/profile/mfa/disable', {
      method: 'POST',
      headers: { 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({ currentPassword: password }),
    });
    toast.success('MFA deaktiviert');
    onRefresh();
  };

  if (profile.mfaEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zwei-Faktor-Authentifizierung</CardTitle>
          <CardDescription>Aktiviert ✓</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setStep('disable')}>
            Deaktivieren
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zwei-Faktor-Authentifizierung</CardTitle>
        <CardDescription>Schützen Sie Ihr Konto mit einem zusätzlichen Sicherheitsfaktor</CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'idle' && (
          <Button onClick={handleSetup}>MFA einrichten</Button>
        )}

        {step === 'enable' && (
          <div>
            <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            <p>Scannen Sie den QR-Code mit Ihrer Authenticator-App</p>
            <Input
              placeholder="6-stelliger Code"
              onSubmit={(code) => handleEnable(code)}
            />
          </div>
        )}

        {recoveryCodes.length > 0 && (
          <Alert>
            <AlertTitle>Recovery Codes</AlertTitle>
            <AlertDescription>
              <p>Speichern Sie diese Codes sicher. Sie werden nur einmal angezeigt.</p>
              <pre className="mt-2 p-4 bg-gray-100 rounded">
                {recoveryCodes.join('\n')}
              </pre>
              <Button onClick={() => downloadTextFile(recoveryCodes.join('\n'), 'recovery-codes.txt')}>
                Herunterladen
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
```

---

### Tab 5: Sessions Tab

**File**: `app/(app)/profile/tabs/SessionsTab.tsx`

**Features**:
- List all active sessions
- Show device/browser/location
- Revoke button (disabled for current session)
- Auto-refresh every 30s

```typescript
const SessionsTab = ({ userId }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    const data = await fetchJSON('/api/profile/sessions');
    setSessions(data);
    setLoading(false);
  };

  const handleRevoke = async (sessionId: string) => {
    if (confirm('Diese Sitzung wirklich beenden?')) {
      await fetchJSON(`/api/profile/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
      toast.success('Sitzung beendet');
      loadSessions();
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Gerät</TableHead>
          <TableHead>Standort</TableHead>
          <TableHead>Letzte Aktivität</TableHead>
          <TableHead>Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => {
          const { browser, os } = parseUserAgent(session.userAgent);
          const isCurrent = session.id === currentSessionId;

          return (
            <TableRow key={session.id}>
              <TableCell>
                {browser} auf {os}
                {isCurrent && <Badge>Aktuell</Badge>}
              </TableCell>
              <TableCell>{session.ip}</TableCell>
              <TableCell>{formatRelativeTime(session.createdAt)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isCurrent}
                  onClick={() => handleRevoke(session.id)}
                >
                  Beenden
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
```

---

### Tab 6: Notifications Tab

**File**: `app/(app)/profile/tabs/NotificationsTab.tsx`

**Fields** (all booleans):
- emailDigest
- productUpdates
- securityAlerts
- webPush
- sms

```typescript
const NotificationsTab = ({ userId }) => {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    const data = await fetchJSON('/api/profile/notifications');
    setPrefs(data);
    setLoading(false);
  };

  const handleToggle = async (field: string, value: boolean) => {
    const updated = await fetchJSON('/api/profile/notifications', {
      method: 'PUT',
      headers: { 'x-csrf-token': getCsrfToken() },
      body: JSON.stringify({ [field]: value }),
    });
    setPrefs(updated);
    toast.success('Einstellungen gespeichert');
  };

  return (
    <div className="space-y-4">
      <Switch
        checked={prefs?.emailDigest}
        onCheckedChange={(v) => handleToggle('emailDigest', v)}
        label="E-Mail-Zusammenfassungen"
        description="Erhalten Sie tägliche Zusammenfassungen per E-Mail"
      />

      <Switch
        checked={prefs?.productUpdates}
        onCheckedChange={(v) => handleToggle('productUpdates', v)}
        label="Produkt-Updates"
        description="Benachrichtigungen über neue Features"
      />

      <Switch
        checked={prefs?.securityAlerts}
        onCheckedChange={(v) => handleToggle('securityAlerts', v)}
        label="Sicherheitswarnungen"
        description="Wichtige Sicherheitshinweise (empfohlen)"
        disabled // Always enabled
      />

      <Switch
        checked={prefs?.webPush}
        onCheckedChange={(v) => handleToggle('webPush', v)}
        label="Web-Push-Benachrichtigungen"
      />

      <Switch
        checked={prefs?.sms}
        onCheckedChange={(v) => handleToggle('sms', v)}
        label="SMS-Benachrichtigungen"
      />
    </div>
  );
};
```

---

### Tab 7: Privacy Tab

**File**: `app/(app)/profile/tabs/PrivacyTab.tsx`

**Fields**:
- directoryOptOut (boolean)
- dataSharing.analytics (boolean)
- dataSharing.product (boolean)
- searchVisibility (boolean)

---

### Tab 8: Audit Tab

**File**: `app/(app)/profile/tabs/AuditTab.tsx`

**Features**:
- Paginated audit log
- Filter by action type
- Relative timestamps
- Details expansion

```typescript
const AuditTab = ({ userId }) => {
  const [entries, setEntries] = useState([]);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadAudit();
  }, [limit]);

  const loadAudit = async () => {
    const data = await fetchJSON(`/api/profile/audit?limit=${limit}`);
    setEntries(data);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Aktion</TableHead>
          <TableHead>Zeitpunkt</TableHead>
          <TableHead>IP-Adresse</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <Badge>{entry.action}</Badge>
            </TableCell>
            <TableCell>{formatRelativeTime(entry.createdAt)}</TableCell>
            <TableCell>{entry.ip}</TableCell>
            <TableCell>
              <Dialog>
                <DialogTrigger>Anzeigen</DialogTrigger>
                <DialogContent>
                  <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                </DialogContent>
              </Dialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

---

## 🧪 TESTING

### Unit Tests

**File**: `tests/unit/profile-ui.spec.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { fetchJSON, validateAvatarFile, parseUserAgent } from '@/lib/profile/client-utils';

describe('Profile UI Utils', () => {
  test('validateAvatarFile rejects invalid types', () => {
    const file = new File([''], 'test.pdf', { type: 'application/pdf' });
    const result = validateAvatarFile(file);
    expect(result.valid).toBe(false);
  });

  test('parseUserAgent extracts browser', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';
    const result = parseUserAgent(ua);
    expect(result.browser).toBe('Chrome');
    expect(result.os).toBe('Windows');
  });
});
```

### E2E Tests

**File**: `tests/e2e/profile.e2e.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('updates profile successfully', async ({ page }) => {
    await page.goto('/profile');
    await page.click('[data-tab="personal"]');
    await page.fill('[name="displayName"]', 'New Name');
    await page.click('button[type="submit"]');
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('enables MFA flow', async ({ page }) => {
    await page.goto('/profile');
    await page.click('[data-tab="security"]');
    await page.click('button:has-text("MFA einrichten")');
    await expect(page.locator('img[alt="QR Code"]')).toBeVisible();
    await page.fill('[name="code"]', '123456');
    await page.click('button:has-text("Aktivieren")');
    await expect(page.locator('text=Recovery Codes')).toBeVisible();
  });

  test('lists and revokes sessions', async ({ page }) => {
    await page.goto('/profile');
    await page.click('[data-tab="sessions"]');
    await expect(page.locator('table tbody tr')).toHaveCount.greaterThan(0);
    await page.click('button:has-text("Beenden")').first();
    await page.click('button:has-text("Bestätigen")');
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

---

## 📊 IMPLEMENTATION CHECKLIST

### Completed ✅
- [x] Core utilities (fetchJSON, formatters, validators)
- [x] Profile hook (useProfile)
- [x] Toaster hook (useToaster)
- [x] Server page component
- [x] Client shell with tabs
- [x] Overview tab (complete)

### Remaining ⏳
- [ ] Personal tab + Avatar uploader
- [ ] Preferences tab (locale, timezone, theme, accessibility)
- [ ] Security tab (email change, password, MFA dialogs)
- [ ] Sessions tab (list, revoke)
- [ ] Notifications tab (toggle preferences)
- [ ] Privacy tab (data sharing settings)
- [ ] Audit tab (log viewer with filters)
- [ ] Re-authentication dialog component
- [ ] Unit tests (utils, hooks, forms)
- [ ] E2E tests (full user flows)
- [ ] Integration with shadcn/ui Toast
- [ ] CSRF token implementation
- [ ] Session ID detection for "current" badge

---

## 🚀 QUICK START

**Estimated Time**: 6-8 hours for complete implementation

**Priority Order**:
1. Personal tab (2 hours) - Avatar + form
2. Security tab (2 hours) - MFA workflow
3. Sessions tab (1 hour) - List + revoke
4. Preferences tab (1 hour) - Selects + toggles
5. Notifications + Privacy (1 hour) - Toggle forms
6. Audit tab (1 hour) - Table + filters
7. Tests (2 hours) - Unit + E2E

**All patterns and examples are provided above. Follow the established structure for consistency.**

---

## 📚 RESOURCES

- **API Docs**: See `docs/PROFILE_IMPLEMENTATION_STATUS.md` for all 14 endpoints
- **Backend**: All services and routes are production-ready
- **Shadcn/UI**: Use existing components from `components/ui/`
- **React Hook Form**: https://react-hook-form.com/
- **Zod**: Schemas already defined in `lib/profile/schemas.ts`

**The foundation is complete. The remaining work is systematic tab and form implementation following the patterns above.**
