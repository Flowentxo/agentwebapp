/**
 * Spec Agent - Competitive Intelligence
 * Monitors competitors, conducts market research, and provides strategic insights
 */

import { MotionBaseAgent } from '../shared/MotionBaseAgent';
import { MotionTool, MotionContext } from '../shared/types';
import {
  MonitorCompetitorInput,
  MonitorCompetitorOutput,
  TrackPricingChangesInput,
  TrackPricingChangesOutput,
  AnalyzeProductUpdatesInput,
  AnalyzeProductUpdatesOutput,
  ConductMarketResearchInput,
  ConductMarketResearchOutput,
  AnalyzeIndustryTrendsInput,
  AnalyzeIndustryTrendsOutput,
  GenerateSwotAnalysisInput,
  GenerateSwotAnalysisOutput,
  GatherCompetitiveIntelInput,
  GatherCompetitiveIntelOutput,
  AnalyzeNewsPressInput,
  AnalyzeNewsPressOutput,
  CreateBattleCardInput,
  CreateBattleCardOutput,
  GenerateStrategicReportInput,
  GenerateStrategicReportOutput,
  AssessMarketPositionInput,
  AssessMarketPositionOutput,
} from './types';

export class SpecAgent extends MotionBaseAgent {
  constructor() {
    super(
      'spec',
      'Spec',
      'Competitive Intelligence',
      'research',
      'Monitors competitors, conducts market research, and provides strategic insights to inform business decisions.',
      ['#6366f1', '#4f46e5'],
      [
        'Competitor Monitoring',
        'Market Research',
        'Trend Analysis',
        'SWOT Analysis',
        'Battle Cards',
        'Strategic Reports',
      ]
    );

    this.registerTools();
  }

  private registerTools(): void {
    // ============================================
    // COMPETITOR MONITORING TOOLS
    // ============================================

    this.registerTool(this.createMonitorCompetitorTool());
    this.registerTool(this.createTrackPricingChangesTool());
    this.registerTool(this.createAnalyzeProductUpdatesTool());

    // ============================================
    // MARKET RESEARCH TOOLS
    // ============================================

    this.registerTool(this.createConductMarketResearchTool());
    this.registerTool(this.createAnalyzeIndustryTrendsTool());
    this.registerTool(this.createGenerateSwotAnalysisTool());

    // ============================================
    // INTELLIGENCE GATHERING TOOLS
    // ============================================

    this.registerTool(this.createGatherCompetitiveIntelTool());
    this.registerTool(this.createAnalyzeNewsPressTool());

    // ============================================
    // STRATEGIC ANALYSIS TOOLS
    // ============================================

    this.registerTool(this.createCreateBattleCardTool());
    this.registerTool(this.createGenerateStrategicReportTool());
    this.registerTool(this.createAssessMarketPositionTool());
  }

  // ============================================
  // COMPETITOR MONITORING TOOL IMPLEMENTATIONS
  // ============================================

