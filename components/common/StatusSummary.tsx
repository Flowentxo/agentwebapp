'use client';

/**
 * StatusSummary - Displays health status counts (OK/Eingeschränkt/Fehler)
 * Used in both Dashboard and Agents pages
 */

interface StatusSummaryProps {
  counts: {
    ok: number;
    degraded: number;
    error: number;
  };
  className?: string;
}

export function StatusSummary({ counts, className = '' }: StatusSummaryProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-1.5">
        <div className="h-2 w-2 rounded-full bg-success" />
        <span className="text-sm font-medium text-success">
          {counts.ok} OK
        </span>
      </div>

      {counts.degraded > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-warning" />
          <span className="text-sm font-medium text-warning">
            {counts.degraded} Eingeschränkt
          </span>
        </div>
      )}

      {counts.error > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-error" />
          <span className="text-sm font-medium text-error">
            {counts.error} Fehler
          </span>
        </div>
      )}
    </div>
  );
}
