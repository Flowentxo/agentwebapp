import { create } from "zustand";
import { load, save } from "@/lib/persist";
import { Bindings } from "@/types/bindings";

type B = Bindings & {
  bindWorkflowAgent: (wfId: string, agentId: string) => void;
  unbindWorkflowAgent: (wfId: string, agentId: string) => void;
  bindWorkflowDataset: (wfId: string, dsId: string) => void;
  unbindWorkflowDataset: (wfId: string, dsId: string) => void;
  bindAgentDataset: (agentId: string, dsId: string) => void;
  unbindAgentDataset: (agentId: string, dsId: string) => void;
};

const KEY = "sintra.bindings.v1";
const initial = load<Bindings>(KEY, {
  workflowAgents: {}, workflowDatasets: {}, agentDatasets: {}
});

function addToMap(map: Record<string,string[]>, key: string, val: string) {
  const set = new Set([...(map[key] ?? []), val]);
  map[key] = Array.from(set);
}
function removeFromMap(map: Record<string,string[]>, key: string, val: string) {
  map[key] = (map[key] ?? []).filter(x => x !== val);
}

export const useBindings = create<B>((set, get) => ({
  ...initial,
  bindWorkflowAgent: (wfId, agentId) => set((s)=>{ const m={...s.workflowAgents}; addToMap(m,wfId,agentId); const next={...s,workflowAgents:m}; save(KEY,next); return next; }),
  unbindWorkflowAgent: (wfId, agentId) => set((s)=>{ const m={...s.workflowAgents}; removeFromMap(m,wfId,agentId); const next={...s,workflowAgents:m}; save(KEY,next); return next; }),
  bindWorkflowDataset: (wfId, dsId) => set((s)=>{ const m={...s.workflowDatasets}; addToMap(m,wfId,dsId); const next={...s,workflowDatasets:m}; save(KEY,next); return next; }),
  unbindWorkflowDataset: (wfId, dsId) => set((s)=>{ const m={...s.workflowDatasets}; removeFromMap(m,wfId,dsId); const next={...s,workflowDatasets:m}; save(KEY,next); return next; }),
  bindAgentDataset: (agentId, dsId) => set((s)=>{ const m={...s.agentDatasets}; addToMap(m,agentId,dsId); const next={...s,agentDatasets:m}; save(KEY,next); return next; }),
  unbindAgentDataset: (agentId, dsId) => set((s)=>{ const m={...s.agentDatasets}; removeFromMap(m,agentId,dsId); const next={...s,agentDatasets:m}; save(KEY,next); return next; }),
}));