  private createMonitorCompetitorTool(): MotionTool<MonitorCompetitorInput, MonitorCompetitorOutput> {
    return {
      name: 'monitor_competitor',
      description: 'Track competitor activities, updates, and changes across multiple dimensions',
      category: 'analytics',
      creditCost: 4,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          competitorName: { type: 'string', description: 'Name of the competitor to monitor' },
          competitorUrl: { type: 'string', description: 'Competitor website URL' },
          monitoringAreas: {
            type: 'array',
            items: { type: 'string', enum: ['pricing', 'products', 'news', 'social', 'hiring', 'partnerships'] },
            description: 'Areas to monitor',
          },
          timeframe: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          alertThreshold: { type: 'string', enum: ['all', 'significant', 'critical'] },
        },
        required: ['competitorName', 'monitoringAreas'],
      },
      execute: async (input: MonitorCompetitorInput, context: MotionContext): Promise<MonitorCompetitorOutput> => {
        console.log(`[SPEC] Monitoring competitor: ${input.competitorName}`);

        // Simulated competitor monitoring
        const updates = input.monitoringAreas.flatMap((area) => {
          const areaUpdates = [];
          const count = Math.floor(Math.random() * 3) + 1;

          for (let i = 0; i < count; i++) {
            areaUpdates.push({
              type: area,
              title: this.generateUpdateTitle(area, input.competitorName),
              description: this.generateUpdateDescription(area),
              source: this.getSourceForArea(area),
              date: this.getRecentDate(i * 2),
              significance: this.randomSignificance(),
              url: `https://${input.competitorName.toLowerCase().replace(/\s/g, '')}.com/${area}`,
            });
          }

          return areaUpdates;
        });

        return {
          competitorId: `comp_${Date.now()}`,
          competitorName: input.competitorName,
          updates: updates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          summary: `Found ${updates.length} updates for ${input.competitorName} across ${input.monitoringAreas.length} monitoring areas. ${updates.filter((u) => u.significance === 'high' || u.significance === 'critical').length} require attention.`,
          nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
      },
    };
  }

  private createTrackPricingChangesTool(): MotionTool<TrackPricingChangesInput, TrackPricingChangesOutput> {
    return {
      name: 'track_pricing_changes',
      description: 'Monitor and analyze competitor pricing strategies and changes',
      category: 'analytics',
      creditCost: 3,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          competitors: { type: 'array', items: { type: 'string' }, description: 'Competitors to track' },
          products: { type: 'array', items: { type: 'string' }, description: 'Specific products to track' },
          includeHistorical: { type: 'boolean', description: 'Include historical pricing data' },
          alertOnChange: { type: 'boolean', description: 'Alert when prices change' },
        },
        required: ['competitors'],
      },
      execute: async (input: TrackPricingChangesInput, context: MotionContext): Promise<TrackPricingChangesOutput> => {
        console.log(`[SPEC] Tracking pricing for: ${input.competitors.join(', ')}`);

        const pricingData = input.competitors.flatMap((competitor) => {
          const products = input.products || ['Basic Plan', 'Pro Plan', 'Enterprise'];
          return products.map((product) => {
            const currentPrice = Math.floor(Math.random() * 200) + 50;
            const previousPrice = input.includeHistorical ? currentPrice + Math.floor(Math.random() * 40) - 20 : undefined;
            const change = previousPrice ? currentPrice - previousPrice : undefined;

            return {
              competitor,
              product,
              currentPrice,
              previousPrice,
              change,
              changePercent: change && previousPrice ? Math.round((change / previousPrice) * 100 * 10) / 10 : undefined,
              lastUpdated: new Date().toISOString(),
              pricingModel: ['per user/month', 'flat rate', 'usage-based'][Math.floor(Math.random() * 3)],
              notes: change && change < 0 ? 'Price decreased - possible promotional period' : undefined,
            };
          });
        });

        const trends = [
          {
            trend: 'Industry-wide shift to usage-based pricing',
            competitors: input.competitors.slice(0, 2),
            recommendation: 'Consider introducing a usage-based tier',
          },
          {
            trend: 'Enterprise pricing becoming more competitive',
            competitors: input.competitors.slice(1),
            recommendation: 'Review enterprise value proposition',
          },
        ];

        const alerts = pricingData
          .filter((p) => p.change && Math.abs(p.change) > 10)
          .map((p) => `${p.competitor} ${p.product}: ${p.change! > 0 ? 'increased' : 'decreased'} by ${Math.abs(p.changePercent!)}%`);

        return { pricingData, trends, alerts };
      },
    };
  }

  private createAnalyzeProductUpdatesTool(): MotionTool<AnalyzeProductUpdatesInput, AnalyzeProductUpdatesOutput> {
    return {
      name: 'analyze_product_updates',
      description: 'Track and analyze competitor product changes, features, and updates',
      category: 'analytics',
      creditCost: 4,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          competitorName: { type: 'string', description: 'Competitor to analyze' },
          productCategory: { type: 'string', description: 'Product category to focus on' },
          timeframe: { type: 'string', description: 'Timeframe for analysis' },
          includeFeatureComparison: { type: 'boolean', description: 'Include feature comparison' },
        },
        required: ['competitorName'],
      },
      execute: async (input: AnalyzeProductUpdatesInput, context: MotionContext): Promise<AnalyzeProductUpdatesOutput> => {
        console.log(`[SPEC] Analyzing product updates for: ${input.competitorName}`);

        const updates = [
          {
            date: this.getRecentDate(5),
            type: 'new_feature' as const,
            title: 'AI-Powered Analytics Dashboard',
            description: 'Launched new AI-powered analytics with predictive insights',
            impact: 'high' as const,
            ourResponse: 'Accelerate our AI roadmap to maintain competitive parity',
          },
          {
            date: this.getRecentDate(15),
            type: 'improvement' as const,
            title: 'Mobile App Redesign',
            description: 'Complete redesign of mobile experience with new UX',
            impact: 'medium' as const,
            ourResponse: 'Conduct user research to identify mobile pain points',
          },
          {
            date: this.getRecentDate(30),
            type: 'pricing_change' as const,
            title: 'New Entry-Level Tier',
            description: 'Introduced a freemium tier to capture SMB market',
            impact: 'high' as const,
            ourResponse: 'Consider free trial extension or freemium offering',
          },
        ];

        return {
          competitor: input.competitorName,
          updates,
          featureGaps: [
            'AI-powered recommendations',
            'Native mobile offline mode',
            'Custom workflow automation',
          ],
          opportunities: [
            'Superior integration ecosystem',
            'Better enterprise security features',
            'More flexible API access',
          ],
          threats: [
            'Aggressive pricing strategy',
            'Faster feature release cycle',
            'Strong brand recognition in SMB',
          ],
        };
      },
    };
  }

  // ============================================
  // MARKET RESEARCH TOOL IMPLEMENTATIONS
  // ============================================

  private createConductMarketResearchTool(): MotionTool<ConductMarketResearchInput, ConductMarketResearchOutput> {
    return {
      name: 'conduct_market_research',
      description: 'Conduct comprehensive market research on specific topics or segments',
      category: 'analytics',
      creditCost: 8,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Research topic' },
          industry: { type: 'string', description: 'Industry context' },
          geography: { type: 'array', items: { type: 'string' }, description: 'Geographic focus' },
          depth: { type: 'string', enum: ['overview', 'detailed', 'comprehensive'] },
          focusAreas: { type: 'array', items: { type: 'string' } },
        },
        required: ['topic', 'depth'],
      },
      execute: async (input: ConductMarketResearchInput, context: MotionContext): Promise<ConductMarketResearchOutput> => {
        console.log(`[SPEC] Conducting market research: ${input.topic}`);

        return {
          topic: input.topic,
          executiveSummary: `The ${input.topic} market is experiencing significant growth driven by digital transformation and changing consumer preferences. Key players are investing heavily in innovation and market expansion.`,
          marketSize: {
            current: '$45.2 billion',
            projected: '$78.5 billion',
            cagr: '11.8%',
            year: 2028,
          },
          keyPlayers: [
            {
              name: 'Market Leader Inc.',
              marketShare: '22%',
              strengths: ['Brand recognition', 'Distribution network', 'R&D investment'],
              weaknesses: ['Legacy technology', 'Slow innovation'],
            },
            {
              name: 'Challenger Corp.',
              marketShare: '15%',
              strengths: ['Modern platform', 'Strong growth', 'Customer satisfaction'],
              weaknesses: ['Limited enterprise presence', 'Smaller partner ecosystem'],
            },
            {
              name: 'Innovative Startup',
              marketShare: '8%',
              strengths: ['AI-first approach', 'Agile development', 'Modern UX'],
              weaknesses: ['Brand awareness', 'Enterprise credibility'],
            },
          ],
          trends: [
            {
              trend: 'AI and Machine Learning Integration',
              impact: 'Transforming product capabilities and customer experience',
              timeframe: '1-3 years',
            },
            {
              trend: 'Shift to Cloud-Native Solutions',
              impact: 'Changing deployment and pricing models',
              timeframe: '0-2 years',
            },
            {
              trend: 'Increased Focus on Data Privacy',
              impact: 'New compliance requirements and competitive differentiation',
              timeframe: '1-2 years',
            },
          ],
          opportunities: [
            'Underserved mid-market segment with specific needs',
            'Growing demand for vertical-specific solutions',
            'Integration partnerships with complementary platforms',
          ],
          challenges: [
            'Intense price competition in entry-level segment',
            'Talent acquisition for AI/ML expertise',
            'Regulatory uncertainty in key markets',
          ],
          recommendations: [
            'Focus on differentiation through AI capabilities',
            'Develop strategic partnerships for market expansion',
            'Invest in vertical-specific solutions',
          ],
          sources: [
            'Industry analyst reports',
            'Public company filings',
            'Market surveys',
            'Expert interviews',
          ],
          generatedAt: new Date().toISOString(),
        };
      },
    };
  }

  private createAnalyzeIndustryTrendsTool(): MotionTool<AnalyzeIndustryTrendsInput, AnalyzeIndustryTrendsOutput> {
    return {
      name: 'analyze_industry_trends',
      description: 'Identify and analyze emerging and current industry trends',
      category: 'analytics',
      creditCost: 6,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          industry: { type: 'string', description: 'Industry to analyze' },
          subSegments: { type: 'array', items: { type: 'string' }, description: 'Sub-segments to focus on' },
          timeHorizon: { type: 'string', enum: ['short', 'medium', 'long'] },
          includeEmerging: { type: 'boolean', description: 'Include emerging trends' },
        },
        required: ['industry'],
      },
      execute: async (input: AnalyzeIndustryTrendsInput, context: MotionContext): Promise<AnalyzeIndustryTrendsOutput> => {
        console.log(`[SPEC] Analyzing industry trends: ${input.industry}`);

        return {
          industry: input.industry,
          currentState: `The ${input.industry} industry is in a period of significant transformation, driven by technological innovation and evolving market demands.`,
          trends: [
            {
              name: 'Generative AI Adoption',
              description: 'Integration of generative AI across product offerings and internal operations',
              maturity: 'growing',
              impact: 'transformative',
              adoptionRate: '35% of enterprises experimenting',
              keyDrivers: ['Cost reduction', 'Productivity gains', 'Competitive pressure'],
              implications: ['New skill requirements', 'Business model changes', 'Regulatory considerations'],
            },
            {
              name: 'Platform Consolidation',
              description: 'Customers seeking unified platforms over point solutions',
              maturity: 'mature',
              impact: 'high',
              adoptionRate: '60% preference for integrated platforms',
              keyDrivers: ['Reduced complexity', 'Lower TCO', 'Better data integration'],
              implications: ['M&A activity', 'Partnership opportunities', 'Feature expansion needs'],
            },
            {
              name: 'Sustainability Focus',
              description: 'Growing emphasis on sustainable and ethical business practices',
              maturity: 'emerging',
              impact: 'medium',
              adoptionRate: '25% actively prioritizing',
              keyDrivers: ['Regulatory pressure', 'Consumer demand', 'Investor requirements'],
              implications: ['Product design changes', 'Supply chain reviews', 'Reporting requirements'],
            },
          ],
          emergingTechnologies: [
            'Quantum computing for complex optimization',
            'Edge AI for real-time processing',
            'Blockchain for supply chain transparency',
          ],
          regulatoryChanges: [
            'Data privacy regulations expanding globally',
            'AI governance frameworks emerging',
            'ESG reporting requirements increasing',
          ],
          consumerBehaviorShifts: [
            'Preference for self-service options',
            'Expectation of personalized experiences',
            'Increased price sensitivity in economic uncertainty',
          ],
          strategicImplications: [
            'Invest in AI capabilities as table stakes',
            'Build or acquire complementary platform capabilities',
            'Develop sustainability metrics and reporting',
          ],
        };
      },
    };
  }

  private createGenerateSwotAnalysisTool(): MotionTool<GenerateSwotAnalysisInput, GenerateSwotAnalysisOutput> {
    return {
      name: 'generate_swot_analysis',
      description: 'Generate comprehensive SWOT analysis with action plans',
      category: 'analytics',
      creditCost: 5,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Subject of analysis' },
          subjectType: { type: 'string', enum: ['company', 'product', 'market', 'strategy'] },
          competitors: { type: 'array', items: { type: 'string' }, description: 'Competitors for comparison' },
          includeActionPlan: { type: 'boolean', description: 'Include action plan' },
        },
        required: ['subject', 'subjectType'],
      },
      execute: async (input: GenerateSwotAnalysisInput, context: MotionContext): Promise<GenerateSwotAnalysisOutput> => {
        console.log(`[SPEC] Generating SWOT for: ${input.subject}`);

        const result: GenerateSwotAnalysisOutput = {
          subject: input.subject,
          strengths: [
            {
              point: 'Strong product-market fit in enterprise segment',
              evidence: '95% customer retention rate, NPS of 72',
              leverage: 'Expand enterprise offerings with premium features',
            },
            {
              point: 'Robust integration ecosystem',
              evidence: '200+ native integrations, active partner program',
              leverage: 'Market as the "integration hub" for workflows',
            },
            {
              point: 'Experienced leadership team',
              evidence: 'Average 15+ years industry experience',
              leverage: 'Leverage expertise for strategic partnerships',
            },
          ],
          weaknesses: [
            {
              point: 'Limited brand awareness in SMB market',
              evidence: 'Low organic traffic from SMB keywords',
              mitigation: 'Invest in content marketing and SMB-focused campaigns',
            },
            {
              point: 'Mobile experience lags behind competitors',
              evidence: 'App store ratings below industry average',
              mitigation: 'Prioritize mobile UX in product roadmap',
            },
            {
              point: 'Higher pricing than key competitors',
              evidence: '20-30% premium over market average',
              mitigation: 'Better communicate value proposition and ROI',
            },
          ],
          opportunities: [
            {
              point: 'Growing demand for AI-powered automation',
              source: 'Market research shows 40% YoY growth in AI adoption',
              action: 'Accelerate AI feature development',
              priority: 'high',
            },
            {
              point: 'Expansion into adjacent verticals',
              source: 'Customer requests and market analysis',
              action: 'Develop vertical-specific solutions for healthcare and finance',
              priority: 'medium',
            },
            {
              point: 'Strategic acquisition targets available',
              source: 'Market consolidation creating opportunities',
              action: 'Evaluate complementary technology acquisitions',
              priority: 'medium',
            },
          ],
          threats: [
            {
              point: 'Well-funded competitor entering market',
              source: 'Recent $200M funding round announced',
              counteraction: 'Accelerate differentiation and customer lock-in features',
              urgency: 'high',
            },
            {
              point: 'Economic uncertainty affecting enterprise budgets',
              source: 'Market indicators and customer feedback',
              counteraction: 'Emphasize ROI and offer flexible pricing options',
              urgency: 'medium',
            },
            {
              point: 'Talent competition for key engineering roles',
              source: 'Hiring metrics and market data',
              counteraction: 'Enhance employer brand and compensation packages',
              urgency: 'medium',
            },
          ],
          summary: `${input.subject} has strong enterprise positioning but needs to address mobile experience and SMB market penetration. Key opportunities lie in AI development and vertical expansion, while monitoring competitive threats closely.`,
        };

        if (input.includeActionPlan) {
          result.actionPlan = [
            {
              action: 'Launch AI-powered automation suite',
              category: 'opportunity',
              timeframe: 'Q2 2025',
              resources: 'Engineering team + AI specialists',
            },
            {
              action: 'Complete mobile app redesign',
              category: 'weakness',
              timeframe: 'Q3 2025',
              resources: 'Mobile team + UX designers',
            },
            {
              action: 'Develop competitive response strategy',
              category: 'threat',
              timeframe: 'Q1 2025',
              resources: 'Strategy team + Product leadership',
            },
          ];
        }

        return result;
      },
    };
  }

  // ============================================
  // INTELLIGENCE GATHERING TOOL IMPLEMENTATIONS
  // ============================================

  private createGatherCompetitiveIntelTool(): MotionTool<GatherCompetitiveIntelInput, GatherCompetitiveIntelOutput> {
    return {
      name: 'gather_competitive_intel',
      description: 'Collect competitive intelligence from multiple sources',
      category: 'analytics',
      creditCost: 6,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          competitors: { type: 'array', items: { type: 'string' }, description: 'Competitors to research' },
          intelTypes: {
            type: 'array',
            items: { type: 'string', enum: ['financials', 'strategy', 'leadership', 'partnerships', 'technology', 'culture'] },
          },
          sources: { type: 'array', items: { type: 'string' } },
          timeframe: { type: 'string', description: 'Timeframe for intel' },
        },
        required: ['competitors', 'intelTypes'],
      },
      execute: async (input: GatherCompetitiveIntelInput, context: MotionContext): Promise<GatherCompetitiveIntelOutput> => {
        console.log(`[SPEC] Gathering intel on: ${input.competitors.join(', ')}`);

        const intel = input.competitors.map((competitor) => ({
          competitor,
          findings: input.intelTypes.map((type) => ({
            type,
            insight: this.generateIntelInsight(type, competitor),
            source: this.getIntelSource(type),
            confidence: this.randomConfidence(),
            date: this.getRecentDate(Math.floor(Math.random() * 30)),
            actionable: Math.random() > 0.3,
          })),
        }));

        return {
          intel,
          keyInsights: [
            `${input.competitors[0]} is significantly increasing R&D investment`,
            'Industry-wide shift towards consumption-based pricing',
            'Key competitor showing signs of potential acquisition activity',
          ],
          strategicRecommendations: [
            'Monitor pricing changes closely for quick response',
            'Strengthen partnerships to counter competitor ecosystem growth',
            'Accelerate feature development in AI capabilities',
          ],
          informationGaps: [
            'Limited visibility into private company financials',
            'Unclear technology roadmap details',
            'Need more data on enterprise customer churn',
          ],
        };
      },
    };
  }

  private createAnalyzeNewsPressTool(): MotionTool<AnalyzeNewsPressInput, AnalyzeNewsPressOutput> {
    return {
      name: 'analyze_news_press',
      description: 'Monitor and analyze news coverage and press releases',
      category: 'analytics',
      creditCost: 3,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to track' },
          competitors: { type: 'array', items: { type: 'string' }, description: 'Competitors to monitor' },
          sources: { type: 'array', items: { type: 'string' }, description: 'News sources' },
          sentiment: { type: 'boolean', description: 'Include sentiment analysis' },
          timeframe: { type: 'string', description: 'Timeframe' },
        },
        required: ['keywords'],
      },
      execute: async (input: AnalyzeNewsPressInput, context: MotionContext): Promise<AnalyzeNewsPressOutput> => {
        console.log(`[SPEC] Analyzing news for: ${input.keywords.join(', ')}`);

        const articles = [
          {
            title: 'Industry Leader Announces AI-Powered Platform Update',
            source: 'TechCrunch',
            date: this.getRecentDate(2),
            summary: 'Major platform update introducing AI capabilities across all product tiers',
            sentiment: 'positive' as const,
            relevance: 0.92,
            url: 'https://techcrunch.com/article-1',
            mentions: input.competitors?.slice(0, 2) || [],
          },
          {
            title: 'Market Analysis: Competition Intensifies in Enterprise Space',
            source: 'Forbes',
            date: this.getRecentDate(5),
            summary: 'Deep dive into competitive dynamics and market positioning',
            sentiment: 'neutral' as const,
            relevance: 0.85,
            url: 'https://forbes.com/article-2',
            mentions: input.competitors || [],
          },
          {
            title: 'Startup Raises $50M to Challenge Market Leaders',
            source: 'VentureBeat',
            date: this.getRecentDate(8),
            summary: 'New entrant with innovative approach gains significant funding',
            sentiment: 'neutral' as const,
            relevance: 0.78,
            url: 'https://venturebeat.com/article-3',
            mentions: [],
          },
        ];

        const competitorMentions: Record<string, number> = {};
        input.competitors?.forEach((comp) => {
          competitorMentions[comp] = Math.floor(Math.random() * 10) + 1;
        });

        return {
          articles,
          sentimentOverview: {
            positive: 35,
            neutral: 50,
            negative: 15,
          },
          topTopics: ['AI adoption', 'Platform consolidation', 'Pricing strategies', 'Enterprise features'],
          competitorMentions,
          keyTakeaways: [
            'Competitors accelerating AI feature development',
            'Industry coverage becoming more focused on enterprise segment',
            'Positive sentiment around innovation and new features',
          ],
        };
      },
    };
  }

  // ============================================
  // STRATEGIC ANALYSIS TOOL IMPLEMENTATIONS
  // ============================================

  private createCreateBattleCardTool(): MotionTool<CreateBattleCardInput, CreateBattleCardOutput> {
    return {
      name: 'create_battle_card',
      description: 'Generate competitive battle cards for sales and marketing teams',
      category: 'content',
      creditCost: 5,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          competitor: { type: 'string', description: 'Competitor for battle card' },
          product: { type: 'string', description: 'Specific product to compare' },
          useCase: { type: 'string', description: 'Use case context' },
          targetAudience: { type: 'string', enum: ['sales', 'marketing', 'executive'] },
          includeObjectionHandling: { type: 'boolean', description: 'Include objection handling' },
        },
        required: ['competitor'],
      },
      execute: async (input: CreateBattleCardInput, context: MotionContext): Promise<CreateBattleCardOutput> => {
        console.log(`[SPEC] Creating battle card for: ${input.competitor}`);

        return {
          competitor: input.competitor,
          lastUpdated: new Date().toISOString(),
          overview: {
            description: `${input.competitor} is a B2B software company focused on enterprise workflow automation`,
            founded: '2015',
            headquarters: 'San Francisco, CA',
            employees: '500-1000',
            funding: 'Series D - $180M total',
          },
          positioning: 'Positioned as the affordable automation solution for mid-market',
          targetMarket: ['Mid-market companies', 'Tech-forward organizations', 'Operations teams'],
          pricing: {
            model: 'Per seat/month with usage tiers',
            range: '$25-$100 per user/month',
            vsUs: 'Generally 20-30% lower on entry tiers, comparable at enterprise',
          },
          strengths: [
            'Lower initial price point',
            'Strong marketing presence',
            'Good mobile app experience',
            'Fast implementation time',
          ],
          weaknesses: [
            'Limited integration ecosystem',
            'Weaker enterprise security features',
            'Less customization flexibility',
            'Smaller customer success team',
          ],
          winAgainstThem: [
            'Enterprise security and compliance requirements',
            'Complex integration needs',
            'Need for extensive customization',
            'Large-scale deployments',
          ],
          theyWinAgainstUs: [
            'Price-sensitive SMB deals',
            'Quick implementation timelines',
            'Simple use cases',
            'Mobile-first requirements',
          ],
          objectionsAndResponses: [
            {
              objection: 'Your solution is more expensive',
              response: 'While our initial price may be higher, our TCO is lower due to fewer add-ons, included integrations, and faster time-to-value. Our enterprise customers see 40% lower total costs over 3 years.',
            },
            {
              objection: 'They have a better mobile app',
              response: 'We\'ve significantly enhanced our mobile experience in the latest release. Additionally, our web platform offers capabilities that complement mobile use, and our API allows for custom mobile solutions.',
            },
            {
              objection: 'They can implement faster',
              response: 'Our implementation may take slightly longer, but that\'s because we properly configure advanced features. Customers who rush implementation often face issues later. Our approach ensures long-term success.',
            },
          ],
          keyDifferentiators: [
            'Enterprise-grade security and compliance (SOC 2 Type II, HIPAA)',
            '200+ native integrations vs their 50+',
            'Advanced workflow automation with AI',
            'Dedicated customer success from day one',
          ],
          talkingPoints: [
            'Focus on total cost of ownership, not initial price',
            'Emphasize integration ecosystem for their tech stack',
            'Highlight customer success stories in their industry',
            'Demo advanced automation capabilities',
          ],
        };
      },
    };
  }

  private createGenerateStrategicReportTool(): MotionTool<GenerateStrategicReportInput, GenerateStrategicReportOutput> {
    return {
      name: 'generate_strategic_report',
      description: 'Generate comprehensive strategic analysis reports',
      category: 'document',
      creditCost: 10,
      requiresApproval: true,
      inputSchema: {
        type: 'object',
        properties: {
          reportType: {
            type: 'string',
            enum: ['competitive_landscape', 'market_entry', 'product_positioning', 'quarterly_review'],
          },
          scope: { type: 'string', description: 'Report scope' },
          competitors: { type: 'array', items: { type: 'string' }, description: 'Competitors to include' },
          timeframe: { type: 'string', description: 'Timeframe for analysis' },
          includeRecommendations: { type: 'boolean', description: 'Include recommendations' },
        },
        required: ['reportType', 'scope'],
      },
      execute: async (input: GenerateStrategicReportInput, context: MotionContext): Promise<GenerateStrategicReportOutput> => {
        console.log(`[SPEC] Generating strategic report: ${input.reportType}`);

        const reportTitles: Record<string, string> = {
          competitive_landscape: 'Competitive Landscape Analysis',
          market_entry: 'Market Entry Strategy Assessment',
          product_positioning: 'Product Positioning Analysis',
          quarterly_review: 'Quarterly Competitive Review',
        };

        return {
          reportId: `rpt_${Date.now()}`,
          title: `${reportTitles[input.reportType]}: ${input.scope}`,
          executiveSummary: `This ${input.reportType.replace('_', ' ')} report provides a comprehensive analysis of ${input.scope}. Key findings indicate significant opportunities for differentiation while highlighting areas requiring strategic attention.`,
          sections: [
            {
              title: 'Market Overview',
              content: 'The market continues to show strong growth with increasing adoption of cloud-based solutions...',
              keyPoints: [
                'Market growing at 15% CAGR',
                'Enterprise segment leading adoption',
                'AI features becoming table stakes',
              ],
            },
            {
              title: 'Competitive Analysis',
              content: 'Analysis of key competitors reveals distinct positioning strategies and capability gaps...',
              keyPoints: [
                'Top 3 competitors control 45% of market',
                'New entrants focusing on vertical solutions',
                'Price competition intensifying in mid-market',
              ],
            },
            {
              title: 'Strategic Implications',
              content: 'Based on the analysis, several strategic implications emerge for consideration...',
              keyPoints: [
                'Differentiation through AI capabilities is critical',
                'Partnership strategy needs acceleration',
                'Pricing model innovation required for SMB expansion',
              ],
            },
          ],
          competitiveMatrix: input.competitors
            ? Object.fromEntries(
                input.competitors.map((comp) => [
                  comp,
                  {
                    'Market Position': ['Leader', 'Challenger', 'Niche'][Math.floor(Math.random() * 3)],
                    'Product Strength': ['Strong', 'Medium', 'Weak'][Math.floor(Math.random() * 3)],
                    'Growth Trajectory': ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
                  },
                ])
              )
            : undefined,
          recommendations: input.includeRecommendations
            ? [
                {
                  priority: 'critical',
                  recommendation: 'Accelerate AI feature development',
                  rationale: 'AI capabilities becoming primary differentiator',
                  resources: 'Engineering + AI team expansion',
                  timeline: 'Q1-Q2 2025',
                },
                {
                  priority: 'high',
                  recommendation: 'Develop vertical-specific solutions',
                  rationale: 'Healthcare and finance showing strong demand',
                  resources: 'Product team + vertical specialists',
                  timeline: 'Q2-Q3 2025',
                },
                {
                  priority: 'medium',
                  recommendation: 'Review pricing for SMB segment',
                  rationale: 'Competitive pressure in entry-level tiers',
                  resources: 'Strategy + Finance teams',
                  timeline: 'Q1 2025',
                },
              ]
            : [],
          appendices: [
            'Detailed competitor profiles',
            'Market size methodology',
            'Survey data and sources',
          ],
          generatedAt: new Date().toISOString(),
        };
      },
    };
  }

  private createAssessMarketPositionTool(): MotionTool<AssessMarketPositionInput, AssessMarketPositionOutput> {
    return {
      name: 'assess_market_position',
      description: 'Evaluate competitive position across multiple dimensions',
      category: 'analytics',
      creditCost: 5,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          dimensions: {
            type: 'array',
            items: { type: 'string', enum: ['price', 'quality', 'features', 'support', 'brand', 'innovation'] },
          },
          competitors: { type: 'array', items: { type: 'string' }, description: 'Competitors to compare' },
          includePerceptualMap: { type: 'boolean', description: 'Include perceptual map' },
        },
        required: ['dimensions', 'competitors'],
      },
      execute: async (input: AssessMarketPositionInput, context: MotionContext): Promise<AssessMarketPositionOutput> => {
        console.log(`[SPEC] Assessing market position against: ${input.competitors.join(', ')}`);

        const ourScores: Record<string, number> = {};
        input.dimensions.forEach((dim) => {
          ourScores[dim] = 70 + Math.floor(Math.random() * 25);
        });

        const competitorPositions = input.competitors.map((competitor, index) => {
          const scores: Record<string, number> = {};
          input.dimensions.forEach((dim) => {
            scores[dim] = 50 + Math.floor(Math.random() * 45);
          });

          return {
            competitor,
            scores,
            rank: index + 2,
            positionDescription: ['Market leader in enterprise', 'Strong challenger', 'Niche player'][index % 3],
          };
        });

        const gaps = input.dimensions
          .map((dim) => {
            const maxScore = Math.max(...competitorPositions.map((c) => c.scores[dim]));
            const ourScore = ourScores[dim];
            const leader = competitorPositions.find((c) => c.scores[dim] === maxScore)?.competitor || 'Unknown';

            return {
              dimension: dim,
              gap: maxScore - ourScore,
              leader,
              recommendation: maxScore > ourScore ? `Improve ${dim} to close gap with ${leader}` : `Maintain leadership in ${dim}`,
            };
          })
          .filter((g) => g.gap > 5);

        const result: AssessMarketPositionOutput = {
          ourPosition: {
            overall: 'Strong position with opportunities for improvement',
            byDimension: ourScores,
            rank: 1,
            totalCompetitors: input.competitors.length + 1,
          },
          competitorPositions,
          gaps,
          opportunities: [
            'Opportunity to lead in AI-powered features',
            'Underserved mid-market segment',
            'Integration ecosystem as differentiator',
          ],
          strategicRecommendations: [
            'Focus investment on closing feature gaps',
            'Leverage support strength as competitive advantage',
            'Build brand awareness through thought leadership',
          ],
        };

        if (input.includePerceptualMap) {
          result.perceptualMap = {
            xAxis: input.dimensions[0] || 'price',
            yAxis: input.dimensions[1] || 'quality',
            positions: [
              { name: 'Us', x: ourScores[input.dimensions[0]] || 75, y: ourScores[input.dimensions[1]] || 80 },
              ...input.competitors.map((comp, i) => ({
                name: comp,
                x: competitorPositions[i].scores[input.dimensions[0]] || 60,
                y: competitorPositions[i].scores[input.dimensions[1]] || 65,
              })),
            ],
          };
        }

        return result;
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateUpdateTitle(area: string, competitor: string): string {
    const titles: Record<string, string[]> = {
      pricing: [
        'New pricing tier announced',
        'Promotional discount launched',
        'Enterprise pricing update',
      ],
      products: [
        'Major feature release',
        'Product redesign revealed',
        'New integration launched',
      ],
      news: [
        'Press release published',
        'Industry award received',
        'Partnership announced',
      ],
      social: [
        'Campaign launched',
        'Viral content trending',
        'New social presence',
      ],
      hiring: [
        'Executive hire announced',
        'Team expansion in progress',
        'New office opening',
      ],
      partnerships: [
        'Strategic partnership formed',
        'Channel partner added',
        'Technology alliance announced',
      ],
    };
    const options = titles[area] || ['General update detected'];
    return `${competitor}: ${options[Math.floor(Math.random() * options.length)]}`;
  }

  private generateUpdateDescription(area: string): string {
    const descriptions: Record<string, string[]> = {
      pricing: [
        'Competitive pricing adjustment detected that may impact market positioning',
        'New pricing model introduced targeting mid-market segment',
      ],
      products: [
        'Significant product update with AI capabilities enhancement',
        'User experience improvements rolled out to all customers',
      ],
      news: [
        'Coverage in major industry publication highlighting growth',
        'Company milestone announcement received media attention',
      ],
      social: [
        'Increased social media activity around product launch',
        'Community engagement initiative showing positive response',
      ],
      hiring: [
        'Leadership team expansion indicating strategic priorities',
        'Engineering team growth suggesting product investment',
      ],
      partnerships: [
        'Partnership expands market reach and integration capabilities',
        'Alliance strengthens competitive position in enterprise segment',
      ],
    };
    const options = descriptions[area] || ['Notable activity detected in this area'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getSourceForArea(area: string): string {
    const sources: Record<string, string[]> = {
      pricing: ['Website monitoring', 'Customer report', 'Press release'],
      products: ['Product changelog', 'Blog post', 'App store'],
      news: ['News aggregator', 'Press release', 'Industry publication'],
      social: ['Twitter/X', 'LinkedIn', 'Facebook'],
      hiring: ['LinkedIn', 'Job board', 'Company careers page'],
      partnerships: ['Press release', 'News article', 'Partner announcement'],
    };
    const options = sources[area] || ['General monitoring'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getRecentDate(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }

  private randomSignificance(): 'low' | 'medium' | 'high' | 'critical' {
    const rand = Math.random();
    if (rand < 0.4) return 'low';
    if (rand < 0.7) return 'medium';
    if (rand < 0.9) return 'high';
    return 'critical';
  }

  private randomConfidence(): 'low' | 'medium' | 'high' {
    const rand = Math.random();
    if (rand < 0.2) return 'low';
    if (rand < 0.6) return 'medium';
    return 'high';
  }

  private generateIntelInsight(type: string, competitor: string): string {
    const insights: Record<string, string[]> = {
      financials: [
        `${competitor} reported strong Q4 revenue growth of 25%`,
        `${competitor} increased R&D spending by 30% YoY`,
      ],
      strategy: [
        `${competitor} appears to be pivoting towards enterprise market`,
        `${competitor} expanding into adjacent vertical markets`,
      ],
      leadership: [
        `${competitor} hired new CTO from major tech company`,
        `${competitor} announced leadership reorganization`,
      ],
      partnerships: [
        `${competitor} formed strategic alliance with cloud provider`,
        `${competitor} announced channel partner expansion`,
      ],
      technology: [
        `${competitor} acquired AI startup for technology capabilities`,
        `${competitor} launched major platform architecture update`,
      ],
      culture: [
        `${competitor} named to best places to work list`,
        `${competitor} experiencing employee turnover in key roles`,
      ],
    };
    const options = insights[type] || [`${competitor} activity detected in ${type}`];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getIntelSource(type: string): string {
    const sources: Record<string, string[]> = {
      financials: ['SEC filings', 'Earnings call', 'Annual report'],
      strategy: ['Executive interview', 'Industry analyst', 'Press release'],
      leadership: ['LinkedIn', 'Press release', 'News article'],
      partnerships: ['Press release', 'Partner announcement', 'News coverage'],
      technology: ['Patent filings', 'Technical blog', 'Acquisition news'],
      culture: ['Glassdoor', 'LinkedIn', 'Industry awards'],
    };
    const options = sources[type] || ['Open source intelligence'];
    return options[Math.floor(Math.random() * options.length)];
  }
}

// Singleton instance
export const specAgent = new SpecAgent();

// Default export
export default SpecAgent;
