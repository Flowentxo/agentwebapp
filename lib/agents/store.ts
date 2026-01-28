// Agent Store - In-memory store for agent runs and state
export interface AgentRunLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface AgentRun {
  id: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'success' | 'error';
  input?: any;
  output?: any;
  error?: string;
  result?: any;
  logs?: AgentRunLog[];
  startedAt: Date;
  completedAt?: Date;
}

class AgentStore {
  private runs: Map<string, AgentRun> = new Map();

  createRun(agentId: string, input?: any): AgentRun {
    const run: AgentRun = {
      id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      status: 'pending',
      input,
      logs: [],
      startedAt: new Date()
    };
    this.runs.set(run.id, run);
    return run;
  }

  getRun(runId: string): AgentRun | undefined {
    return this.runs.get(runId);
  }

  updateRun(runId: string, updates: Partial<AgentRun>): AgentRun | undefined {
    const run = this.runs.get(runId);
    if (run) {
      Object.assign(run, updates);
      this.runs.set(runId, run);
    }
    return run;
  }

  cancelRun(runId: string): boolean {
    const run = this.runs.get(runId);
    if (run && (run.status === 'pending' || run.status === 'running')) {
      run.status = 'cancelled';
      run.completedAt = new Date();
      this.runs.set(runId, run);
      return true;
    }
    return false;
  }

  listRuns(agentId?: string): AgentRun[] {
    const runs = Array.from(this.runs.values());
    if (agentId) {
      return runs.filter(run => run.agentId === agentId);
    }
    return runs;
  }

  // Backward compatibility methods
  updateRunStatus(runId: string, status: AgentRun['status'], error?: string): AgentRun | undefined {
    const updates: Partial<AgentRun> = { status };
    if (error) {
      updates.error = error;
    }
    if (status === 'completed' || status === 'success' || status === 'failed' || status === 'error' || status === 'cancelled') {
      updates.completedAt = new Date();
    }
    return this.updateRun(runId, updates);
  }

  addLog(runId: string, log: AgentRunLog): void {
    const run = this.runs.get(runId);
    if (run) {
      if (!run.logs) {
        run.logs = [];
      }
      run.logs.push(log);
      this.runs.set(runId, run);
    }
  }
}

export const agentStore = new AgentStore();

// Backward compatibility alias
export const runsStore = agentStore;