import { create } from "zustand";
import { load, save } from "@/lib/persist";

export type Workflow = {
  id: string;
  name: string;
  description?: string;
  triggers: string[]; // e.g. "cron:0 8 * * *", "webhook:/support"
  steps: { kind: "agent" | "tool" | "branch"; ref: string; note?: string }[];
  enabled: boolean;
};

type WFState = {
  items: Workflow[];
  add: (w: Workflow) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
};

const KEY = "sintra.workflows.v1";
const initial = load<Workflow[]>(KEY, []);

export const useWorkflows = create<WFState>((set) => ({
  items: initial,
  add: (w) =>
    set((s) => {
      const next = [...s.items, w];
      save(KEY, next);
      return { items: next };
    }),
  remove: (id) =>
    set((s) => {
      const next = s.items.filter((x) => x.id !== id);
      save(KEY, next);
      return { items: next };
    }),
  toggle: (id) =>
    set((s) => {
      const next = s.items.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x));
      save(KEY, next);
      return { items: next };
    }),
}));
