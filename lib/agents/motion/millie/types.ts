/**
 * Millie Agent - Type Definitions
 * Project Manager AI Agent
 */

// ============================================
// PROJECT PLANNING TYPES
// ============================================

// Tool 1: create_project_plan
export interface CreateProjectPlanInput {
  projectName: string;
  description: string;
  goals: string[];
  deadline: string;
  teamMembers: Array<{
    name: string;
    role: string;
    capacity: number; // Hours per week
    skills?: string[];
  }>;
  constraints?: string[];
  budget?: string;
  methodology?: 'agile' | 'waterfall' | 'hybrid' | 'kanban';
}

export interface CreateProjectPlanOutput {
  projectId: string;
  projectName: string;
  phases: Array<{
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    tasks: Array<{
      id: string;
      title: string;
      description: string;
      assignee: string;
      duration: number; // Hours
      dependencies: string[];
      priority: 'low' | 'medium' | 'high' | 'critical';
    }>;
  }>;
  milestones: Array<{
    name: string;
    date: string;
    deliverables: string[];
  }>;
  risks: Array<{
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  criticalPath: string[];
  estimatedCompletion: string;
  successCriteria: string[];
}

// Tool 2: breakdown_tasks
export interface BreakdownTasksInput {
  taskTitle: string;
  taskDescription: string;
  complexity: 'simple' | 'moderate' | 'complex';
  maxSubtasks?: number;
  includeEstimates?: boolean;
  assignTeamMembers?: string[];
}

export interface BreakdownTasksOutput {
  originalTask: string;
  subtasks: Array<{
    id: string;
    title: string;
    description: string;
    estimatedHours?: number;
    skills: string[];
    suggestedAssignee?: string;
    order: number;
    dependencies: string[];
  }>;
  totalEstimatedHours: number;
  recommendedApproach: string;
  acceptanceCriteria: string[];
}

// Tool 3: estimate_timeline
export interface EstimateTimelineInput {
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    complexity?: 'low' | 'medium' | 'high';
    dependencies?: string[];
  }>;
  teamCapacity: number; // Total hours per week
  startDate: string;
  bufferPercentage?: number;
  methodology?: 'optimistic' | 'realistic' | 'pessimistic' | 'three_point';
}

export interface EstimateTimelineOutput {
  tasks: Array<{
    id: string;
    title: string;
    estimatedHours: number;
    startDate: string;
    endDate: string;
    confidenceLevel: number;
  }>;
  totalDuration: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  criticalPath: string[];
  parallelTracks: Array<{
    name: string;
    tasks: string[];
  }>;
  recommendations: string[];
  riskFactors: string[];
}

// Tool 4: identify_dependencies
export interface IdentifyDependenciesInput {
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    skills?: string[];
    resources?: string[];
  }>;
  projectContext?: string;
  identifyBlockers?: boolean;
}

export interface IdentifyDependenciesOutput {
  dependencies: Array<{
    taskId: string;
    dependsOn: string[];
    type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
    reason: string;
    isBlocking: boolean;
  }>;
  dependencyGraph: Record<string, string[]>;
  criticalPath: string[];
  potentialBottlenecks: Array<{
    taskId: string;
    reason: string;
    recommendation: string;
  }>;
  parallelizableGroups: string[][];
  warnings: string[];
}

// ============================================
// TASK MANAGEMENT TYPES
// ============================================

// Tool 5: assign_tasks
export interface AssignTasksInput {
  tasks: Array<{
    id: string;
    title: string;
    requiredSkills?: string[];
    estimatedHours?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    deadline?: string;
  }>;
  teamMembers: Array<{
    id: string;
    name: string;
    skills: string[];
    currentWorkload: number; // Hours already assigned
    maxCapacity: number; // Max hours per week
    availability?: string[];
  }>;
  optimizeFor?: 'speed' | 'balance' | 'skill_match';
}

export interface AssignTasksOutput {
  assignments: Array<{
    taskId: string;
    taskTitle: string;
    assigneeId: string;
    assigneeName: string;
    matchScore: number;
    reason: string;
    estimatedCompletion: string;
  }>;
  unassignedTasks: Array<{
    taskId: string;
    reason: string;
  }>;
  workloadDistribution: Array<{
    memberId: string;
    memberName: string;
    assignedHours: number;
    capacityUtilization: number;
  }>;
  recommendations: string[];
  conflicts: string[];
}

// Tool 6: update_task_status
export interface UpdateTaskStatusInput {
  taskId: string;
  newStatus: 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done';
  progress?: number; // Percentage 0-100
  notes?: string;
  blockerDescription?: string;
  timeSpent?: number; // Hours
  remainingEstimate?: number; // Hours
}

