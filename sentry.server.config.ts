import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Nur in Production aktiv
  enabled: process.env.NODE_ENV === "production",

  // Environment
  environment: process.env.NODE_ENV,

  // Release Version
  release: "brain-ai@3.0.0",

  // Tracing
  tracesSampleRate: 0.1,

  // Custom Tags
  initialScope: {
    tags: {
      "app.name": "brain-ai",
      "app.version": "3.0.0",
      "runtime": "nodejs",
    },
  },

  // Before Send Hook
  beforeSend(event, hint) {
    // Remove sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});
