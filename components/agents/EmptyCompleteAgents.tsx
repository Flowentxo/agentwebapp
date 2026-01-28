"use client";

import { PackageX } from 'lucide-react';

/**
 * Empty state shown when no complete agents are available
 * Displays German message
 */
export function EmptyCompleteAgents() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-card/5 p-4 mb-4">
        <PackageX className="h-10 w-10 text-text-muted" />
      </div>

      <h3 className="text-lg font-semibold text-text mb-2">
        Keine fertigen Agents gefunden
      </h3>

      <p className="text-sm text-text-muted text-center max-w-md">
        Aktuell sind keine produktionsbereiten Agents verfügbar.
      </p>
    </div>
  );
}