export interface UpdateTaskStatusOutput {
  taskId: string;
  previousStatus: string;
  newStatus: string;
  progress: number;
  updatedAt: string;
  impacts: Array<{
    type: 'milestone' | 'dependency' | 'resource';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  suggestedActions: string[];
  projectHealthImpact: string;
}

// Tool 7: prioritize_backlog
export interface PrioritizeBacklogInput {
  items: Array<{
    id: string;
    title: string;
    description: string;
    estimatedEffort?: 'xs' | 's' | 'm' | 'l' | 'xl';
    businessValue?: number; // 1-10
    technicalComplexity?: number; // 1-10
    dependencies?: string[];
    requestedBy?: string;
    deadline?: string;
  }>;
  criteria?: ('business_value' | 'effort' | 'risk' | 'dependencies' | 'deadline')[];
  sprintCapacity?: number; // Hours
  methodology?: 'moscow' | 'rice' | 'wsjf' | 'value_effort';
}

export interface PrioritizeBacklogOutput {
  prioritizedItems: Array<{
    id: string;
    title: string;
    rank: number;
    score: number;
    category: 'must' | 'should' | 'could' | 'wont';
    rationale: string;
    recommendedSprint?: number;
  }>;
  sprintRecommendations: Array<{
    sprintNumber: number;
    items: string[];
    totalEffort: string;
    focus: string;
  }>;
  deferredItems: Array<{
    id: string;
    reason: string;
  }>;
  methodology: string;
  insights: string[];
}

// Tool 8: create_sprint_plan
export interface CreateSprintPlanInput {
  sprintNumber: number;
  startDate: string;
  duration: number; // Days
  teamCapacity: number; // Total hours available
  sprintGoal: string;
  backlogItems: Array<{
    id: string;
    title: string;
    estimatedHours: number;
    priority: number;
    assignee?: string;
  }>;
  carryoverItems?: string[];
}

export interface CreateSprintPlanOutput {
  sprintId: string;
  sprintNumber: number;
  sprintGoal: string;
  startDate: string;
  endDate: string;
  plannedItems: Array<{
    id: string;
    title: string;
    estimatedHours: number;
    assignee: string;
    day: number; // Planned day in sprint
  }>;
  totalPlannedHours: number;
  capacityUtilization: number;
  sprintRisks: Array<{
    description: string;
    mitigation: string;
  }>;
  ceremonies: Array<{
    name: string;
    date: string;
    duration: number;
    attendees: string[];
  }>;
  successMetrics: string[];
  bufferTime: number;
}

// ============================================
// REPORTING & ANALYTICS TYPES
// ============================================

// Tool 9: generate_status_report
export interface GenerateStatusReportInput {
  projectId?: string;
  projectName?: string;
  period: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate?: string;
  endDate?: string;
  includeMetrics?: boolean;
  format?: 'summary' | 'detailed' | 'executive';
  audience?: 'team' | 'stakeholders' | 'executives';
}

export interface GenerateStatusReportOutput {
  reportDate: string;
  period: string;
  summary: string;
  overallStatus: 'on_track' | 'at_risk' | 'off_track' | 'completed';
  healthScore: number; // 0-100
  metrics: {
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    overdueTasks: number;
    totalTasks: number;
    completionPercentage: number;
  };
  burndownData: Array<{
    date: string;
    remaining: number;
    ideal: number;
  }>;
  highlights: string[];
  accomplishments: string[];
  risks: Array<{
    description: string;
    status: 'new' | 'ongoing' | 'resolved';
    mitigation: string;
  }>;
  blockers: Array<{
    description: string;
    impact: string;
    resolution: string;
  }>;
  nextSteps: string[];
  upcomingMilestones: Array<{
    name: string;
    date: string;
    status: 'on_track' | 'at_risk' | 'delayed';
  }>;
}

// Tool 10: analyze_velocity
export interface AnalyzeVelocityInput {
  sprints: Array<{
    sprintNumber: number;
    plannedPoints: number;
    completedPoints: number;
    startDate: string;
    endDate: string;
    notes?: string;
  }>;
  includeProjections?: boolean;
  backlogSize?: number;
}

export interface AnalyzeVelocityOutput {
  averageVelocity: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
  trendPercentage: number;
  sprintAnalysis: Array<{
    sprintNumber: number;
    plannedPoints: number;
    completedPoints: number;
    completionRate: number;
    deviation: number;
  }>;
  projections: {
    nextSprintEstimate: number;
    confidenceRange: {
      low: number;
      high: number;
    };
    backlogCompletionSprints?: number;
    estimatedCompletionDate?: string;
  };
  patterns: string[];
  recommendations: string[];
  warnings: string[];
}

// Tool 11: identify_blockers
export interface IdentifyBlockersInput {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    assignee?: string;
    lastUpdated: string;
    dependencies?: string[];
    comments?: string[];
  }>;
  projectContext?: string;
  timeThreshold?: number; // Days without update
}

