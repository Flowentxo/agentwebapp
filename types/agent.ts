export type Kpi = {
  label: string
  value: string
  hint?: string
  trend?: number[]
}

export type AgentConfig = {
  [key: string]: any
}

export type AgentLog = {
  id: string
  agentId: string
  timestamp: string
  level: "info" | "warn" | "error"
  message: string
  metadata?: any
}

export type SystemMetrics = {
  totalAgents: number
  activeAgents: number
  inactiveAgents: number
  errorAgents: number
  cpuUsage: number
  memoryUsage: number
  alerts: number
}

export type Agent = {
  id: string
  name: string
  status: "active" | "stopped" | "inactive" | "error"
  description?: string
  capabilities: string[]
  kpis: Kpi[]
  lastAction?: string
  tags?: string[]
  config?: AgentConfig
  updatedAt?: string
}
