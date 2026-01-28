"use client";
import * as React from "react";
import { useBindings } from "@/store/bindings";
import { useDatasets } from "@/store/datasets";

type Props = {
  parentId: string;
  type: "workflow" | "agent";
};

export default function BindControl({ parentId, type }: Props) {
  const { items: datasets } = useDatasets();
  const {
    workflowDatasets,
    agentDatasets,
    bindWorkflowDataset,
    unbindWorkflowDataset,
    bindAgentDataset,
    unbindAgentDataset,
  } = useBindings();

  const bound =
    type === "workflow"
      ? workflowDatasets[parentId] ?? []
      : agentDatasets[parentId] ?? [];

  const toggle = (dsId: string) => {
    if (bound.includes(dsId)) {
      if (type === "workflow") unbindWorkflowDataset(parentId, dsId);
      else unbindAgentDataset(parentId, dsId);
    } else {
      if (type === "workflow") bindWorkflowDataset(parentId, dsId);
      else bindAgentDataset(parentId, dsId);
    }
  };

  return (
    <div className="rounded-md border border-white/10 bg-card/5 p-3">
      <div className="mb-2 text-xs font-semibold text-white/80">Linked Datasets</div>
      {datasets.length === 0 && (
        <div className="text-xs text-white/40">No datasets available</div>
      )}
      <div className="space-y-1">
        {datasets.map((ds) => (
          <label
            key={ds.id}
            className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-card/5"
          >
            <input
              type="checkbox"
              checked={bound.includes(ds.id)}
              onChange={() => toggle(ds.id)}
              className="h-4 w-4 rounded border-white/20 bg-card/10 text-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-white/80">{ds.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
