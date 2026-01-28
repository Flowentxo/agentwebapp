/**
 * Suki Agent - Type Definitions
 * Marketing Associate AI Agent
 */

// ============================================
// CONTENT CREATION TYPES
// ============================================

// Tool 1: generate_blog_post
export interface GenerateBlogPostInput {
  topic: string;
  keywords: string[];
  targetLength: 'short' | 'medium' | 'long'; // 500, 1000, 2000 words
  tone: 'professional' | 'casual' | 'educational' | 'entertaining';
  targetAudience?: string;
  includeOutline?: boolean;
  includeCTA?: boolean;
  industry?: string;
}

export interface GenerateBlogPostOutput {
  title: string;
  metaDescription: string;
  outline: string[];
  content: string;
  wordCount: number;
  readingTime: number;
  suggestedTags: string[];
  seoScore: number;
  callToAction?: string;
}

// Tool 2: create_social_post
export interface CreateSocialPostInput {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'threads';
  topic: string;
  tone: 'professional' | 'casual' | 'humorous' | 'inspirational';
  includeHashtags: boolean;
  includeEmoji: boolean;
  callToAction?: string;
  linkToInclude?: string;
  targetAudience?: string;
}

export interface CreateSocialPostOutput {
  post: string;
  characterCount: number;
  hashtags: string[];
  suggestedImage?: string;
  bestPostingTime: string;
  variants: string[];
  platformTips: string[];
}

// Tool 3: write_ad_copy
export interface WriteAdCopyInput {
  product: string;
  targetAudience: string;
  platform: 'google' | 'facebook' | 'linkedin' | 'display' | 'tiktok';
  adType: 'search' | 'display' | 'video' | 'carousel' | 'story';
  uniqueSellingPoints: string[];
  tone: 'professional' | 'urgent' | 'friendly' | 'luxurious';
  budget?: string;
}

export interface WriteAdCopyOutput {
  headlines: string[];
  descriptions: string[];
  callToAction: string;
  displayUrl?: string;
  variants: Array<{
    headline: string;
    description: string;
    cta: string;
  }>;
  platformSpecs: {
    maxHeadlineLength: number;
    maxDescriptionLength: number;
  };
}

// Tool 4: generate_email_campaign
export interface GenerateEmailCampaignInput {
  campaignGoal: 'nurture' | 'promotion' | 'announcement' | 'reengagement' | 'onboarding';
  targetAudience: string;
  numberOfEmails: number;
  productOrService: string;
  tone: 'professional' | 'friendly' | 'urgent' | 'educational';
  includeSubjectVariants: boolean;
  sendFrequency?: string;
}

export interface GenerateEmailCampaignOutput {
  campaignName: string;
  campaignSummary: string;
  emails: Array<{
    order: number;
    subject: string;
    subjectVariants: string[];
    preheader: string;
    body: string;
    callToAction: string;
    sendTiming: string;
  }>;
  expectedMetrics: {
    openRate: string;
    clickRate: string;
    conversionRate: string;
  };
  automationTriggers: string[];
}

// Tool 5: create_landing_page_copy
export interface CreateLandingPageCopyInput {
  product: string;
  targetAudience: string;
  primaryGoal: 'signup' | 'purchase' | 'download' | 'contact' | 'demo';
  keyBenefits: string[];
  socialProof?: string[];
  tone: 'professional' | 'friendly' | 'luxurious' | 'urgent';
  competitorDifferentiators?: string[];
}

export interface CreateLandingPageCopyOutput {
  headline: string;
  subheadline: string;
  heroSection: string;
  benefitsSections: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  socialProofSection?: string;
  ctaText: string;
  ctaButtonText: string;
  urgencyElement?: string;
  faqSuggestions: Array<{
    question: string;
    answer: string;
  }>;
  seoRecommendations: string[];
}

// ============================================
// SEO & ANALYTICS TYPES
// ============================================

