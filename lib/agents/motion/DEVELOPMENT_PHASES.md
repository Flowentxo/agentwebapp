# Motion Agents - Phasen-Entwicklungsplan

## Gesamtübersicht

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MOTION AGENTS ENTWICKLUNGS-ROADMAP                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Phase 1        Phase 2        Phase 3        Phase 4        Phase 5           │
│  Foundation     Core Agents    Sales & HR     Intelligence   Polish            │
│  ─────────     ───────────    ──────────     ────────────   ──────            │
│  [████████]    [░░░░░░░░]     [░░░░░░░░]     [░░░░░░░░]     [░░░░░░░░]        │
│                                                                                 │
│  ✅ Alfred      → Suki         → Chip         → Spec         → Testing         │
│  ✅ Base        → Millie       → Dot          → Analytics    → Optimization    │
│  ✅ DB Schema                  → Clide                       → Documentation   │
│                                                                                 │
│  Woche 1-2      Woche 2-4      Woche 4-6      Woche 6-7      Woche 7-8        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (✅ ABGESCHLOSSEN)

**Status:** Abgeschlossen
**Dauer:** Woche 1-2

### Erledigte Aufgaben

| Task | Status | Datei |
|------|--------|-------|
| Directory Structure | ✅ | `lib/agents/motion/` |
| Config & Types | ✅ | `config.ts`, `shared/types.ts` |
| Constants | ✅ | `shared/constants.ts` |
| MotionBaseAgent | ✅ | `shared/MotionBaseAgent.ts` |
| Database Migration | ✅ | `drizzle/migrations/0011_motion_agents_foundation.sql` |
| Drizzle Schema | ✅ | `lib/db/schema-motion.ts` |
| AlfredAgent | ✅ | `alfred/AlfredAgent.ts` (12 Tools) |

---

## Phase 2: Core Agents (Suki & Millie)

**Status:** Ausstehend
**Dauer:** Woche 2-4
**Priorität:** HIGH

### 2.1 Suki - Marketing Associate

#### Sprint 2.1.1: Grundstruktur (Tag 1)

```
📁 lib/agents/motion/suki/
├── SukiAgent.ts          # Hauptklasse
├── tools/
│   ├── content.ts        # Content Creation Tools
│   ├── seo.ts           # SEO Tools
│   ├── campaigns.ts     # Campaign Tools
│   └── brand.ts         # Brand Tools
├── prompts.ts           # System Prompts
├── types.ts             # Suki-spezifische Types
└── index.ts             # Exports
```

**Tasks:**
- [ ] `SukiAgent.ts` Grundstruktur erstellen
- [ ] Types für alle Tool-Inputs/Outputs definieren
- [ ] System Prompt implementieren
- [ ] Agent in Registry registrieren

#### Sprint 2.1.2: Content Creation Tools (Tag 2)

| # | Tool | Funktion | Credits | Approval |
|---|------|----------|---------|----------|
| 1 | `generate_blog_post` | Blog-Artikel generieren | 200 | ❌ |
| 2 | `create_social_post` | Social Media Posts | 50 | ✅ |
| 3 | `write_ad_copy` | Werbetexte erstellen | 100 | ❌ |
| 4 | `generate_email_campaign` | E-Mail-Kampagnen | 150 | ✅ |
| 5 | `create_landing_page_copy` | Landing Page Texte | 100 | ❌ |

**Implementierungsdetails:**

