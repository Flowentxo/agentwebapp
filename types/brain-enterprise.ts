/**
 * 🏢 Brain AI - Enterprise Type Definitions
 * Production-ready types for Enterprise Knowledge & AI Ops Platform
 *
 * ARCHITECTURE:
 * - Role-Based Access Control (RBAC)
 * - Audit Logging & Compliance
 * - Workflow Automation
 * - AI Recommendations
 * - Analytics & Monitoring
 */

// ===== USER & PERMISSIONS =====

export type UserRole = 'admin' | 'editor' | 'stakeholder' | 'guest';

export interface Permission {
  resource: 'documents' | 'queries' | 'workflows' | 'analytics' | 'settings' | 'users';
  action: 'read' | 'write' | 'delete' | 'execute' | 'manage';
  scope?: 'own' | 'team' | 'all';
}

export interface EnterpriseUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  teams: string[];
  preferences: UserPreferences;
  mfaEnabled: boolean;
  ssoProvider?: 'google' | 'azure' | 'okta';
  createdAt: Date;
  lastLoginAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  dashboardLayout: DashboardWidget[];
  language: string;
  notifications: NotificationPreferences;
  shortcuts: Record<string, string>;
}

// ===== DASHBOARD & WIDGETS =====

export type WidgetType =
  | 'kpi-card'
  | 'line-chart'
  | 'bar-chart'
  | 'table'
  | 'recent-activity'
  | 'quick-actions'
  | 'ai-insights'
  | 'health-status';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
  dataSource?: string;
  refreshInterval?: number;
}

export interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  widgets: DashboardWidget[];
  forRoles?: UserRole[];
}

// ===== ANALYTICS & METRICS =====

export interface BrainAnalytics {
  timeToInsight: MetricTimeSeries;
  agentPerformance: AgentMetrics[];
  apiConsumption: APIMetrics;
  userActivity: UserActivityMetrics;
  errorRates: ErrorMetrics;
  trends: TrendAnalysis[];
}

export interface MetricTimeSeries {
  metric: string;
  unit: string;
  dataPoints: { timestamp: Date; value: number }[];
  aggregation: 'avg' | 'sum' | 'min' | 'max';
}

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalQueries: number;
  successRate: number;
  avgResponseTime: number;
  tokensUsed: number;
  costUSD: number;
  uptime: number;
}

export interface APIMetrics {
  totalRequests: number;
  requestsPerMinute: number;
  avgLatency: number;
  errorRate: number;
  quotaUsage: number;
  quotaLimit: number;
}

export interface UserActivityMetrics {
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  avgSessionDuration: number;
  topFeatures: { feature: string; usage: number }[];
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  criticalErrors: number;
  resolvedErrors: number;
}

export interface TrendAnalysis {
  metric: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  prediction?: number;
  anomalies?: { timestamp: Date; severity: 'low' | 'medium' | 'high' }[];
}

// ===== AUDIT LOGGING =====

export type AuditAction =
  | 'document.upload'
  | 'document.update'
  | 'document.delete'
  | 'document.view'
  | 'query.execute'
  | 'workflow.create'
  | 'workflow.execute'
  | 'user.login'
  | 'user.logout'
  | 'user.create'
  | 'user.update'
  | 'permission.change'
  | 'settings.update'
  | 'export.data';

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure' | 'denied';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: AuditAction;
  resource?: string;
  result?: 'success' | 'failure' | 'denied';
}

// ===== WORKFLOWS & AUTOMATION =====

export type WorkflowTrigger =
  | 'manual'
  | 'schedule'
  | 'document.upload'
  | 'query.threshold'
  | 'error.detected'
  | 'webhook';

export type WorkflowActionType =
  | 'send-notification'
  | 'generate-report'
  | 'export-data'
  | 'execute-query'
  | 'update-document'
  | 'call-webhook'
  | 'ai-analyze';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  triggerConfig: Record<string, unknown>;
  actions: WorkflowAction[];
  createdBy: string;
  createdAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  successRate: number;
}

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  config: Record<string, unknown>;
  condition?: WorkflowCondition;
  onSuccess?: string;
  onFailure?: string;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists';
  value: unknown;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  triggeredBy: string;
  actionsExecuted: number;
  logs: WorkflowLog[];
  result?: Record<string, unknown>;
}

