/**
 * Analytics Integration Services
 *
 * Provides comprehensive API access for:
 * - Google Analytics (already partially in Google service, extended here)
 * - Mixpanel (events, users, funnels, retention)
 * - Hotjar (surveys, feedback, heatmaps)
 */

import { BaseIntegrationService, ApiError } from './base-service';

// ============================================================================
// GOOGLE ANALYTICS SERVICE (Extended)
// ============================================================================

export interface GAProperty {
  name: string;
  createTime: string;
  updateTime: string;
  parent: string;
  displayName: string;
  industryCategory: string;
  timeZone: string;
  currencyCode: string;
  serviceLevel: 'GOOGLE_ANALYTICS_STANDARD' | 'GOOGLE_ANALYTICS_360';
  deleteTime?: string;
  expireTime?: string;
  account: string;
}

export interface GADataStream {
  name: string;
  type: 'WEB_DATA_STREAM' | 'ANDROID_APP_DATA_STREAM' | 'IOS_APP_DATA_STREAM';
  displayName: string;
  createTime: string;
  updateTime: string;
  webStreamData?: {
    measurementId: string;
    firebaseAppId?: string;
    defaultUri: string;
  };
  androidAppStreamData?: {
    firebaseAppId: string;
    packageName: string;
  };
  iosAppStreamData?: {
    firebaseAppId: string;
    bundleId: string;
  };
}

export interface GAReportRequest {
  property: string;
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  dimensionFilter?: any;
  metricFilter?: any;
  offset?: number;
  limit?: number;
  orderBys?: Array<{
    dimension?: { dimensionName: string; orderType?: 'ALPHANUMERIC' | 'CASE_INSENSITIVE_ALPHANUMERIC' | 'NUMERIC' };
    metric?: { metricName: string };
    desc?: boolean;
  }>;
}

export interface GAReportResponse {
  dimensionHeaders: Array<{ name: string }>;
  metricHeaders: Array<{ name: string; type: string }>;
  rows: Array<{
    dimensionValues: Array<{ value: string }>;
    metricValues: Array<{ value: string }>;
  }>;
  rowCount: number;
  metadata: {
    currencyCode: string;
    timeZone: string;
  };
}

export interface GARealTimeData {
  dimensionHeaders: Array<{ name: string }>;
  metricHeaders: Array<{ name: string; type: string }>;
  rows: Array<{
    dimensionValues: Array<{ value: string }>;
    metricValues: Array<{ value: string }>;
  }>;
  rowCount: number;
}

class GoogleAnalyticsService extends BaseIntegrationService {
  constructor() {
    super('google_analytics', 'https://analyticsdata.googleapis.com/v1beta');
  }

  protected parsePaginatedResponse<T>(response: any): { items: T[]; nextCursor?: string } {
    return {
      items: response.properties || response.dataStreams || response.rows || [],
      nextCursor: response.nextPageToken,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.listProperties(userId);
      return true;
    } catch {
      return false;
    }
  }

  // ============ Admin API ============

  async listProperties(
    userId: string,
    options: { pageSize?: number; pageToken?: string } = {}
  ): Promise<{ properties: GAProperty[]; nextPageToken?: string }> {
    const params = new URLSearchParams();
    params.set('pageSize', (options.pageSize || 200).toString());
    if (options.pageToken) params.set('pageToken', options.pageToken);

    // Use Admin API for properties
    const baseUrl = 'https://analyticsadmin.googleapis.com/v1beta';
    return this.request(userId, `/accounts/-/properties?${params.toString()}`, {}, baseUrl);
  }

  async getProperty(userId: string, propertyId: string): Promise<GAProperty> {
    const baseUrl = 'https://analyticsadmin.googleapis.com/v1beta';
    return this.request(userId, `/properties/${propertyId}`, {}, baseUrl);
  }

  async listDataStreams(
    userId: string,
    propertyId: string,
    options: { pageSize?: number; pageToken?: string } = {}
  ): Promise<{ dataStreams: GADataStream[]; nextPageToken?: string }> {
    const params = new URLSearchParams();
    params.set('pageSize', (options.pageSize || 200).toString());
    if (options.pageToken) params.set('pageToken', options.pageToken);

    const baseUrl = 'https://analyticsadmin.googleapis.com/v1beta';
    return this.request(userId, `/properties/${propertyId}/dataStreams?${params.toString()}`, {}, baseUrl);
  }

