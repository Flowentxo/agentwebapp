import { create } from "zustand";
import { load, save } from "@/lib/persist";
import { Dataset } from "@/types/dataset";

type DS = {
  items: Dataset[];
  add: (d: Dataset) => void;
  remove: (id: string) => void;
  addDoc: (id: string, doc: { id: string; title: string; content: string }) => void;
};

const KEY = "sintra.datasets.v1";
const initial = load<Dataset[]>(KEY, [
  { id: "faq", name: "Support FAQ", description: "Common Q&A", size: 1024, docs: [
    { id: "d1", title: "Refund Policy", content: "Customers may request refunds within 14 days…" }
  ] },
]);

export const useDatasets = create<DS>((set) => ({
  items: initial,
  add: (d) => set((s) => { const next = [...s.items, d]; save(KEY, next); return { items: next }; }),
  remove: (id) => set((s) => { const next = s.items.filter(x => x.id !== id); save(KEY, next); return { items: next }; }),
  addDoc: (id, doc) => set((s) => {
    const next = s.items.map(x => x.id===id ? { ...x, docs:[...x.docs, doc] } : x);
    save(KEY, next); return { items: next };
  }),
}));
