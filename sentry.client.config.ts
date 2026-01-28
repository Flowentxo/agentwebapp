import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Nur in Production aktiv
  enabled: process.env.NODE_ENV === "production",

  // Environment
  environment: process.env.NODE_ENV,

  // Release Version
  release: "brain-ai@3.0.0",

  // Tracing - 10% der Requests tracken
  tracesSampleRate: 0.1,

  // Session Replay (optional)
  replaysSessionSampleRate: 0.1, // 10% aller Sessions
  replaysOnErrorSampleRate: 1.0,  // 100% bei Errors

  // Ignore bestimmte Errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    "Navigation cancelled",
    "AbortError",
  ],

  // Custom Tags
  initialScope: {
    tags: {
      "app.name": "brain-ai",
      "app.version": "3.0.0",
    },
  },

  // Before Send Hook (Datenschutz)
  beforeSend(event, hint) {
    // Remove sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },

  // Breadcrumbs
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter sensitive breadcrumbs
    if (breadcrumb.category === "console") {
      return null;
    }
    return breadcrumb;
  },
});
