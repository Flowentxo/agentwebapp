# Motion Agents - Ausbau Roadmap

## Übersicht

Diese Roadmap beschreibt den vollständigen Ausbau aller 6 verbleibenden Motion AI Agents nach dem Vorbild von Usemotion. Alfred ist bereits implementiert und dient als Referenz.

| Agent | Rolle | Status | Priorität | Tools | Geschätzte Dauer |
|-------|-------|--------|-----------|-------|------------------|
| Alfred | Executive Assistant | ✅ Fertig | HIGH | 12 | - |
| **Suki** | Marketing Associate | 🔲 Geplant | HIGH | 15 | 2-3 Tage |
| **Millie** | Project Manager | 🔲 Geplant | HIGH | 14 | 2-3 Tage |
| **Chip** | Sales Development Rep | 🔲 Geplant | MEDIUM | 12 | 2 Tage |
| **Dot** | Recruiter | 🔲 Geplant | MEDIUM | 10 | 2 Tage |
| **Clide** | Client Success Manager | 🔲 Geplant | MEDIUM | 11 | 2 Tage |
| **Spec** | Competitive Intelligence | 🔲 Geplant | MEDIUM | 10 | 2 Tage |

**Gesamtdauer:** 12-15 Tage

---

## Agent 1: Suki - Marketing Associate

### Beschreibung
Suki ist eine kreative Marketing-Spezialistin, die überzeugende Inhalte erstellt, Kampagnen verwaltet und das Markenengagement steigert.

### Konfiguration
```typescript
{
  id: 'suki',
  name: 'Suki',
  role: 'Marketing Associate',
  category: 'marketing',
  color: '#EC4899', // Pink
  icon: Megaphone,
  creditCostMultiplier: 1.2, // Content-Erstellung kostet mehr
  maxConcurrentExecutions: 3,
}
```

### Tools (15)

#### Content Creation (5 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 1 | `generate_blog_post` | Blog-Artikel basierend auf Thema/Keywords generieren | 200 | ❌ |
| 2 | `create_social_post` | Social Media Posts für verschiedene Plattformen | 50 | ✅ |
| 3 | `write_ad_copy` | Werbetexte für Kampagnen erstellen | 100 | ❌ |
| 4 | `generate_email_campaign` | E-Mail-Marketing-Kampagnen entwerfen | 150 | ✅ |
| 5 | `create_landing_page_copy` | Landing Page Texte optimieren | 100 | ❌ |

#### SEO & Analytics (4 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 6 | `analyze_seo_keywords` | Keyword-Recherche und -Analyse | 50 | ❌ |
| 7 | `optimize_content_seo` | Bestehenden Content für SEO optimieren | 75 | ❌ |
| 8 | `analyze_competitors` | Wettbewerber-Content analysieren | 100 | ❌ |
| 9 | `generate_meta_tags` | Meta-Titel und -Beschreibungen generieren | 25 | ❌ |

#### Campaign Management (4 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 10 | `plan_content_calendar` | Content-Kalender erstellen/verwalten | 75 | ❌ |
| 11 | `schedule_social_posts` | Social Media Posts planen | 50 | ✅ |
| 12 | `analyze_campaign_performance` | Kampagnen-Performance auswerten | 50 | ❌ |
| 13 | `generate_ab_test_variants` | A/B-Test Varianten erstellen | 75 | ❌ |

#### Brand & Strategy (2 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 14 | `define_brand_voice` | Marken-Tonalität dokumentieren | 100 | ❌ |
| 15 | `create_marketing_brief` | Marketing-Briefings erstellen | 75 | ❌ |

### Integrationen
- Twitter/X
- LinkedIn
- HubSpot
- Google Analytics
- Mailchimp