```typescript
// Tool 1: generate_blog_post
interface GenerateBlogPostInput {
  topic: string;
  keywords: string[];
  targetLength: 'short' | 'medium' | 'long';
  tone: 'professional' | 'casual' | 'educational' | 'entertaining';
  targetAudience?: string;
  includeOutline?: boolean;
  includeCTA?: boolean;
}

interface GenerateBlogPostOutput {
  title: string;
  metaDescription: string;
  outline: string[];
  content: string;
  wordCount: number;
  readingTime: number;
  suggestedTags: string[];
  seoScore: number;
}

// Tool 2: create_social_post
interface CreateSocialPostInput {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'threads';
  topic: string;
  tone: 'professional' | 'casual' | 'humorous' | 'inspirational';
  includeHashtags: boolean;
  includeEmoji: boolean;
  callToAction?: string;
  linkToInclude?: string;
}

interface CreateSocialPostOutput {
  post: string;
  characterCount: number;
  hashtags: string[];
  suggestedImage?: string;
  bestPostingTime: string;
  variants: string[]; // 2-3 alternative Versionen
}

// Tool 3: write_ad_copy
interface WriteAdCopyInput {
  product: string;
  targetAudience: string;
  platform: 'google' | 'facebook' | 'linkedin' | 'display';
  adType: 'search' | 'display' | 'video' | 'carousel';
  uniqueSellingPoints: string[];
  tone: string;
}

interface WriteAdCopyOutput {
  headlines: string[];
  descriptions: string[];
  callToAction: string;
  displayUrl?: string;
  variants: Array<{
    headline: string;
    description: string;
  }>;
}

// Tool 4: generate_email_campaign
interface GenerateEmailCampaignInput {
  campaignGoal: 'nurture' | 'promotion' | 'announcement' | 'reengagement';
  targetAudience: string;
  numberOfEmails: number;
  productOrService: string;
  tone: string;
  includeSubjectVariants: boolean;
}

interface GenerateEmailCampaignOutput {
  campaignName: string;
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
  };
}

// Tool 5: create_landing_page_copy
interface CreateLandingPageCopyInput {
  product: string;
  targetAudience: string;
  primaryGoal: 'signup' | 'purchase' | 'download' | 'contact';
  keyBenefits: string[];
  socialProof?: string[];
  tone: string;
}

interface CreateLandingPageCopyOutput {
  headline: string;
  subheadline: string;
  heroSection: string;
  benefitsSections: Array<{
    title: string;
    description: string;
  }>;
  testimonialSection?: string;
  ctaText: string;
  ctaButtonText: string;
  faqSuggestions: Array<{
    question: string;
    answer: string;
  }>;
}
```

#### Sprint 2.1.3: SEO & Analytics Tools (Tag 3)

| # | Tool | Funktion | Credits | Approval |
|---|------|----------|---------|----------|
| 6 | `analyze_seo_keywords` | Keyword-Recherche | 50 | ❌ |
| 7 | `optimize_content_seo` | Content SEO-Optimierung | 75 | ❌ |
| 8 | `analyze_competitor_content` | Wettbewerber-Content analysieren | 100 | ❌ |
| 9 | `generate_meta_tags` | Meta-Tags generieren | 25 | ❌ |

**Implementierungsdetails:**

```typescript
// Tool 6: analyze_seo_keywords
interface AnalyzeSeoKeywordsInput {
  seedKeywords: string[];
  industry: string;
  targetLocation?: string;
  searchIntent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
}

interface AnalyzeSeoKeywordsOutput {
  primaryKeywords: Array<{
    keyword: string;
    searchVolume: string;
    difficulty: 'low' | 'medium' | 'high';
    intent: string;
  }>;
  longTailKeywords: Array<{
    keyword: string;
    parentKeyword: string;
  }>;
  questions: string[];
  relatedTopics: string[];
  contentGaps: string[];
}

// Tool 7: optimize_content_seo
interface OptimizeContentSeoInput {
  content: string;
  targetKeyword: string;
  secondaryKeywords?: string[];
  contentType: 'blog' | 'product' | 'service' | 'landing';
}

interface OptimizeContentSeoOutput {
  optimizedContent: string;
  seoScore: number;
  improvements: Array<{
    type: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  keywordDensity: Record<string, number>;
  readabilityScore: number;
  suggestedInternalLinks: string[];
}

// Tool 8: analyze_competitor_content
interface AnalyzeCompetitorContentInput {
  competitorUrl?: string;
  competitorContent?: string;
  analysisType: 'seo' | 'messaging' | 'structure' | 'comprehensive';
}

interface AnalyzeCompetitorContentOutput {
  contentStructure: {
    headings: string[];
    wordCount: number;
    mediaCount: number;
  };
  seoAnalysis: {
    targetKeywords: string[];
    metaDescription: string;
    internalLinks: number;
    externalLinks: number;
  };
  messagingAnalysis: {
    tone: string;
    uniqueSellingPoints: string[];
    callToActions: string[];
  };
  recommendations: string[];
  contentGaps: string[];
}

// Tool 9: generate_meta_tags
interface GenerateMetaTagsInput {
  pageTitle: string;
  pageContent: string;
  targetKeyword: string;
  pageType: 'homepage' | 'product' | 'blog' | 'service' | 'landing';
}

interface GenerateMetaTagsOutput {
  title: string;
  titleLength: number;
  metaDescription: string;
  descriptionLength: number;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  canonicalUrl?: string;
  schemaMarkup?: string;
}
```

#### Sprint 2.1.4: Campaign & Brand Tools (Tag 4)

