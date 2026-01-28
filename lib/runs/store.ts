// Minimal runs store with test-only helpers for log redaction testing

type LogEntry = { ts: string; level: "info" | "warn" | "error"; message: string; details?: string };

interface Run {
  id: string;
  projectId: string;
  status: "running" | "completed" | "failed";
  logs: LogEntry[];
  createdAt: string;
}

const runs = new Map<string, Run>();

// Index: projectId → Set<runId>
const projectRunsIndex = new Map<string, Set<string>>();

function addToIndex(projectId: string, runId: string) {
  if (!projectRunsIndex.has(projectId)) {
    projectRunsIndex.set(projectId, new Set());
  }
  projectRunsIndex.get(projectId)!.add(runId);
}

// ====== Test-only helpers ======

export async function __createRunForTests(projectId: string): Promise<string> {
  const runId = `r_${Math.random().toString(36).slice(2, 11)}`;
  const run: Run = {
    id: runId,
    projectId,
    status: "completed",
    logs: [],
    createdAt: new Date().toISOString(),
  };
  runs.set(runId, run);
  addToIndex(projectId, runId);
  return runId;
}

export async function __appendLogsForTests(projectId: string, runId: string, lines: string[]) {
  const run = runs.get(runId);
  if (!run) return;

  const now = new Date();
  const entries: LogEntry[] = lines.map((message) => ({
    ts: now.toISOString(),
    level: "info",
    message,
  }));

  run.logs.push(...entries);
}

export async function __resetForTests() {
  runs.clear();
  projectRunsIndex.clear();
}

// ====== Production API ======

export async function getRunLogs(projectId: string, runId: string): Promise<LogEntry[]> {
  const run = runs.get(runId);
  if (!run || run.projectId !== projectId) {
    return [];
  }
  return run.logs;
}

export function getRun(runId: string): Run | undefined {
  return runs.get(runId);
}

export function listRunsByProject(projectId: string): Run[] {
  const runIds = projectRunsIndex.get(projectId) || new Set();
  return Array.from(runIds)
    .map((id) => runs.get(id)!)
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