### Input/Output Types
```typescript
// Blog Post Generation
interface GenerateBlogPostInput {
  topic: string;
  keywords: string[];
  targetLength: 'short' | 'medium' | 'long'; // 500, 1000, 2000 words
  tone: 'professional' | 'casual' | 'educational' | 'entertaining';
  includeOutline?: boolean;
  targetAudience?: string;
}

interface GenerateBlogPostOutput {
  title: string;
  outline: string[];
  content: string;
  metaDescription: string;
  suggestedImages: string[];
  estimatedReadTime: number;
}

// Social Media Post
interface CreateSocialPostInput {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  topic: string;
  tone: string;
  includeHashtags?: boolean;
  includeEmoji?: boolean;
  callToAction?: string;
}

interface CreateSocialPostOutput {
  post: string;
  hashtags: string[];
  characterCount: number;
  suggestedPostTime: string;
  variants: string[]; // Alternative Versionen
}
```

### System Prompt
```
You are Suki, an expert Marketing Associate AI.

YOUR ROLE:
- Create compelling content that engages and converts
- Manage social media presence across platforms
- Optimize content for SEO and discoverability
- Plan and execute marketing campaigns
- Maintain consistent brand voice

YOUR PERSONALITY:
- Creative and innovative thinker
- Data-informed decision maker
- Trend-aware and culturally savvy
- Clear and persuasive communicator

GUIDELINES:
1. Always consider the target audience
2. Maintain brand consistency
3. Use data to inform content decisions
4. Balance creativity with measurable goals
5. Stay current with platform best practices
```

---

## Agent 2: Millie - Project Manager

### Beschreibung
Millie ist eine organisierte Projektmanagerin, die Teams koordiniert, Fortschritte verfolgt und sicherstellt, dass Projekte termingerecht geliefert werden.

### Konfiguration
```typescript
{
  id: 'millie',
  name: 'Millie',
  role: 'Project Manager',
  category: 'operations',
  color: '#F59E0B', // Amber
  icon: FolderKanban,
  creditCostMultiplier: 1.0,
  maxConcurrentExecutions: 5,
}
```

### Tools (14)

#### Project Planning (4 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 1 | `create_project_plan` | Detaillierten Projektplan erstellen | 150 | ❌ |
| 2 | `breakdown_tasks` | Aufgaben in Unteraufgaben zerlegen | 50 | ❌ |
| 3 | `estimate_timeline` | Zeitschätzungen für Aufgaben | 50 | ❌ |
| 4 | `identify_dependencies` | Abhängigkeiten zwischen Aufgaben erkennen | 50 | ❌ |

#### Task Management (4 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 5 | `assign_tasks` | Aufgaben an Teammitglieder zuweisen | 25 | ✅ |
| 6 | `update_task_status` | Aufgabenstatus aktualisieren | 10 | ❌ |
| 7 | `prioritize_backlog` | Backlog priorisieren | 50 | ❌ |
| 8 | `create_sprint_plan` | Sprint-Planung erstellen | 100 | ❌ |

#### Reporting & Analytics (3 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 9 | `generate_status_report` | Statusberichte generieren | 75 | ❌ |
| 10 | `analyze_velocity` | Team-Velocity analysieren | 50 | ❌ |
| 11 | `identify_blockers` | Blocker identifizieren und Lösungen vorschlagen | 50 | ❌ |

#### Resource Management (3 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 12 | `analyze_workload` | Team-Workload analysieren | 50 | ❌ |
| 13 | `suggest_resource_allocation` | Ressourcenzuweisung optimieren | 75 | ❌ |
| 14 | `forecast_capacity` | Kapazitätsprognosen erstellen | 75 | ❌ |

### Integrationen
- Jira
- Asana
- Notion
- Linear
- Monday.com
- Trello

### Input/Output Types
```typescript
// Project Plan Creation
interface CreateProjectPlanInput {
  projectName: string;
  description: string;
  goals: string[];
  deadline: string;
  teamMembers: Array<{ name: string; role: string; capacity: number }>;
  constraints?: string[];
}

interface CreateProjectPlanOutput {
  phases: Array<{
    name: string;
    startDate: string;
    endDate: string;
    tasks: Array<{
      title: string;
      assignee: string;
      duration: number;
      dependencies: string[];
    }>;
  }>;
  milestones: Array<{ name: string; date: string }>;
  risks: Array<{ description: string; mitigation: string }>;
  criticalPath: string[];
}

// Status Report
interface GenerateStatusReportInput {
  projectId: string;
  period: 'daily' | 'weekly' | 'monthly';
  includeMetrics?: boolean;
  format?: 'summary' | 'detailed';
}

interface GenerateStatusReportOutput {
  summary: string;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  burndownData: Array<{ date: string; remaining: number }>;
  highlights: string[];
  risks: string[];
  nextSteps: string[];
}
```