| # | Tool | Funktion | Credits | Approval |
|---|------|----------|---------|----------|
| 10 | `plan_content_calendar` | Content-Kalender planen | 75 | ❌ |
| 11 | `schedule_social_posts` | Posts planen | 50 | ✅ |
| 12 | `analyze_campaign_performance` | Performance analysieren | 50 | ❌ |
| 13 | `generate_ab_test_variants` | A/B-Test Varianten | 75 | ❌ |
| 14 | `define_brand_voice` | Markentonalität definieren | 100 | ❌ |
| 15 | `create_marketing_brief` | Marketing-Brief erstellen | 75 | ❌ |

**Implementierungsdetails:**

```typescript
// Tool 10: plan_content_calendar
interface PlanContentCalendarInput {
  timeframe: 'week' | 'month' | 'quarter';
  contentTypes: ('blog' | 'social' | 'email' | 'video')[];
  themes: string[];
  frequency: Record<string, number>; // z.B. { blog: 2, social: 5 }
  keyDates?: Array<{ date: string; event: string }>;
}

interface PlanContentCalendarOutput {
  calendar: Array<{
    date: string;
    contentType: string;
    title: string;
    theme: string;
    platform?: string;
    notes: string;
  }>;
  themeSummary: Record<string, number>;
  recommendations: string[];
}

// Tool 11: schedule_social_posts (requires approval)
interface ScheduleSocialPostsInput {
  posts: Array<{
    platform: string;
    content: string;
    mediaUrls?: string[];
    scheduledTime?: string;
  }>;
  autoOptimizeTime: boolean;
}

interface ScheduleSocialPostsOutput {
  scheduledPosts: Array<{
    id: string;
    platform: string;
    content: string;
    scheduledTime: string;
    status: 'scheduled' | 'pending_approval';
  }>;
  conflicts: string[];
}

// Tool 12: analyze_campaign_performance
interface AnalyzeCampaignPerformanceInput {
  campaignId?: string;
  metrics: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    spend?: number;
    revenue?: number;
  };
  comparisonPeriod?: 'previous_period' | 'previous_year';
}

interface AnalyzeCampaignPerformanceOutput {
  summary: string;
  kpis: {
    ctr: number;
    conversionRate: number;
    cpc: number;
    cpa: number;
    roas: number;
  };
  trends: Array<{
    metric: string;
    trend: 'up' | 'down' | 'stable';
    change: number;
  }>;
  insights: string[];
  recommendations: string[];
}

// Tool 13: generate_ab_test_variants
interface GenerateAbTestVariantsInput {
  original: string;
  elementType: 'headline' | 'cta' | 'email_subject' | 'ad_copy';
  numberOfVariants: number;
  testHypothesis?: string;
}

interface GenerateAbTestVariantsOutput {
  variants: Array<{
    variant: string;
    label: string;
    hypothesis: string;
    expectedImpact: string;
  }>;
  testingRecommendations: {
    sampleSize: number;
    duration: string;
    primaryMetric: string;
  };
}

// Tool 14: define_brand_voice
interface DefineBrandVoiceInput {
  companyDescription: string;
  targetAudience: string;
  brandValues: string[];
  competitors?: string[];
  existingContent?: string[];
}

interface DefineBrandVoiceOutput {
  voiceSummary: string;
  toneAttributes: Array<{
    attribute: string;
    description: string;
    example: string;
  }>;
  doAndDont: {
    do: string[];
    dont: string[];
  };
  vocabularyGuide: {
    preferred: string[];
    avoid: string[];
  };
  examplePhrases: Record<string, string[]>;
}

// Tool 15: create_marketing_brief
interface CreateMarketingBriefInput {
  projectName: string;
  objective: string;
  targetAudience: string;
  keyMessages: string[];
  deliverables: string[];
  budget?: string;
  timeline?: string;
}

interface CreateMarketingBriefOutput {
  brief: {
    projectOverview: string;
    objectives: string[];
    targetAudience: {
      demographics: string;
      psychographics: string;
      painPoints: string[];
    };
    keyMessages: string[];
    deliverables: Array<{
      item: string;
      specifications: string;
      deadline?: string;
    }>;
    successMetrics: string[];
    budget: string;
    timeline: string;
  };
}
```

#### Sprint 2.1.5: Integration & Test (Tag 5)

- [ ] Alle Tools in SukiAgent registrieren
- [ ] handleChat() implementieren
- [ ] Unit Tests schreiben
- [ ] Integration Tests
- [ ] Agent in motion/index.ts exportieren

---

### 2.2 Millie - Project Manager

#### Sprint 2.2.1: Grundstruktur (Tag 6)

