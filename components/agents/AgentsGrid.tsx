// AgentsGrid.tsx - Placeholder component

interface AgentsGridProps {
  agents: any[];
}

export function AgentsGrid({ agents }: AgentsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <div key={agent.id} className="p-4 border rounded">
          <h3>{agent.name}</h3>
        </div>
      ))}
    </div>
  );
}