export interface WorkflowLog {
  timestamp: Date;
  actionId: string;
  actionType: string;
  status: 'started' | 'success' | 'failed';
  message: string;
  duration?: number;
}

// ===== AI RECOMMENDATIONS =====

export type RecommendationType =
  | 'document-suggestion'
  | 'query-template'
  | 'context-improvement'
  | 'workflow-optimization'
  | 'performance-tuning';

export interface AIRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  impact: string;
  actionable: boolean;
  action?: {
    label: string;
    handler: string;
    params: Record<string, unknown>;
  };
  createdAt: Date;
  dismissedAt?: Date;
  appliedAt?: Date;
}

export interface ExplainableAI {
  queryId: string;
  query: string;
  response: string;
  reasoning: {
    step: number;
    description: string;
    documentsUsed: string[];
    confidence: number;
  }[];
  agentPath: {
    agent: string;
    action: string;
    duration: number;
  }[];
  sourcesUsed: {
    documentId: string;
    documentTitle: string;
    relevanceScore: number;
    snippets: string[];
  }[];
}

// ===== COLLABORATION =====

export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  content: string;
  mentions: string[];
  resolved: boolean;
  createdAt: Date;
  updatedAt?: Date;
  replies?: DocumentComment[];
}

export interface CollaborationSession {
  id: string;
  type: 'document' | 'query' | 'workflow';
  resourceId: string;
  participants: {
    userId: string;
    userName: string;
    joinedAt: Date;
    cursor?: { line: number; column: number };
  }[];
  startedAt: Date;
  endedAt?: Date;
}

// ===== NOTIFICATIONS & TASKS =====

export type NotificationType =
  | 'mention'
  | 'approval-required'
  | 'workflow-completed'
  | 'error-detected'
  | 'recommendation'
  | 'system-update';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  channels: {
    [key in NotificationType]?: boolean;
  };
  quietHours?: { start: string; end: string };
}

export interface Task {
  id: string;
  type: 'approval' | 'review' | 'incident' | 'onboarding';
  title: string;
  description: string;
  assignedTo: string[];
  createdBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

// ===== SECURITY & COMPLIANCE =====

export interface SecurityEvent {
  id: string;
  type: 'login-attempt' | 'permission-denied' | 'data-export' | 'mfa-challenge' | 'suspicious-activity';
  severity: 'info' | 'warning' | 'critical';
  userId?: string;
  ipAddress: string;
  details: Record<string, unknown>;
  timestamp: Date;
  resolved: boolean;
}

export interface ComplianceReport {
  id: string;
  type: 'gdpr' | 'soc2' | 'hipaa' | 'iso27001';
  period: { start: Date; end: Date };
  generatedAt: Date;
  status: 'compliant' | 'issues-found' | 'in-review';
  findings: {
    category: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    remediation: string;
  }[];
  attestation?: {
    attestedBy: string;
    attestedAt: Date;
    signature: string;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  services: {
    name: string;
    status: 'up' | 'down' | 'degraded';
    latency: number;
    errorRate: number;
    lastCheck: Date;
  }[];
  incidents: {
    id: string;
    title: string;
    severity: 'minor' | 'major' | 'critical';
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    startedAt: Date;
    resolvedAt?: Date;
    updates: { timestamp: Date; message: string }[];
  }[];
}

// ===== COMMAND PALETTE =====

export type CommandCategory = 'navigation' | 'actions' | 'documents' | 'workflows' | 'help' | 'settings';

export interface Command {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  shortcut?: string;
  icon?: string;
  handler: () => void | Promise<void>;
  permission?: Permission;
  searchTerms?: string[];
}

// ===== HELP CENTER =====

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  views: number;
  helpful: number;
  notHelpful: number;
  lastUpdated: Date;
}

export interface GuidedTour {
  id: string;
  title: string;
  description: string;
  targetRole?: UserRole;
  steps: {
    target: string;
    title: string;
    content: string;
    placement: 'top' | 'bottom' | 'left' | 'right';
  }[];
  completedBy: string[];
}

// ===== EXPORT & UTILITIES =====

export interface DataExport {
  id: string;
  type: 'documents' | 'queries' | 'analytics' | 'audit-logs';
  format: 'csv' | 'json' | 'pdf' | 'xlsx';
  filters: Record<string, unknown>;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  requestedBy: string;
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  rowCount?: number;
}