```
📁 lib/agents/motion/millie/
├── MillieAgent.ts        # Hauptklasse
├── tools/
│   ├── planning.ts       # Project Planning Tools
│   ├── tasks.ts          # Task Management Tools
│   ├── reporting.ts      # Reporting Tools
│   └── resources.ts      # Resource Management Tools
├── prompts.ts            # System Prompts
├── types.ts              # Millie-spezifische Types
└── index.ts              # Exports
```

**Tasks:**
- [ ] `MillieAgent.ts` Grundstruktur erstellen
- [ ] Types definieren
- [ ] System Prompt implementieren

#### Sprint 2.2.2: Project Planning Tools (Tag 7)

| # | Tool | Funktion | Credits | Approval |
|---|------|----------|---------|----------|
| 1 | `create_project_plan` | Projektplan erstellen | 150 | ❌ |
| 2 | `breakdown_tasks` | Tasks aufteilen | 50 | ❌ |
| 3 | `estimate_timeline` | Zeitschätzungen | 50 | ❌ |
| 4 | `identify_dependencies` | Abhängigkeiten erkennen | 50 | ❌ |

**Implementierungsdetails:**

```typescript
// Tool 1: create_project_plan
interface CreateProjectPlanInput {
  projectName: string;
  description: string;
  objectives: string[];
  deadline: string;
  teamMembers: Array<{
    name: string;
    role: string;
    availability: number; // Stunden pro Woche
  }>;
  constraints?: string[];
  methodology?: 'agile' | 'waterfall' | 'hybrid';
}

interface CreateProjectPlanOutput {
  projectOverview: {
    name: string;
    startDate: string;
    endDate: string;
    totalDuration: string;
    methodology: string;
  };
  phases: Array<{
    name: string;
    startDate: string;
    endDate: string;
    objectives: string[];
    deliverables: string[];
    tasks: Array<{
      title: string;
      description: string;
      assignee: string;
      duration: string;
      dependencies: string[];
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
  resourceAllocation: Record<string, number>;
  criticalPath: string[];
}

// Tool 2: breakdown_tasks
interface BreakdownTasksInput {
  parentTask: string;
  description: string;
  estimatedEffort?: string;
  maxSubtaskSize?: 'small' | 'medium' | 'large';
}

interface BreakdownTasksOutput {
  subtasks: Array<{
    title: string;
    description: string;
    estimatedHours: number;
    skillsRequired: string[];
    acceptanceCriteria: string[];
  }>;
  totalEstimatedHours: number;
  suggestedOrder: string[];
  dependencies: Array<{
    task: string;
    dependsOn: string[];
  }>;
}

// Tool 3: estimate_timeline
interface EstimateTimelineInput {
  tasks: Array<{
    title: string;
    complexity: 'low' | 'medium' | 'high';
    type: 'development' | 'design' | 'research' | 'review' | 'other';
  }>;
  teamSize: number;
  bufferPercentage?: number;
}

interface EstimateTimelineOutput {
  estimates: Array<{
    task: string;
    optimistic: string;
    realistic: string;
    pessimistic: string;
    recommended: string;
  }>;
  totalDuration: {
    optimistic: string;
    realistic: string;
    pessimistic: string;
  };
  assumptions: string[];
  risks: string[];
}

// Tool 4: identify_dependencies
interface IdentifyDependenciesInput {
  tasks: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}

interface IdentifyDependenciesOutput {
  dependencies: Array<{
    taskId: string;
    dependsOn: string[];
    type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish';
    reasoning: string;
  }>;
  parallelizable: string[];
  criticalPath: string[];
  bottlenecks: string[];
  visualization: string; // Mermaid diagram
}
```

#### Sprint 2.2.3: Task Management Tools (Tag 8)

| # | Tool | Funktion | Credits | Approval |
|---|------|----------|---------|----------|
| 5 | `assign_tasks` | Tasks zuweisen | 25 | ✅ |
| 6 | `update_task_status` | Status aktualisieren | 10 | ❌ |
| 7 | `prioritize_backlog` | Backlog priorisieren | 50 | ❌ |
| 8 | `create_sprint_plan` | Sprint planen | 100 | ❌ |

**Implementierungsdetails:**

