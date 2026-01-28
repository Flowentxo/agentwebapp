'use client';

import { useEffect } from 'react';

export default function AppLayoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    console.error('App Layout Error:', error);
  }, [error]);

  return (
    <div style={{
      padding: '32px',
      minHeight: '100vh',
      background: '#0a0a0a',
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
          ⚠️ Ein Fehler ist aufgetreten
        </h2>

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