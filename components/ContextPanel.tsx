"use client";
import * as React from "react";
import { useAgents } from "@/store/agents";
import TagBadge from "@/components/TagBadge";

export default function ContextPanel({
  selectedIds,
  recent,
}: {
  selectedIds: string[];
  recent: { id: string; name: string }[];
}) {
  const agents = useAgents((s) => s.agents);

  const selected = agents.filter((a) => selectedIds.includes(a.id));
  const selectedTags = Array.from(new Set(selected.flatMap((a) => a.tags ?? []))).slice(0, 10);

  // Only render if there are selections or recent items
  const hasContent = selected.length > 0 || recent.length > 0;
  if (!hasContent) return null;

  return (
    <aside className="hidden xl:block xl:col-span-3">
      <div className="sticky top-[56px] space-y-4">
        {/* Selection Section - Only show when items are selected */}
        {selected.length > 0 && (
          <>
            <section className="rounded-2xl border border-white/10 bg-card/5 p-4">
              <div className="text-sm font-semibold text-white/90">Selection</div>
              <div className="mt-1 text-xs text-white/65">
                {selected.length} selected — {selected.map((s) => s.name).join(", ")}
              </div>
              {selectedTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTags.map((t) => <TagBadge key={t} t={t} />)}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-card/5 p-4">
              <div className="text-sm font-semibold text-white/90">Quick Info</div>
              <div className="mt-2 text-xs text-white/65">
                Status mix:{" "}
                {(() => {
                  const act = selected.filter((a) => a.status === "active").length;
                  return `${act} active / ${selected.length - act} stopped`;
                })()}
              </div>
            </section>
          </>
        )}

        {/* Recently Opened - Only show when there are recent items */}
        {recent.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-card/5 p-4">
            <div className="text-sm font-semibold text-white/90">Recently opened</div>
            <ul className="mt-2 space-y-1 text-sm text-white/80">
              {recent.map((r) => <li key={r.id}>{r.name}</li>)}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