```typescript
// Tool 5: assign_tasks (requires approval)
interface AssignTasksInput {
  tasks: Array<{
    taskId: string;
    title: string;
    requiredSkills: string[];
    estimatedHours: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
  teamMembers: Array<{
    name: string;
    skills: string[];
    currentWorkload: number;
    maxCapacity: number;
  }>;
  optimizationGoal: 'balanced' | 'fastest' | 'skill-match';
}

interface AssignTasksOutput {
  assignments: Array<{
    taskId: string;
    taskTitle: string;
    assignee: string;
    reasoning: string;
    skillMatch: number;
  }>;
  workloadDistribution: Record<string, {
    assignedHours: number;
    utilizationRate: number;
  }>;
  unassignedTasks: Array<{
    taskId: string;
    reason: string;
  }>;
  recommendations: string[];
}

// Tool 6: update_task_status
interface UpdateTaskStatusInput {
  taskId: string;
  newStatus: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  progress?: number;
  blockerDescription?: string;
  timeSpent?: number;
}

interface UpdateTaskStatusOutput {
  taskId: string;
  previousStatus: string;
  newStatus: string;
  updatedAt: string;
  impactedTasks: string[];
  notifications: Array<{
    recipient: string;
    message: string;
  }>;
}

// Tool 7: prioritize_backlog
interface PrioritizeBacklogInput {
  items: Array<{
    id: string;
    title: string;
    description: string;
    effort: 'xs' | 's' | 'm' | 'l' | 'xl';
    businessValue?: number;
    requestedBy?: string;
    deadline?: string;
  }>;
  prioritizationMethod: 'moscow' | 'rice' | 'wsjf' | 'value-effort';
  sprintCapacity?: number;
}

interface PrioritizeBacklogOutput {
  prioritizedItems: Array<{
    id: string;
    title: string;
    priority: number;
    score: number;
    reasoning: string;
    category?: 'must' | 'should' | 'could' | 'wont';
  }>;
  recommendedForSprint: string[];
  deferredItems: Array<{
    id: string;
    reason: string;
  }>;
  insights: string[];
}

// Tool 8: create_sprint_plan
interface CreateSprintPlanInput {
  sprintNumber: number;
  duration: number; // Tage
  teamCapacity: Record<string, number>; // Stunden pro Person
  backlogItems: Array<{
    id: string;
    title: string;
    storyPoints: number;
    priority: number;
  }>;
  sprintGoal?: string;
}

interface CreateSprintPlanOutput {
  sprintOverview: {
    number: number;
    startDate: string;
    endDate: string;
    goal: string;
    totalCapacity: number;
    plannedPoints: number;
  };
  selectedItems: Array<{
    id: string;
    title: string;
    storyPoints: number;
    assignee: string;
  }>;
  capacityAllocation: Record<string, {
    allocated: number;
    available: number;
    utilization: number;
  }>;
  risks: string[];
  commitments: string[];
}
```

#### Sprint 2.2.4: Reporting & Resource Tools (Tag 9)

| # | Tool | Funktion | Credits | Approval |
|---|------|----------|---------|----------|
| 9 | `generate_status_report` | Statusberichte | 75 | ❌ |
| 10 | `analyze_velocity` | Velocity analysieren | 50 | ❌ |
| 11 | `identify_blockers` | Blocker identifizieren | 50 | ❌ |
| 12 | `analyze_workload` | Workload analysieren | 50 | ❌ |
| 13 | `suggest_resource_allocation` | Ressourcen optimieren | 75 | ❌ |
| 14 | `forecast_capacity` | Kapazität prognostizieren | 75 | ❌ |

**Implementierungsdetails:**

