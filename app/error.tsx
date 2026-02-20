/**
 * App Error Boundary
 * Catches errors in the app segment
 */

'use client';

import { useEffect } from 'react';

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const msg = (error?.message || '').toLowerCase();
  const isAuthError = msg.includes('auth') || msg.includes('unauthorized') || msg.includes('token') || msg.includes('401') || msg.includes('sign in');

  useEffect(() => {
    if (isAuthError && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      document.cookie = 'sintra.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';
    }
  }, [isAuthError]);

  if (isAuthError) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>Deine Sitzung ist abgelaufen</p>
          <button
            onClick={() => window.location.href = '/login'}
            style={{ padding: '10px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
          >
            Neu einloggen
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md rounded-2xl border-2 border-border p-6 shadow-sm bg-card">
        <h1 className="text-xl font-semibold mb-2 text-foreground">
          Seitenfehler
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          Diese Seite konnte nicht geladen werden.
        </p>
        <details className="text-xs text-muted-foreground dark:text-muted-foreground mb-4 whitespace-pre-wrap">
          <summary className="cursor-pointer mb-2">Fehlerdetails anzeigen</summary>
          {String(error?.message || 'Unknown error')}
        </details>
        <div className="flex gap-3">
          <button
            onClick={() => reset()}
            className="rounded-md bg-primary text-primary-foreground px-3 py-2 hover:bg-primary/90 transition-colors"
          >
            Erneut versuchen
          </button>
          <a
            href="/"
            className="rounded-md border border-border px-3 py-2 hover:bg-muted transition-colors"
          >
            Startseite
          </a>
        </div>
      </div>
    </main>
  );
}
