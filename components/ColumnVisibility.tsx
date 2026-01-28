"use client";
import { useTablePrefs } from "@/store/table";

export default function ColumnVisibility() {
  const { columns, setColumns, resetColumns } = useTablePrefs();

  const Item = ({ keyName, label }: { keyName: keyof typeof columns; label: string }) => (
    <label className="flex items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={columns[keyName]}
        onChange={(e) => setColumns({ [keyName]: e.target.checked } as any)}
      />
      {label}
    </label>
  );

  return (
    <div className="rounded-xl border border-white/10 bg-card/5 px-3 py-2">
      <div className="mb-2 text-xs font-semibold">Columns</div>
      <div className="grid grid-cols-2 gap-2">
        <Item keyName="agent" label="Agent" />
        <Item keyName="status" label="Status" />
        <Item keyName="req" label="Requests" />
        <Item keyName="succ" label="Success" />
        <Item keyName="avg" label="Avg Time" />
        <Item keyName="uptime" label="Uptime" />
        <Item keyName="action" label="Action" />
      </div>
      <button
        className="mt-2 rounded-lg border border-white/10 px-2 py-1 text-[11px] hover:bg-card/10"
        onClick={resetColumns}
      >
        Reset
      </button>
    </div>
  );
}
