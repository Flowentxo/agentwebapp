/**
 * Chip Agent - Type Definitions
 * Sales Development Rep AI Agent
 */

// ============================================
// LEAD RESEARCH TYPES
// ============================================

// Tool 1: research_lead
export interface ResearchLeadInput {
  companyName?: string;
  contactEmail?: string;
  linkedInUrl?: string;
  websiteUrl?: string;
  enrichmentLevel: 'basic' | 'standard' | 'deep';
}

export interface ResearchLeadOutput {
  company: {
    name: string;
    industry: string;
    size: string;
    employeeCount?: string;
    revenue?: string;
    founded?: string;
    headquarters?: string;
    website?: string;
    technologies?: string[];
    recentNews?: string[];
    socialProfiles?: {
      linkedin?: string;
      twitter?: string;
    };
  };
  contact: {
    name: string;
    title: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    previousCompanies?: string[];
    education?: string[];
    recentActivity?: string[];
  };
  insights: string[];
  talkingPoints: string[];
  potentialPainPoints: string[];
  competitorInfo?: string[];
  bestApproachTiming?: string;
}

// Tool 2: enrich_lead_data
export interface EnrichLeadDataInput {
  leadId?: string;
  email?: string;
  company?: string;
  name?: string;
  enrichmentFields: ('company' | 'contact' | 'social' | 'technographics' | 'intent')[];
}

export interface EnrichLeadDataOutput {
  leadId: string;
  originalData: Record<string, unknown>;
  enrichedData: {
    company?: {
      industry: string;
      size: string;
      revenue: string;
      technologies: string[];
      fundingStage?: string;
      recentFunding?: string;
    };
    contact?: {
      fullName: string;
      title: string;
      department: string;
      seniority: string;
      decisionMaker: boolean;
      directPhone?: string;
    };
    social?: {
      linkedin: string;
      twitter?: string;
      followers?: number;
      recentPosts?: string[];
    };
    technographics?: {
      currentStack: string[];
      recentChanges?: string[];
      competitorProducts?: string[];
    };
    intent?: {
      signals: string[];
      score: number;
      topics: string[];
    };
  };
  dataQuality: {
    completeness: number;
    confidence: number;
    lastUpdated: string;
  };
  nextSteps: string[];
}

// Tool 3: score_lead
export interface ScoreLeadInput {
  leadData: {
    company: string;
    industry: string;
    companySize: string;
    title: string;
    seniority: string;
    email?: string;
    engagement?: {
      websiteVisits?: number;
      emailOpens?: number;
      contentDownloads?: number;
    };
  };
  scoringCriteria?: {
    idealIndustries?: string[];
    idealCompanySizes?: string[];
    idealTitles?: string[];
    requiredSignals?: string[];
  };
}

export interface ScoreLeadOutput {
  leadScore: number; // 0-100
  scoreBreakdown: {
    fit: {
      score: number;
      factors: Array<{ factor: string; impact: number; reasoning: string }>;
    };
    engagement: {
      score: number;
      factors: Array<{ factor: string; impact: number; reasoning: string }>;
    };
    timing: {
      score: number;
      factors: Array<{ factor: string; impact: number; reasoning: string }>;
    };
  };
  tier: 'hot' | 'warm' | 'cold' | 'disqualified';
  priorityRank: number;
  readinessIndicators: string[];
  disqualificationReasons?: string[];
  recommendedAction: string;
  estimatedConversionProbability: number;
}

// Tool 4: find_decision_makers
export interface FindDecisionMakersInput {
  companyName: string;
  companyDomain?: string;
  targetDepartments?: ('executive' | 'sales' | 'marketing' | 'engineering' | 'hr' | 'finance' | 'operations')[];
  seniorityLevels?: ('c_level' | 'vp' | 'director' | 'manager')[];
  maxResults?: number;
}

