/**
 * AI Standup Generator - Automated Status Reports
 *
 * Features:
 * - Aggregates activity from multiple sources
 * - Filters noise (minor updates)
 * - Generates structured reports
 * - Supports multiple formats
 */

import { modelRouter } from './ModelRouter';
import { getDb } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface StandupConfig {
  timeRange: '24h' | '48h' | '1w' | 'custom';
  customStartDate?: Date;
  customEndDate?: Date;
  sources: ('tasks' | 'documents' | 'meetings' | 'ideas' | 'messages')[];
  format: 'bullets' | 'narrative' | 'structured' | 'slack';
  filters: {
    projects?: string[];
    users?: string[];
    excludeMinor: boolean;
    minImportance?: number;
  };
  language: 'de' | 'en';
}

export interface ActivityItem {
  type: 'task' | 'document' | 'meeting' | 'idea' | 'message';
  title: string;
  description: string;
  status?: string;
  timestamp: Date;
  user?: string;
  project?: string;
  importance: 'low' | 'medium' | 'high';
  metadata?: Record<string, unknown>;
}

export interface StandupReport {
  summary: string;
  highlights: {
    completed: string[];
    inProgress: string[];
    blocked: string[];
    upcoming: string[];
  };
  sections: {
    title: string;
    items: string[];
  }[];
  metrics: {
    tasksCompleted: number;
    documentsCreated: number;
    meetingsHeld: number;
    ideasGenerated: number;
    messagesExchanged: number;
  };
  timeRange: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  format: string;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: StandupConfig = {
  timeRange: '24h',
  sources: ['tasks', 'documents', 'meetings', 'ideas'],
  format: 'structured',
  filters: {
    excludeMinor: true,
    minImportance: 1
  },
  language: 'de'
};

// ============================================
// STANDUP GENERATOR SERVICE
// ============================================

export class StandupGeneratorService {
  private static instance: StandupGeneratorService;
  private db = getDb();

  private constructor() {
    console.log('[StandupGenerator] Initialized');
  }

  public static getInstance(): StandupGeneratorService {
    if (!StandupGeneratorService.instance) {
      StandupGeneratorService.instance = new StandupGeneratorService();
    }
    return StandupGeneratorService.instance;
  }

  /**
   * Generate a standup report
   */
  public async generateStandup(
    workspaceId: string,
    userId: string,
    config: Partial<StandupConfig> = {}
  ): Promise<StandupReport> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const { start, end } = this.getTimeRange(finalConfig);

    // Collect activities from all sources
    const activities: ActivityItem[] = [];

    for (const source of finalConfig.sources) {
      const sourceActivities = await this.collectActivities(
        source,
        workspaceId,
        userId,
        start,
        end,
        finalConfig.filters
      );
      activities.push(...sourceActivities);
    }

    // Sort by timestamp
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Filter minor activities if configured
    const filteredActivities = finalConfig.filters.excludeMinor
      ? activities.filter(a => a.importance !== 'low')
      : activities;

    // Calculate metrics
    const metrics = this.calculateMetrics(activities);

    // Generate report using AI
    const report = await this.generateReport(
      filteredActivities,
      metrics,
      finalConfig,
      { start, end }
    );

    return report;
  }

  /**
   * Generate team standup (aggregated)
   */
  public async generateTeamStandup(
    workspaceId: string,
    teamUserIds: string[],
    config: Partial<StandupConfig> = {}
  ): Promise<StandupReport> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const { start, end } = this.getTimeRange(finalConfig);

    const allActivities: ActivityItem[] = [];

    for (const userId of teamUserIds) {
      for (const source of finalConfig.sources) {
        const activities = await this.collectActivities(
          source,
          workspaceId,
          userId,
          start,
          end,
          finalConfig.filters
        );
        allActivities.push(...activities);
      }
    }

    // Sort and filter
    allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const filteredActivities = finalConfig.filters.excludeMinor
      ? allActivities.filter(a => a.importance !== 'low')
      : allActivities;

    const metrics = this.calculateMetrics(allActivities);

