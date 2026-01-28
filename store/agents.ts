import { create } from "zustand";
import { Agent } from "@/types/agent";
import { load, save } from "@/lib/persist";

type AgentsState = {
  agents: Agent[];
  add: (agent: Agent) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  upsertMany: (list: Agent[]) => void;
  updateKpi: (id: string, kpiLabel: string, newValue: string) => void;
  tagAdd: (id: string, tag: string) => void;
  tagRemove: (id: string, tag: string) => void;
  markOpened: (id: string) => void;
};

const KEY = "sintra.agents.v1";

const initial: Agent[] = [
  {
    id: "dexter",
    name: "Dexter",
    status: "active",
    description:
      "Autonomous multilingual customer support agent powered by GPT-4 class models.",
    capabilities: ["SQL", "Python", "Visualization", "Reflection", "Summarization"],
    kpis: [
      { label: "Requests", value: "4,567" },
      { label: "Success", value: "96.8%" },
      { label: "Avg Time", value: "0.80 s" },
      { label: "Uptime", value: "99.9%" },
    ],
    lastAction: "Processing customer inquiries",
    tags: ["support", "nlp", "prod"],
  },
  {
    id: "cassie",
    name: "Cassie",
    status: "active",
    description: "Customer support agent.",
    capabilities: ["FAQ", "Reports"],
    kpis: [
      { label: "Requests", value: "120" },
      { label: "Success", value: "89%" },
      { label: "Avg Time", value: "0.90 s" },
      { label: "Uptime", value: "99.8%" },
    ],
    lastAction: "—",
    tags: ["support", "reports", "staging"],
  },
];

export const useAgents = create<AgentsState>((set, get) => ({
  agents: load<Agent[]>(KEY, initial),
  add: (agent) =>
    set((s) => {
      const next = [...s.agents, { ...agent, tags: agent.tags ?? [] }];
      save(KEY, next);
      return { agents: next };
    }),
  remove: (id) =>
    set((s) => {
      const next = s.agents.filter((a) => a.id !== id);
      save(KEY, next);
      return { agents: next };
    }),
  toggle: (id) =>
    set((s) => {
      const next = s.agents.map((a) =>
        a.id === id ? { ...a, status: (a.status === "active" ? "stopped" : "active") as Agent["status"] } : a
      );
      save(KEY, next);
      return { agents: next };
    }),
  upsertMany: (list) =>
    set(() => {
      list = list.map((a) => ({ ...a, tags: a.tags ?? [] }));
      save(KEY, list);
      return { agents: list };
    }),
  updateKpi: (id, kpiLabel, newValue) =>
    set((s) => {
      const next = s.agents.map((a) =>
        a.id !== id ? a : { ...a, kpis: a.kpis.map((k) => (k.label === kpiLabel ? { ...k, value: newValue } : k)) }
      );
      save(KEY, next);
      return { agents: next };
    }),
  tagAdd: (id, tag) =>
    set((s) => {
      const next = s.agents.map((a) =>
        a.id !== id ? a : { ...a, tags: Array.from(new Set([...(a.tags ?? []), tag.toLowerCase()])) }
      );
      save(KEY, next); return { agents: next };
    }),
  tagRemove: (id, tag) =>
    set((s) => {
      const next = s.agents.map((a) =>
        a.id !== id ? a : { ...a, tags: (a.tags ?? []).filter((t) => t !== tag.toLowerCase()) }
      );
      save(KEY, next); return { agents: next };
    }),
  markOpened: (id) => {
    // no persistence list here; ContextPanel führt „recent" separat
  },
}));