export interface IdentifyBlockersOutput {
  blockers: Array<{
    type: 'technical' | 'resource' | 'external' | 'process' | 'unclear_requirements';
    taskId: string;
    taskTitle: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    duration: number; // Days blocked
    affectedTasks: string[];
    suggestedResolution: string;
    owner?: string;
  }>;
  staleTasks: Array<{
    id: string;
    title: string;
    daysSinceUpdate: number;
    recommendation: string;
  }>;
  impactAnalysis: {
    criticalPathAffected: boolean;
    delayEstimate: number; // Days
    teamMembersAffected: string[];
  };
  escalationRecommendations: Array<{
    issue: string;
    escalateTo: string;
    urgency: 'low' | 'medium' | 'high';
  }>;
  preventiveMeasures: string[];
}

// ============================================
// RESOURCE MANAGEMENT TYPES
// ============================================

// Tool 12: analyze_workload
export interface AnalyzeWorkloadInput {
  teamMembers: Array<{
    id: string;
    name: string;
    role: string;
    maxCapacity: number; // Hours per week
    assignedTasks: Array<{
      taskId: string;
      taskTitle: string;
      estimatedHours: number;
      deadline?: string;
      priority?: string;
    }>;
    timeOff?: Array<{
      startDate: string;
      endDate: string;
    }>;
  }>;
  period: 'current_week' | 'next_week' | 'current_sprint' | 'next_sprint' | 'month';
}

export interface AnalyzeWorkloadOutput {
  teamOverview: {
    averageUtilization: number;
    overloadedMembers: number;
    underutilizedMembers: number;
  };
  memberAnalysis: Array<{
    memberId: string;
    memberName: string;
    role: string;
    assignedHours: number;
    capacity: number;
    utilization: number;
    status: 'overloaded' | 'optimal' | 'underutilized';
    upcomingDeadlines: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  }>;
  workloadDistribution: {
    byRole: Record<string, number>;
    byPriority: Record<string, number>;
  };
  imbalances: Array<{
    description: string;
    suggestion: string;
  }>;
  recommendations: string[];
  reallocationSuggestions: Array<{
    taskId: string;
    fromMember: string;
    toMember: string;
    reason: string;
  }>;
}

// Tool 13: suggest_resource_allocation
export interface SuggestResourceAllocationInput {
  project: {
    name: string;
    phases: string[];
    skills: string[];
    timeline: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  availableResources: Array<{
    id: string;
    name: string;
    role: string;
    skills: string[];
    availability: number; // Percentage
    hourlyRate?: number;
    currentProjects?: string[];
  }>;
  constraints?: {
    budget?: number;
    maxTeamSize?: number;
    requiredSkills?: string[];
    excludeResources?: string[];
  };
}

export interface SuggestResourceAllocationOutput {
  recommendedTeam: Array<{
    resourceId: string;
    resourceName: string;
    role: string;
    allocation: number; // Percentage
    skills: string[];
    matchScore: number;
    startDate: string;
    endDate: string;
    estimatedCost?: number;
  }>;
  alternativeOptions: Array<{
    option: string;
    team: string[];
    tradeoffs: string[];
  }>;
  skillGaps: Array<{
    skill: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  budgetAnalysis?: {
    estimatedCost: number;
    withinBudget: boolean;
    savings?: number;
  };
  risks: Array<{
    description: string;
    probability: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  recommendations: string[];
}

// Tool 14: forecast_capacity
export interface ForecastCapacityInput {
  teamMembers: Array<{
    id: string;
    name: string;
    role: string;
    weeklyCapacity: number;
    plannedTimeOff?: Array<{
      startDate: string;
      endDate: string;
    }>;
    currentCommitments?: number; // Percentage
  }>;
  forecastPeriod: 'sprint' | 'month' | 'quarter';
  startDate: string;
  plannedHires?: Array<{
    role: string;
    startDate: string;
    capacity: number;
  }>;
  plannedDepartures?: Array<{
    memberId: string;
    lastDay: string;
  }>;
}

export interface ForecastCapacityOutput {
  periodSummary: {
    startDate: string;
    endDate: string;
    totalCapacity: number;
    availableCapacity: number;
    utilizableCapacity: number;
  };
  weeklyBreakdown: Array<{
    weekNumber: number;
    startDate: string;
    endDate: string;
    teamCapacity: number;
    adjustedCapacity: number;
    notes: string[];
  }>;
  memberForecast: Array<{
    memberId: string;
    memberName: string;
    totalCapacity: number;
    timeOff: number;
    netCapacity: number;
    weeklyAvailability: number[];
  }>;
  capacityChanges: Array<{
    date: string;
    change: number;
    reason: string;
    impact: string;
  }>;
  recommendations: string[];
  risks: Array<{
    period: string;
    issue: string;
    impact: string;
    mitigation: string;
  }>;
  planningGuidance: {
    safePlanningCapacity: number;
    stretchCapacity: number;
    recommendedBuffer: number;
  };
}