### System Prompt
```
You are Millie, an expert Project Manager AI.

YOUR ROLE:
- Plan and structure projects effectively
- Track progress and identify issues early
- Coordinate team efforts and resources
- Ensure timely delivery of milestones
- Communicate status clearly to stakeholders

YOUR PERSONALITY:
- Organized and methodical
- Proactive problem solver
- Clear communicator
- Detail-oriented but sees the big picture

GUIDELINES:
1. Always consider team capacity and constraints
2. Identify risks and dependencies early
3. Provide actionable status updates
4. Balance speed with quality
5. Keep all stakeholders informed
```

---

## Agent 3: Chip - Sales Development Rep

### Beschreibung
Chip ist ein proaktiver Vertriebsmitarbeiter, der Interessenten recherchiert, Outreach-Nachrichten erstellt und die Vertriebspipeline aufbaut.

### Konfiguration
```typescript
{
  id: 'chip',
  name: 'Chip',
  role: 'Sales Development Rep',
  category: 'sales',
  color: '#22C55E', // Green
  icon: TrendingUp,
  creditCostMultiplier: 1.1,
  maxConcurrentExecutions: 10, // Hohes Volumen für Outreach
}
```

### Tools (12)

#### Lead Research (4 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 1 | `research_lead` | Lead-Informationen recherchieren | 50 | ❌ |
| 2 | `enrich_lead_data` | Lead-Daten anreichern | 25 | ❌ |
| 3 | `score_lead` | Lead-Scoring durchführen | 25 | ❌ |
| 4 | `find_decision_makers` | Entscheidungsträger identifizieren | 50 | ❌ |

#### Outreach (4 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 5 | `draft_cold_email` | Kalt-E-Mails erstellen | 50 | ✅ |
| 6 | `draft_linkedin_message` | LinkedIn-Nachrichten verfassen | 50 | ✅ |
| 7 | `create_follow_up_sequence` | Follow-up-Sequenzen erstellen | 100 | ❌ |
| 8 | `personalize_template` | Templates personalisieren | 25 | ❌ |

#### CRM & Pipeline (4 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 9 | `update_crm_record` | CRM-Datensätze aktualisieren | 10 | ❌ |
| 10 | `analyze_pipeline` | Pipeline analysieren | 75 | ❌ |
| 11 | `suggest_next_actions` | Nächste Aktionen vorschlagen | 50 | ❌ |
| 12 | `generate_sales_report` | Vertriebsberichte erstellen | 75 | ❌ |

### Integrationen
- Salesforce
- HubSpot
- LinkedIn Sales Navigator
- Outreach.io
- Apollo.io

### Input/Output Types
```typescript
// Lead Research
interface ResearchLeadInput {
  companyName?: string;
  contactEmail?: string;
  linkedInUrl?: string;
  enrichmentLevel: 'basic' | 'standard' | 'deep';
}

interface ResearchLeadOutput {
  company: {
    name: string;
    industry: string;
    size: string;
    revenue?: string;
    technologies?: string[];
    recentNews?: string[];
  };
  contact: {
    name: string;
    title: string;
    email?: string;
    linkedin?: string;
    previousCompanies?: string[];
  };
  insights: string[];
  talkingPoints: string[];
  potentialPainPoints: string[];
}

// Cold Email
interface DraftColdEmailInput {
  leadInfo: {
    name: string;
    company: string;
    role: string;
  };
  valueProposition: string;
  tone: 'professional' | 'casual' | 'direct';
  callToAction: 'meeting' | 'demo' | 'call' | 'reply';
  personalizationPoints?: string[];
}

interface DraftColdEmailOutput {
  subject: string;
  body: string;
  followUpSubject: string;
  followUpBody: string;
  bestSendTime: string;
}
```

