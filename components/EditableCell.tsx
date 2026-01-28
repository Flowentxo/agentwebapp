"use client";
import * as React from "react";

export default function EditableCell({
  value,
  onCommit,
  placeholder = "—",
  className = "",
  ariaLabel,
}: {
  value?: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(value ?? "");

  React.useEffect(() => setVal(value ?? ""), [value]);

  const commit = () => {
    setEditing(false);
    if ((value ?? "") !== val.trim()) onCommit(val.trim());
  };

  if (!editing) {
    return (
      <button
        className={`inline-flex min-w-[48px] items-center rounded px-1 hover:bg-card/10 ${className}`}
        onClick={() => setEditing(true)}
        aria-label={ariaLabel ?? "edit cell"}
      >
        {value ?? <span className="text-white/40">{placeholder}</span>}
      </button>
    );
  }

  return (
    <input
      autoFocus
      className={`w-full rounded bg-input px-1 py-0.5 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/50 ${className}`}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      aria-label={ariaLabel ?? "cell editor"}
    />
  );
}