// Tool 6: analyze_seo_keywords
export interface AnalyzeSeoKeywordsInput {
  seedKeywords: string[];
  industry: string;
  targetLocation?: string;
  searchIntent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
  competitorDomains?: string[];
}

export interface AnalyzeSeoKeywordsOutput {
  primaryKeywords: Array<{
    keyword: string;
    searchVolume: string;
    difficulty: 'low' | 'medium' | 'high';
    intent: string;
    cpc?: string;
  }>;
  longTailKeywords: Array<{
    keyword: string;
    parentKeyword: string;
    searchVolume: string;
  }>;
  questions: string[];
  relatedTopics: string[];
  contentGaps: string[];
  seasonalTrends?: string[];
}

// Tool 7: optimize_content_seo
export interface OptimizeContentSeoInput {
  content: string;
  targetKeyword: string;
  secondaryKeywords?: string[];
  contentType: 'blog' | 'product' | 'service' | 'landing' | 'category';
  currentUrl?: string;
}

export interface OptimizeContentSeoOutput {
  optimizedContent: string;
  seoScore: number;
  improvements: Array<{
    type: 'title' | 'meta' | 'heading' | 'content' | 'links' | 'images';
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    implemented: boolean;
  }>;
  keywordDensity: Record<string, number>;
  readabilityScore: number;
  suggestedInternalLinks: string[];
  structuredDataSuggestions?: string;
}

// Tool 8: analyze_competitor_content
export interface AnalyzeCompetitorContentInput {
  competitorUrl?: string;
  competitorContent?: string;
  ourContent?: string;
  analysisType: 'seo' | 'messaging' | 'structure' | 'comprehensive';
  targetKeyword?: string;
}

export interface AnalyzeCompetitorContentOutput {
  contentStructure: {
    headings: string[];
    wordCount: number;
    mediaCount: number;
    readingLevel: string;
  };
  seoAnalysis: {
    targetKeywords: string[];
    metaDescription: string;
    titleTag: string;
    internalLinks: number;
    externalLinks: number;
    schemaMarkup: boolean;
  };
  messagingAnalysis: {
    tone: string;
    uniqueSellingPoints: string[];
    callToActions: string[];
    valueProposition: string;
  };
  recommendations: string[];
  contentGaps: string[];
  competitiveAdvantages: string[];
}

// Tool 9: generate_meta_tags
export interface GenerateMetaTagsInput {
  pageTitle: string;
  pageContent: string;
  targetKeyword: string;
  pageType: 'homepage' | 'product' | 'blog' | 'service' | 'landing' | 'category';
  brandName?: string;
}

export interface GenerateMetaTagsOutput {
  title: string;
  titleLength: number;
  metaDescription: string;
  descriptionLength: number;
  ogTitle: string;
  ogDescription: string;
  ogType: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterCard: string;
  canonicalUrl?: string;
  schemaMarkup: string;
  robotsDirective: string;
}

// ============================================
// CAMPAIGN MANAGEMENT TYPES
// ============================================

// Tool 10: plan_content_calendar
export interface PlanContentCalendarInput {
  timeframe: 'week' | 'month' | 'quarter';
  contentTypes: ('blog' | 'social' | 'email' | 'video' | 'podcast')[];
  themes: string[];
  frequency: Record<string, number>;
  keyDates?: Array<{ date: string; event: string }>;
  targetAudience?: string;
  goals?: string[];
}

export interface PlanContentCalendarOutput {
  calendar: Array<{
    date: string;
    dayOfWeek: string;
    contentType: string;
    title: string;
    theme: string;
    platform?: string;
    status: 'planned' | 'draft' | 'review' | 'scheduled';
    notes: string;
    assignee?: string;
  }>;
  themeSummary: Record<string, number>;
  contentMix: Record<string, number>;
  recommendations: string[];
  resourceRequirements: string[];
}

// Tool 11: schedule_social_posts
export interface ScheduleSocialPostsInput {
  posts: Array<{
    platform: string;
    content: string;
    mediaUrls?: string[];
    scheduledTime?: string;
    hashtags?: string[];
  }>;
  autoOptimizeTime: boolean;
  timezone?: string;
}