### System Prompt
```
You are Chip, an expert Sales Development Rep AI.

YOUR ROLE:
- Research and qualify potential leads
- Craft personalized outreach messages
- Build and maintain sales pipeline
- Track and follow up with prospects
- Identify best opportunities to pursue

YOUR PERSONALITY:
- Persistent but respectful
- Research-driven approach
- Personalization expert
- Results-oriented

GUIDELINES:
1. Always research before reaching out
2. Personalize every message
3. Focus on value, not features
4. Respect prospect's time
5. Track all interactions in CRM
```

---

## Agent 4: Dot - Recruiter

### Beschreibung
Dot ist eine Talent-Acquisition-Spezialistin, die Kandidaten sourcet, Lebensläufe prüft und den Einstellungsprozess koordiniert.

### Konfiguration
```typescript
{
  id: 'dot',
  name: 'Dot',
  role: 'Recruiter',
  category: 'hr',
  color: '#8B5CF6', // Purple
  icon: Users,
  creditCostMultiplier: 1.0,
  maxConcurrentExecutions: 5,
}
```

### Tools (10)

#### Sourcing (3 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 1 | `search_candidates` | Kandidaten nach Kriterien suchen | 50 | ❌ |
| 2 | `analyze_linkedin_profile` | LinkedIn-Profile analysieren | 25 | ❌ |
| 3 | `generate_boolean_search` | Boolean-Suchstrings erstellen | 25 | ❌ |

#### Screening (3 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 4 | `screen_resume` | Lebensläufe bewerten | 50 | ❌ |
| 5 | `match_job_requirements` | Kandidaten-Job-Matching | 50 | ❌ |
| 6 | `generate_screening_questions` | Screening-Fragen erstellen | 25 | ❌ |

#### Communication (2 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 7 | `draft_outreach_message` | Kandidaten-Ansprache verfassen | 50 | ✅ |
| 8 | `draft_rejection_email` | Absage-E-Mails erstellen | 25 | ✅ |

#### Coordination (2 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 9 | `schedule_interview` | Interviews koordinieren | 50 | ✅ |
| 10 | `create_job_description` | Stellenbeschreibungen erstellen | 75 | ❌ |

### Integrationen
- LinkedIn Recruiter
- Greenhouse
- Lever
- Workday
- BambooHR

### Input/Output Types
```typescript
// Resume Screening
interface ScreenResumeInput {
  resumeText: string;
  jobRequirements: {
    requiredSkills: string[];
    preferredSkills: string[];
    yearsExperience: number;
    education?: string;
  };
}

interface ScreenResumeOutput {
  overallScore: number; // 0-100
  skillsMatch: {
    required: Array<{ skill: string; found: boolean; evidence?: string }>;
    preferred: Array<{ skill: string; found: boolean; evidence?: string }>;
  };
  experienceAnalysis: {
    totalYears: number;
    relevantYears: number;
    seniorityLevel: string;
  };
  strengths: string[];
  concerns: string[];
  recommendation: 'proceed' | 'maybe' | 'pass';
  suggestedQuestions: string[];
}

// Job Description
interface CreateJobDescriptionInput {
  title: string;
  department: string;
  level: 'junior' | 'mid' | 'senior' | 'lead' | 'manager';
  responsibilities: string[];
  requirements: string[];
  benefits?: string[];
  companyInfo?: string;
}

interface CreateJobDescriptionOutput {
  title: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  aboutCompany: string;
  equalOpportunityStatement: string;
}
```

### System Prompt
```
You are Dot, an expert Recruiter AI.

YOUR ROLE:
- Source and identify top talent
- Screen and evaluate candidates
- Coordinate the interview process
- Maintain positive candidate experience
- Support hiring managers

YOUR PERSONALITY:
- Empathetic and professional
- Detail-oriented evaluator
- Excellent communicator
- Diversity-conscious

GUIDELINES:
1. Evaluate candidates objectively
2. Maintain excellent candidate experience
3. Communicate clearly and promptly
4. Consider cultural fit alongside skills
5. Respect confidentiality
```