```typescript
// Tool 9: generate_status_report
interface GenerateStatusReportInput {
  projectId: string;
  reportType: 'daily' | 'weekly' | 'sprint' | 'monthly';
  includeMetrics: boolean;
  audience: 'team' | 'stakeholders' | 'executives';
}

interface GenerateStatusReportOutput {
  report: {
    summary: string;
    period: { start: string; end: string };
    progress: {
      completed: number;
      inProgress: number;
      blocked: number;
      remaining: number;
      percentComplete: number;
    };
    highlights: string[];
    challenges: string[];
    metrics?: {
      velocity: number;
      burndown: Array<{ date: string; remaining: number }>;
      cycleTime: number;
    };
    nextSteps: string[];
    risksAndIssues: string[];
  };
  formattedReport: string; // Markdown-formatiert
}

// Tool 10: analyze_velocity
interface AnalyzeVelocityInput {
  sprints: Array<{
    number: number;
    committed: number;
    completed: number;
    startDate: string;
    endDate: string;
  }>;
}

interface AnalyzeVelocityOutput {
  averageVelocity: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
  reliability: number; // % of commitment met
  sprintAnalysis: Array<{
    sprint: number;
    velocity: number;
    commitmentRatio: number;
    insight: string;
  }>;
  forecast: {
    nextSprint: number;
    confidence: number;
  };
  recommendations: string[];
}

// Tool 11: identify_blockers
interface IdentifyBlockersInput {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    assignee: string;
    daysInStatus: number;
    dependencies: string[];
  }>;
  threshold?: number; // Tage
}

interface IdentifyBlockersOutput {
  blockers: Array<{
    taskId: string;
    taskTitle: string;
    blockerType: 'dependency' | 'resource' | 'technical' | 'external' | 'unclear';
    description: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    suggestedResolution: string;
    escalationNeeded: boolean;
  }>;
  atRiskTasks: string[];
  recommendations: string[];
  prioritizedActions: Array<{
    action: string;
    priority: number;
    owner: string;
  }>;
}

// Tool 12: analyze_workload
interface AnalyzeWorkloadInput {
  teamMembers: Array<{
    name: string;
    capacity: number;
    assignedTasks: Array<{
      title: string;
      estimatedHours: number;
      deadline: string;
    }>;
  }>;
  timeframe: 'week' | 'sprint' | 'month';
}

interface AnalyzeWorkloadOutput {
  teamOverview: {
    totalCapacity: number;
    totalAllocated: number;
    utilizationRate: number;
  };
  memberAnalysis: Array<{
    name: string;
    capacity: number;
    allocated: number;
    utilization: number;
    status: 'underutilized' | 'optimal' | 'overloaded';
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  imbalances: Array<{
    issue: string;
    suggestion: string;
  }>;
  recommendations: string[];
}

// Tool 13: suggest_resource_allocation
interface SuggestResourceAllocationInput {
  project: {
    tasks: Array<{
      id: string;
      title: string;
      requiredSkills: string[];
      estimatedHours: number;
      priority: number;
    }>;
    deadline: string;
  };
  availableResources: Array<{
    name: string;
    skills: string[];
    availableHours: number;
    hourlyRate?: number;
  }>;
  optimizationGoal: 'cost' | 'time' | 'quality' | 'balanced';
}

interface SuggestResourceAllocationOutput {
  allocation: Array<{
    taskId: string;
    resource: string;
    hours: number;
    startDate: string;
    endDate: string;
  }>;
  unallocatedTasks: Array<{
    taskId: string;
    reason: string;
    suggestion: string;
  }>;
  projectedCompletion: string;
  cost?: number;
  risks: string[];
  alternatives: Array<{
    scenario: string;
    tradeoffs: string;
  }>;
}

// Tool 14: forecast_capacity
interface ForecastCapacityInput {
  team: Array<{
    name: string;
    weeklyCapacity: number;
    plannedTimeOff: Array<{ start: string; end: string }>;
  }>;
  forecastPeriod: number; // Wochen
  existingCommitments: Array<{
    hours: number;
    startWeek: number;
    endWeek: number;
  }>;
}

interface ForecastCapacityOutput {
  weeklyForecast: Array<{
    week: number;
    startDate: string;
    totalCapacity: number;
    committed: number;
    available: number;
    byMember: Record<string, number>;
  }>;
  summary: {
    totalAvailable: number;
    peakCapacity: { week: number; hours: number };
    lowestCapacity: { week: number; hours: number };
  };
  recommendations: string[];
  warnings: string[];
}
```

#### Sprint 2.2.5: Integration & Test (Tag 10)

- [ ] Alle Tools in MillieAgent registrieren
- [ ] handleChat() implementieren
- [ ] Unit Tests schreiben
- [ ] Integration Tests
- [ ] Agent in motion/index.ts exportieren

---

## Phase 3: Sales & HR Agents (Chip, Dot, Clide)

**Status:** Ausstehend
**Dauer:** Woche 4-6
**Priorität:** MEDIUM

### 3.1 Chip - Sales Development Rep

#### Sprint 3.1.1: Grundstruktur & Lead Tools (Tag 11-12)

```
📁 lib/agents/motion/chip/
├── ChipAgent.ts
├── tools/
│   ├── research.ts       # Lead Research Tools
│   ├── outreach.ts       # Outreach Tools
│   └── crm.ts           # CRM Tools
├── prompts.ts
├── types.ts
└── index.ts
```

| # | Tool | Sprint | Credits |
|---|------|--------|---------|
| 1 | `research_lead` | 3.1.1 | 50 |
| 2 | `enrich_lead_data` | 3.1.1 | 25 |
| 3 | `score_lead` | 3.1.1 | 25 |
| 4 | `find_decision_makers` | 3.1.1 | 50 |
| 5 | `draft_cold_email` | 3.1.2 | 50 |
| 6 | `draft_linkedin_message` | 3.1.2 | 50 |
| 7 | `create_follow_up_sequence` | 3.1.2 | 100 |
| 8 | `personalize_template` | 3.1.2 | 25 |
| 9 | `update_crm_record` | 3.1.3 | 10 |
| 10 | `analyze_pipeline` | 3.1.3 | 75 |
| 11 | `suggest_next_actions` | 3.1.3 | 50 |
| 12 | `generate_sales_report` | 3.1.3 | 75 |

