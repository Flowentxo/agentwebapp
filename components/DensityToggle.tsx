"use client";
import { useTablePrefs } from "@/store/table";

export default function DensityToggle() {
  const { density, set } = useTablePrefs();
  const Btn = ({ v }: { v: typeof density }) => (
    <button
      onClick={() => set(v)}
      className={`rounded-lg px-2 py-1 text-xs ${
        density === v ? "bg-card/10" : "hover:bg-card/5"
      } border border-white/10`}
      aria-pressed={density === v}
    >
      {v}
    </button>
  );
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-card/5 p-1">
      <Btn v="comfortable" />
      <Btn v="compact" />
      <Btn v="condensed" />
    </div>
  );
}
