'use client';

import { useEffect } from 'react';

export default function AgentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg = (error?.message || '').toLowerCase();
  const isAuthError = msg.includes('auth') || msg.includes('unauthorized') || msg.includes('token') || msg.includes('401') || msg.includes('sign in');

  useEffect(() => {
    // Log the error to console in development
    console.error('Agents Page Error:', error);

    if (isAuthError && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      document.cookie = 'sintra.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';
    }
  }, [error, isAuthError]);

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
    <div style={{
      padding: '32px',
      minHeight: '100vh',
      background: '#030712',
      color: '#e5e7eb'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <h2 style={{
          color: '#ef4444',
          fontSize: '24px',
          marginBottom: '16px',
          fontWeight: '600'
        }}>
          ⚠️ Fehler beim Laden der Agents
        </h2>

        <p style={{
          color: '#94a3b8',
          marginBottom: '16px'
        }}>
          Die Agent-Seite konnte nicht geladen werden.
        </p>

        <pre style={{
          color: '#fca5a5',
          background: '#1f2937',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          overflow: 'auto',
          marginBottom: '24px',
          border: '1px solid #374151',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {error?.message || String(error)}
        </pre>

        {error?.digest && (
          <p style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginBottom: '16px'
          }}>
            Error ID: {error.digest}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Seite neu laden
          </button>

          <button
            onClick={() => window.location.href = '/agents/browse'}
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📋 Zur Agent-Übersicht
          </button>

          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '10px 20px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🏠 Zur Startseite
          </button>
        </div>
      </div>
    </div>
  );
}