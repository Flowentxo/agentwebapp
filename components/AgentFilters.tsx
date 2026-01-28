"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import TagChip from "@/components/TagChip";
import { useAgents } from "@/store/agents";

export type SortKey = "name-asc" | "name-desc" | "status" | "requests-desc";
export type Filters = { q: string; onlyActive: boolean; sort: SortKey; tags: string[] };

export default function AgentFilters({
  value,
  onChange,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
}) {
  const allTags = React.useMemo(() => {
    const a = useAgents.getState().agents;
    return Array.from(new Set(a.flatMap((x) => x.tags ?? []))).sort();
  }, [useAgents((s)=>s.agents.length)]); // quick recompute on size change

  const toggleTag = (t: string) => {
    const active = new Set(value.tags);
    active.has(t) ? active.delete(t) : active.add(t);
    onChange({ ...value, tags: Array.from(active) });
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <Input
        placeholder="Filter by name, capability, or tag…"
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
        className="max-w-md"
      />

      {/* Tag Chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((t) => (
            <TagChip key={t} tag={t} active={value.tags.includes(t)} onToggle={toggleTag} />
          ))}
          {value.tags.length > 0 && (
            <button
              onClick={() => onChange({ ...value, tags: [] })}
              className="rounded-full border border-white/10 bg-card/5 px-3 py-1 text-xs text-white/60 hover:bg-card/8 transition"
            >
              Clear tags
            </button>
          )}
        </div>
      )}
    </div>
  );
}
