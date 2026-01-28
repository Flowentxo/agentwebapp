import { create } from "zustand";
import { load, save } from "@/lib/persist";

export type ViewPreset = {
  id: string;
  name: string;
  prefs: { q: string; onlyActive: boolean; sort: string; tags: string[] };
  isDefault?: boolean;
};

type VState = {
  items: ViewPreset[];
  add: (v: ViewPreset) => void;
  remove: (id: string) => void;
  setDefault: (id: string) => void;
};

const KEY = "sintra.views.v1";
const initial = load<ViewPreset[]>(KEY, [
  { id: "default", name: "Default", prefs: { q: "", onlyActive: false, sort: "name-asc", tags: [] }, isDefault: true },
  { id: "support", name: "Support Agents", prefs: { q: "", onlyActive: true, sort: "requests-desc", tags: ["support"] } },
]);

export const useViews = create<VState>((set, get) => ({
  items: initial,
  add: (v) => set((s) => { const next = [...s.items, v]; save(KEY, next); return { items: next }; }),
  remove: (id) => set((s) => { const next = s.items.filter((x) => x.id !== id || x.isDefault); save(KEY, next); return { items: next }; }),
  setDefault: (id) =>
    set((s) => {
      const next = s.items.map((x) => ({ ...x, isDefault: x.id === id }));
      save(KEY, next); return { items: next };
    }),
}));
