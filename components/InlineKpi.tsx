"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export default function InlineKpi({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(value);

  React.useEffect(() => setVal(value), [value]);

  const commit = () => {
    setEditing(false);
    if (onChange && val !== value) onChange(val);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-card/5 px-3 py-2 hover:ring-1 hover:ring-[hsl(var(--ring))]/40",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
        <button
          type="button"
          className="rounded-md px-1 text-[10px] text-white/60 hover:bg-card/10"
          onClick={() => setEditing((v) => !v)}
          aria-label={editing ? "Save KPI" : "Edit KPI"}
        >
          {editing ? "Save" : "Edit"}
        </button>
      </div>
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="mt-1 w-full rounded-lg bg-input px-2 py-1 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/60"
        />
      ) : (
        <div className="mt-1 text-sm font-semibold">{value}</div>
      )}
    </div>
  );
}
