export type Bindings = {
  // Many-to-many: workflow -> agents, workflow -> datasets, agent -> datasets
  workflowAgents: Record<string, string[]>;   // wfId -> agentIds[]
  workflowDatasets: Record<string, string[]>; // wfId -> datasetIds[]
  agentDatasets: Record<string, string[]>;    // agentId -> datasetIds[]
};