---

### 3.2 Dot - Recruiter

#### Sprint 3.2.1: Grundstruktur & Sourcing (Tag 13-14)

```
📁 lib/agents/motion/dot/
├── DotAgent.ts
├── tools/
│   ├── sourcing.ts       # Sourcing Tools
│   ├── screening.ts      # Screening Tools
│   └── coordination.ts   # Coordination Tools
├── prompts.ts
├── types.ts
└── index.ts
```

| # | Tool | Sprint | Credits |
|---|------|--------|---------|
| 1 | `search_candidates` | 3.2.1 | 50 |
| 2 | `analyze_linkedin_profile` | 3.2.1 | 25 |
| 3 | `generate_boolean_search` | 3.2.1 | 25 |
| 4 | `screen_resume` | 3.2.2 | 50 |
| 5 | `match_job_requirements` | 3.2.2 | 50 |
| 6 | `generate_screening_questions` | 3.2.2 | 25 |
| 7 | `draft_outreach_message` | 3.2.3 | 50 |
| 8 | `draft_rejection_email` | 3.2.3 | 25 |
| 9 | `schedule_interview` | 3.2.3 | 50 |
| 10 | `create_job_description` | 3.2.3 | 75 |

---

### 3.3 Clide - Client Success Manager

#### Sprint 3.3.1: Grundstruktur & Health Tools (Tag 15-16)

```
📁 lib/agents/motion/clide/
├── ClideAgent.ts
├── tools/
│   ├── health.ts         # Client Health Tools
│   ├── communication.ts  # Communication Tools
│   └── growth.ts         # Growth Tools
├── prompts.ts
├── types.ts
└── index.ts
```

| # | Tool | Sprint | Credits |
|---|------|--------|---------|
| 1 | `calculate_health_score` | 3.3.1 | 50 |
| 2 | `identify_churn_risk` | 3.3.1 | 75 |
| 3 | `analyze_usage_patterns` | 3.3.1 | 50 |
| 4 | `generate_qbr_report` | 3.3.1 | 150 |
| 5 | `draft_check_in_email` | 3.3.2 | 50 |
| 6 | `create_onboarding_plan` | 3.3.2 | 100 |
| 7 | `respond_to_feedback` | 3.3.2 | 50 |
| 8 | `identify_upsell_opportunities` | 3.3.3 | 75 |
| 9 | `create_success_plan` | 3.3.3 | 100 |
| 10 | `analyze_nps_feedback` | 3.3.3 | 50 |
| 11 | `generate_retention_report` | 3.3.3 | 75 |

---

## Phase 4: Intelligence Agent (Spec)

**Status:** Ausstehend
**Dauer:** Woche 6-7
**Priorität:** MEDIUM

### 4.1 Spec - Competitive Intelligence

#### Sprint 4.1.1: Grundstruktur & Competitor Tools (Tag 17-18)

```
📁 lib/agents/motion/spec/
├── SpecAgent.ts
├── tools/
│   ├── competitors.ts    # Competitor Analysis Tools
│   ├── market.ts         # Market Research Tools
│   └── strategy.ts       # Strategic Analysis Tools
├── prompts.ts
├── types.ts
└── index.ts
```

| # | Tool | Sprint | Credits |
|---|------|--------|---------|
| 1 | `analyze_competitor` | 4.1.1 | 150 |
| 2 | `track_competitor_changes` | 4.1.1 | 100 |
| 3 | `compare_features` | 4.1.1 | 100 |
| 4 | `analyze_pricing` | 4.1.1 | 75 |
| 5 | `research_market_trends` | 4.1.2 | 200 |
| 6 | `analyze_industry_news` | 4.1.2 | 100 |
| 7 | `identify_market_opportunities` | 4.1.2 | 150 |
| 8 | `create_swot_analysis` | 4.1.3 | 100 |
| 9 | `generate_battle_card` | 4.1.3 | 150 |
| 10 | `create_intelligence_report` | 4.1.3 | 200 |

---

## Phase 5: Polish & Integration

**Status:** Ausstehend
**Dauer:** Woche 7-8
**Priorität:** HIGH