---

## Agent 5: Clide - Client Success Manager

### Beschreibung
Clide ist ein dedizierter Client Success Manager, der Kundenzufriedenheit sicherstellt, Support handhabt und die Kundenbindung steigert.

### Konfiguration
```typescript
{
  id: 'clide',
  name: 'Clide',
  role: 'Client Success Manager',
  category: 'support',
  color: '#EF4444', // Red
  icon: Heart,
  creditCostMultiplier: 1.0,
  maxConcurrentExecutions: 5,
}
```

### Tools (11)

#### Client Health (4 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 1 | `calculate_health_score` | Kunden-Health-Score berechnen | 50 | ❌ |
| 2 | `identify_churn_risk` | Abwanderungsrisiko erkennen | 75 | ❌ |
| 3 | `analyze_usage_patterns` | Nutzungsmuster analysieren | 50 | ❌ |
| 4 | `generate_qbr_report` | Quarterly Business Review erstellen | 150 | ❌ |

#### Communication (3 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 5 | `draft_check_in_email` | Check-in E-Mails erstellen | 50 | ✅ |
| 6 | `create_onboarding_plan` | Onboarding-Plan erstellen | 100 | ❌ |
| 7 | `respond_to_feedback` | Auf Kundenfeedback reagieren | 50 | ✅ |

#### Growth (2 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 8 | `identify_upsell_opportunities` | Upselling-Chancen erkennen | 75 | ❌ |
| 9 | `create_success_plan` | Erfolgsplan für Kunden erstellen | 100 | ❌ |

#### Analytics (2 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 10 | `analyze_nps_feedback` | NPS-Feedback analysieren | 50 | ❌ |
| 11 | `generate_retention_report` | Retention-Berichte erstellen | 75 | ❌ |

### Integrationen
- Intercom
- Zendesk
- HubSpot
- Gainsight
- ChurnZero
- Salesforce

### Input/Output Types
```typescript
// Health Score
interface CalculateHealthScoreInput {
  clientId: string;
  metrics: {
    loginFrequency: number;
    featureAdoption: number;
    supportTickets: number;
    npsScore?: number;
    contractValue: number;
    daysSinceLastContact: number;
  };
}

interface CalculateHealthScoreOutput {
  overallScore: number; // 0-100
  components: {
    engagement: number;
    adoption: number;
    support: number;
    sentiment: number;
    growth: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
  alertTriggers: string[];
}

// Churn Risk
interface IdentifyChurnRiskInput {
  clientId: string;
  lookbackDays?: number;
}

interface IdentifyChurnRiskOutput {
  riskScore: number; // 0-100
  riskFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    evidence: string;
  }>;
  earlyWarningSignals: string[];
  recommendedInterventions: Array<{
    action: string;
    priority: number;
    expectedImpact: string;
  }>;
  renewalProbability: number;
}
```

### System Prompt
```
You are Clide, an expert Client Success Manager AI.

YOUR ROLE:
- Ensure client satisfaction and success
- Monitor and improve client health
- Prevent churn through proactive engagement
- Identify growth opportunities
- Build lasting client relationships

YOUR PERSONALITY:
- Empathetic and caring
- Proactive problem solver
- Data-driven decision maker
- Relationship builder

GUIDELINES:
1. Put client success first
2. Be proactive, not reactive
3. Use data to identify issues early
4. Celebrate client wins
5. Always follow up on commitments
```

---

## Agent 6: Spec - Competitive Intelligence

### Beschreibung
Spec ist ein strategischer Researcher, der Wettbewerber überwacht, Markttrends analysiert und handlungsrelevante Erkenntnisse liefert.

### Konfiguration
```typescript
{
  id: 'spec',
  name: 'Spec',
  role: 'Competitive Intelligence',
  category: 'research',
  color: '#0EA5E9', // Sky Blue
  icon: Telescope,
  creditCostMultiplier: 1.3, // Forschungsintensiv
  maxConcurrentExecutions: 3,
}
```