export interface ScheduleSocialPostsOutput {
  scheduledPosts: Array<{
    id: string;
    platform: string;
    content: string;
    scheduledTime: string;
    optimizedTime?: string;
    status: 'scheduled' | 'pending_approval';
    expectedReach?: string;
  }>;
  conflicts: string[];
  optimizationNotes: string[];
}

// Tool 12: analyze_campaign_performance
export interface AnalyzeCampaignPerformanceInput {
  campaignId?: string;
  campaignName?: string;
  metrics: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    spend?: number;
    revenue?: number;
    emailsSent?: number;
    emailsOpened?: number;
    emailsClicked?: number;
  };
  comparisonPeriod?: 'previous_period' | 'previous_year' | 'benchmark';
  industry?: string;
}

export interface AnalyzeCampaignPerformanceOutput {
  summary: string;
  kpis: {
    ctr: number;
    conversionRate: number;
    cpc?: number;
    cpa?: number;
    roas?: number;
    openRate?: number;
    clickToOpenRate?: number;
  };
  trends: Array<{
    metric: string;
    trend: 'up' | 'down' | 'stable';
    change: number;
    insight: string;
  }>;
  benchmarkComparison?: Record<string, { yours: number; benchmark: number }>;
  insights: string[];
  recommendations: string[];
  nextSteps: string[];
}

// Tool 13: generate_ab_test_variants
export interface GenerateAbTestVariantsInput {
  original: string;
  elementType: 'headline' | 'cta' | 'email_subject' | 'ad_copy' | 'landing_hero';
  numberOfVariants: number;
  testHypothesis?: string;
  targetMetric?: 'clicks' | 'conversions' | 'opens' | 'engagement';
}

export interface GenerateAbTestVariantsOutput {
  original: string;
  variants: Array<{
    id: string;
    variant: string;
    variationType: string;
    hypothesis: string;
    expectedImpact: string;
  }>;
  testingRecommendations: {
    sampleSize: number;
    duration: string;
    primaryMetric: string;
    secondaryMetrics: string[];
    statisticalSignificance: string;
  };
  implementationNotes: string[];
}

// ============================================
// BRAND & STRATEGY TYPES
// ============================================

// Tool 14: define_brand_voice
export interface DefineBrandVoiceInput {
  companyDescription: string;
  targetAudience: string;
  brandValues: string[];
  competitors?: string[];
  existingContent?: string[];
  industryType?: string;
}

export interface DefineBrandVoiceOutput {
  voiceSummary: string;
  personalityTraits: string[];
  toneAttributes: Array<{
    attribute: string;
    description: string;
    scale: number; // 1-10
    example: string;
  }>;
  doAndDont: {
    do: string[];
    dont: string[];
  };
  vocabularyGuide: {
    preferred: string[];
    avoid: string[];
    industryTerms: string[];
  };
  examplePhrases: Record<string, string[]>;
  channelAdaptations: Record<string, string>;
}

// Tool 15: create_marketing_brief
export interface CreateMarketingBriefInput {
  projectName: string;
  objective: string;
  targetAudience: string;
  keyMessages: string[];
  deliverables: string[];
  budget?: string;
  timeline?: string;
  stakeholders?: string[];
  competitorContext?: string;
}

export interface CreateMarketingBriefOutput {
  brief: {
    projectOverview: string;
    background: string;
    objectives: string[];
    targetAudience: {
      demographics: string;
      psychographics: string;
      painPoints: string[];
      motivations: string[];
    };
    keyMessages: string[];
    toneAndStyle: string;
    deliverables: Array<{
      item: string;
      specifications: string;
      deadline?: string;
      owner?: string;
    }>;
    successMetrics: string[];
    budget: string;
    timeline: string;
    approvalProcess: string[];
    risks: string[];
  };
  checklistItems: string[];
}
