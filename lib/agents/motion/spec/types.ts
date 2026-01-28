/**
 * Spec Agent Types - Competitive Intelligence
 * Type definitions for all 10 tools
 */

// ============================================
// COMPETITOR MONITORING TOOLS
// ============================================

/**
 * Monitor Competitor - Track competitor activities and updates
 */
export interface MonitorCompetitorInput {
  competitorName: string;
  competitorUrl?: string;
  monitoringAreas: ('pricing' | 'products' | 'news' | 'social' | 'hiring' | 'partnerships')[];
  timeframe?: 'daily' | 'weekly' | 'monthly';
  alertThreshold?: 'all' | 'significant' | 'critical';
}

export interface MonitorCompetitorOutput {
  competitorId: string;
  competitorName: string;
  updates: Array<{
    type: string;
    title: string;
    description: string;
    source: string;
    date: string;
    significance: 'low' | 'medium' | 'high' | 'critical';
    url?: string;
  }>;
  summary: string;
  nextCheck: string;
}

/**
 * Track Pricing Changes - Monitor competitor pricing strategies
 */
export interface TrackPricingChangesInput {
  competitors: string[];
  products?: string[];
  includeHistorical?: boolean;
  alertOnChange?: boolean;
}

export interface TrackPricingChangesOutput {
  pricingData: Array<{
    competitor: string;
    product: string;
    currentPrice: number;
    previousPrice?: number;
    change?: number;
    changePercent?: number;
    lastUpdated: string;
    pricingModel: string;
    notes?: string;
  }>;
  trends: Array<{
    trend: string;
    competitors: string[];
    recommendation: string;
  }>;
  alerts: string[];
}

/**
 * Analyze Product Updates - Track competitor product changes
 */
export interface AnalyzeProductUpdatesInput {
  competitorName: string;
  productCategory?: string;
  timeframe?: string;
  includeFeatureComparison?: boolean;
}

export interface AnalyzeProductUpdatesOutput {
  competitor: string;
  updates: Array<{
    date: string;
    type: 'new_feature' | 'improvement' | 'removal' | 'rebranding' | 'pricing_change';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    ourResponse?: string;
  }>;
  featureGaps: string[];
  opportunities: string[];
  threats: string[];
}

// ============================================
// MARKET RESEARCH TOOLS
// ============================================

/**
 * Conduct Market Research - Deep dive into market segments
 */
export interface ConductMarketResearchInput {
  topic: string;
  industry?: string;
  geography?: string[];
  depth: 'overview' | 'detailed' | 'comprehensive';
  focusAreas?: ('size' | 'growth' | 'trends' | 'players' | 'barriers' | 'opportunities')[];
}

