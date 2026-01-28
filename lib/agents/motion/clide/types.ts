/**
 * Clide Agent - Type Definitions
 * Client Success Manager AI Agent
 */

// ============================================
// CLIENT HEALTH TYPES
// ============================================

// Tool 1: calculate_health_score
export interface CalculateHealthScoreInput {
  clientId: string;
  clientName?: string;
  metrics: {
    loginFrequency: number; // Logins per month
    featureAdoption: number; // Percentage 0-100
    supportTickets: number; // Open tickets
    npsScore?: number; // -100 to 100
    contractValue: number;
    daysSinceLastContact: number;
    activeUsers?: number;
    totalLicenses?: number;
  };
  historicalData?: {
    previousHealthScore?: number;
    lastQbrDate?: string;
    renewalDate?: string;
  };
}

export interface CalculateHealthScoreOutput {
  overallScore: number;
  components: {
    engagement: { score: number; breakdown: string };
    adoption: { score: number; breakdown: string };
    support: { score: number; breakdown: string };
    sentiment: { score: number; breakdown: string };
    growth: { score: number; breakdown: string };
  };
  trend: 'improving' | 'stable' | 'declining';
  trendDetails: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: string;
  }>;
  alertTriggers: string[];
  nextReviewDate: string;
}

// Tool 2: identify_churn_risk
export interface IdentifyChurnRiskInput {
  clientId: string;
  clientName?: string;
  lookbackDays?: number;
  currentMetrics: {
    healthScore?: number;
    daysSinceLastLogin?: number;
    recentTicketVolume?: number;
    npsScore?: number;
    contractEndDate?: string;
    usageDecline?: number;
  };
}

export interface IdentifyChurnRiskOutput {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    evidence: string;
    weight: number;
  }>;
  earlyWarningSignals: string[];
  recommendedInterventions: Array<{
    action: string;
    priority: number;
    timing: string;
    expectedImpact: string;
    owner?: string;
  }>;
  renewalProbability: number;
  saveabilityScore: number;
  comparableCases: string[];
}

// Tool 3: analyze_usage_patterns
export interface AnalyzeUsagePatternsInput {
  clientId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  features?: string[];
  compareToBaseline?: boolean;
}

export interface AnalyzeUsagePatternsOutput {
  summary: {
    overallUsage: string;
    trend: 'increasing' | 'stable' | 'decreasing';
    changePercentage: number;
  };
  featureUsage: Array<{
    feature: string;
    usageCount: number;
    uniqueUsers: number;
    trend: 'up' | 'down' | 'stable';
    percentOfTotal: number;
  }>;
  userSegments: Array<{
    segment: string;
    userCount: number;
    avgUsage: string;
    behavior: string;
  }>;
  unusedFeatures: string[];
  adoptionOpportunities: Array<{
    feature: string;
    currentAdoption: number;
    potentialValue: string;
    recommendation: string;
  }>;
  peakUsageTimes: string[];
  insights: string[];
  recommendations: string[];
}

// Tool 4: generate_qbr_report
export interface GenerateQbrReportInput {
  clientId: string;
  clientName: string;
  quarterPeriod: string;
  includeExecutiveSummary?: boolean;
  customSections?: string[];
  metrics: {
    roi?: number;
    adoption?: number;
    supportTickets?: number;
    userGrowth?: number;
    keyMilestones?: string[];
  };
}

