# 🐛 Error Logging & Monitoring Setup

**Ziel:** Production-ready Error Tracking für Brain AI

**Empfohlene Tools:**
- **Sentry** (Recommended) – Beste DX, kostenlos für 5k Events/Monat
- **LogRocket** – Session Replay + Error Tracking
- **Console.log** – Fallback für Entwicklung

---

## Option 1: Sentry Setup (Empfohlen)

### 1. Sentry Account erstellen
```bash
# Visit https://sentry.io/signup/
# Wähle: Next.js Framework
```

### 2. Sentry installieren
```bash
npm install @sentry/nextjs
```

### 3. Sentry konfigurieren
```bash
npx @sentry/wizard@latest -i nextjs
```

**Was der Wizard tut:**
- Erstellt `sentry.client.config.ts`
- Erstellt `sentry.server.config.ts`
- Erstellt `sentry.edge.config.ts`
- Fügt Sentry zu `next.config.js` hinzu

### 4. Environment Variables setzen

**`.env.local`**
```env
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

### 5. Sentry Client Config anpassen

**`sentry.client.config.ts`**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Nur in Production aktiv
  enabled: process.env.NODE_ENV === "production",

  // Environment
  environment: process.env.NODE_ENV,

  // Release Version (wichtig für Tracking)
  release: "brain-ai@3.0.0",

  // Tracing
  tracesSampleRate: 0.1, // 10% der Requests tracken

  // Session Replay (optional)
  replaysSessionSampleRate: 0.1, // 10% aller Sessions
  replaysOnErrorSampleRate: 1.0,  // 100% bei Errors

  // Ignore certain errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    "Navigation cancelled",
  ],

  // Custom Tags
  initialScope: {
    tags: {
      "app.name": "brain-ai",
      "app.version": "3.0.0",
    },
  },

  // Before Send Hook (für Datenschutz)
  beforeSend(event, hint) {
    // Remove sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});
```

### 6. Custom Error Tracking in Brain AI

**Beispiel: Semantic Search Error Tracking**

**`app/(app)/brain/page.tsx`**
```typescript
import * as Sentry from "@sentry/nextjs";

const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    // ... existing search logic
  } catch (error: any) {
    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        feature: "semantic-search",
        searchType: useSemanticSearch ? "semantic" : "keyword",
      },
      extra: {
        searchQuery,
        userId: "demo-user",
      },
    });

    // Show error to user
    showToast({
      variant: "error",
      title: "Suche fehlgeschlagen",
      description: error.message,
    });
  }
};
```

**Beispiel: Document Upload Error Tracking**

**`components/brain/DocumentUpload.tsx`**
```typescript
import * as Sentry from "@sentry/nextjs";

const uploadFile = async (file: File) => {
  try {
    // ... existing upload logic
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: {
        feature: "document-upload",
        fileType: file.type,
        fileSize: file.size,
      },
      extra: {
        fileName: file.name,
      },
    });

    setError(error.message || "Upload failed");
  }
};
```

### 7. Performance Monitoring

**Track Brain AI Feature Performance:**

```typescript
import * as Sentry from "@sentry/nextjs";

// Document Upload Performance
const uploadTransaction = Sentry.startTransaction({
  name: "Document Upload",
  op: "brain-ai.upload",
});

try {
  await uploadFile(file);
  uploadTransaction.setStatus("ok");
} catch (error) {
  uploadTransaction.setStatus("internal_error");
  throw error;
} finally {
  uploadTransaction.finish();
}
```

### 8. Alerts Setup (Sentry Dashboard)

**Wichtige Alerts:**
1. **Error Rate > 5%** → Email an Team
2. **Neue Error-Type** → Slack-Notification
3. **Performance Regression** (> 5s) → Email
4. **High-Volume Errors** (> 100/h) → PagerDuty

---

## Option 2: Custom Console Logging (Development)

Für Development/Testing ohne Sentry:

**`lib/logger.ts`**
```typescript
export const logger = {
  error: (message: string, context?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.error(`[ERROR] ${message}`, context);
    }
  },

  warn: (message: string, context?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[WARN] ${message}`, context);
    }
  },

  info: (message: string, context?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.info(`[INFO] ${message}`, context);
    }
  },

  debug: (message: string, context?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, context);
    }
  },
};
```

**Usage:**
```typescript
import { logger } from "@/lib/logger";

try {
  await uploadFile(file);
} catch (error) {
  logger.error("Document upload failed", {
    fileName: file.name,
    fileSize: file.size,
    error,
  });
}
```

---

## Option 3: LogRocket (Session Replay + Errors)

**Vorteile:**
- Session Replay (sieh genau, was User gemacht haben)
- Error Tracking
- Performance Monitoring
- User Identify

**Setup:**
```bash
npm install logrocket
```

**`app/layout.tsx`**
```typescript
import LogRocket from 'logrocket';

// Init LogRocket (nur in Production)
if (process.env.NODE_ENV === 'production') {
  LogRocket.init('your-app-id/brain-ai');

  // Identify User (optional)
  LogRocket.identify('demo-user', {
    name: 'Demo User',
    email: 'demo@example.com',
  });
}
```

**Custom Events:**
```typescript
import LogRocket from 'logrocket';

// Track Feature Usage
LogRocket.track('Document Uploaded', {
  fileType: 'pdf',
  fileSize: 1024000,
  feature: 'brain-ai',
});
```

---

## Production Checklist

### Error Tracking
- [ ] Sentry/LogRocket Setup abgeschlossen
- [ ] DSN in Environment Variables
- [ ] Nur in Production aktiv (nicht Dev)
- [ ] Custom Error Boundaries für Brain AI
- [ ] Performance Monitoring aktiviert
- [ ] Alerts konfiguriert

### Privacy & Security
- [ ] Sensitive Daten aus Errors entfernt (Cookies, Headers)
- [ ] User-IDs anonymisiert (optional)
- [ ] GDPR-konform (User kann Tracking ablehnen)

### Testing
- [ ] Error Tracking in Dev getestet
- [ ] Sentry Dashboard zeigt Errors an
- [ ] Alerts funktionieren
- [ ] Source Maps hochgeladen (für Stack Traces)

---

## Monitoring Dashboard (Sentry)

**Key Metrics to Track:**
1. **Error Rate** – Fehler pro 100 Requests
2. **Crash-Free Sessions** – % Sessions ohne Fehler (Ziel: > 99%)
3. **Most Common Errors** – Top 5 Fehler nach Häufigkeit
4. **Errors by Feature** – Brain AI Features mit meisten Errors
5. **Performance** – P95 Response Time < 3s

**Wöchentliches Review:**
- Top 3 kritischsten Bugs fixen
- Performance-Regressions identifizieren
- User Impact bewerten

---

## Next Steps

1. ✅ **Sentry Account erstellen** → https://sentry.io/signup/
2. ✅ **NPM Package installieren** → `npm install @sentry/nextjs`
3. ✅ **Wizard laufen lassen** → `npx @sentry/wizard@latest -i nextjs`
4. ✅ **Environment Variables setzen**
5. ✅ **Custom Error Tracking in Brain AI Features**
6. ✅ **Alerts konfigurieren**
7. ✅ **Testen** (Trigger einen Fehler absichtlich)

---

**Support:**
- 📖 Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- 💬 Sentry Discord: https://discord.gg/sentry
- 📧 Support: support@sentry.io

---

**Last Updated:** 2025-11-19
