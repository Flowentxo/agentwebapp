/**
 * SukiAgent - Marketing Associate AI Agent
 *
 * Inspired by Usemotion's Suki AI Employee
 * Creates compelling content, manages campaigns, and drives brand engagement
 *
 * ENTERPRISE VERSION - All tools use real AI processing
 * NO MOCKS - Powered by MotionAIService
 *
 * Features:
 * - AI-powered Content Creation (Blog, Social, Ads, Email, Landing Pages)
 * - Intelligent SEO Optimization & Analytics
 * - Smart Campaign Management & Scheduling
 * - AI-driven Brand Voice & Strategy
 */

import { Megaphone } from 'lucide-react';
import { MotionBaseAgent } from '../shared/MotionBaseAgent';
import { AgentContext, AgentResponse, ConversationMessage } from '@/lib/agents/shared/types';
import {
  MotionAgentContext,
  MotionTool,
  MotionAgentId,
  AgentCategory,
} from '../shared/types';
import { CREDIT_COSTS } from '../shared/constants';
import { motionAI } from '../services/MotionAIService';
import { memoryService } from '../services/MemoryService';
import { getAllSukiEnterpriseTools } from './SukiEnterpriseTools';
import {
  // Content Creation
  GenerateBlogPostInput,
  GenerateBlogPostOutput,
  CreateSocialPostInput,
  CreateSocialPostOutput,
  WriteAdCopyInput,
  WriteAdCopyOutput,
  GenerateEmailCampaignInput,
  GenerateEmailCampaignOutput,
  CreateLandingPageCopyInput,
  CreateLandingPageCopyOutput,
  // SEO & Analytics
  AnalyzeSeoKeywordsInput,
  AnalyzeSeoKeywordsOutput,
  OptimizeContentSeoInput,
  OptimizeContentSeoOutput,
  AnalyzeCompetitorContentInput,
  AnalyzeCompetitorContentOutput,
  GenerateMetaTagsInput,
  GenerateMetaTagsOutput,
  // Campaign Management
  PlanContentCalendarInput,
  PlanContentCalendarOutput,
  ScheduleSocialPostsInput,
  ScheduleSocialPostsOutput,
  AnalyzeCampaignPerformanceInput,
  AnalyzeCampaignPerformanceOutput,
  GenerateAbTestVariantsInput,
  GenerateAbTestVariantsOutput,
  // Brand & Strategy
  DefineBrandVoiceInput,
  DefineBrandVoiceOutput,
  CreateMarketingBriefInput,
  CreateMarketingBriefOutput,
} from './types';

// ============================================
// SUKI AGENT CLASS
// ============================================

export class SukiAgent extends MotionBaseAgent {
  // Required BaseAgent properties
  readonly id = 'suki';
  readonly name = 'Suki';
  readonly description = 'A creative marketing specialist who crafts compelling content, manages campaigns, and drives brand engagement.';
  readonly version = '1.0.0';
  readonly category = 'marketing';
  readonly icon = 'Megaphone';
  readonly color = '#EC4899';

  // Motion-specific properties
  readonly motionId: MotionAgentId = 'suki';
  readonly role = 'Marketing Associate';
  readonly agentCategory: AgentCategory = 'marketing';
  readonly specialties = [
    'Content Creation & Writing',
    'Social Media Management',
    'SEO Optimization',
    'Campaign Planning',
    'Brand Voice Development',
    'Marketing Analytics',
  ];
  readonly lucideIcon = Megaphone;

  // Credit multiplier for content generation
  protected creditMultiplier = 1.2;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor() {
    super();
    this.registerMotionTools();
  }

  // ============================================
  // TOOL REGISTRATION
  // ============================================

  protected registerTools(): void {
    // Called by BaseAgent constructor
  }

  protected registerMotionTools(): void {
    // Register all Enterprise AI-powered tools
    // NO MOCKS - All tools use real AI processing via MotionAIService
    const enterpriseTools = getAllSukiEnterpriseTools();

    for (const tool of enterpriseTools) {
      this.registerMotionTool(tool as MotionTool<unknown, unknown>);
    }

    console.log(`[SUKI] Registered ${enterpriseTools.length} enterprise AI-powered tools`);
  }

  // Legacy tool registration preserved for backwards compatibility
  private registerLegacyTools(): void {
    // Content Creation Tools
    this.registerMotionTool(this.createGenerateBlogPostTool());
    this.registerMotionTool(this.createSocialPostTool());
    this.registerMotionTool(this.createWriteAdCopyTool());
    this.registerMotionTool(this.createEmailCampaignTool());
    this.registerMotionTool(this.createLandingPageCopyTool());

    // SEO & Analytics Tools
    this.registerMotionTool(this.createAnalyzeSeoKeywordsTool());
    this.registerMotionTool(this.createOptimizeContentSeoTool());
    this.registerMotionTool(this.createAnalyzeCompetitorContentTool());
    this.registerMotionTool(this.createGenerateMetaTagsTool());

    // Campaign Management Tools
    this.registerMotionTool(this.createPlanContentCalendarTool());
    this.registerMotionTool(this.createScheduleSocialPostsTool());
    this.registerMotionTool(this.createAnalyzeCampaignPerformanceTool());
    this.registerMotionTool(this.createGenerateAbTestVariantsTool());

    // Brand & Strategy Tools
    this.registerMotionTool(this.createDefineBrandVoiceTool());
    this.registerMotionTool(this.createMarketingBriefTool());
  }

  // ============================================
  // CONTENT CREATION TOOLS
  // ============================================

