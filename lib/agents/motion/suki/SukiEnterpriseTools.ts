/**
 * SukiEnterpriseTools - AI-Powered Enterprise Tools for Suki Agent
 *
 * NO MOCKS - All tools use real AI processing via MotionAIService
 *
 * Marketing Associate with AI-powered content generation, SEO analysis,
 * campaign management, and brand voice development.
 */

import { motionAI } from '../services/MotionAIService';
import { memoryService } from '../services/MemoryService';
import type { MotionTool, MotionAgentContext } from '../shared/types';
import { CREDIT_COSTS } from '../shared/constants';

// ============================================
// CONTENT CREATION TOOLS
// ============================================

/**
 * AI-powered Blog Post Generator
 */
export function createEnterpriseGenerateBlogPostTool(): MotionTool<
  {
    topic: string;
    keywords: string[];
    targetLength: 'short' | 'medium' | 'long';
    tone: 'professional' | 'casual' | 'educational' | 'entertaining';
    targetAudience?: string;
    includeOutline?: boolean;
    includeCTA?: boolean;
  },
  {
    title: string;
    metaDescription: string;
    outline: string[];
    content: string;
    wordCount: number;
    readingTime: number;
    suggestedTags: string[];
    seoScore: number;
    callToAction?: string;
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'generate_blog_post',
    displayName: 'Generate Blog Post',
    description: 'AI-powered blog article generation with SEO optimization and audience targeting',
    category: 'content',
    creditCost: 200,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
        targetLength: { type: 'string', enum: ['short', 'medium', 'long'] },
        tone: { type: 'string', enum: ['professional', 'casual', 'educational', 'entertaining'] },
        targetAudience: { type: 'string' },
        includeOutline: { type: 'boolean' },
        includeCTA: { type: 'boolean' },
      },
      required: ['topic', 'keywords', 'targetLength', 'tone'],
    },
    execute: async (input, context) => {
      const wordTargets = { short: 500, medium: 1000, long: 2000 };
      const targetWords = wordTargets[input.targetLength];

      const result = await motionAI.generateDocument({
        type: 'report',
        title: input.topic,
        sections: ['introduction', 'main_content', 'conclusion', 'cta'],
        context: `
Topic: ${input.topic}
Target Keywords: ${input.keywords.join(', ')}
Tone: ${input.tone}
Target Audience: ${input.targetAudience || 'general readers'}
Target Word Count: ${targetWords}
Include CTA: ${input.includeCTA}`,
        data: input,
        format: 'markdown',
      });

      // Generate SEO-optimized meta description
      const metaResult = await motionAI.generateContent(
        `Write a compelling SEO meta description (max 155 chars) for: ${result.title}`,
        'You are an SEO expert. Write concise, clickable meta descriptions.',
        { style: 'professional', format: 'text' }
      );

      // Analyze SEO score
      const seoAnalysis = await motionAI.analyzeData<{ score: number; suggestions: string[] }>({
        data: { content: result.content, keywords: input.keywords },
        analysisType: 'seo_scoring',
        outputSchema: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            suggestions: { type: 'array' },
          },
          required: ['score', 'suggestions'],
        },
      });

      const wordCount = result.content.split(/\s+/).length;

      return {
        title: result.title,
        metaDescription: metaResult.content.substring(0, 155),
        outline: result.sections.map((s) => s.title),
        content: result.content,
        wordCount,
        readingTime: Math.ceil(wordCount / 200),
        suggestedTags: input.keywords.slice(0, 5),
        seoScore: seoAnalysis.result.score,
        callToAction: input.includeCTA ? result.sections.find((s) => s.title.includes('CTA'))?.content : undefined,
        metadata: { tokensUsed: result.tokensUsed + metaResult.metadata.tokensUsed + seoAnalysis.tokensUsed },
      };
    },
  };
}

/**
 * AI-powered Social Media Post Creator
 */
