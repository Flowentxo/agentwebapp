/**
 * Agent Run & Logs Types
 * Sprint 2 - Agents & Runs
 */

export type RunStatus = "pending" | "running" | "success" | "error" | "cancelled";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

export interface Run {
  id: string;
  agentId: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  logs: LogEntry[];
  errorMessage?: string;
  result?: any;
}