    return this.generateReport(
      filteredActivities,
      metrics,
      finalConfig,
      { start, end }
    );
  }

  // ============================================
  // ACTIVITY COLLECTION
  // ============================================

  private async collectActivities(
    source: StandupConfig['sources'][number],
    workspaceId: string,
    userId: string,
    start: Date,
    end: Date,
    filters: StandupConfig['filters']
  ): Promise<ActivityItem[]> {
    switch (source) {
      case 'tasks':
        return this.collectTaskActivities(workspaceId, userId, start, end);
      case 'documents':
        return this.collectDocumentActivities(workspaceId, userId, start, end);
      case 'meetings':
        return this.collectMeetingActivities(workspaceId, userId, start, end);
      case 'ideas':
        return this.collectIdeaActivities(workspaceId, userId, start, end);
      case 'messages':
        return this.collectMessageActivities(workspaceId, userId, start, end);
      default:
        return [];
    }
  }

  private async collectTaskActivities(
    workspaceId: string,
    userId: string,
    start: Date,
    end: Date
  ): Promise<ActivityItem[]> {
    try {
      // Query workflow executions as proxy for tasks
      const results = await this.db.execute(sql`
        SELECT
          id,
          workflow_id as title,
          status,
          created_at,
          updated_at,
          result
        FROM workflow_executions
        WHERE created_at >= ${start}
          AND created_at <= ${end}
        ORDER BY created_at DESC
        LIMIT 50
      `);

      const rows = results as unknown as Array<{
        id: string;
        title: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        result?: unknown;
      }>;

      return rows.map(row => ({
        type: 'task' as const,
        title: row.title || 'Workflow Execution',
        description: `Status: ${row.status}`,
        status: row.status,
        timestamp: row.updated_at || row.created_at,
        importance: row.status === 'completed' ? 'high' as const : 'medium' as const,
        metadata: { id: row.id }
      }));
    } catch (err) {
      console.log('[StandupGenerator] Tasks table not available');
      return [];
    }
  }

  private async collectDocumentActivities(
    workspaceId: string,
    userId: string,
    start: Date,
    end: Date
  ): Promise<ActivityItem[]> {
    try {
      const results = await this.db.execute(sql`
        SELECT
          id,
          title,
          status,
          created_at,
          updated_at,
          metadata
        FROM brain_documents
        WHERE workspace_id = ${workspaceId}
          AND (created_at >= ${start} OR updated_at >= ${start})
          AND (created_at <= ${end} OR updated_at <= ${end})
        ORDER BY updated_at DESC
        LIMIT 30
      `);

      const rows = results as unknown as Array<{
        id: string;
        title: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        metadata?: Record<string, unknown>;
      }>;

      return rows.map(row => {
        const isNew = row.created_at >= start;
        return {
          type: 'document' as const,
          title: row.title,
          description: isNew ? 'Neues Dokument erstellt' : 'Dokument aktualisiert',
          status: row.status,
          timestamp: row.updated_at || row.created_at,
          importance: row.status === 'published' ? 'high' as const : 'medium' as const,
          metadata: { id: row.id, ...row.metadata }
        };
      });
    } catch (err) {
      console.log('[StandupGenerator] Documents table not available');
      return [];
    }
  }

  private async collectMeetingActivities(
    workspaceId: string,
    userId: string,
    start: Date,
    end: Date
  ): Promise<ActivityItem[]> {
    try {
      const results = await this.db.execute(sql`
        SELECT
          id,
          title,
          start_time,
          end_time,
          status,
          attendees
        FROM calendar_events
        WHERE user_id = ${userId}
          AND start_time >= ${start}
          AND start_time <= ${end}
        ORDER BY start_time DESC
        LIMIT 20
      `);

      const rows = results as unknown as Array<{
        id: string;
        title: string;
        start_time: Date;
        end_time: Date;
        status: string;
        attendees?: unknown[];
      }>;

      return rows.map(row => ({
        type: 'meeting' as const,
        title: row.title,
        description: `Meeting ${row.status === 'confirmed' ? 'stattgefunden' : 'geplant'}`,
        status: row.status,
        timestamp: row.start_time,
        importance: 'high' as const,
        metadata: {
          id: row.id,
          attendeeCount: Array.isArray(row.attendees) ? row.attendees.length : 0
        }
      }));
    } catch (err) {
      console.log('[StandupGenerator] Calendar events table not available');
      return [];
    }
  }

  private async collectIdeaActivities(
    workspaceId: string,
    userId: string,
    start: Date,
    end: Date
  ): Promise<ActivityItem[]> {
    try {
      const results = await this.db.execute(sql`
        SELECT
          id,
          title,
          description,
          category,
          status,
          votes_up,
          created_at
        FROM brain_business_ideas
        WHERE user_id = ${userId}
          AND created_at >= ${start}
          AND created_at <= ${end}
        ORDER BY created_at DESC
        LIMIT 20
      `);

      const rows = results as unknown as Array<{
        id: string;
        title: string;
        description: string;
        category: string;
        status: string;
        votes_up: number;
        created_at: Date;
      }>;

      return rows.map(row => ({
        type: 'idea' as const,
        title: row.title,
        description: row.description.slice(0, 100),
        status: row.status,
        timestamp: row.created_at,
        importance: row.votes_up > 0 ? 'high' as const : 'medium' as const,
        metadata: { id: row.id, category: row.category, votes: row.votes_up }
      }));
    } catch (err) {
      console.log('[StandupGenerator] Ideas table not available');
      return [];
    }
  }

  private async collectMessageActivities(
    workspaceId: string,
    userId: string,
    start: Date,
    end: Date
  ): Promise<ActivityItem[]> {
    try {
      const results = await this.db.execute(sql`
        SELECT
          agent_id,
          COUNT(*) as message_count,
          MAX(created_at) as last_message
        FROM agent_messages
        WHERE user_id = ${userId}
          AND created_at >= ${start}
          AND created_at <= ${end}
        GROUP BY agent_id
      `);

      const rows = results as unknown as Array<{
        agent_id: string;
        message_count: number;
        last_message: Date;
      }>;

      return rows.map(row => ({
        type: 'message' as const,
        title: `Konversation mit ${row.agent_id}`,
        description: `${row.message_count} Nachrichten ausgetauscht`,
        timestamp: row.last_message,
        importance: row.message_count > 10 ? 'high' as const : 'low' as const,
        metadata: { agentId: row.agent_id, count: row.message_count }
      }));
    } catch (err) {
      console.log('[StandupGenerator] Messages table not available');
      return [];
    }
  }

  // ============================================
  // REPORT GENERATION
  // ============================================

  private async generateReport(
    activities: ActivityItem[],
    metrics: StandupReport['metrics'],
    config: StandupConfig,
    timeRange: { start: Date; end: Date }
  ): Promise<StandupReport> {
    // Categorize activities
    const completed = activities.filter(a =>
      a.status === 'completed' || a.status === 'published' || a.status === 'confirmed'
    );
    const inProgress = activities.filter(a =>
      a.status === 'running' || a.status === 'in_review' || a.status === 'draft'
    );
    const blocked = activities.filter(a =>
      a.status === 'blocked' || a.status === 'failed'
    );

    // Build activity summary for AI
    const activitySummary = activities.slice(0, 20).map(a =>
      `- [${a.type.toUpperCase()}] ${a.title}: ${a.description}`
    ).join('\n');

    // Generate AI summary
    const aiPrompt = config.language === 'de'
      ? `Erstelle einen professionellen Standup-Bericht basierend auf diesen Aktivitäten:

${activitySummary}

Metriken:
- Abgeschlossene Tasks: ${metrics.tasksCompleted}
- Erstellte Dokumente: ${metrics.documentsCreated}
- Meetings: ${metrics.meetingsHeld}
- Generierte Ideen: ${metrics.ideasGenerated}

Schreibe einen kurzen, prägnanten Bericht im ${config.format === 'bullets' ? 'Aufzählungs' : config.format === 'narrative' ? 'Fließtext' : 'strukturierten'}-Format.
Fokussiere auf die wichtigsten Erfolge und nächsten Schritte.`
      : `Create a professional standup report based on these activities:

${activitySummary}

Metrics:
- Completed Tasks: ${metrics.tasksCompleted}
- Documents Created: ${metrics.documentsCreated}
- Meetings: ${metrics.meetingsHeld}
- Ideas Generated: ${metrics.ideasGenerated}

Write a concise report in ${config.format} format.
Focus on key achievements and next steps.`;

    const aiResult = await modelRouter.generate(
      'You are a professional project status reporter. Create clear, actionable standup reports.',
      aiPrompt,
      { preferSpeed: true }
    );

    // Build highlights
    const highlights = {
      completed: completed.slice(0, 5).map(a => a.title),
      inProgress: inProgress.slice(0, 5).map(a => a.title),
      blocked: blocked.slice(0, 3).map(a => a.title),
      upcoming: [] as string[]
    };

    // Build sections by type
    const sections: StandupReport['sections'] = [];

    const typeGroups = this.groupByType(activities);
    for (const [type, items] of Object.entries(typeGroups)) {
      if (items.length > 0) {
        sections.push({
          title: this.getTypeName(type, config.language),
          items: items.slice(0, 5).map(i => `${i.title} - ${i.description}`)
        });
      }
    }

    return {
      summary: aiResult.content,
      highlights,
      sections,
      metrics,
      timeRange,
      generatedAt: new Date(),
      format: config.format
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private getTimeRange(config: StandupConfig): { start: Date; end: Date } {
    const end = new Date();
    let start: Date;

    switch (config.timeRange) {
      case '24h':
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '48h':
        start = new Date(end.getTime() - 48 * 60 * 60 * 1000);
        break;
      case '1w':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        start = config.customStartDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  private calculateMetrics(activities: ActivityItem[]): StandupReport['metrics'] {
    return {
      tasksCompleted: activities.filter(a => a.type === 'task' && a.status === 'completed').length,
      documentsCreated: activities.filter(a => a.type === 'document').length,
      meetingsHeld: activities.filter(a => a.type === 'meeting').length,
      ideasGenerated: activities.filter(a => a.type === 'idea').length,
      messagesExchanged: activities.filter(a => a.type === 'message')
        .reduce((sum, a) => sum + ((a.metadata as Record<string, number>)?.count || 1), 0)
    };
  }

  private groupByType(activities: ActivityItem[]): Record<string, ActivityItem[]> {
    const groups: Record<string, ActivityItem[]> = {};

    for (const activity of activities) {
      if (!groups[activity.type]) {
        groups[activity.type] = [];
      }
      groups[activity.type].push(activity);
    }

    return groups;
  }

  private getTypeName(type: string, language: 'de' | 'en'): string {
    const names: Record<string, Record<'de' | 'en', string>> = {
      task: { de: 'Aufgaben', en: 'Tasks' },
      document: { de: 'Dokumente', en: 'Documents' },
      meeting: { de: 'Meetings', en: 'Meetings' },
      idea: { de: 'Ideen', en: 'Ideas' },
      message: { de: 'Kommunikation', en: 'Communication' }
    };

    return names[type]?.[language] || type;
  }
}

export const standupGenerator = StandupGeneratorService.getInstance();
