/**
 * Provider Action API
 * POST /api/integrations/[provider]/[action] - Execute provider-specific actions
 *
 * This is a universal endpoint for executing service-specific operations.
 * Actions are mapped to service methods dynamically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getProviderConfig } from '@/lib/integrations/providers/provider-config';
import { getService, hasService } from '@/lib/integrations/services';
import { getIntegration } from '@/lib/integrations/providers/integration-repository';

// Get session user ID
async function getUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie?.value) return null;

  try {
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    return sessionData.userId || null;
  } catch {
    return null;
  }
}

// Map of allowed actions per provider
const ALLOWED_ACTIONS: Record<string, string[]> = {
  // Google
  google: ['listMessages', 'getMessage', 'sendEmail', 'listCalendars', 'listEvents', 'createEvent', 'listFiles', 'listContacts'],
  gmail: ['listMessages', 'getMessage', 'getThread', 'listLabels', 'sendEmail', 'markAsRead', 'markAsUnread', 'archiveMessage', 'trashMessage'],
  google_calendar: ['listCalendars', 'getPrimaryCalendar', 'listEvents', 'getEvent', 'createEvent', 'updateEvent', 'deleteEvent', 'getUpcomingEvents'],
  google_drive: ['listFiles', 'getFile', 'downloadFile', 'createFolder', 'searchFiles'],

  // Microsoft
  microsoft: ['listMailFolders', 'listMessages', 'getMessage', 'sendEmail', 'listCalendars', 'listEvents', 'listContacts'],
  outlook: ['listMailFolders', 'listMessages', 'getMessage', 'sendEmail', 'replyToMessage', 'forwardMessage', 'deleteMessage', 'moveMessage'],
  outlook_calendar: ['listCalendars', 'getDefaultCalendar', 'listEvents', 'createEvent', 'updateEvent', 'deleteEvent', 'respondToEvent'],
  onedrive: ['listDriveItems', 'getDriveItem', 'searchDrive', 'downloadDriveItem', 'createFolder'],

  // Social Media
  linkedin: ['getProfile', 'getProfilePicture', 'createPost', 'getOrganizationPosts'],
  twitter: ['getMe', 'getUserByUsername', 'createTweet', 'deleteTweet', 'getUserTweets', 'likeTweet', 'retweet', 'searchTweets'],
  facebook: ['getMe', 'getPages', 'getPagePosts', 'createPagePost', 'getPageInsights'],
  instagram: ['getProfile', 'getMedia', 'getMediaItem', 'getMediaInsights', 'getAccountInsights'],
  tiktok: ['getProfile', 'getVideos', 'getVideo'],

  // CRM
  hubspot: ['listContacts', 'getContact', 'createContact', 'updateContact', 'deleteContact', 'listDeals', 'getDeal', 'createDeal', 'getDealPipelines'],
  salesforce: ['query', 'getContact', 'createContact', 'updateContact', 'getOpportunity', 'createOpportunity', 'search'],
  pipedrive: ['listPersons', 'getPerson', 'createPerson', 'listDeals', 'getDeal', 'createDeal', 'getPipelines'],

  // Finance
  quickbooks: ['getCompanyInfo', 'listCustomers', 'getCustomer', 'createCustomer', 'listInvoices', 'getInvoice', 'createInvoice', 'getBalanceSheet', 'getProfitAndLoss'],
  stripe: ['listCustomers', 'getCustomer', 'createCustomer', 'listCharges', 'getCharge', 'listSubscriptions', 'getBalance', 'listProducts'],
  paypal: ['getUserInfo', 'listTransactions', 'getOrder', 'createOrder', 'captureOrder', 'createPayout'],
  xero: ['getOrganisation', 'listContacts', 'getContact', 'createContact', 'listInvoices', 'getInvoice', 'createInvoice', 'getBalanceSheet', 'getProfitAndLoss'],

  // Fitness
  strava: ['getAthlete', 'getAthleteStats', 'listActivities', 'getActivity', 'createActivity', 'listClubs', 'listRoutes'],
  fitbit: ['getProfile', 'getDailyActivitySummary', 'getSleepLogs', 'getHeartRateByDate', 'getWeightLogs', 'getFoodLogs', 'getDevices'],
  garmin: ['getUserProfile', 'getDailyActivities', 'getDailySummary', 'getSleepData', 'getHeartRate', 'getBodyComposition', 'getStressData'],

  // Productivity
  notion: ['getMe', 'getUsers', 'getPage', 'createPage', 'updatePage', 'getDatabase', 'queryDatabase', 'search', 'getBlockChildren', 'appendBlockChildren'],
  slack: ['authTest', 'listUsers', 'getUser', 'listChannels', 'getChannel', 'getMessages', 'postMessage', 'updateMessage', 'deleteMessage', 'searchMessages', 'getTeamInfo'],
  dropbox: ['getCurrentAccount', 'getSpaceUsage', 'listFolder', 'getMetadata', 'createFolder', 'deleteFile', 'copyFile', 'moveFile', 'search', 'createSharedLink', 'listSharedLinks'],

  // Analytics
  google_analytics: ['listProperties', 'getProperty', 'listDataStreams', 'runReport', 'runRealtimeReport', 'getActiveUsers', 'getPageViews', 'getTrafficSources'],
  mixpanel: ['getTopEvents', 'getEventNames', 'queryInsights', 'segmentationQuery', 'listFunnels', 'getFunnel', 'getRetention', 'queryProfiles', 'listCohorts'],
  hotjar: ['listSites', 'getSite', 'getSiteStats', 'listSurveys', 'getSurveyResponses', 'listFeedback', 'listRecordings', 'listHeatmaps', 'getHeatmapData'],
};

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string; action: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider, action } = params;
    const config = getProviderConfig(provider);

    if (!config) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
    }

    // Check if service exists
    if (!hasService(provider)) {
      return NextResponse.json({ error: 'Service not available' }, { status: 404 });
    }

    // Check if action is allowed
    const allowedActions = ALLOWED_ACTIONS[provider] || [];
    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        { error: `Action '${action}' is not allowed for provider '${provider}'` },
        { status: 403 }
      );
    }

    // Check if integration exists
    const integration = await getIntegration(userId, provider);
    if (!integration) {
      return NextResponse.json(
        { error: `${config.name} is not connected. Please connect it first.` },
        { status: 400 }
      );
    }

    // Get service
    const service = getService(provider);
    if (!service) {
      return NextResponse.json({ error: 'Service not available' }, { status: 500 });
    }

    // Check if method exists on service
    const method = (service as any)[action];
    if (typeof method !== 'function') {
      return NextResponse.json(
        { error: `Action '${action}' is not implemented for provider '${provider}'` },
        { status: 501 }
      );
    }

    // Get request body
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // No body or invalid JSON is fine for some actions
    }

    // Execute action
    // The first parameter is always userId, followed by action-specific params
    const { params: actionParams, ...options } = body;

    let result: any;
    if (Array.isArray(actionParams)) {
      // If params is an array, spread it as arguments
      result = await method.call(service, userId, ...actionParams, options);
    } else if (actionParams !== undefined) {
      // If params is a single value
      result = await method.call(service, userId, actionParams, options);
    } else if (Object.keys(options).length > 0) {
      // If only options are provided
      result = await method.call(service, userId, options);
    } else {
      // No params
      result = await method.call(service, userId);
    }

    return NextResponse.json({
      success: true,
      provider,
      action,
      data: result,
    });
  } catch (error: any) {
    console.error(`[INTEGRATION_ACTION] Error:`, error);

    // Handle specific error types
    if (error.message?.includes('token') || error.message?.includes('expired')) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect the integration.' },
        { status: 401 }
      );
    }

    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Action failed' },
      { status: error.statusCode || 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string; action: string } }
) {
  // For GET requests, convert query params to body format and use POST logic
  const { provider, action } = params;
  const searchParams = request.nextUrl.searchParams;

  // Build options from query params
  const options: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    // Try to parse JSON values
    try {
      options[key] = JSON.parse(value);
    } catch {
      options[key] = value;
    }
  });

  // Create a mock request with body
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(options),
  });

  return POST(mockRequest, { params });
}
