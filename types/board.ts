export type BoardStatus = "active" | "pending" | "stopped" | "archived";

export interface BoardCard {
  id: string;
  name: string;
  description: string;
  status: BoardStatus;
  tags: string[];
  statusBadge: "success" | "warning" | "error";
  owner: string;
  lastModified: string;
  createdAt: string;
  metrics?: {
    successRate: number;
    errorRate: number;
    runtime: number;
    requests: number;
  };
}

export interface BoardStats {
  activeAgents: number;
  inactiveAgents: number;
  incidents24h: number;
  successRate: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  fromStatus?: BoardStatus;
  toStatus?: BoardStatus;
}

export interface BoardData {
  cards: BoardCard[];
  stats: BoardStats;
  activity: ActivityEntry[];
}

export type ViewMode = "status" | "tags";
