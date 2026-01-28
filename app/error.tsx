/**
 * App Error Boundary
 * Catches errors in the app segment
 */

'use client';

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
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