  private createGenerateBlogPostTool(): MotionTool<GenerateBlogPostInput, GenerateBlogPostOutput> {
    return {
      name: 'generate_blog_post',
      displayName: 'Generate Blog Post',
      description: 'Generate a complete blog article with SEO optimization based on topic and keywords',
      category: 'content',
      creditCost: 200,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Main topic of the blog post' },
          keywords: { type: 'array', items: { type: 'string' }, description: 'Target SEO keywords' },
          targetLength: { type: 'string', enum: ['short', 'medium', 'long'] },
          tone: { type: 'string', enum: ['professional', 'casual', 'educational', 'entertaining'] },
          targetAudience: { type: 'string' },
          includeOutline: { type: 'boolean' },
          includeCTA: { type: 'boolean' },
        },
        required: ['topic', 'keywords', 'targetLength', 'tone'],
      },
      execute: async (input, context) => {
        const wordCounts = { short: 500, medium: 1000, long: 2000 };
        const targetWords = wordCounts[input.targetLength];

        // Generate blog content (in production, use OpenAI)
        const title = this.generateBlogTitle(input.topic, input.tone);
        const outline = this.generateOutline(input.topic, input.targetLength);
        const content = this.generateBlogContent(input.topic, input.tone, targetWords, input.keywords);

        return {
          title,
          metaDescription: `Learn about ${input.topic}. ${input.keywords.slice(0, 2).join(', ')} and more in this comprehensive guide.`,
          outline,
          content,
          wordCount: content.split(/\s+/).length,
          readingTime: Math.ceil(content.split(/\s+/).length / 200),
          suggestedTags: input.keywords.slice(0, 5),
          seoScore: 85,
          callToAction: input.includeCTA ? `Ready to learn more about ${input.topic}? Contact us today!` : undefined,
        };
      },
    };
  }

  private createSocialPostTool(): MotionTool<CreateSocialPostInput, CreateSocialPostOutput> {
    return {
      name: 'create_social_post',
      displayName: 'Create Social Media Post',
      description: 'Create engaging social media posts optimized for specific platforms',
      category: 'content',
      creditCost: 50,
      requiresApproval: true,
      inputSchema: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: ['twitter', 'linkedin', 'instagram', 'facebook', 'threads'] },
          topic: { type: 'string' },
          tone: { type: 'string', enum: ['professional', 'casual', 'humorous', 'inspirational'] },
          includeHashtags: { type: 'boolean' },
          includeEmoji: { type: 'boolean' },
          callToAction: { type: 'string' },
          linkToInclude: { type: 'string' },
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
        };

        const post = this.generateSocialPost(input);
        const hashtags = input.includeHashtags ? this.generateHashtags(input.topic, 5) : [];

        return {
          post,
          characterCount: post.length,
          hashtags,
          suggestedImage: `Consider using an image related to: ${input.topic}`,
          bestPostingTime: this.getBestPostingTime(input.platform),
          variants: [
            this.generateSocialPost({ ...input, tone: 'professional' }),
            this.generateSocialPost({ ...input, tone: 'casual' }),
          ],
          platformTips: this.getPlatformTips(input.platform),
        };
      },
    };
  }

  private createWriteAdCopyTool(): MotionTool<WriteAdCopyInput, WriteAdCopyOutput> {
    return {
      name: 'write_ad_copy',
      displayName: 'Write Ad Copy',
      description: 'Create compelling advertising copy for various platforms',
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
        },
        required: ['product', 'targetAudience', 'platform', 'adType', 'uniqueSellingPoints', 'tone'],
      },
      execute: async (input, context) => {
        const headlines = this.generateAdHeadlines(input.product, input.uniqueSellingPoints, input.tone);
        const descriptions = this.generateAdDescriptions(input.product, input.targetAudience, input.tone);

        return {
          headlines,
          descriptions,
          callToAction: this.getAdCTA(input.adType),
          displayUrl: `www.example.com/${input.product.toLowerCase().replace(/\s+/g, '-')}`,
          variants: headlines.slice(0, 3).map((headline, i) => ({
            headline,
            description: descriptions[i] || descriptions[0],
            cta: this.getAdCTA(input.adType),
          })),
          platformSpecs: this.getAdSpecs(input.platform),
        };
      },
    };
  }

  private createEmailCampaignTool(): MotionTool<GenerateEmailCampaignInput, GenerateEmailCampaignOutput> {
    return {
      name: 'generate_email_campaign',
      displayName: 'Generate Email Campaign',
      description: 'Create a complete email marketing campaign with multiple emails',
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
        },
        required: ['campaignGoal', 'targetAudience', 'numberOfEmails', 'productOrService', 'tone', 'includeSubjectVariants'],
      },
      execute: async (input, context) => {
        const emails = [];
        const timings = this.getEmailTimings(input.campaignGoal, input.numberOfEmails);

        for (let i = 0; i < input.numberOfEmails; i++) {
          const email = this.generateCampaignEmail(input, i + 1);
          emails.push({
            order: i + 1,
            subject: email.subject,
            subjectVariants: input.includeSubjectVariants ? this.generateSubjectVariants(email.subject) : [],
            preheader: email.preheader,
            body: email.body,
            callToAction: email.cta,
            sendTiming: timings[i],
          });
        }

        return {
          campaignName: `${input.campaignGoal.charAt(0).toUpperCase() + input.campaignGoal.slice(1)} Campaign - ${input.productOrService}`,
          campaignSummary: `A ${input.numberOfEmails}-email ${input.campaignGoal} campaign targeting ${input.targetAudience}`,
          emails,
          expectedMetrics: {
            openRate: '20-25%',
            clickRate: '2-5%',
            conversionRate: '1-3%',
          },
          automationTriggers: this.getAutomationTriggers(input.campaignGoal),
        };
      },
    };
  }

  private createLandingPageCopyTool(): MotionTool<CreateLandingPageCopyInput, CreateLandingPageCopyOutput> {
    return {
      name: 'create_landing_page_copy',
      displayName: 'Create Landing Page Copy',
      description: 'Generate conversion-optimized landing page copy',
      category: 'content',
      creditCost: 100,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          product: { type: 'string' },
          targetAudience: { type: 'string' },
          primaryGoal: { type: 'string', enum: ['signup', 'purchase', 'download', 'contact', 'demo'] },
          keyBenefits: { type: 'array', items: { type: 'string' } },
          socialProof: { type: 'array', items: { type: 'string' } },
          tone: { type: 'string', enum: ['professional', 'friendly', 'luxurious', 'urgent'] },
        },
        required: ['product', 'targetAudience', 'primaryGoal', 'keyBenefits', 'tone'],
      },
      execute: async (input, context) => {
        return {
          headline: this.generateLandingHeadline(input.product, input.primaryGoal),
          subheadline: `The smart solution for ${input.targetAudience} who want results`,
          heroSection: `Discover how ${input.product} can transform your ${input.keyBenefits[0]?.toLowerCase() || 'workflow'}. Join thousands of satisfied customers.`,
          benefitsSections: input.keyBenefits.map((benefit, i) => ({
            title: benefit,
            description: `Experience the power of ${benefit.toLowerCase()}. Our solution delivers measurable results.`,
            icon: ['star', 'zap', 'shield', 'trending-up', 'check-circle'][i % 5],
          })),
          socialProofSection: input.socialProof?.length
            ? `Trusted by: ${input.socialProof.join(', ')}`
            : 'Trusted by thousands of businesses worldwide',
          ctaText: this.getLandingCTA(input.primaryGoal),
          ctaButtonText: this.getLandingButtonText(input.primaryGoal),
          urgencyElement: input.tone === 'urgent' ? 'Limited time offer - Act now!' : undefined,
          faqSuggestions: this.generateFAQs(input.product, input.keyBenefits),
          seoRecommendations: [
            `Include "${input.product}" in the page title`,
            'Add alt text to all images',
            'Ensure page loads in under 3 seconds',
            'Include customer testimonials with schema markup',
          ],
        };
      },
    };
  }

  // ============================================
  // SEO & ANALYTICS TOOLS
  // ============================================

  private createAnalyzeSeoKeywordsTool(): MotionTool<AnalyzeSeoKeywordsInput, AnalyzeSeoKeywordsOutput> {
    return {
      name: 'analyze_seo_keywords',
      displayName: 'Analyze SEO Keywords',
      description: 'Research and analyze keywords for SEO optimization',
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
        const primaryKeywords = input.seedKeywords.map(kw => ({
          keyword: kw,
          searchVolume: `${Math.floor(Math.random() * 10000 + 1000)}/mo`,
          difficulty: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
          intent: input.searchIntent || 'informational',
          cpc: `$${(Math.random() * 5 + 0.5).toFixed(2)}`,
        }));

        const longTailKeywords = input.seedKeywords.flatMap(kw => [
          { keyword: `best ${kw}`, parentKeyword: kw, searchVolume: `${Math.floor(Math.random() * 2000 + 100)}/mo` },
          { keyword: `${kw} for beginners`, parentKeyword: kw, searchVolume: `${Math.floor(Math.random() * 1500 + 100)}/mo` },
          { keyword: `how to ${kw}`, parentKeyword: kw, searchVolume: `${Math.floor(Math.random() * 3000 + 200)}/mo` },
        ]);

        return {
          primaryKeywords,
          longTailKeywords,
          questions: [
            `What is ${input.seedKeywords[0]}?`,
            `How does ${input.seedKeywords[0]} work?`,
            `Why is ${input.seedKeywords[0]} important?`,
            `How to get started with ${input.seedKeywords[0]}?`,
          ],
          relatedTopics: input.seedKeywords.map(kw => `${kw} trends`),
          contentGaps: [
            `Complete guide to ${input.seedKeywords[0]}`,
            `${input.seedKeywords[0]} vs alternatives comparison`,
            `${input.seedKeywords[0]} case studies`,
          ],
          seasonalTrends: ['Search volume typically peaks in Q4'],
        };
      },
    };
  }

  private createOptimizeContentSeoTool(): MotionTool<OptimizeContentSeoInput, OptimizeContentSeoOutput> {
    return {
      name: 'optimize_content_seo',
      displayName: 'Optimize Content for SEO',
      description: 'Analyze and optimize existing content for better SEO performance',
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
        const wordCount = input.content.split(/\s+/).length;
        const keywordCount = (input.content.match(new RegExp(input.targetKeyword, 'gi')) || []).length;
        const keywordDensity = (keywordCount / wordCount) * 100;

        const improvements = [];
        if (keywordDensity < 1) {
          improvements.push({
            type: 'content' as const,
            suggestion: `Increase keyword density. Current: ${keywordDensity.toFixed(2)}%, Target: 1-2%`,
            priority: 'high' as const,
            implemented: false,
          });
        }
        if (!input.content.toLowerCase().includes(input.targetKeyword.toLowerCase())) {
          improvements.push({
            type: 'heading' as const,
            suggestion: 'Include target keyword in at least one heading',
            priority: 'high' as const,
            implemented: false,
          });
        }

        return {
          optimizedContent: input.content, // In production, return actually optimized content
          seoScore: Math.min(95, 60 + improvements.length * 5),
          improvements,
          keywordDensity: { [input.targetKeyword]: keywordDensity },
          readabilityScore: 75,
          suggestedInternalLinks: [
            '/related-topic-1',
            '/related-topic-2',
          ],
          structuredDataSuggestions: `Add Article schema markup for ${input.contentType} content`,
        };
      },
    };
  }

  private createAnalyzeCompetitorContentTool(): MotionTool<AnalyzeCompetitorContentInput, AnalyzeCompetitorContentOutput> {
    return {
      name: 'analyze_competitor_content',
      displayName: 'Analyze Competitor Content',
      description: 'Analyze competitor content strategy and identify opportunities',
      category: 'analytics',
      creditCost: 100,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          competitorUrl: { type: 'string' },
          competitorContent: { type: 'string' },
          analysisType: { type: 'string', enum: ['seo', 'messaging', 'structure', 'comprehensive'] },
          targetKeyword: { type: 'string' },
        },
        required: ['analysisType'],
      },
      execute: async (input, context) => {
        return {
          contentStructure: {
            headings: ['H1: Main Title', 'H2: Section 1', 'H2: Section 2', 'H3: Subsection'],
            wordCount: 1500,
            mediaCount: 5,
            readingLevel: 'Grade 8',
          },
          seoAnalysis: {
            targetKeywords: [input.targetKeyword || 'main keyword', 'secondary keyword'],
            metaDescription: 'Competitor meta description example...',
            titleTag: 'Competitor Title | Brand',
            internalLinks: 12,
            externalLinks: 5,
            schemaMarkup: true,
          },
          messagingAnalysis: {
            tone: 'Professional and authoritative',
            uniqueSellingPoints: ['Feature 1', 'Feature 2', 'Feature 3'],
            callToActions: ['Get Started', 'Learn More', 'Contact Us'],
            valueProposition: 'Helping customers achieve their goals',
          },
          recommendations: [
            'Create longer-form content to outrank competitor',
            'Add more visual elements (images, videos, infographics)',
            'Include customer testimonials and case studies',
            'Improve internal linking structure',
          ],
          contentGaps: [
            'Missing comparison guides',
            'No tutorial content',
            'Limited case studies',
          ],
          competitiveAdvantages: [
            'Opportunity to create more comprehensive guides',
            'Room for better visual content',
            'Can add interactive elements',
          ],
        };
      },
    };
  }

  private createGenerateMetaTagsTool(): MotionTool<GenerateMetaTagsInput, GenerateMetaTagsOutput> {
    return {
      name: 'generate_meta_tags',
      displayName: 'Generate Meta Tags',
      description: 'Generate SEO-optimized meta tags for web pages',
      category: 'analytics',
      creditCost: 25,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          pageTitle: { type: 'string' },
          pageContent: { type: 'string' },
          targetKeyword: { type: 'string' },
          pageType: { type: 'string', enum: ['homepage', 'product', 'blog', 'service', 'landing', 'category'] },
          brandName: { type: 'string' },
        },
        required: ['pageTitle', 'pageContent', 'targetKeyword', 'pageType'],
      },
      execute: async (input, context) => {
        const brand = input.brandName || 'Your Brand';
        const title = `${input.pageTitle} | ${brand}`;
        const description = `Discover ${input.targetKeyword}. ${input.pageContent.substring(0, 100)}...`;

        return {
          title,
          titleLength: title.length,
          metaDescription: description,
          descriptionLength: description.length,
          ogTitle: input.pageTitle,
          ogDescription: description,
          ogType: input.pageType === 'blog' ? 'article' : 'website',
          twitterTitle: input.pageTitle,
          twitterDescription: description,
          twitterCard: 'summary_large_image',
          canonicalUrl: `https://example.com/${input.pageTitle.toLowerCase().replace(/\s+/g, '-')}`,
          schemaMarkup: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': input.pageType === 'blog' ? 'Article' : 'WebPage',
            name: input.pageTitle,
            description: description,
          }, null, 2),
          robotsDirective: 'index, follow',
        };
      },
    };
  }

  // ============================================
  // CAMPAIGN MANAGEMENT TOOLS
  // ============================================

  private createPlanContentCalendarTool(): MotionTool<PlanContentCalendarInput, PlanContentCalendarOutput> {
    return {
      name: 'plan_content_calendar',
      displayName: 'Plan Content Calendar',
      description: 'Create a comprehensive content calendar for multiple channels',
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
          keyDates: { type: 'array', items: { type: 'object' } },
        },
        required: ['timeframe', 'contentTypes', 'themes', 'frequency'],
      },
      execute: async (input, context) => {
        const days = input.timeframe === 'week' ? 7 : input.timeframe === 'month' ? 30 : 90;
        const calendar = [];
        const startDate = new Date();

        for (let i = 0; i < days; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

          // Add content based on frequency
          for (const [contentType, freq] of Object.entries(input.frequency)) {
            if (i % Math.ceil(days / (freq as number)) === 0) {
              calendar.push({
                date: date.toISOString().split('T')[0],
                dayOfWeek,
                contentType,
                title: `${input.themes[i % input.themes.length]} - ${contentType}`,
                theme: input.themes[i % input.themes.length],
                platform: contentType === 'social' ? 'linkedin' : undefined,
                status: 'planned' as const,
                notes: `Create ${contentType} content about ${input.themes[i % input.themes.length]}`,
              });
            }
          }
        }

        return {
          calendar: calendar.slice(0, 50), // Limit output
          themeSummary: input.themes.reduce((acc, theme) => ({ ...acc, [theme]: Math.ceil(calendar.length / input.themes.length) }), {}),
          contentMix: input.contentTypes.reduce((acc, type) => ({ ...acc, [type]: input.frequency[type] || 1 }), {}),
          recommendations: [
            'Maintain consistent posting schedule',
            'Batch content creation for efficiency',
            'Plan content around key dates and events',
            'Leave buffer time for reactive content',
          ],
          resourceRequirements: [
            'Content writer: 10 hours/week',
            'Designer: 5 hours/week',
            'Video editor: 3 hours/week (if video content)',
          ],
        };
      },
    };
  }

  private createScheduleSocialPostsTool(): MotionTool<ScheduleSocialPostsInput, ScheduleSocialPostsOutput> {
    return {
      name: 'schedule_social_posts',
      displayName: 'Schedule Social Posts',
      description: 'Schedule social media posts with optimal timing',
      category: 'communication',
      creditCost: 50,
      requiresApproval: true,
      inputSchema: {
        type: 'object',
        properties: {
          posts: { type: 'array', items: { type: 'object' } },
          autoOptimizeTime: { type: 'boolean' },
          timezone: { type: 'string' },
        },
        required: ['posts', 'autoOptimizeTime'],
      },
      execute: async (input, context) => {
        const scheduledPosts = input.posts.map((post, i) => {
          const scheduledTime = post.scheduledTime || new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString();
          const optimizedTime = input.autoOptimizeTime ? this.getOptimalPostTime(post.platform, scheduledTime) : scheduledTime;

          return {
            id: crypto.randomUUID(),
            platform: post.platform,
            content: post.content,
            scheduledTime,
            optimizedTime: input.autoOptimizeTime ? optimizedTime : undefined,
            status: 'pending_approval' as const,
            expectedReach: `${Math.floor(Math.random() * 5000 + 1000)} - ${Math.floor(Math.random() * 10000 + 5000)}`,
          };
        });

        return {
          scheduledPosts,
          conflicts: [],
          optimizationNotes: input.autoOptimizeTime ? [
            'Times optimized based on platform best practices',
            'Avoided posting during low-engagement hours',
            'Spread posts to avoid audience fatigue',
          ] : [],
        };
      },
    };
  }

  private createAnalyzeCampaignPerformanceTool(): MotionTool<AnalyzeCampaignPerformanceInput, AnalyzeCampaignPerformanceOutput> {
    return {
      name: 'analyze_campaign_performance',
      displayName: 'Analyze Campaign Performance',
      description: 'Analyze marketing campaign performance and provide insights',
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
        },
        required: ['metrics'],
      },
      execute: async (input, context) => {
        const { metrics } = input;
        const ctr = metrics.clicks && metrics.impressions ? (metrics.clicks / metrics.impressions) * 100 : 0;
        const conversionRate = metrics.conversions && metrics.clicks ? (metrics.conversions / metrics.clicks) * 100 : 0;
        const cpc = metrics.spend && metrics.clicks ? metrics.spend / metrics.clicks : 0;
        const cpa = metrics.spend && metrics.conversions ? metrics.spend / metrics.conversions : 0;
        const roas = metrics.revenue && metrics.spend ? metrics.revenue / metrics.spend : 0;

        return {
          summary: `Campaign ${input.campaignName || ''} generated ${metrics.conversions || 0} conversions from ${metrics.impressions || 0} impressions with a ${conversionRate.toFixed(2)}% conversion rate.`,
          kpis: {
            ctr,
            conversionRate,
            cpc,
            cpa,
            roas,
            openRate: metrics.emailsOpened && metrics.emailsSent ? (metrics.emailsOpened / metrics.emailsSent) * 100 : undefined,
            clickToOpenRate: metrics.emailsClicked && metrics.emailsOpened ? (metrics.emailsClicked / metrics.emailsOpened) * 100 : undefined,
          },
          trends: [
            { metric: 'CTR', trend: ctr > 2 ? 'up' : 'stable', change: 12, insight: 'Above average click-through rate' },
            { metric: 'Conversion Rate', trend: conversionRate > 3 ? 'up' : 'down', change: -5, insight: 'Room for improvement in conversions' },
          ],
          benchmarkComparison: input.comparisonPeriod === 'benchmark' ? {
            ctr: { yours: ctr, benchmark: 2.5 },
            conversionRate: { yours: conversionRate, benchmark: 3.0 },
          } : undefined,
          insights: [
            ctr > 2.5 ? 'Strong creative performance' : 'Consider testing new ad creatives',
            conversionRate > 3 ? 'Effective landing page' : 'Optimize landing page for conversions',
            roas > 3 ? 'Profitable campaign' : 'Review targeting and bidding strategy',
          ],
          recommendations: [
            'A/B test headlines to improve CTR',
            'Implement retargeting for non-converters',
            'Expand successful audience segments',
          ],
          nextSteps: [
            'Review top-performing ads',
            'Analyze conversion path',
            'Set up automated optimization rules',
          ],
        };
      },
    };
  }

  private createGenerateAbTestVariantsTool(): MotionTool<GenerateAbTestVariantsInput, GenerateAbTestVariantsOutput> {
    return {
      name: 'generate_ab_test_variants',
      displayName: 'Generate A/B Test Variants',
      description: 'Create variations for A/B testing different marketing elements',
      category: 'content',
      creditCost: 75,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          elementType: { type: 'string', enum: ['headline', 'cta', 'email_subject', 'ad_copy', 'landing_hero'] },
          numberOfVariants: { type: 'number', minimum: 2, maximum: 5 },
          testHypothesis: { type: 'string' },
          targetMetric: { type: 'string', enum: ['clicks', 'conversions', 'opens', 'engagement'] },
        },
        required: ['original', 'elementType', 'numberOfVariants'],
      },
      execute: async (input, context) => {
        const variants = [];
        const variationTypes = ['length', 'tone', 'urgency', 'personalization', 'benefit-focused'];

        for (let i = 0; i < input.numberOfVariants; i++) {
          variants.push({
            id: `variant_${i + 1}`,
            variant: this.generateVariant(input.original, variationTypes[i % variationTypes.length]),
            variationType: variationTypes[i % variationTypes.length],
            hypothesis: input.testHypothesis || `This variation will improve ${input.targetMetric || 'engagement'}`,
            expectedImpact: `${Math.floor(Math.random() * 20 + 5)}% improvement potential`,
          });
        }

        return {
          original: input.original,
          variants,
          testingRecommendations: {
            sampleSize: Math.floor(Math.random() * 5000 + 1000),
            duration: '2 weeks',
            primaryMetric: input.targetMetric || 'clicks',
            secondaryMetrics: ['time on page', 'bounce rate', 'scroll depth'],
            statisticalSignificance: '95%',
          },
          implementationNotes: [
            'Ensure equal traffic split between variants',
            'Run test for at least 2 business cycles',
            'Document all external factors during test period',
          ],
        };
      },
    };
  }

  // ============================================
  // BRAND & STRATEGY TOOLS
  // ============================================

  private createDefineBrandVoiceTool(): MotionTool<DefineBrandVoiceInput, DefineBrandVoiceOutput> {
    return {
      name: 'define_brand_voice',
      displayName: 'Define Brand Voice',
      description: 'Create a comprehensive brand voice guide',
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
        },
        required: ['companyDescription', 'targetAudience', 'brandValues'],
      },
      execute: async (input, context) => {
        return {
          voiceSummary: `A ${input.brandValues[0]?.toLowerCase() || 'professional'} voice that speaks directly to ${input.targetAudience}, combining expertise with approachability.`,
          personalityTraits: input.brandValues.slice(0, 5),
          toneAttributes: [
            { attribute: 'Professional', description: 'Expert but not stuffy', scale: 8, example: 'We understand your challenges and have the solutions.' },
            { attribute: 'Friendly', description: 'Warm and approachable', scale: 7, example: 'Hey there! Let\'s work together on this.' },
            { attribute: 'Confident', description: 'Assured without arrogance', scale: 8, example: 'Our approach delivers results. Here\'s how.' },
            { attribute: 'Clear', description: 'Simple and jargon-free', scale: 9, example: 'In simple terms, this means...' },
          ],
          doAndDont: {
            do: [
              'Use active voice',
              'Be specific and concrete',
              'Show empathy for customer challenges',
              'Use "you" and "your" to address readers directly',
              'Include real examples and data',
            ],
            dont: [
              'Use excessive jargon',
              'Sound robotic or corporate',
              'Make exaggerated claims',
              'Use passive voice excessively',
              'Ignore the reader\'s perspective',
            ],
          },
          vocabularyGuide: {
            preferred: ['innovative', 'reliable', 'partner', 'solution', 'transform', 'achieve'],
            avoid: ['synergy', 'leverage', 'pivot', 'disrupt', 'best-in-class'],
            industryTerms: ['workflow', 'automation', 'integration', 'analytics'],
          },
          examplePhrases: {
            greeting: ['Hello!', 'Hey there!', 'Good to see you!'],
            closing: ['Let\'s make it happen.', 'We\'re here when you need us.', 'Onward and upward!'],
            ctaButtons: ['Get Started', 'Learn More', 'See How It Works'],
          },
          channelAdaptations: {
            email: 'More personal, conversational tone',
            social: 'Shorter, punchier, more casual',
            website: 'Professional but approachable',
            support: 'Empathetic and solution-focused',
          },
        };
      },
    };
  }

  private createMarketingBriefTool(): MotionTool<CreateMarketingBriefInput, CreateMarketingBriefOutput> {
    return {
      name: 'create_marketing_brief',
      displayName: 'Create Marketing Brief',
      description: 'Generate a comprehensive marketing project brief',
      category: 'document',
      creditCost: 75,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          projectName: { type: 'string' },
          objective: { type: 'string' },
          targetAudience: { type: 'string' },
          keyMessages: { type: 'array', items: { type: 'string' } },
          deliverables: { type: 'array', items: { type: 'string' } },
          budget: { type: 'string' },
          timeline: { type: 'string' },
        },
        required: ['projectName', 'objective', 'targetAudience', 'keyMessages', 'deliverables'],
      },
      execute: async (input, context) => {
        return {
          brief: {
            projectOverview: `${input.projectName}: A marketing initiative to ${input.objective}`,
            background: `This project aims to reach ${input.targetAudience} with compelling messaging that drives action.`,
            objectives: [input.objective, 'Increase brand awareness', 'Drive engagement', 'Generate leads'],
            targetAudience: {
              demographics: `Primary: ${input.targetAudience}`,
              psychographics: 'Value-conscious professionals seeking efficiency',
              painPoints: ['Time constraints', 'Information overload', 'Decision fatigue'],
              motivations: ['Career growth', 'Cost savings', 'Improved productivity'],
            },
            keyMessages: input.keyMessages,
            toneAndStyle: 'Professional yet approachable, confident but not arrogant',
            deliverables: input.deliverables.map(item => ({
              item,
              specifications: 'To be defined in kickoff meeting',
              deadline: input.timeline,
            })),
            successMetrics: [
              'Reach: 100,000 impressions',
              'Engagement: 5% engagement rate',
              'Conversions: 500 new leads',
            ],
            budget: input.budget || 'TBD',
            timeline: input.timeline || '4-6 weeks',
            approvalProcess: ['Draft review', 'Stakeholder feedback', 'Final approval', 'Launch'],
            risks: [
              'Timeline delays due to approval process',
              'Budget constraints limiting reach',
              'Competitive activity during campaign',
            ],
          },
          checklistItems: [
            '[ ] Kickoff meeting scheduled',
            '[ ] Creative brief approved',
            '[ ] Assets created',
            '[ ] Copy reviewed and approved',
            '[ ] Tracking set up',
            '[ ] Launch plan finalized',
          ],
        };
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateBlogTitle(topic: string, tone: string): string {
    const templates: Record<string, string[]> = {
      professional: [`The Complete Guide to ${topic}`, `${topic}: Best Practices for Success`],
      casual: [`Everything You Need to Know About ${topic}`, `Let's Talk About ${topic}`],
      educational: [`Understanding ${topic}: A Comprehensive Overview`, `${topic} 101: Getting Started`],
      entertaining: [`Why ${topic} Is More Exciting Than You Think`, `The Surprising Truth About ${topic}`],
    };
    const options = templates[tone] || templates.professional;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateOutline(topic: string, length: string): string[] {
    const base = [
      `Introduction to ${topic}`,
      `Why ${topic} Matters`,
      `Key Components of ${topic}`,
    ];
    if (length === 'medium' || length === 'long') {
      base.push(`Best Practices for ${topic}`, `Common Mistakes to Avoid`);
    }
    if (length === 'long') {
      base.push(`Advanced ${topic} Strategies`, `Case Studies`, `Future of ${topic}`);
    }
    base.push('Conclusion');
    return base;
  }

  private generateBlogContent(topic: string, tone: string, targetWords: number, keywords: string[]): string {
    // Simplified content generation - in production, use OpenAI
    const intro = `In today's fast-paced world, ${topic} has become increasingly important. Whether you're a beginner or an experienced professional, understanding ${topic} can help you achieve better results.`;
    const body = keywords.map(kw => `When it comes to ${kw}, there are several key factors to consider. ${kw} plays a crucial role in the overall success of your ${topic} strategy.`).join('\n\n');
    const conclusion = `In conclusion, mastering ${topic} requires dedication and continuous learning. By applying these principles, you'll be well on your way to success.`;
    return `${intro}\n\n${body}\n\n${conclusion}`;
  }

  private generateSocialPost(input: CreateSocialPostInput): string {
    const emoji = input.includeEmoji ? '🚀 ' : '';
    const cta = input.callToAction ? `\n\n${input.callToAction}` : '';
    const link = input.linkToInclude ? `\n\n${input.linkToInclude}` : '';
    return `${emoji}${input.topic}${cta}${link}`;
  }

  private generateHashtags(topic: string, count: number): string[] {
    const words = topic.split(' ');
    return words.slice(0, count).map(w => `#${w.replace(/[^a-zA-Z0-9]/g, '')}`);
  }

  private getBestPostingTime(platform: string): string {
    const times: Record<string, string> = {
      twitter: 'Tuesday-Thursday, 9 AM - 12 PM',
      linkedin: 'Tuesday-Thursday, 7 AM - 8 AM, 12 PM',
      instagram: 'Monday-Friday, 11 AM - 1 PM',
      facebook: 'Wednesday-Friday, 1 PM - 4 PM',
      threads: 'Weekdays, 10 AM - 2 PM',
    };
    return times[platform] || 'Weekdays, 9 AM - 5 PM';
  }

  private getPlatformTips(platform: string): string[] {
    const tips: Record<string, string[]> = {
      twitter: ['Keep it concise', 'Use relevant hashtags', 'Engage with replies'],
      linkedin: ['Be professional', 'Share insights', 'Tag relevant connections'],
      instagram: ['Use high-quality visuals', 'Write engaging captions', 'Use Stories'],
      facebook: ['Use videos when possible', 'Ask questions', 'Post at peak times'],
      threads: ['Be conversational', 'Join trending topics', 'Cross-post from Twitter'],
    };
    return tips[platform] || ['Engage authentically', 'Post consistently'];
  }

  private generateAdHeadlines(product: string, usps: string[], tone: string): string[] {
    return [
      `Discover ${product} Today`,
      `${usps[0] || 'Transform'} with ${product}`,
      `The Smarter Way to ${usps[0] || 'Succeed'}`,
      `${product}: ${usps[1] || 'Results You Can See'}`,
      `Why Choose ${product}?`,
    ];
  }

  private generateAdDescriptions(product: string, audience: string, tone: string): string[] {
    return [
      `${product} helps ${audience} achieve more. Try it free today.`,
      `Join thousands who trust ${product}. Start your journey now.`,
      `See why ${audience} love ${product}. Limited time offer.`,
    ];
  }

  private getAdCTA(adType: string): string {
    const ctas: Record<string, string> = {
      search: 'Learn More',
      display: 'Shop Now',
      video: 'Watch Now',
      carousel: 'Explore',
      story: 'Swipe Up',
    };
    return ctas[adType] || 'Learn More';
  }

  private getAdSpecs(platform: string): { maxHeadlineLength: number; maxDescriptionLength: number } {
    const specs: Record<string, { maxHeadlineLength: number; maxDescriptionLength: number }> = {
      google: { maxHeadlineLength: 30, maxDescriptionLength: 90 },
      facebook: { maxHeadlineLength: 40, maxDescriptionLength: 125 },
      linkedin: { maxHeadlineLength: 70, maxDescriptionLength: 100 },
      display: { maxHeadlineLength: 25, maxDescriptionLength: 90 },
      tiktok: { maxHeadlineLength: 50, maxDescriptionLength: 100 },
    };
    return specs[platform] || { maxHeadlineLength: 30, maxDescriptionLength: 90 };
  }

  private getEmailTimings(goal: string, count: number): string[] {
    const timings: Record<string, string[]> = {
      nurture: ['Day 0', 'Day 3', 'Day 7', 'Day 14', 'Day 21'],
      promotion: ['Day 0', 'Day 2', 'Day 5'],
      announcement: ['Day 0', 'Day 7'],
      reengagement: ['Day 0', 'Day 5', 'Day 10'],
      onboarding: ['Day 0', 'Day 1', 'Day 3', 'Day 7', 'Day 14'],
    };
    return (timings[goal] || timings.nurture).slice(0, count);
  }

  private generateCampaignEmail(input: GenerateEmailCampaignInput, emailNumber: number): { subject: string; preheader: string; body: string; cta: string } {
    return {
      subject: `${emailNumber === 1 ? 'Welcome!' : `Email ${emailNumber}`}: ${input.productOrService}`,
      preheader: `Discover how ${input.productOrService} can help you...`,
      body: `Hi there,\n\n${emailNumber === 1 ? 'Welcome to our community!' : 'Hope you\'re doing well!'}\n\nWe wanted to share some exciting news about ${input.productOrService}...\n\nBest,\nThe Team`,
      cta: emailNumber === 1 ? 'Get Started' : 'Learn More',
    };
  }

  private generateSubjectVariants(original: string): string[] {
    return [
      original,
      `🎉 ${original}`,
      original.replace(/!$/, '?'),
      `[New] ${original}`,
    ];
  }

  private getAutomationTriggers(goal: string): string[] {
    const triggers: Record<string, string[]> = {
      nurture: ['Lead form submission', 'Content download'],
      promotion: ['Cart abandonment', 'Browse abandonment'],
      announcement: ['Product launch', 'Feature release'],
      reengagement: ['30 days inactive', 'Subscription expiring'],
      onboarding: ['Account created', 'First login'],
    };
    return triggers[goal] || ['Manual trigger'];
  }

  private generateLandingHeadline(product: string, goal: string): string {
    const headlines: Record<string, string> = {
      signup: `Join Thousands Using ${product}`,
      purchase: `Get ${product} Today`,
      download: `Download ${product} Free`,
      contact: `Let's Talk About ${product}`,
      demo: `See ${product} in Action`,
    };
    return headlines[goal] || `Discover ${product}`;
  }

  private getLandingCTA(goal: string): string {
    const ctas: Record<string, string> = {
      signup: 'Ready to get started? Sign up now and see results in minutes.',
      purchase: 'Limited time offer. Get yours today and start transforming your workflow.',
      download: 'Get instant access. Download now and start using immediately.',
      contact: 'Have questions? Our team is ready to help. Reach out today.',
      demo: 'See it in action. Book your personalized demo now.',
    };
    return ctas[goal] || 'Take the next step today.';
  }

  private getLandingButtonText(goal: string): string {
    const buttons: Record<string, string> = {
      signup: 'Sign Up Free',
      purchase: 'Buy Now',
      download: 'Download Now',
      contact: 'Contact Us',
      demo: 'Book Demo',
    };
    return buttons[goal] || 'Get Started';
  }

  private generateFAQs(product: string, benefits: string[]): Array<{ question: string; answer: string }> {
    return [
      { question: `What is ${product}?`, answer: `${product} is a solution designed to help you ${benefits[0]?.toLowerCase() || 'achieve more'}.` },
      { question: 'How does it work?', answer: 'Our platform uses advanced technology to streamline your workflow and deliver results.' },
      { question: 'Is there a free trial?', answer: 'Yes! We offer a free trial so you can experience the benefits firsthand.' },
      { question: 'What support is available?', answer: 'We provide 24/7 customer support via chat, email, and phone.' },
    ];
  }

  private getOptimalPostTime(platform: string, scheduledTime: string): string {
    // Simulate optimization - in production, use analytics
    const date = new Date(scheduledTime);
    date.setHours(10, 0, 0, 0); // Set to 10 AM as "optimal"
    return date.toISOString();
  }

  private generateVariant(original: string, variationType: string): string {
    const modifications: Record<string, (s: string) => string> = {
      length: (s) => s.length > 50 ? s.substring(0, 50) + '...' : s + ' - Learn more!',
      tone: (s) => s.replace(/!/g, '.').replace(/\?/g, '!'),
      urgency: (s) => `🔥 ${s} - Limited time!`,
      personalization: (s) => `Hey there! ${s}`,
      'benefit-focused': (s) => `Save time with ${s}`,
    };
    return (modifications[variationType] || ((s) => s))(original);
  }

  // ============================================
  // CHAT HANDLING
  // ============================================

  public async handleChat(
    message: string,
    context: AgentContext,
    conversationHistory?: ConversationMessage[]
  ): Promise<AgentResponse<string>> {
    const startTime = Date.now();

    try {
      // Get system prompt
      const systemPrompt = this.getSystemPrompt();

      // Build context from memory service
      const memoryContext = await memoryService.buildAgentContext({
        userId: context.userId || 'default-user',
        workspaceId: context.workspaceId || 'default-workspace',
        agentId: this.motionId,
      });

      // Enrich system prompt with user context
      const enrichedSystemPrompt = `${systemPrompt}

USER CONTEXT:
- User Profile: ${memoryContext.userProfile.name || 'Unknown User'}
- Communication Style: ${memoryContext.userProfile.communicationStyle || 'professional'}
- Recent Context: ${memoryContext.contextSummary || 'No recent context'}
${memoryContext.userProfile.preferences ? `- Preferences: ${JSON.stringify(memoryContext.userProfile.preferences)}` : ''}`;

      // Generate AI response using MotionAIService
      const aiResponse = await motionAI.generateContent(
        message,
        enrichedSystemPrompt,
        {
          style: 'creative',
          format: 'text',
        }
      );

      // Store conversation in memory for context building
      await memoryService.storeConversation(
        {
          userId: context.userId || 'default-user',
          workspaceId: context.workspaceId || 'default-workspace',
          agentId: this.motionId,
        },
        context.sessionId || crypto.randomUUID(),
        [
          ...(conversationHistory || []),
          { role: 'user', content: message },
          { role: 'assistant', content: aiResponse.content },
        ]
      );

      return {
        success: true,
        data: aiResponse.content,
        metadata: {
          agentId: this.id,
          executionTimeMs: Date.now() - startTime,
          toolsUsed: [],
          correlationId: crypto.randomUUID(),
          tokensUsed: aiResponse.metadata.tokensUsed,
          model: 'enterprise-ai',
        },
      };
    } catch (error) {
      console.error('[SUKI] Chat error:', error);
      return {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
        metadata: {
          agentId: this.id,
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  // ============================================
  // SYSTEM PROMPT
  // ============================================

  public getSystemPrompt(): string {
    return `You are Suki, an expert Marketing Associate AI.

YOUR ROLE:
- Create compelling content that engages and converts
- Manage social media presence across platforms
- Optimize content for SEO and discoverability
- Plan and execute marketing campaigns
- Maintain consistent brand voice
- Analyze marketing performance and provide insights

YOUR PERSONALITY:
- Creative and innovative thinker
- Data-informed decision maker
- Trend-aware and culturally savvy
- Clear and persuasive communicator
- Detail-oriented but sees the big picture

YOUR SPECIALTIES:
${this.specialties.map(s => `- ${s}`).join('\n')}

AVAILABLE TOOLS:
${this.getMotionTools().map(t => `- ${t.displayName}: ${t.description}`).join('\n')}

GUIDELINES:
1. Always consider the target audience
2. Maintain brand consistency across all content
3. Use data to inform content decisions
4. Balance creativity with measurable goals
5. Stay current with platform best practices
6. Optimize for both engagement and conversion
7. Suggest A/B tests for important decisions

When creating content, always ask about:
- Target audience
- Key message or goal
- Preferred tone and style
- Platform or channel
- Any brand guidelines to follow`;
  }

  // ============================================
  // CONTEXT ENRICHMENT
  // ============================================

  protected async getAgentSpecificContext(context: MotionAgentContext): Promise<Record<string, unknown>> {
    return {
      agentRole: 'Marketing Associate',
      availableTools: this.getMotionTools().map(t => t.name),
      contentTypes: ['blog', 'social', 'email', 'ad', 'landing'],
      supportedPlatforms: ['twitter', 'linkedin', 'instagram', 'facebook', 'google', 'tiktok'],
    };
  }
}

// Export singleton instance
export const sukiAgent = new SukiAgent();

export default SukiAgent;