export interface FindDecisionMakersOutput {
  company: string;
  decisionMakers: Array<{
    name: string;
    title: string;
    department: string;
    seniority: string;
    email?: string;
    linkedin?: string;
    phone?: string;
    influenceLevel: 'champion' | 'influencer' | 'blocker' | 'end_user';
    reportsTo?: string;
    directReports?: number;
    keyResponsibilities?: string[];
    commonBackground?: string[];
  }>;
  organizationChart?: {
    hierarchy: string;
    keyRelationships: string[];
  };
  approachStrategy: {
    primaryContact: string;
    secondaryContacts: string[];
    entryPoint: string;
    multiThreadingApproach: string;
  };
  recommendations: string[];
}

// ============================================
// OUTREACH TYPES
// ============================================

// Tool 5: draft_cold_email
export interface DraftColdEmailInput {
  leadInfo: {
    name: string;
    company: string;
    role: string;
    industry?: string;
  };
  valueProposition: string;
  tone: 'professional' | 'casual' | 'direct' | 'consultative';
  callToAction: 'meeting' | 'demo' | 'call' | 'reply' | 'resource';
  personalizationPoints?: string[];
  product?: string;
  painPoints?: string[];
  competitorContext?: string;
}

export interface DraftColdEmailOutput {
  subject: string;
  subjectVariants: string[];
  body: string;
  previewText: string;
  plainTextVersion: string;
  callToActionLink?: string;
  bestSendTime: string;
  bestSendDay: string;
  personalizationUsed: string[];
  followUpSubject: string;
  followUpBody: string;
  abTestSuggestions: Array<{
    element: string;
    variantA: string;
    variantB: string;
    hypothesis: string;
  }>;
}

// Tool 6: draft_linkedin_message
export interface DraftLinkedInMessageInput {
  leadInfo: {
    name: string;
    company: string;
    role: string;
    mutualConnections?: number;
    sharedGroups?: string[];
    recentActivity?: string;
  };
  messageType: 'connection_request' | 'inmail' | 'follow_up' | 'engagement';
  objective: 'book_meeting' | 'start_conversation' | 'share_content' | 'ask_question';
  tone: 'professional' | 'friendly' | 'curious';
  personalizationHooks?: string[];
}

export interface DraftLinkedInMessageOutput {
  connectionNote?: string; // Max 300 chars
  message: string;
  characterCount: number;
  variants: string[];
  engagementTips: string[];
  followUpStrategy: {
    timing: string;
    message: string;
    escalationPath: string;
  };
  profileOptimizations?: string[];
  contentToShare?: string;
}

// Tool 7: create_follow_up_sequence
export interface CreateFollowUpSequenceInput {
  leadInfo: {
    name: string;
    company: string;
    role: string;
  };
  initialOutreach: {
    type: 'email' | 'linkedin' | 'call';
    content: string;
    sentDate: string;
  };
  sequenceLength: number;
  channels: ('email' | 'linkedin' | 'phone' | 'video')[];
  objective: 'book_meeting' | 'get_response' | 'nurture';
  valueProps: string[];
  breakupEmailIncluded?: boolean;
}

export interface CreateFollowUpSequenceOutput {
  sequenceName: string;
  steps: Array<{
    stepNumber: number;
    channel: string;
    timing: string; // e.g., "3 days after step 1"
    dayOfWeek: string;
    timeOfDay: string;
    subject?: string;
    content: string;
    objective: string;
    callScript?: string;
    voicemailScript?: string;
  }>;
  totalDuration: string;
  expectedResponseRate: string;
  breakupEmail?: {
    subject: string;
    body: string;
  };
  automationNotes: string[];
  abTestRecommendations: string[];
}

// Tool 8: personalize_template
export interface PersonalizeTemplateInput {
  template: string;
  leadData: {
    name: string;
    company: string;
    role: string;
    industry?: string;
    companySize?: string;
    recentNews?: string[];
    technologies?: string[];
    challenges?: string[];
    competitors?: string[];
  };
  personalizationLevel: 'light' | 'moderate' | 'deep';
  preserveStructure?: boolean;
}

export interface PersonalizeTemplateOutput {
  personalizedContent: string;
  personalizationElements: Array<{
    type: 'company' | 'role' | 'industry' | 'news' | 'technology' | 'challenge';
    original: string;
    personalized: string;
    reason: string;
  }>;
  personalizationScore: number;
  suggestions: string[];
  alternativeVersions: string[];
}

