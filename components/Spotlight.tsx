"use client";
import * as React from "react";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useAgents } from "@/store/agents";
import { useWorkflows } from "@/store/workflows";
import { useDatasets } from "@/store/datasets";
import { usePlaybooks } from "@/store/playbooks";
import { useRouter } from "next/navigation";

type NavItem = {
  id: string;
  label: string;
  category: string;
  href: string;
};

export default function Spotlight() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  const agents = useAgents((s) => s.agents);
  const workflows = useWorkflows((s) => s.items);
  const datasets = useDatasets((s) => s.items);
  const playbooks = usePlaybooks((s) => s.items);

  const items: NavItem[] = React.useMemo(() => {
    return [
      { id: "dash", label: "Dashboard", category: "Page", href: "/dashboard" },
      { id: "wf", label: "Workflows", category: "Page", href: "/workflows" },
      { id: "know", label: "Knowledge", category: "Page", href: "/knowledge" },
      { id: "admin", label: "Admin / Playbooks", category: "Page", href: "/admin" },
      { id: "analytics", label: "Analytics", category: "Page", href: "/analytics" },
      ...agents.map((a) => ({
        id: `agent-${a.id}`,
        label: a.name,
        category: "Agent",
        href: `/dashboard?agent=${a.id}`,
      })),
      ...workflows.map((w) => ({
        id: `workflow-${w.id}`,
        label: w.name,
        category: "Workflow",
        href: `/workflows?id=${w.id}`,
      })),
      ...datasets.map((d) => ({
        id: `dataset-${d.id}`,
        label: d.name,
        category: "Dataset",
        href: `/knowledge?id=${d.id}`,
      })),
      ...playbooks.map((p) => ({
        id: `playbook-${p.id}`,
        label: p.title,
        category: "Playbook",
        href: `/admin?id=${p.id}`,
      })),
    ];
  }, [agents, workflows, datasets, playbooks]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q)
    );
  }, [query, items]);

  useHotkeys({
    "mod+p": () => setOpen((prev) => !prev),
    "Escape": () => open && setOpen(false)
  });

  const onSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      data-overlay-root
      data-overlay-open="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24 pointer-events-auto"
      onClick={() => setOpen(false)}
      aria-hidden="false"
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-white/10 bg-zinc-900 shadow-2xl pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          placeholder="Search pages, agents, workflows, datasets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border-b border-white/10 bg-transparent px-4 py-3 text-white placeholder:text-white/40 focus:outline-none"
          autoFocus
        />
        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-white/40">
              No results
            </div>
          ) : (
            filtered.map((it) => (
              <button
                key={it.id}
                onClick={() => onSelect(it.href)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-card/5"
              >
                <div>
                  <div className="text-sm text-white">{it.label}</div>
                  <div className="text-xs text-white/50">{it.category}</div>
                </div>
                <div className="text-xs text-white/30">→</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
