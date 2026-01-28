/**
 * Global Error Boundary
 * Catches all unhandled errors at the root level
 */

'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main className="min-h-screen flex items-center justify-center p-6 bg-muted/50">
          <div className="w-full max-w-md rounded-2xl border border-border p-6 shadow-sm bg-card">
            <h1 className="text-xl font-semibold mb-2 text-foreground">Unerwarteter Fehler</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Es ist ein Fehler aufgetreten. Bitte versuche es erneut.
            </p>
            {error?.digest && (
              <p className="text-xs text-muted-foreground mb-4">
                Fehler-ID: <code className="bg-muted px-1 rounded">{error.digest}</code>
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => reset()}
                className="rounded-md bg-primary text-primary-foreground px-3 py-2 hover:bg-primary/90 transition-colors"
              >
                Erneut versuchen
              </button>
              <a
                href="/"
                className="rounded-md border border-border px-3 py-2 hover:bg-muted/50 transition-colors"
              >
                Startseite
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