### 5.1 Cross-Agent Features

#### Sprint 5.1.1: Multi-Agent Coordination (Tag 19)

- [ ] Agent-zu-Agent Kommunikation
- [ ] Shared Context zwischen Agents
- [ ] Workflow-Übergaben (z.B. Chip → Clide)
- [ ] Unified Dashboard Data

#### Sprint 5.1.2: Skill System Integration (Tag 20)

- [ ] Skill-Definitionen für jeden Agent
- [ ] Scheduled Skills (Cron-Jobs)
- [ ] Event-triggered Skills
- [ ] Skill-Templates

### 5.2 Testing & QA

#### Sprint 5.2.1: Unit Tests (Tag 21)

```
📁 lib/agents/motion/__tests__/
├── alfred.test.ts
├── suki.test.ts
├── millie.test.ts
├── chip.test.ts
├── dot.test.ts
├── clide.test.ts
├── spec.test.ts
└── integration.test.ts
```

- [ ] Tool-Unit-Tests für jeden Agent
- [ ] Input-Validierung Tests
- [ ] Error-Handling Tests
- [ ] Credit-Calculation Tests

#### Sprint 5.2.2: Integration Tests (Tag 22)

- [ ] Agent-Chat-Flow Tests
- [ ] Multi-Tool-Execution Tests
- [ ] Approval-Workflow Tests
- [ ] Cross-Agent Tests

### 5.3 Performance & Optimization

#### Sprint 5.3.1: Optimierung (Tag 23)

- [ ] Response-Zeit Optimierung
- [ ] Token-Optimierung in Prompts
- [ ] Caching-Strategien
- [ ] Rate-Limiting Feintuning

### 5.4 Documentation

#### Sprint 5.4.1: Dokumentation (Tag 24)

- [ ] API-Dokumentation für jeden Agent
- [ ] Tool-Referenz
- [ ] Integration Guide
- [ ] Best Practices

---

## Gesamtübersicht: Tool-Matrix

| Agent | Tools | Approval-Tools | Integrations |
|-------|-------|----------------|--------------|
| Alfred | 12 | 4 | Gmail, Calendar, Slack |
| Suki | 15 | 2 | Twitter, LinkedIn, HubSpot |
| Millie | 14 | 1 | Jira, Asana, Notion |
| Chip | 12 | 2 | Salesforce, HubSpot, LinkedIn |
| Dot | 10 | 3 | LinkedIn, Greenhouse, Lever |
| Clide | 11 | 2 | Intercom, Zendesk, HubSpot |
| Spec | 10 | 0 | Web, Crunchbase, LinkedIn |
| **Total** | **84** | **14** | - |

---

## Zeitplan-Übersicht

```
Woche 1-2:  ████████████████████ Phase 1: Foundation (DONE)
Woche 2-3:  ░░░░░░░░░░░░░░░░░░░░ Phase 2.1: Suki
Woche 3-4:  ░░░░░░░░░░░░░░░░░░░░ Phase 2.2: Millie
Woche 4-5:  ░░░░░░░░░░░░░░░░░░░░ Phase 3.1: Chip
Woche 5:    ░░░░░░░░░░░░░░░░░░░░ Phase 3.2: Dot
Woche 5-6:  ░░░░░░░░░░░░░░░░░░░░ Phase 3.3: Clide
Woche 6-7:  ░░░░░░░░░░░░░░░░░░░░ Phase 4: Spec
Woche 7-8:  ░░░░░░░░░░░░░░░░░░░░ Phase 5: Polish
```

---

## Checkliste pro Agent

Für jeden Agent müssen folgende Punkte erfüllt sein:

### Code
- [ ] Agent-Klasse implementiert
- [ ] Alle Tools registriert
- [ ] System Prompt definiert
- [ ] handleChat() funktional
- [ ] getSystemPrompt() definiert
- [ ] Types vollständig

### Qualität
- [ ] Input-Validierung
- [ ] Error-Handling
- [ ] Credit-Tracking
- [ ] Approval-Workflow (wo nötig)
- [ ] Unit Tests
- [ ] Integration Tests

### Integration
- [ ] In Registry registriert
- [ ] Exports in index.ts
- [ ] API-Endpunkte funktional
- [ ] Frontend-Komponenten

### Dokumentation
- [ ] Tool-Beschreibungen
- [ ] Input/Output Schemas
- [ ] Beispiel-Nutzungen
- [ ] Integration Guide

---

## Nächster Schritt

**Bereit für Phase 2.1: Suki (Marketing Associate)**

Soll ich mit der Implementierung von Suki beginnen?
