"use client";
import { useState } from "react";

type Project = {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  createdAt: string;
};

type Props = {
  project: Project;
};

export default function ProjectCard({ project }: Props) {
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  async function runAgent() {
    setRunning(true);
    setRunResult(null);
    setRunError(null);

    try {
      const r = await fetch(`/api/secure/projects/${project.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "dexter", input: {} }),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setRunError(j.error || "Failed to run agent");
      } else {
        const j = await r.json();
        setRunResult(`Run created: ${j.runId}`);
      }
    } catch (err: any) {
      setRunError(err.message || "Network error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div>
        <h3 className="font-semibold">{project.name}</h3>
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </div>

      <button
        onClick={runAgent}
        disabled={running}
        className="h-11 w-full rounded-xl px-4 font-medium border bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Run agent in this project"
      >
        {running ? "Running..." : "Run agent"}
      </button>

      {runResult && (
        <p
          aria-live="polite"
          className="text-xs text-green-700"
          data-testid="run-success"
        >
          {runResult}
        </p>
      )}

      {runError && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-xs text-red-700"
          data-testid="run-error"
        >
          {runError}
        </p>
      )}
    </div>
  );
}