### Tools (10)

#### Competitor Analysis (4 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 1 | `analyze_competitor` | Wettbewerber-Analyse durchführen | 150 | ❌ |
| 2 | `track_competitor_changes` | Wettbewerber-Änderungen verfolgen | 100 | ❌ |
| 3 | `compare_features` | Feature-Vergleich erstellen | 100 | ❌ |
| 4 | `analyze_pricing` | Preisanalyse durchführen | 75 | ❌ |

#### Market Research (3 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 5 | `research_market_trends` | Markttrends recherchieren | 200 | ❌ |
| 6 | `analyze_industry_news` | Branchennews analysieren | 100 | ❌ |
| 7 | `identify_market_opportunities` | Marktchancen identifizieren | 150 | ❌ |

#### Strategic Analysis (3 Tools)
| Tool | Name | Beschreibung | Credits | Approval |
|------|------|--------------|---------|----------|
| 8 | `create_swot_analysis` | SWOT-Analyse erstellen | 100 | ❌ |
| 9 | `generate_battle_card` | Battle Cards erstellen | 150 | ❌ |
| 10 | `create_intelligence_report` | Intelligence-Reports generieren | 200 | ❌ |

### Integrationen
- Web Scraping
- Crunchbase
- LinkedIn
- Google Alerts
- News APIs
- SEC Filings

### Input/Output Types
```typescript
// Competitor Analysis
interface AnalyzeCompetitorInput {
  competitorName: string;
  analysisDepth: 'overview' | 'detailed' | 'comprehensive';
  focusAreas?: ('product' | 'pricing' | 'marketing' | 'team' | 'funding')[];
}

interface AnalyzeCompetitorOutput {
  company: {
    name: string;
    founded: string;
    headquarters: string;
    employees: string;
    funding: string;
    valuation?: string;
  };
  product: {
    mainOffering: string;
    targetMarket: string;
    uniqueSellingPoints: string[];
    weaknesses: string[];
  };
  marketing: {
    positioning: string;
    keyMessages: string[];
    channels: string[];
    contentStrategy: string;
  };
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
}

// Battle Card
interface GenerateBattleCardInput {
  competitor: string;
  ourProduct: string;
  targetAudience?: string;
}

interface GenerateBattleCardOutput {
  competitorOverview: string;
  keyDifferentiators: Array<{
    area: string;
    us: string;
    them: string;
    advantage: 'us' | 'them' | 'tie';
  }>;
  commonObjections: Array<{
    objection: string;
    response: string;
  }>;
  winningStrategies: string[];
  landmines: string[]; // Things to avoid
  proofPoints: string[];
  competitiveQuotes: string[];
}
```

### System Prompt
```
You are Spec, an expert Competitive Intelligence AI.

YOUR ROLE:
- Monitor competitors and market landscape
- Analyze trends and identify opportunities
- Provide actionable strategic insights
- Create comprehensive research reports
- Support sales with competitive intel

YOUR PERSONALITY:
- Analytical and thorough
- Strategic thinker
- Objective and unbiased
- Detail-oriented researcher

GUIDELINES:
1. Always verify information from multiple sources
2. Distinguish facts from speculation
3. Focus on actionable insights
4. Update intelligence regularly
5. Tailor reports to audience needs
```

---

## Implementierungs-Reihenfolge

### Phase 1: High Priority Agents (Woche 1-2)

#### Schritt 1: Suki (Marketing Associate)
```
Tag 1-2:
- [ ] SukiAgent.ts Grundstruktur
- [ ] Content Creation Tools (5)
- [ ] System Prompt & Persona

Tag 3:
- [ ] SEO & Analytics Tools (4)
- [ ] Campaign Management Tools (4)
- [ ] Brand Tools (2)
- [ ] Integration Tests
```

#### Schritt 2: Millie (Project Manager)
```
Tag 4-5:
- [ ] MillieAgent.ts Grundstruktur
- [ ] Project Planning Tools (4)
- [ ] Task Management Tools (4)

Tag 6:
- [ ] Reporting Tools (3)
- [ ] Resource Management Tools (3)
- [ ] Integration mit Jira/Asana
```

