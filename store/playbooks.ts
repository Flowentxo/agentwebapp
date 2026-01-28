import { create } from "zustand";
import { load, save } from "@/lib/persist";
import { Playbook } from "@/types/playbook";

type PB = {
  items: Playbook[];
  add: (p: Playbook) => void;
  toggleStep: (pbId: string, stepId: string) => void;
  reset: (pbId: string) => void;
  remove: (id: string) => void;
};

const KEY = "sintra.playbooks.v1";
const sample = `
# Outage Response
1. Check status page
2. Roll logs for last 15 minutes
3. Notify stakeholders
4. Identify blast radius
5. Mitigation & follow-up
`;
const initial = load<Playbook[]>(KEY, [
  { id: "outage", title: "Outage Response", markdown: sample.trim(), steps: [
    { id: "s1", text: "Check status page" },
    { id: "s2", text: "Roll logs last 15 min" },
    { id: "s3", text: "Notify stakeholders" },
    { id: "s4", text: "Identify blast radius" },
    { id: "s5", text: "Mitigation & follow-up" },
  ]},
]);

export const usePlaybooks = create<PB>((set) => ({
  items: initial,
  add: (p) => set((s)=>{ const next=[...s.items,p]; save(KEY,next); return {items:next}; }),
  remove: (id) => set((s)=>{ const next=s.items.filter(x=>x.id!==id); save(KEY,next); return {items:next}; }),
  toggleStep: (pbId, stepId) => set((s) => {
    const next = s.items.map(pb => pb.id!==pbId ? pb : {
      ...pb,
      steps: pb.steps.map(st => st.id===stepId ? { ...st, done: !st.done } : st)
    });
    save(KEY,next); return { items: next };
  }),
  reset: (pbId) => set((s) => {
    const next = s.items.map(pb => pb.id!==pbId ? pb : {
      ...pb,
      steps: pb.steps.map(st => ({ ...st, done: false }))
    });
    save(KEY,next); return { items: next };
  }),
}));