export interface GenerateQbrReportOutput {
  reportTitle: string;
  executiveSummary: string;
  sections: Array<{
    title: string;
    content: string;
    metrics?: Record<string, string>;
    charts?: string[];
  }>;
  achievements: string[];
  challenges: string[];
  recommendations: string[];
  successStories: string[];
  roadmapPreview: string[];
  actionItems: Array<{
    item: string;
    owner: string;
    dueDate: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  nextQbrDate: string;
}

// ============================================
// COMMUNICATION TYPES
// ============================================

// Tool 5: draft_check_in_email
export interface DraftCheckInEmailInput {
  clientName: string;
  contactName: string;
  checkInReason: 'regular' | 'concern' | 'celebration' | 'renewal' | 'onboarding_progress';
  lastInteraction?: string;
  specificTopics?: string[];
  tone: 'formal' | 'friendly' | 'concerned';
  includeCalendarLink?: boolean;
}

export interface DraftCheckInEmailOutput {
  subject: string;
  body: string;
  callToAction: string;
  variants: string[];
  followUpPlan: {
    noResponseAction: string;
    noResponseTiming: string;
  };
  attachmentSuggestions: string[];
  bestSendTime: string;
}

// Tool 6: create_onboarding_plan
export interface CreateOnboardingPlanInput {
  clientName: string;
  contractValue: string;
  productPackage: string;
  stakeholders: Array<{
    name: string;
    role: string;
    email: string;
  }>;
  goals: string[];
  timeline: number; // Days
  complexity: 'simple' | 'standard' | 'complex' | 'enterprise';
}

export interface CreateOnboardingPlanOutput {
  planName: string;
  totalDuration: string;
  phases: Array<{
    name: string;
    duration: string;
    objectives: string[];
    tasks: Array<{
      task: string;
      owner: 'client' | 'csm' | 'implementation' | 'support';
      dueDate: string;
      dependencies?: string[];
    }>;
    milestones: string[];
    successCriteria: string[];
  }>;
  kickoffAgenda: string[];
  trainingPlan: Array<{
    topic: string;
    audience: string;
    format: string;
    duration: string;
  }>;
  successMetrics: Array<{
    metric: string;
    target: string;
    measurementMethod: string;
  }>;
  riskMitigation: Array<{
    risk: string;
    mitigation: string;
  }>;
  communicationPlan: string[];
}

// Tool 7: respond_to_feedback
export interface RespondToFeedbackInput {
  clientName: string;
  feedbackType: 'complaint' | 'suggestion' | 'praise' | 'question' | 'nps_response';
  feedbackContent: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  previousInteractions?: string[];
  resolution?: string;
}

export interface RespondToFeedbackOutput {
  responseEmail: {
    subject: string;
    body: string;
  };
  internalNotes: string;
  escalationNeeded: boolean;
  escalationDetails?: {
    to: string;
    reason: string;
    suggestedAction: string;
  };
  followUpActions: Array<{
    action: string;
    owner: string;
    timing: string;
  }>;
  categoryTags: string[];
  sentimentAnalysis: {
    sentiment: 'positive' | 'neutral' | 'negative';
    intensity: 'low' | 'medium' | 'high';
    keyThemes: string[];
  };
}

// ============================================
// GROWTH TYPES
// ============================================

// Tool 8: identify_upsell_opportunities
export interface IdentifyUpsellOpportunitiesInput {
  clientId: string;
  clientName: string;
  currentProducts: string[];
  usageData: {
    powerUsers?: number;
    featureLimitsHit?: string[];
    requestedFeatures?: string[];
  };
  contractDetails: {
    value: number;
    endDate: string;
    tier: string;
  };
}

export interface IdentifyUpsellOpportunitiesOutput {
  opportunities: Array<{
    product: string;
    reason: string;
    estimatedValue: number;
    confidence: 'high' | 'medium' | 'low';
    bestTiming: string;
    stakeholder: string;
    talkingPoints: string[];
  }>;
  expansionPotential: {
    score: number;
    analysis: string;
  };
  crossSellOpportunities: Array<{
    product: string;
    fit: string;
    approach: string;
  }>;
  recommendedApproach: string;
  objectionHandling: Array<{
    objection: string;
    response: string;
  }>;
  timeline: string;
}

// Tool 9: create_success_plan
export interface CreateSuccessPlanInput {
  clientName: string;
  clientGoals: string[];
  currentChallenges: string[];
  stakeholders: Array<{
    name: string;
    role: string;
    priorities: string[];
  }>;
  timeline: number; // Months
  metrics?: string[];
}

export interface CreateSuccessPlanOutput {
  planTitle: string;
  executiveSummary: string;
  objectives: Array<{
    objective: string;
    keyResults: string[];
    timeline: string;
    owner: string;
  }>;
  milestones: Array<{
    milestone: string;
    targetDate: string;
    successCriteria: string[];
    dependencies: string[];
  }>;
  actionPlan: Array<{
    phase: string;
    actions: string[];
    duration: string;
  }>;
  riskAssessment: Array<{
    risk: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  communicationCadence: {
    checkIns: string;
    reviews: string;
    escalations: string;
  };
  successMetrics: Array<{
    metric: string;
    baseline: string;
    target: string;
    measurementFrequency: string;
  }>;
}

// ============================================
// ANALYTICS TYPES
// ============================================

// Tool 10: analyze_nps_feedback
export interface AnalyzeNpsFeedbackInput {
  responses: Array<{
    score: number;
    comment?: string;
    date: string;
    segment?: string;
  }>;
  period: 'month' | 'quarter' | 'year';
  comparePrevious?: boolean;
}

export interface AnalyzeNpsFeedbackOutput {
  overallNps: number;
  breakdown: {
    promoters: { count: number; percentage: number };
    passives: { count: number; percentage: number };
    detractors: { count: number; percentage: number };
  };
  trend: {
    direction: 'improving' | 'stable' | 'declining';
    change: number;
  };
  themes: Array<{
    theme: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    frequency: number;
    exampleQuotes: string[];
  }>;
  segmentAnalysis?: Array<{
    segment: string;
    nps: number;
    insights: string;
  }>;
  actionableInsights: string[];
  recommendedActions: Array<{
    action: string;
    impactedSegment: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  benchmarkComparison?: {
    industryAvg: number;
    difference: number;
    percentile: number;
  };
}

// Tool 11: generate_retention_report
export interface GenerateRetentionReportInput {
  period: 'month' | 'quarter' | 'year';
  cohortAnalysis?: boolean;
  includeForecasting?: boolean;
  segments?: string[];
}

export interface GenerateRetentionReportOutput {
  summary: {
    retentionRate: number;
    churnRate: number;
    netRevenue: number;
    mrrChange: number;
  };
  retentionBySegment: Array<{
    segment: string;
    retentionRate: number;
    churnRate: number;
    revenue: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  churnAnalysis: {
    churned: number;
    revenue: number;
    topReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
    preventableChurn: number;
  };
  atRiskAccounts: Array<{
    accountName: string;
    riskScore: number;
    reason: string;
    recommendedAction: string;
  }>;
  cohortAnalysis?: Array<{
    cohort: string;
    month1: number;
    month3: number;
    month6: number;
    month12: number;
  }>;
  forecast?: {
    nextPeriod: number;
    confidence: number;
    factors: string[];
  };
  recommendations: string[];
}