export function createEnterpriseCreateSocialPostTool(): MotionTool<
  {
    platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'threads' | 'tiktok';
    topic: string;
    tone: 'professional' | 'casual' | 'humorous' | 'inspirational';
    includeHashtags: boolean;
    includeEmoji: boolean;
    callToAction?: string;
    linkToInclude?: string;
    brandVoice?: string;
  },
  {
    post: string;
    characterCount: number;
    hashtags: string[];
    suggestedImage: string;
    bestPostingTime: string;
    variants: Array<{ version: string; tone: string; text: string }>;
    platformTips: string[];
    engagementPrediction: string;
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'create_social_post',
    displayName: 'Create Social Media Post',
    description: 'AI-powered social media content optimized for each platform',
    category: 'content',
    creditCost: 50,
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['twitter', 'linkedin', 'instagram', 'facebook', 'threads', 'tiktok'] },
        topic: { type: 'string' },
        tone: { type: 'string', enum: ['professional', 'casual', 'humorous', 'inspirational'] },
        includeHashtags: { type: 'boolean' },
        includeEmoji: { type: 'boolean' },
        callToAction: { type: 'string' },
        linkToInclude: { type: 'string' },
        brandVoice: { type: 'string' },
      },
      required: ['platform', 'topic', 'tone', 'includeHashtags', 'includeEmoji'],
    },
    execute: async (input, context) => {
      const platformLimits: Record<string, number> = {
        twitter: 280,
        linkedin: 3000,
        instagram: 2200,
        facebook: 63206,
        threads: 500,
        tiktok: 150,
      };

      const result = await motionAI.generateStructuredOutput<{
        post: string;
        hashtags: string[];
        imageDescription: string;
        variants: Array<{ version: string; tone: string; text: string }>;
        platformTips: string[];
        engagementPrediction: string;
      }>(
        `Create a ${input.platform} post about: ${input.topic}
Tone: ${input.tone}
Include hashtags: ${input.includeHashtags}
Include emoji: ${input.includeEmoji}
CTA: ${input.callToAction || 'none'}
Link: ${input.linkToInclude || 'none'}
Brand voice: ${input.brandVoice || 'professional'}
Character limit: ${platformLimits[input.platform]}`,
        `You are a social media expert. Create engaging, platform-optimized content that drives engagement.
Consider ${input.platform}'s best practices, character limits, and audience expectations.`,
        {
          type: 'object',
          properties: {
            post: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' } },
            imageDescription: { type: 'string' },
            variants: { type: 'array' },
            platformTips: { type: 'array' },
            engagementPrediction: { type: 'string' },
          },
          required: ['post', 'hashtags', 'imageDescription', 'variants', 'platformTips', 'engagementPrediction'],
        }
      );

      const bestTimes: Record<string, string> = {
        twitter: 'Tuesday-Thursday, 9 AM - 12 PM',
        linkedin: 'Tuesday-Thursday, 7-8 AM, 12 PM',
        instagram: 'Monday-Friday, 11 AM - 1 PM',
        facebook: 'Wednesday-Friday, 1-4 PM',
        threads: 'Weekdays, 10 AM - 2 PM',
        tiktok: 'Tuesday-Thursday, 7-9 PM',
      };

      return {
        post: result.result.post,
        characterCount: result.result.post.length,
        hashtags: result.result.hashtags,
        suggestedImage: result.result.imageDescription,
        bestPostingTime: bestTimes[input.platform],
        variants: result.result.variants,
        platformTips: result.result.platformTips,
        engagementPrediction: result.result.engagementPrediction,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

/**
 * AI-powered Ad Copy Writer
 */
export function createEnterpriseWriteAdCopyTool(): MotionTool<
  {
    product: string;
    targetAudience: string;
    platform: 'google' | 'facebook' | 'linkedin' | 'display' | 'tiktok';
    adType: 'search' | 'display' | 'video' | 'carousel' | 'story';
    uniqueSellingPoints: string[];
    tone: 'professional' | 'urgent' | 'friendly' | 'luxurious';
    competitors?: string[];
  },
  {
    headlines: string[];
    descriptions: string[];
    callToAction: string;
    displayUrl: string;
    variants: Array<{ headline: string; description: string; cta: string }>;
    platformSpecs: { maxHeadlineLength: number; maxDescriptionLength: number };
    competitiveAnalysis?: string;
    estimatedCTR: string;
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'write_ad_copy',
    displayName: 'Write Ad Copy',
    description: 'AI-powered advertising copy optimized for conversions',
    category: 'content',
    creditCost: 100,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        product: { type: 'string' },
        targetAudience: { type: 'string' },
        platform: { type: 'string', enum: ['google', 'facebook', 'linkedin', 'display', 'tiktok'] },
        adType: { type: 'string', enum: ['search', 'display', 'video', 'carousel', 'story'] },
        uniqueSellingPoints: { type: 'array', items: { type: 'string' } },
        tone: { type: 'string', enum: ['professional', 'urgent', 'friendly', 'luxurious'] },
        competitors: { type: 'array', items: { type: 'string' } },
      },
      required: ['product', 'targetAudience', 'platform', 'adType', 'uniqueSellingPoints', 'tone'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateStructuredOutput<{
        headlines: string[];
        descriptions: string[];
        callToAction: string;
        variants: Array<{ headline: string; description: string; cta: string }>;
        competitiveAnalysis: string;
        estimatedCTR: string;
      }>(
        `Create ${input.platform} ${input.adType} ad copy for:
Product: ${input.product}
Target Audience: ${input.targetAudience}
USPs: ${input.uniqueSellingPoints.join(', ')}
Tone: ${input.tone}
${input.competitors ? `Competitors: ${input.competitors.join(', ')}` : ''}`,
        `You are a performance marketing expert. Create high-converting ad copy that:
- Grabs attention immediately
- Highlights unique value propositions
- Drives action with compelling CTAs
- Follows ${input.platform} best practices and character limits`,
        {
          type: 'object',
          properties: {
            headlines: { type: 'array', items: { type: 'string' } },
            descriptions: { type: 'array', items: { type: 'string' } },
            callToAction: { type: 'string' },
            variants: { type: 'array' },
            competitiveAnalysis: { type: 'string' },
            estimatedCTR: { type: 'string' },
          },
          required: ['headlines', 'descriptions', 'callToAction', 'variants', 'estimatedCTR'],
        }
      );

      const specs: Record<string, { maxHeadlineLength: number; maxDescriptionLength: number }> = {
        google: { maxHeadlineLength: 30, maxDescriptionLength: 90 },
        facebook: { maxHeadlineLength: 40, maxDescriptionLength: 125 },
        linkedin: { maxHeadlineLength: 70, maxDescriptionLength: 100 },
        display: { maxHeadlineLength: 25, maxDescriptionLength: 90 },
        tiktok: { maxHeadlineLength: 50, maxDescriptionLength: 100 },
      };

      return {
        headlines: result.result.headlines,
        descriptions: result.result.descriptions,
        callToAction: result.result.callToAction,
        displayUrl: `www.example.com/${input.product.toLowerCase().replace(/\s+/g, '-')}`,
        variants: result.result.variants,
        platformSpecs: specs[input.platform],
        competitiveAnalysis: result.result.competitiveAnalysis,
        estimatedCTR: result.result.estimatedCTR,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

/**
 * AI-powered Email Campaign Generator
 */
export function createEnterpriseGenerateEmailCampaignTool(): MotionTool<
  {
    campaignGoal: 'nurture' | 'promotion' | 'announcement' | 'reengagement' | 'onboarding';
    targetAudience: string;
    numberOfEmails: number;
    productOrService: string;
    tone: 'professional' | 'friendly' | 'urgent' | 'educational';
    includeSubjectVariants: boolean;
    personalizationFields?: string[];
  },
  {
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
      personalizationHints: string[];
    }>;
    expectedMetrics: { openRate: string; clickRate: string; conversionRate: string };
    automationTriggers: string[];
    segmentationSuggestions: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'generate_email_campaign',
    displayName: 'Generate Email Campaign',
    description: 'AI-powered complete email marketing campaign with personalization',
    category: 'content',
    creditCost: 150,
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        campaignGoal: { type: 'string', enum: ['nurture', 'promotion', 'announcement', 'reengagement', 'onboarding'] },
        targetAudience: { type: 'string' },
        numberOfEmails: { type: 'number', minimum: 1, maximum: 10 },
        productOrService: { type: 'string' },
        tone: { type: 'string', enum: ['professional', 'friendly', 'urgent', 'educational'] },
        includeSubjectVariants: { type: 'boolean' },
        personalizationFields: { type: 'array', items: { type: 'string' } },
      },
      required: ['campaignGoal', 'targetAudience', 'numberOfEmails', 'productOrService', 'tone', 'includeSubjectVariants'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateStructuredOutput<{
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
          personalizationHints: string[];
        }>;
        expectedMetrics: { openRate: string; clickRate: string; conversionRate: string };
        automationTriggers: string[];
        segmentationSuggestions: string[];
      }>(
        `Create a ${input.numberOfEmails}-email ${input.campaignGoal} campaign:
Product/Service: ${input.productOrService}
Target Audience: ${input.targetAudience}
Tone: ${input.tone}
Include Subject Variants: ${input.includeSubjectVariants}
Personalization Fields: ${input.personalizationFields?.join(', ') || 'first_name'}`,
        `You are an email marketing expert. Create a complete email campaign that:
- Tells a compelling story across multiple emails
- Uses proven email copywriting techniques
- Includes clear CTAs in each email
- Considers optimal send timing
- Maximizes open rates and conversions`,
        {
          type: 'object',
          properties: {
            campaignName: { type: 'string' },
            campaignSummary: { type: 'string' },
            emails: { type: 'array' },
            expectedMetrics: { type: 'object' },
            automationTriggers: { type: 'array' },
            segmentationSuggestions: { type: 'array' },
          },
          required: ['campaignName', 'campaignSummary', 'emails', 'expectedMetrics', 'automationTriggers', 'segmentationSuggestions'],
        }
      );

      return {
        ...result.result,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

// ============================================
// SEO & ANALYTICS TOOLS
// ============================================

/**
 * AI-powered SEO Keyword Analyzer
 */
export function createEnterpriseAnalyzeSeoKeywordsTool(): MotionTool<
  {
    seedKeywords: string[];
    industry: string;
    targetLocation?: string;
    searchIntent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
  },
  {
    primaryKeywords: Array<{
      keyword: string;
      searchVolume: string;
      difficulty: 'low' | 'medium' | 'high';
      intent: string;
      cpc: string;
      competition: string;
    }>;
    longTailKeywords: Array<{
      keyword: string;
      parentKeyword: string;
      searchVolume: string;
      opportunity: string;
    }>;
    questions: string[];
    relatedTopics: string[];
    contentGaps: string[];
    seasonalTrends: string[];
    competitorKeywords: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'analyze_seo_keywords',
    displayName: 'Analyze SEO Keywords',
    description: 'AI-powered comprehensive keyword research and analysis',
    category: 'analytics',
    creditCost: 50,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        seedKeywords: { type: 'array', items: { type: 'string' } },
        industry: { type: 'string' },
        targetLocation: { type: 'string' },
        searchIntent: { type: 'string', enum: ['informational', 'commercial', 'transactional', 'navigational'] },
      },
      required: ['seedKeywords', 'industry'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        primaryKeywords: Array<{
          keyword: string;
          searchVolume: string;
          difficulty: 'low' | 'medium' | 'high';
          intent: string;
          cpc: string;
          competition: string;
        }>;
        longTailKeywords: Array<{ keyword: string; parentKeyword: string; searchVolume: string; opportunity: string }>;
        questions: string[];
        relatedTopics: string[];
        contentGaps: string[];
        seasonalTrends: string[];
        competitorKeywords: string[];
      }>({
        data: {
          seedKeywords: input.seedKeywords,
          industry: input.industry,
          location: input.targetLocation,
          intent: input.searchIntent,
        },
        analysisType: 'seo_keyword_research',
        outputSchema: {
          type: 'object',
          properties: {
            primaryKeywords: { type: 'array' },
            longTailKeywords: { type: 'array' },
            questions: { type: 'array' },
            relatedTopics: { type: 'array' },
            contentGaps: { type: 'array' },
            seasonalTrends: { type: 'array' },
            competitorKeywords: { type: 'array' },
          },
          required: ['primaryKeywords', 'longTailKeywords', 'questions', 'relatedTopics', 'contentGaps', 'seasonalTrends'],
        },
      });

      return {
        ...result.result,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

/**
 * AI-powered Content SEO Optimizer
 */
export function createEnterpriseOptimizeContentSeoTool(): MotionTool<
  {
    content: string;
    targetKeyword: string;
    secondaryKeywords?: string[];
    contentType: 'blog' | 'product' | 'service' | 'landing' | 'category';
  },
  {
    optimizedContent: string;
    seoScore: number;
    improvements: Array<{
      type: 'heading' | 'content' | 'meta' | 'link' | 'image';
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
      implemented: boolean;
    }>;
    keywordDensity: Record<string, number>;
    readabilityScore: number;
    suggestedInternalLinks: string[];
    structuredDataSuggestions: string;
    competitorComparison: string;
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'optimize_content_seo',
    displayName: 'Optimize Content for SEO',
    description: 'AI-powered content optimization with actionable recommendations',
    category: 'analytics',
    creditCost: 75,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        targetKeyword: { type: 'string' },
        secondaryKeywords: { type: 'array', items: { type: 'string' } },
        contentType: { type: 'string', enum: ['blog', 'product', 'service', 'landing', 'category'] },
      },
      required: ['content', 'targetKeyword', 'contentType'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        optimizedContent: string;
        seoScore: number;
        improvements: Array<{
          type: 'heading' | 'content' | 'meta' | 'link' | 'image';
          suggestion: string;
          priority: 'high' | 'medium' | 'low';
          implemented: boolean;
        }>;
        keywordDensity: Record<string, number>;
        readabilityScore: number;
        suggestedInternalLinks: string[];
        structuredDataSuggestions: string;
        competitorComparison: string;
      }>({
        data: {
          content: input.content,
          targetKeyword: input.targetKeyword,
          secondaryKeywords: input.secondaryKeywords,
          contentType: input.contentType,
        },
        analysisType: 'seo_content_optimization',
        outputSchema: {
          type: 'object',
          properties: {
            optimizedContent: { type: 'string' },
            seoScore: { type: 'number' },
            improvements: { type: 'array' },
            keywordDensity: { type: 'object' },
            readabilityScore: { type: 'number' },
            suggestedInternalLinks: { type: 'array' },
            structuredDataSuggestions: { type: 'string' },
            competitorComparison: { type: 'string' },
          },
          required: ['optimizedContent', 'seoScore', 'improvements', 'keywordDensity', 'readabilityScore'],
        },
      });

      return {
        ...result.result,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

// ============================================
// CAMPAIGN MANAGEMENT TOOLS
// ============================================

/**
 * AI-powered Content Calendar Planner
 */
export function createEnterprisePlanContentCalendarTool(): MotionTool<
  {
    timeframe: 'week' | 'month' | 'quarter';
    contentTypes: string[];
    themes: string[];
    frequency: Record<string, number>;
    keyDates?: Array<{ date: string; event: string }>;
    channels?: string[];
  },
  {
    calendar: Array<{
      date: string;
      dayOfWeek: string;
      contentType: string;
      title: string;
      theme: string;
      platform?: string;
      status: 'planned' | 'draft' | 'scheduled';
      notes: string;
      hashtags?: string[];
    }>;
    themeSummary: Record<string, number>;
    contentMix: Record<string, number>;
    recommendations: string[];
    resourceRequirements: string[];
    keyDateIntegration: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'plan_content_calendar',
    displayName: 'Plan Content Calendar',
    description: 'AI-powered comprehensive content calendar with strategic planning',
    category: 'project',
    creditCost: 75,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        timeframe: { type: 'string', enum: ['week', 'month', 'quarter'] },
        contentTypes: { type: 'array', items: { type: 'string' } },
        themes: { type: 'array', items: { type: 'string' } },
        frequency: { type: 'object' },
        keyDates: { type: 'array' },
        channels: { type: 'array', items: { type: 'string' } },
      },
      required: ['timeframe', 'contentTypes', 'themes', 'frequency'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateStructuredOutput<{
        calendar: Array<{
          date: string;
          dayOfWeek: string;
          contentType: string;
          title: string;
          theme: string;
          platform?: string;
          status: 'planned';
          notes: string;
          hashtags?: string[];
        }>;
        themeSummary: Record<string, number>;
        contentMix: Record<string, number>;
        recommendations: string[];
        resourceRequirements: string[];
        keyDateIntegration: string[];
      }>(
        `Create a ${input.timeframe} content calendar:
Content Types: ${input.contentTypes.join(', ')}
Themes: ${input.themes.join(', ')}
Frequency: ${JSON.stringify(input.frequency)}
Key Dates: ${JSON.stringify(input.keyDates || [])}
Channels: ${input.channels?.join(', ') || 'all'}`,
        `You are a content strategist. Create a balanced, strategic content calendar that:
- Maintains consistent posting schedule
- Balances different content types
- Aligns with key dates and events
- Supports overarching marketing goals
- Considers content creation resources`,
        {
          type: 'object',
          properties: {
            calendar: { type: 'array' },
            themeSummary: { type: 'object' },
            contentMix: { type: 'object' },
            recommendations: { type: 'array' },
            resourceRequirements: { type: 'array' },
            keyDateIntegration: { type: 'array' },
          },
          required: ['calendar', 'themeSummary', 'contentMix', 'recommendations', 'resourceRequirements'],
        }
      );

      return {
        ...result.result,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

/**
 * AI-powered Campaign Performance Analyzer
 */
export function createEnterpriseAnalyzeCampaignPerformanceTool(): MotionTool<
  {
    campaignName?: string;
    metrics: Record<string, number>;
    comparisonPeriod?: 'previous_period' | 'previous_year' | 'benchmark';
    industry?: string;
    goals?: Record<string, number>;
  },
  {
    summary: string;
    kpis: {
      ctr: number;
      conversionRate: number;
      cpc: number;
      cpa: number;
      roas: number;
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
    actionPlan: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      expectedImpact: string;
      timeframe: string;
    }>;
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'analyze_campaign_performance',
    displayName: 'Analyze Campaign Performance',
    description: 'AI-powered deep campaign analysis with actionable insights',
    category: 'analytics',
    creditCost: 50,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        campaignName: { type: 'string' },
        metrics: { type: 'object' },
        comparisonPeriod: { type: 'string', enum: ['previous_period', 'previous_year', 'benchmark'] },
        industry: { type: 'string' },
        goals: { type: 'object' },
      },
      required: ['metrics'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        summary: string;
        kpis: {
          ctr: number;
          conversionRate: number;
          cpc: number;
          cpa: number;
          roas: number;
          openRate?: number;
          clickToOpenRate?: number;
        };
        trends: Array<{ metric: string; trend: 'up' | 'down' | 'stable'; change: number; insight: string }>;
        benchmarkComparison?: Record<string, { yours: number; benchmark: number }>;
        insights: string[];
        recommendations: string[];
        actionPlan: Array<{ action: string; priority: 'high' | 'medium' | 'low'; expectedImpact: string; timeframe: string }>;
      }>({
        data: {
          campaignName: input.campaignName,
          metrics: input.metrics,
          comparisonPeriod: input.comparisonPeriod,
          industry: input.industry,
          goals: input.goals,
        },
        analysisType: 'marketing_campaign_performance',
        outputSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            kpis: { type: 'object' },
            trends: { type: 'array' },
            benchmarkComparison: { type: 'object' },
            insights: { type: 'array' },
            recommendations: { type: 'array' },
            actionPlan: { type: 'array' },
          },
          required: ['summary', 'kpis', 'trends', 'insights', 'recommendations', 'actionPlan'],
        },
      });

      return {
        ...result.result,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

// ============================================
// BRAND & STRATEGY TOOLS
// ============================================

/**
 * AI-powered Brand Voice Definer
 */
export function createEnterpriseDefineBrandVoiceTool(): MotionTool<
  {
    companyDescription: string;
    targetAudience: string;
    brandValues: string[];
    competitors?: string[];
    existingContent?: string[];
    industryContext?: string;
  },
  {
    voiceSummary: string;
    personalityTraits: string[];
    toneAttributes: Array<{
      attribute: string;
      description: string;
      scale: number;
      example: string;
    }>;
    doAndDont: { do: string[]; dont: string[] };
    vocabularyGuide: {
      preferred: string[];
      avoid: string[];
      industryTerms: string[];
    };
    examplePhrases: {
      greeting: string[];
      closing: string[];
      ctaButtons: string[];
    };
    channelAdaptations: Record<string, string>;
    competitorDifferentiation?: string;
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'define_brand_voice',
    displayName: 'Define Brand Voice',
    description: 'AI-powered comprehensive brand voice and tone guide',
    category: 'content',
    creditCost: 100,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        companyDescription: { type: 'string' },
        targetAudience: { type: 'string' },
        brandValues: { type: 'array', items: { type: 'string' } },
        competitors: { type: 'array', items: { type: 'string' } },
        existingContent: { type: 'array', items: { type: 'string' } },
        industryContext: { type: 'string' },
      },
      required: ['companyDescription', 'targetAudience', 'brandValues'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateStructuredOutput<{
        voiceSummary: string;
        personalityTraits: string[];
        toneAttributes: Array<{ attribute: string; description: string; scale: number; example: string }>;
        doAndDont: { do: string[]; dont: string[] };
        vocabularyGuide: { preferred: string[]; avoid: string[]; industryTerms: string[] };
        examplePhrases: { greeting: string[]; closing: string[]; ctaButtons: string[] };
        channelAdaptations: Record<string, string>;
        competitorDifferentiation: string;
      }>(
        `Create a comprehensive brand voice guide:
Company: ${input.companyDescription}
Target Audience: ${input.targetAudience}
Brand Values: ${input.brandValues.join(', ')}
Competitors: ${input.competitors?.join(', ') || 'not specified'}
Industry: ${input.industryContext || 'general'}
Existing Content Samples: ${input.existingContent?.length || 0} provided`,
        `You are a brand strategist. Create a detailed brand voice guide that:
- Captures the unique personality of the brand
- Provides actionable guidance for content creators
- Differentiates from competitors
- Adapts to different channels and contexts
- Includes practical examples`,
        {
          type: 'object',
          properties: {
            voiceSummary: { type: 'string' },
            personalityTraits: { type: 'array' },
            toneAttributes: { type: 'array' },
            doAndDont: { type: 'object' },
            vocabularyGuide: { type: 'object' },
            examplePhrases: { type: 'object' },
            channelAdaptations: { type: 'object' },
            competitorDifferentiation: { type: 'string' },
          },
          required: ['voiceSummary', 'personalityTraits', 'toneAttributes', 'doAndDont', 'vocabularyGuide', 'examplePhrases', 'channelAdaptations'],
        }
      );

      return {
        ...result.result,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

// ============================================
// EXPORT ALL ENTERPRISE TOOLS
// ============================================

export const sukiEnterpriseTools = {
  // Content Creation
  generateBlogPost: createEnterpriseGenerateBlogPostTool,
  createSocialPost: createEnterpriseCreateSocialPostTool,
  writeAdCopy: createEnterpriseWriteAdCopyTool,
  generateEmailCampaign: createEnterpriseGenerateEmailCampaignTool,

  // SEO & Analytics
  analyzeSeoKeywords: createEnterpriseAnalyzeSeoKeywordsTool,
  optimizeContentSeo: createEnterpriseOptimizeContentSeoTool,

  // Campaign Management
  planContentCalendar: createEnterprisePlanContentCalendarTool,
  analyzeCampaignPerformance: createEnterpriseAnalyzeCampaignPerformanceTool,

  // Brand & Strategy
  defineBrandVoice: createEnterpriseDefineBrandVoiceTool,
};

/**
 * Get all Suki enterprise tools as an array
 */
export function getAllSukiEnterpriseTools(): MotionTool<unknown, unknown>[] {
  return [
    createEnterpriseGenerateBlogPostTool(),
    createEnterpriseCreateSocialPostTool(),
    createEnterpriseWriteAdCopyTool(),
    createEnterpriseGenerateEmailCampaignTool(),
    createEnterpriseAnalyzeSeoKeywordsTool(),
    createEnterpriseOptimizeContentSeoTool(),
    createEnterprisePlanContentCalendarTool(),
    createEnterpriseAnalyzeCampaignPerformanceTool(),
    createEnterpriseDefineBrandVoiceTool(),
  ];
}

export default sukiEnterpriseTools;