// ============================================
// CRM & PIPELINE TYPES
// ============================================

// Tool 9: update_crm_record
export interface UpdateCrmRecordInput {
  recordType: 'lead' | 'contact' | 'account' | 'opportunity';
  recordId: string;
  updates: Record<string, unknown>;
  createActivityLog?: boolean;
  activityType?: 'email' | 'call' | 'meeting' | 'note' | 'task';
  activityDetails?: string;
}

export interface UpdateCrmRecordOutput {
  success: boolean;
  recordId: string;
  recordType: string;
  updatedFields: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  activityCreated?: {
    id: string;
    type: string;
    timestamp: string;
  };
  automatedActions?: string[];
  warnings?: string[];
}

// Tool 10: analyze_pipeline
export interface AnalyzePipelineInput {
  pipelineId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: {
    owner?: string;
    stage?: string[];
    industry?: string[];
    dealSize?: { min?: number; max?: number };
  };
  includeForecasting?: boolean;
}

export interface AnalyzePipelineOutput {
  summary: {
    totalOpportunities: number;
    totalValue: number;
    weightedValue: number;
    averageDealSize: number;
    averageSalesCycle: number;
  };
  stageAnalysis: Array<{
    stage: string;
    count: number;
    value: number;
    avgDaysInStage: number;
    conversionRate: number;
    atRiskDeals: number;
  }>;
  velocityMetrics: {
    pipelineVelocity: number;
    avgTimeToClose: number;
    winRate: number;
    lossReasons: Array<{ reason: string; count: number }>;
  };
  forecast?: {
    bestCase: number;
    mostLikely: number;
    worstCase: number;
    confidence: number;
  };
  atRiskOpportunities: Array<{
    id: string;
    name: string;
    value: number;
    reason: string;
    recommendation: string;
  }>;
  insights: string[];
  recommendations: string[];
}

// Tool 11: suggest_next_actions
export interface SuggestNextActionsInput {
  leadId?: string;
  opportunityId?: string;
  currentStage: string;
  lastActivity?: {
    type: string;
    date: string;
    outcome?: string;
  };
  leadScore?: number;
  objectives?: ('advance_stage' | 're_engage' | 'close_deal' | 'qualify')[];
}

export interface SuggestNextActionsOutput {
  primaryAction: {
    action: string;
    channel: string;
    timing: string;
    reason: string;
    script?: string;
    template?: string;
  };
  alternativeActions: Array<{
    action: string;
    channel: string;
    timing: string;
    reason: string;
    priority: number;
  }>;
  stakeholderActions?: Array<{
    stakeholder: string;
    action: string;
    objective: string;
  }>;
  contentToShare?: Array<{
    type: string;
    title: string;
    relevance: string;
  }>;
  warnings?: string[];
  successProbability: number;
  expectedOutcome: string;
}

// Tool 12: generate_sales_report
export interface GenerateSalesReportInput {
  reportType: 'activity' | 'pipeline' | 'forecast' | 'performance' | 'comprehensive';
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dateRange?: {
    start: string;
    end: string;
  };
  owner?: string;
  team?: string;
  includeCharts?: boolean;
}

export interface GenerateSalesReportOutput {
  reportTitle: string;
  period: string;
  generatedAt: string;
  executiveSummary: string;
  metrics: {
    activities: {
      emails: number;
      calls: number;
      meetings: number;
      demos: number;
    };
    pipeline: {
      newOpportunities: number;
      closedWon: number;
      closedLost: number;
      inProgress: number;
    };
    performance: {
      quotaAttainment: number;
      avgDealSize: number;
      winRate: number;
      conversionRates: Record<string, number>;
    };
  };
  trends: Array<{
    metric: string;
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  topPerformers?: Array<{
    name: string;
    metric: string;
    value: number;
  }>;
  areasForImprovement: string[];
  recommendations: string[];
  forecast?: {
    currentQuarter: number;
    nextQuarter: number;
    yearEnd: number;
  };
}
