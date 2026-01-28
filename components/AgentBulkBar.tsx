"use client";
import { Button } from "@/components/ui/button";

export default function AgentBulkBar({
  count,
  onStart,
  onStop,
  onDelete,
  onExport,
  onExportCSV,
  onClear,
}: {
  count: number;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
  onExport: () => void;
  onExportCSV?: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="col-span-12 sticky top-[56px] z-30 flex items-center justify-between rounded-xl border border-white/10 bg-[hsl(var(--card))]/80 px-3 py-2 backdrop-blur">
      <div className="text-sm">
        <strong>{count}</strong> selected
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onStart}>Start</Button>
        <Button variant="secondary" onClick={onStop}>Stop</Button>
        <Button variant="outline" onClick={onExport}>Export JSON</Button>
        {onExportCSV && <Button variant="outline" onClick={onExportCSV}>Export CSV</Button>}
        <Button variant="ghost" onClick={onDelete}>Delete</Button>
        <Button variant="ghost" onClick={onClear}>Clear</Button>
      </div>
    </div>
  );
}