  // ============ Data API ============

  async runReport(
    userId: string,
    propertyId: string,
    report: Omit<GAReportRequest, 'property'>
  ): Promise<GAReportResponse> {
    return this.request(userId, `/properties/${propertyId}:runReport`, {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  async batchRunReports(
    userId: string,
    propertyId: string,
    requests: Array<Omit<GAReportRequest, 'property'>>
  ): Promise<{ reports: GAReportResponse[] }> {
    return this.request(userId, `/properties/${propertyId}:batchRunReports`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }

  async runPivotReport(
    userId: string,
    propertyId: string,
    report: {
      dateRanges: Array<{ startDate: string; endDate: string }>;
      dimensions?: Array<{ name: string }>;
      metrics: Array<{ name: string }>;
      pivots: Array<{
        fieldNames: string[];
        orderBys?: any[];
        offset?: number;
        limit?: number;
      }>;
      dimensionFilter?: any;
      metricFilter?: any;
    }
  ): Promise<any> {
    return this.request(userId, `/properties/${propertyId}:runPivotReport`, {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  async runRealtimeReport(
    userId: string,
    propertyId: string,
    report: {
      dimensions?: Array<{ name: string }>;
      metrics: Array<{ name: string }>;
      dimensionFilter?: any;
      metricFilter?: any;
      limit?: number;
    }
  ): Promise<GARealTimeData> {
    return this.request(userId, `/properties/${propertyId}:runRealtimeReport`, {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  // ============ Common Report Helpers ============

  async getActiveUsers(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GAReportResponse> {
    return this.runReport(userId, propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'totalUsers' },
      ],
    });
  }

  async getPageViews(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = ['pagePath']
  ): Promise<GAReportResponse> {
    return this.runReport(userId, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: dimensions.map(name => ({ name })),
      metrics: [
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
      limit: 100,
    });
  }

  async getTrafficSources(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GAReportResponse> {
    return this.runReport(userId, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      limit: 50,
    });
  }

  async getDeviceBreakdown(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GAReportResponse> {
    return this.runReport(userId, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
    });
  }

  async getGeographicData(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GAReportResponse> {
    return this.runReport(userId, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'country' },
        { name: 'city' },
      ],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
      ],
      limit: 100,
    });
  }

  async getConversions(
    userId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<GAReportResponse> {
    return this.runReport(userId, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [
        { name: 'eventCount' },
        { name: 'eventValue' },
        { name: 'conversions' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'CONTAINS',
            value: 'conversion',
            caseSensitive: false,
          },
        },
      },
      limit: 50,
    });
  }

  async getRealTimeUsers(userId: string, propertyId: string): Promise<GARealTimeData> {
    return this.runRealtimeReport(userId, propertyId, {
      metrics: [{ name: 'activeUsers' }],
    });
  }

  async getRealTimeByCountry(userId: string, propertyId: string): Promise<GARealTimeData> {
    return this.runRealtimeReport(userId, propertyId, {
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 20,
    });
  }

  async getRealTimeByPage(userId: string, propertyId: string): Promise<GARealTimeData> {
    return this.runRealtimeReport(userId, propertyId, {
      dimensions: [{ name: 'unifiedScreenName' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 20,
    });
  }
}

// ============================================================================
// MIXPANEL SERVICE
// ============================================================================

export interface MixpanelEvent {
  event: string;
  properties: {
    time: number;
    distinct_id: string;
    $insert_id?: string;
    [key: string]: any;
  };
}

export interface MixpanelProfile {
  $distinct_id: string;
  $properties: Record<string, any>;
}

export interface MixpanelQueryResult {
  computed_at: string;
  status: string;
  result: any;
}

export interface MixpanelInsightsResult {
  series: Record<string, number[]>;
  series_labels: Record<string, string>;
  time_comparison: Record<string, any>;
}

export interface MixpanelFunnelResult {
  meta: {
    dates: string[];
  };
  data: {
    [date: string]: {
      steps: Array<{
        count: number;
        step_conv_ratio: number;
        overall_conv_ratio: number;
        avg_time: number | null;
        goal: string;
      }>;
    };
  };
}

export interface MixpanelRetentionResult {
  [cohort: string]: {
    counts: number[];
    percentages: number[];
  };
}

class MixpanelService extends BaseIntegrationService {
  private projectId: string = '';

  constructor() {
    super('mixpanel', 'https://mixpanel.com/api/2.0');
  }

  protected parsePaginatedResponse<T>(response: any): { items: T[]; nextCursor?: string } {
    return {
      items: Array.isArray(response) ? response : (response.results || []),
      nextCursor: response.next_page ? response.page?.toString() : undefined,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      // Test with a simple query
      await this.getTopEvents(userId, '7');
      return true;
    } catch {
      return false;
    }
  }

  setProjectId(projectId: string): void {
    this.projectId = projectId;
  }

  // ============ Export API ============

  async exportEvents(
    userId: string,
    options: {
      from_date: string;
      to_date: string;
      event?: string[];
      where?: string;
      limit?: number;
    }
  ): Promise<MixpanelEvent[]> {
    const params = new URLSearchParams();
    params.set('from_date', options.from_date);
    params.set('to_date', options.to_date);
    if (options.event) params.set('event', JSON.stringify(options.event));
    if (options.where) params.set('where', options.where);
    if (options.limit) params.set('limit', options.limit.toString());

    // Export API has different base URL
    const exportUrl = 'https://data.mixpanel.com/api/2.0';
    return this.request(userId, `/export?${params.toString()}`, {}, exportUrl);
  }

  // ============ Insights API ============

  async queryInsights(
    userId: string,
    query: {
      event: string;
      from_date: string;
      to_date: string;
      unit?: 'day' | 'week' | 'month';
      type?: 'general' | 'unique' | 'average';
      where?: string;
      on?: string;
    }
  ): Promise<MixpanelInsightsResult> {
    return this.request(userId, '/insights', {
      method: 'POST',
      body: JSON.stringify({
        project_id: this.projectId,
        ...query,
      }),
    });
  }

  async getTopEvents(
    userId: string,
    lastNDays: string = '30'
  ): Promise<{ events: Array<{ event: string; amount: number }> }> {
    const params = new URLSearchParams();
    params.set('type', 'general');
    params.set('limit', '100');

    return this.request(userId, `/events/top?${params.toString()}`);
  }

  async getEventNames(userId: string): Promise<string[]> {
    return this.request(userId, '/events/names');
  }

  async getEventProperties(userId: string, event: string): Promise<string[]> {
    const params = new URLSearchParams();
    params.set('event', event);
    return this.request(userId, `/events/properties?${params.toString()}`);
  }

  async getPropertyValues(
    userId: string,
    event: string,
    property: string,
    options: { limit?: number } = {}
  ): Promise<string[]> {
    const params = new URLSearchParams();
    params.set('event', event);
    params.set('name', property);
    if (options.limit) params.set('limit', options.limit.toString());

    return this.request(userId, `/events/properties/values?${params.toString()}`);
  }

  // ============ Segmentation API ============

  async segmentationQuery(
    userId: string,
    options: {
      event: string;
      from_date: string;
      to_date: string;
      type?: 'general' | 'unique' | 'average';
      unit?: 'minute' | 'hour' | 'day' | 'week' | 'month';
      where?: string;
      on?: string;
      action?: 'sum' | 'average' | 'median';
    }
  ): Promise<{ data: { series: Record<string, number[]>; values: Record<string, number> } }> {
    const params = new URLSearchParams();
    params.set('event', options.event);
    params.set('from_date', options.from_date);
    params.set('to_date', options.to_date);
    if (options.type) params.set('type', options.type);
    if (options.unit) params.set('unit', options.unit);
    if (options.where) params.set('where', options.where);
    if (options.on) params.set('on', options.on);
    if (options.action) params.set('action', options.action);

    return this.request(userId, `/segmentation?${params.toString()}`);
  }

  // ============ Funnels API ============

  async listFunnels(userId: string): Promise<Array<{ funnel_id: number; name: string }>> {
    return this.request(userId, '/funnels/list');
  }

  async getFunnel(
    userId: string,
    funnelId: number,
    options: {
      from_date: string;
      to_date: string;
      unit?: 'day' | 'week' | 'month';
      where?: string;
      on?: string;
    }
  ): Promise<MixpanelFunnelResult> {
    const params = new URLSearchParams();
    params.set('funnel_id', funnelId.toString());
    params.set('from_date', options.from_date);
    params.set('to_date', options.to_date);
    if (options.unit) params.set('unit', options.unit);
    if (options.where) params.set('where', options.where);
    if (options.on) params.set('on', options.on);

    return this.request(userId, `/funnels?${params.toString()}`);
  }

  // ============ Retention API ============

  async getRetention(
    userId: string,
    options: {
      from_date: string;
      to_date: string;
      retention_type?: 'birth' | 'compounded';
      born_event?: string;
      event?: string;
      unit?: 'day' | 'week' | 'month';
      born_where?: string;
      where?: string;
      on?: string;
      interval_count?: number;
    }
  ): Promise<MixpanelRetentionResult> {
    const params = new URLSearchParams();
    params.set('from_date', options.from_date);
    params.set('to_date', options.to_date);
    if (options.retention_type) params.set('retention_type', options.retention_type);
    if (options.born_event) params.set('born_event', options.born_event);
    if (options.event) params.set('event', options.event);
    if (options.unit) params.set('unit', options.unit);
    if (options.born_where) params.set('born_where', options.born_where);
    if (options.where) params.set('where', options.where);
    if (options.on) params.set('on', options.on);
    if (options.interval_count) params.set('interval_count', options.interval_count.toString());

    return this.request(userId, `/retention?${params.toString()}`);
  }

  // ============ Engage (Profiles) API ============

  async queryProfiles(
    userId: string,
    options: {
      where?: string;
      session_id?: string;
      page?: number;
      output_properties?: string[];
    } = {}
  ): Promise<{
    results: MixpanelProfile[];
    page: number;
    page_size: number;
    session_id: string;
    status: string;
    total: number;
  }> {
    const body: Record<string, any> = {};
    if (options.where) body.where = options.where;
    if (options.session_id) body.session_id = options.session_id;
    if (options.page) body.page = options.page;
    if (options.output_properties) body.output_properties = options.output_properties;

    return this.request(userId, '/engage', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getProfile(userId: string, distinctId: string): Promise<MixpanelProfile> {
    const response = await this.queryProfiles(userId, {
      where: `properties["$distinct_id"] == "${distinctId}"`,
    });
    if (response.results.length === 0) {
      throw new ApiError('Profile not found', 404);
    }
    return response.results[0];
  }

  // ============ JQL Query API ============

  async runJQLQuery(userId: string, script: string): Promise<any[]> {
    return this.request(userId, '/jql', {
      method: 'POST',
      body: JSON.stringify({ script }),
    });
  }

  // ============ Annotations API ============

  async listAnnotations(userId: string): Promise<{ annotations: Array<{ id: number; date: string; description: string }> }> {
    return this.request(userId, '/annotations');
  }

  async createAnnotation(
    userId: string,
    annotation: { date: string; description: string }
  ): Promise<{ id: number; date: string; description: string }> {
    return this.request(userId, '/annotations/create', {
      method: 'POST',
      body: JSON.stringify(annotation),
    });
  }

  async updateAnnotation(
    userId: string,
    annotationId: number,
    updates: { date?: string; description?: string }
  ): Promise<{ id: number; date: string; description: string }> {
    return this.request(userId, `/annotations/update?id=${annotationId}`, {
      method: 'POST',
      body: JSON.stringify(updates),
    });
  }

  async deleteAnnotation(userId: string, annotationId: number): Promise<{ status: string }> {
    return this.request(userId, `/annotations/delete?id=${annotationId}`, {
      method: 'DELETE',
    });
  }

  // ============ Cohorts API ============

  async listCohorts(userId: string): Promise<Array<{ id: number; name: string; description: string; created: string; count: number }>> {
    return this.request(userId, '/cohorts/list');
  }

  // ============ Helper Methods ============

  async getDailyActiveUsers(
    userId: string,
    fromDate: string,
    toDate: string
  ): Promise<MixpanelInsightsResult> {
    return this.queryInsights(userId, {
      event: '$active',
      from_date: fromDate,
      to_date: toDate,
      type: 'unique',
      unit: 'day',
    });
  }

  async getEventCount(
    userId: string,
    event: string,
    fromDate: string,
    toDate: string
  ): Promise<MixpanelInsightsResult> {
    return this.queryInsights(userId, {
      event,
      from_date: fromDate,
      to_date: toDate,
      type: 'general',
      unit: 'day',
    });
  }
}

// ============================================================================
// HOTJAR SERVICE
// ============================================================================

export interface HotjarSite {
  id: number;
  name: string;
  status: 'active' | 'disabled';
  created_at: string;
  tracking_code_installed: boolean;
  domain: string;
}

export interface HotjarSurvey {
  id: number;
  name: string;
  status: 'active' | 'paused' | 'draft' | 'completed';
  created_at: string;
  responses_count: number;
  questions: Array<{
    id: number;
    type: string;
    text: string;
    options?: string[];
  }>;
}

export interface HotjarSurveyResponse {
  id: number;
  survey_id: number;
  created_at: string;
  completed_at: string;
  answers: Array<{
    question_id: number;
    value: string | string[] | number;
  }>;
  metadata: {
    country: string;
    device: string;
    browser: string;
    os: string;
    page_url: string;
  };
}

export interface HotjarFeedback {
  id: number;
  created_at: string;
  content: string;
  emotion: 'happy' | 'neutral' | 'sad' | 'angry';
  screenshot_url?: string;
  page_url: string;
  metadata: {
    country: string;
    device: string;
    browser: string;
    os: string;
    screen_resolution: string;
  };
}

export interface HotjarRecording {
  id: number;
  site_id: number;
  created_at: string;
  duration: number;
  pages_visited: number;
  device: 'desktop' | 'tablet' | 'mobile';
  country: string;
  browser: string;
  os: string;
  entry_url: string;
  exit_url: string;
  player_url: string;
  user_id?: string;
  frustration_score?: number;
}

export interface HotjarHeatmap {
  id: number;
  name: string;
  site_id: number;
  status: 'active' | 'paused';
  created_at: string;
  url_pattern: string;
  snapshot_count: number;
  click_count: number;
  move_count: number;
  scroll_count: number;
}

class HotjarService extends BaseIntegrationService {
  constructor() {
    // Hotjar uses API key authentication, but we'll support it through our OAuth flow
    super('hotjar', 'https://insights.hotjar.com/api/v2');
  }

  protected parsePaginatedResponse<T>(response: any): { items: T[]; nextCursor?: string } {
    return {
      items: response.data || response.items || [],
      nextCursor: response.pagination?.next_cursor,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.listSites(userId);
      return true;
    } catch {
      return false;
    }
  }

  // ============ Sites API ============

  async listSites(userId: string): Promise<HotjarSite[]> {
    const response = await this.request<any>(userId, '/sites');
    return response.data || [];
  }

  async getSite(userId: string, siteId: number): Promise<HotjarSite> {
    return this.request(userId, `/sites/${siteId}`);
  }

  async getSiteStats(
    userId: string,
    siteId: number,
    options: { from_date: string; to_date: string }
  ): Promise<{
    pageviews: number;
    visitors: number;
    recordings: number;
    feedback_count: number;
    survey_responses: number;
  }> {
    const params = new URLSearchParams();
    params.set('from_date', options.from_date);
    params.set('to_date', options.to_date);

    return this.request(userId, `/sites/${siteId}/stats?${params.toString()}`);
  }

  // ============ Surveys API ============

  async listSurveys(
    userId: string,
    siteId: number,
    options: { status?: 'active' | 'paused' | 'draft' | 'completed'; limit?: number; cursor?: string } = {}
  ): Promise<{ data: HotjarSurvey[]; pagination: { next_cursor?: string } }> {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.cursor) params.set('cursor', options.cursor);

    return this.request(userId, `/sites/${siteId}/surveys?${params.toString()}`);
  }

  async getSurvey(userId: string, siteId: number, surveyId: number): Promise<HotjarSurvey> {
    return this.request(userId, `/sites/${siteId}/surveys/${surveyId}`);
  }

  async getSurveyResponses(
    userId: string,
    siteId: number,
    surveyId: number,
    options: {
      from_date?: string;
      to_date?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{ data: HotjarSurveyResponse[]; pagination: { next_cursor?: string } }> {
    const params = new URLSearchParams();
    if (options.from_date) params.set('from_date', options.from_date);
    if (options.to_date) params.set('to_date', options.to_date);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.cursor) params.set('cursor', options.cursor);

    return this.request(userId, `/sites/${siteId}/surveys/${surveyId}/responses?${params.toString()}`);
  }

  async exportSurveyResponses(
    userId: string,
    siteId: number,
    surveyId: number,
    format: 'csv' | 'xlsx' = 'csv'
  ): Promise<{ download_url: string; expires_at: string }> {
    return this.request(userId, `/sites/${siteId}/surveys/${surveyId}/export`, {
      method: 'POST',
      body: JSON.stringify({ format }),
    });
  }

  // ============ Feedback API ============

  async listFeedback(
    userId: string,
    siteId: number,
    options: {
      from_date?: string;
      to_date?: string;
      emotion?: 'happy' | 'neutral' | 'sad' | 'angry';
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{ data: HotjarFeedback[]; pagination: { next_cursor?: string } }> {
    const params = new URLSearchParams();
    if (options.from_date) params.set('from_date', options.from_date);
    if (options.to_date) params.set('to_date', options.to_date);
    if (options.emotion) params.set('emotion', options.emotion);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.cursor) params.set('cursor', options.cursor);

    return this.request(userId, `/sites/${siteId}/feedback?${params.toString()}`);
  }

  async getFeedback(userId: string, siteId: number, feedbackId: number): Promise<HotjarFeedback> {
    return this.request(userId, `/sites/${siteId}/feedback/${feedbackId}`);
  }

  async getFeedbackStats(
    userId: string,
    siteId: number,
    options: { from_date: string; to_date: string }
  ): Promise<{
    total: number;
    by_emotion: { happy: number; neutral: number; sad: number; angry: number };
    by_device: { desktop: number; mobile: number; tablet: number };
  }> {
    const params = new URLSearchParams();
    params.set('from_date', options.from_date);
    params.set('to_date', options.to_date);

    return this.request(userId, `/sites/${siteId}/feedback/stats?${params.toString()}`);
  }

  // ============ Recordings API ============

  async listRecordings(
    userId: string,
    siteId: number,
    options: {
      from_date?: string;
      to_date?: string;
      device?: 'desktop' | 'tablet' | 'mobile';
      min_duration?: number;
      max_duration?: number;
      user_id?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{ data: HotjarRecording[]; pagination: { next_cursor?: string } }> {
    const params = new URLSearchParams();
    if (options.from_date) params.set('from_date', options.from_date);
    if (options.to_date) params.set('to_date', options.to_date);
    if (options.device) params.set('device', options.device);
    if (options.min_duration) params.set('min_duration', options.min_duration.toString());
    if (options.max_duration) params.set('max_duration', options.max_duration.toString());
    if (options.user_id) params.set('user_id', options.user_id);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.cursor) params.set('cursor', options.cursor);

    return this.request(userId, `/sites/${siteId}/recordings?${params.toString()}`);
  }

  async getRecording(userId: string, siteId: number, recordingId: number): Promise<HotjarRecording> {
    return this.request(userId, `/sites/${siteId}/recordings/${recordingId}`);
  }

  async getRecordingStats(
    userId: string,
    siteId: number,
    options: { from_date: string; to_date: string }
  ): Promise<{
    total: number;
    total_duration: number;
    avg_duration: number;
    by_device: { desktop: number; mobile: number; tablet: number };
    by_browser: Record<string, number>;
    by_country: Record<string, number>;
  }> {
    const params = new URLSearchParams();
    params.set('from_date', options.from_date);
    params.set('to_date', options.to_date);

    return this.request(userId, `/sites/${siteId}/recordings/stats?${params.toString()}`);
  }

  async tagRecording(
    userId: string,
    siteId: number,
    recordingId: number,
    tags: string[]
  ): Promise<HotjarRecording> {
    return this.request(userId, `/sites/${siteId}/recordings/${recordingId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags }),
    });
  }

  async deleteRecording(userId: string, siteId: number, recordingId: number): Promise<void> {
    await this.request(userId, `/sites/${siteId}/recordings/${recordingId}`, {
      method: 'DELETE',
    });
  }

  // ============ Heatmaps API ============

  async listHeatmaps(
    userId: string,
    siteId: number,
    options: { status?: 'active' | 'paused'; limit?: number; cursor?: string } = {}
  ): Promise<{ data: HotjarHeatmap[]; pagination: { next_cursor?: string } }> {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.cursor) params.set('cursor', options.cursor);

    return this.request(userId, `/sites/${siteId}/heatmaps?${params.toString()}`);
  }

  async getHeatmap(userId: string, siteId: number, heatmapId: number): Promise<HotjarHeatmap> {
    return this.request(userId, `/sites/${siteId}/heatmaps/${heatmapId}`);
  }

  async getHeatmapData(
    userId: string,
    siteId: number,
    heatmapId: number,
    dataType: 'click' | 'move' | 'scroll'
  ): Promise<{
    data: Array<{
      x: number;
      y: number;
      value: number;
    }>;
    snapshot_url: string;
    device: 'desktop' | 'tablet' | 'mobile';
  }> {
    return this.request(userId, `/sites/${siteId}/heatmaps/${heatmapId}/${dataType}`);
  }

  async createHeatmap(
    userId: string,
    siteId: number,
    heatmap: {
      name: string;
      url_pattern: string;
      device_types?: ('desktop' | 'tablet' | 'mobile')[];
    }
  ): Promise<HotjarHeatmap> {
    return this.request(userId, `/sites/${siteId}/heatmaps`, {
      method: 'POST',
      body: JSON.stringify(heatmap),
    });
  }

  async updateHeatmapStatus(
    userId: string,
    siteId: number,
    heatmapId: number,
    status: 'active' | 'paused'
  ): Promise<HotjarHeatmap> {
    return this.request(userId, `/sites/${siteId}/heatmaps/${heatmapId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteHeatmap(userId: string, siteId: number, heatmapId: number): Promise<void> {
    await this.request(userId, `/sites/${siteId}/heatmaps/${heatmapId}`, {
      method: 'DELETE',
    });
  }

  // ============ Funnels API ============

  async listFunnels(
    userId: string,
    siteId: number
  ): Promise<Array<{
    id: number;
    name: string;
    steps: Array<{ name: string; url_pattern: string }>;
    created_at: string;
  }>> {
    const response = await this.request<any>(userId, `/sites/${siteId}/funnels`);
    return response.data || [];
  }

  async getFunnelStats(
    userId: string,
    siteId: number,
    funnelId: number,
    options: { from_date: string; to_date: string }
  ): Promise<{
    steps: Array<{
      name: string;
      visitors: number;
      conversion_rate: number;
      drop_off_rate: number;
    }>;
    total_conversion_rate: number;
  }> {
    const params = new URLSearchParams();
    params.set('from_date', options.from_date);
    params.set('to_date', options.to_date);

    return this.request(userId, `/sites/${siteId}/funnels/${funnelId}/stats?${params.toString()}`);
  }

  // ============ Events API ============

  async listEvents(
    userId: string,
    siteId: number
  ): Promise<Array<{
    id: number;
    name: string;
    type: 'click' | 'rage_click' | 'u_turn' | 'custom';
    created_at: string;
    trigger_count: number;
  }>> {
    const response = await this.request<any>(userId, `/sites/${siteId}/events`);
    return response.data || [];
  }

  async getEventStats(
    userId: string,
    siteId: number,
    eventId: number,
    options: { from_date: string; to_date: string; granularity?: 'day' | 'week' | 'month' }
  ): Promise<{
    total: number;
    by_date: Array<{ date: string; count: number }>;
    by_page: Array<{ url: string; count: number }>;
  }> {
    const params = new URLSearchParams();
    params.set('from_date', options.from_date);
    params.set('to_date', options.to_date);
    if (options.granularity) params.set('granularity', options.granularity);

    return this.request(userId, `/sites/${siteId}/events/${eventId}/stats?${params.toString()}`);
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCES
// ============================================================================

export const googleAnalyticsService = new GoogleAnalyticsService();
export const mixpanelService = new MixpanelService();
export const hotjarService = new HotjarService();