export interface ConductMarketResearchOutput {
  topic: string;
  executiveSummary: string;
  marketSize: {
    current: string;
    projected: string;
    cagr: string;
    year: number;
  };
  keyPlayers: Array<{
    name: string;
    marketShare?: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  trends: Array<{
    trend: string;
    impact: string;
    timeframe: string;
  }>;
  opportunities: string[];
  challenges: string[];
  recommendations: string[];
  sources: string[];
  generatedAt: string;
}

/**
 * Analyze Industry Trends - Identify and analyze market trends
 */
export interface AnalyzeIndustryTrendsInput {
  industry: string;
  subSegments?: string[];
  timeHorizon?: 'short' | 'medium' | 'long';
  includeEmerging?: boolean;
}

export interface AnalyzeIndustryTrendsOutput {
  industry: string;
  currentState: string;
  trends: Array<{
    name: string;
    description: string;
    maturity: 'emerging' | 'growing' | 'mature' | 'declining';
    impact: 'low' | 'medium' | 'high' | 'transformative';
    adoptionRate: string;
    keyDrivers: string[];
    implications: string[];
  }>;
  emergingTechnologies: string[];
  regulatoryChanges: string[];
  consumerBehaviorShifts: string[];
  strategicImplications: string[];
}

/**
 * Generate SWOT Analysis - Create comprehensive SWOT
 */
export interface GenerateSwotAnalysisInput {
  subject: string;
  subjectType: 'company' | 'product' | 'market' | 'strategy';
  competitors?: string[];
  includeActionPlan?: boolean;
}

export interface GenerateSwotAnalysisOutput {
  subject: string;
  strengths: Array<{
    point: string;
    evidence: string;
    leverage: string;
  }>;
  weaknesses: Array<{
    point: string;
    evidence: string;
    mitigation: string;
  }>;
  opportunities: Array<{
    point: string;
    source: string;
    action: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  threats: Array<{
    point: string;
    source: string;
    counteraction: string;
    urgency: 'low' | 'medium' | 'high';
  }>;
  actionPlan?: Array<{
    action: string;
    category: 'strength' | 'weakness' | 'opportunity' | 'threat';
    timeframe: string;
    resources: string;
  }>;
  summary: string;
}

// ============================================
// INTELLIGENCE GATHERING TOOLS
// ============================================

/**
 * Gather Competitive Intel - Collect intelligence from multiple sources
 */
export interface GatherCompetitiveIntelInput {
  competitors: string[];
  intelTypes: ('financials' | 'strategy' | 'leadership' | 'partnerships' | 'technology' | 'culture')[];
  sources?: ('news' | 'social' | 'filings' | 'job_posts' | 'patents' | 'reviews')[];
  timeframe?: string;
}

export interface GatherCompetitiveIntelOutput {
  intel: Array<{
    competitor: string;
    findings: Array<{
      type: string;
      insight: string;
      source: string;
      confidence: 'low' | 'medium' | 'high';
      date: string;
      actionable: boolean;
    }>;
  }>;
  keyInsights: string[];
  strategicRecommendations: string[];
  informationGaps: string[];
}

/**
 * Analyze News & Press - Monitor and analyze news coverage
 */
export interface AnalyzeNewsPressInput {
  keywords: string[];
  competitors?: string[];
  sources?: string[];
  sentiment?: boolean;
  timeframe?: string;
}

export interface AnalyzeNewsPressOutput {
  articles: Array<{
    title: string;
    source: string;
    date: string;
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    relevance: number;
    url: string;
    mentions: string[];
  }>;
  sentimentOverview: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topTopics: string[];
  competitorMentions: Record<string, number>;
  keyTakeaways: string[];
}

// ============================================
// STRATEGIC ANALYSIS TOOLS
// ============================================

/**
 * Create Battle Card - Generate competitive battle cards
 */
export interface CreateBattleCardInput {
  competitor: string;
  product?: string;
  useCase?: string;
  targetAudience?: 'sales' | 'marketing' | 'executive';
  includeObjectionHandling?: boolean;
}

export interface CreateBattleCardOutput {
  competitor: string;
  lastUpdated: string;
  overview: {
    description: string;
    founded: string;
    headquarters: string;
    employees: string;
    funding: string;
  };
  positioning: string;
  targetMarket: string[];
  pricing: {
    model: string;
    range: string;
    vsUs: string;
  };
  strengths: string[];
  weaknesses: string[];
  winAgainstThem: string[];
  theyWinAgainstUs: string[];
  objectionsAndResponses: Array<{
    objection: string;
    response: string;
  }>;
  keyDifferentiators: string[];
  talkingPoints: string[];
}

/**
 * Generate Strategic Report - Create comprehensive strategic analysis
 */
export interface GenerateStrategicReportInput {
  reportType: 'competitive_landscape' | 'market_entry' | 'product_positioning' | 'quarterly_review';
  scope: string;
  competitors?: string[];
  timeframe?: string;
  includeRecommendations?: boolean;
}

export interface GenerateStrategicReportOutput {
  reportId: string;
  title: string;
  executiveSummary: string;
  sections: Array<{
    title: string;
    content: string;
    keyPoints: string[];
    data?: Record<string, unknown>;
  }>;
  competitiveMatrix?: Record<string, Record<string, string>>;
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
    rationale: string;
    resources: string;
    timeline: string;
  }>;
  appendices: string[];
  generatedAt: string;
}

/**
 * Assess Market Position - Evaluate competitive position
 */
export interface AssessMarketPositionInput {
  dimensions: ('price' | 'quality' | 'features' | 'support' | 'brand' | 'innovation')[];
  competitors: string[];
  includePerceptualMap?: boolean;
}

export interface AssessMarketPositionOutput {
  ourPosition: {
    overall: string;
    byDimension: Record<string, number>;
    rank: number;
    totalCompetitors: number;
  };
  competitorPositions: Array<{
    competitor: string;
    scores: Record<string, number>;
    rank: number;
    positionDescription: string;
  }>;
  gaps: Array<{
    dimension: string;
    gap: number;
    leader: string;
    recommendation: string;
  }>;
  opportunities: string[];
  perceptualMap?: {
    xAxis: string;
    yAxis: string;
    positions: Array<{
      name: string;
      x: number;
      y: number;
    }>;
  };
  strategicRecommendations: string[];
}