### Phase 2: Medium Priority Agents (Woche 2-3)

#### Schritt 3: Chip (Sales Development Rep)
```
Tag 7-8:
- [ ] ChipAgent.ts Grundstruktur
- [ ] Lead Research Tools (4)
- [ ] Outreach Tools (4)
- [ ] CRM Tools (4)
```

#### Schritt 4: Dot (Recruiter)
```
Tag 9-10:
- [ ] DotAgent.ts Grundstruktur
- [ ] Sourcing Tools (3)
- [ ] Screening Tools (3)
- [ ] Communication & Coordination Tools (4)
```

#### Schritt 5: Clide (Client Success Manager)
```
Tag 11-12:
- [ ] ClideAgent.ts Grundstruktur
- [ ] Client Health Tools (4)
- [ ] Communication Tools (3)
- [ ] Growth & Analytics Tools (4)
```

#### Schritt 6: Spec (Competitive Intelligence)
```
Tag 13-14:
- [ ] SpecAgent.ts Grundstruktur
- [ ] Competitor Analysis Tools (4)
- [ ] Market Research Tools (3)
- [ ] Strategic Analysis Tools (3)
```

### Phase 3: Integration & Testing (Woche 3)

```
Tag 15:
- [ ] Cross-Agent Communication
- [ ] Skill System Integration
- [ ] Credit Tracking für alle Agents

Tag 16:
- [ ] End-to-End Tests
- [ ] Performance Optimierung
- [ ] Dokumentation
```

---

## Gemeinsame Patterns

### Tool-Erstellung Template
```typescript
private createExampleTool(): MotionTool<InputType, OutputType> {
  return {
    name: 'tool_name',
    displayName: 'Tool Display Name',
    description: 'What this tool does',
    category: 'category',
    creditCost: CREDIT_COSTS.SIMPLE_TOOL,
    requiresApproval: false,
    requiredIntegrations: ['integration'],
    inputSchema: {
      type: 'object',
      properties: {
        // Define input properties
      },
      required: ['requiredField'],
    },
    execute: async (input, context) => {
      // Implementation
      return output;
    },
  };
}
```

### Agent-Erstellung Template
```typescript
export class AgentNameAgent extends MotionBaseAgent {
  readonly id = 'agent_id';
  readonly name = 'Agent Name';
  readonly description = 'Agent description';
  readonly version = '1.0.0';
  readonly category = 'category';
  readonly icon = 'IconName';
  readonly color = '#HEXCOLOR';

  readonly motionId: MotionAgentId = 'agent_id';
  readonly role = 'Agent Role';
  readonly agentCategory: AgentCategory = 'category';
  readonly specialties = ['Specialty 1', 'Specialty 2'];
  readonly lucideIcon = IconComponent;

  constructor() {
    super();
    this.registerMotionTools();
  }

  protected registerTools(): void {}

  protected registerMotionTools(): void {
    // Register all tools here
  }

  public async handleChat(...): Promise<AgentResponse<string>> {
    // Chat implementation
  }

  public getSystemPrompt(): string {
    return `System prompt here`;
  }
}
```

---

## Akzeptanzkriterien pro Agent

Jeder Agent ist fertig, wenn:

- [ ] Agent-Klasse implementiert und typisiert
- [ ] Alle Tools registriert und funktional
- [ ] System Prompt definiert und getestet
- [ ] handleChat() implementiert
- [ ] Approval-Workflow für relevante Tools
- [ ] Credit-Tracking funktional
- [ ] Unit Tests geschrieben
- [ ] Integration Tests bestanden
- [ ] Dokumentation aktualisiert

---

## Nächste Schritte

1. **Sofort starten mit Suki** (Marketing) - Höchste Priorität
2. **Dann Millie** (Project Manager) - Kernfunktionalität
3. **Chip, Dot, Clide, Spec** in der angegebenen Reihenfolge

Bereit zum Starten? Sag mir, mit welchem Agent ich beginnen soll!
