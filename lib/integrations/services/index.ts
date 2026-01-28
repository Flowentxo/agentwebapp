/**
 * Integration Services Index
 *
 * Central export for all integration services.
 * Import services from this file for consistent access.
 */

// ============================================================================
// BASE SERVICE
// ============================================================================

export { BaseIntegrationService, ApiError } from './base-service';

// ============================================================================
// GOOGLE SERVICES
// ============================================================================

export {
  googleService,
  // Gmail types
  type GmailMessage,
  type GmailThread,
  type GmailLabel,
  // Calendar types
  type GoogleCalendar,
  type GoogleEvent,
  // Drive types
  type DriveFile,
  // Contacts types
  type GoogleContact,
} from './google-service';

// ============================================================================
// MICROSOFT SERVICES
// ============================================================================

export {
  microsoftService,
  // Outlook types
  type OutlookMessage,
  type OutlookMailFolder,
  // Calendar types
  type OutlookCalendar,
  type OutlookEvent,
  // OneDrive types
  type OneDriveItem,
  // Contacts types
  type OutlookContact,
} from './microsoft-service';

// ============================================================================
// SOCIAL MEDIA SERVICES
// ============================================================================

export {
  linkedInService,
  twitterService,
  facebookService,
  instagramService,
  tiktokService,
  // LinkedIn types
  type LinkedInProfile,
  type LinkedInPost,
  // Twitter types
  type TwitterUser,
  type TwitterTweet,
  // Facebook types
  type FacebookUser,
  type FacebookPage,
  type FacebookPost,
  // Instagram types
  type InstagramProfile,
  type InstagramMedia,
  // TikTok types
  type TikTokProfile,
  type TikTokVideo,
} from './social-service';

// ============================================================================
// CRM SERVICES
// ============================================================================

export {
  hubspotService,
  salesforceService,
  pipedriveService,
  // HubSpot types
  type HubSpotContact,
  type HubSpotDeal,
  type HubSpotCompany,
  type HubSpotOwner,
  type HubSpotPipeline,
  // Salesforce types
  type SalesforceContact,
  type SalesforceOpportunity,
  type SalesforceAccount,
  type SalesforceQueryResult,
  // Pipedrive types
  type PipedrivePerson,
  type PipedriveDeal,
  type PipedriveOrganization,
  type PipedrivePipeline,
  type PipedriveActivity,
} from './crm-service';

// ============================================================================
// FINANCE SERVICES
// ============================================================================

export {
  quickbooksService,
  stripeService,
  paypalService,
  xeroService,
  // QuickBooks types
  type QuickBooksCompanyInfo,
  type QuickBooksCustomer,
  type QuickBooksInvoice,
  type QuickBooksPayment,
  type QuickBooksAccount,
  // Stripe types
  type StripeCustomer,
  type StripeCharge,
  type StripePaymentIntent,
  type StripeSubscription,
  type StripeInvoice as StripeInvoiceType,
  type StripeProduct,
  // PayPal types
  type PayPalUserInfo,
  type PayPalTransaction,
  type PayPalOrder,
  type PayPalPayout,
  // Xero types
  type XeroOrganisation,
  type XeroContact,
  type XeroInvoice,
  type XeroPayment,
  type XeroAccount,
} from './finance-service';

// ============================================================================
// FITNESS SERVICES
// ============================================================================

export {
  stravaService,
  fitbitService,
  garminService,
  // Strava types
  type StravaAthlete,
  type StravaActivity,
  type StravaActivityStats,
  type StravaGear,
  type StravaSegment,
  // Fitbit types
  type FitbitProfile,
  type FitbitActivitySummary,
  type FitbitActivity,
  type FitbitSleepLog,
  type FitbitHeartRate,
  type FitbitFood,
  type FitbitWeight,
  // Garmin types
  type GarminProfile,
  type GarminActivity,
  type GarminDailySummary,
  type GarminSleep,
  type GarminBodyComposition,
} from './fitness-service';

// ============================================================================
// PRODUCTIVITY SERVICES
// ============================================================================

export {
  notionService,
  slackService,
  dropboxService,
  // Notion types
  type NotionUser,
  type NotionPage,
  type NotionDatabase,
  type NotionProperty,
  type NotionBlock,
  type NotionSearchResult,
  // Slack types
  type SlackUser,
  type SlackChannel,
  type SlackMessage,
  type SlackTeam,
  // Dropbox types
  type DropboxAccount,
  type DropboxSpaceUsage,
  type DropboxFileMetadata,
  type DropboxFolderMetadata,
  type DropboxMetadata,
  type DropboxListFolderResult,
  type DropboxSearchResult,
  type DropboxSharedLink,
} from './productivity-service';

// ============================================================================
// ANALYTICS SERVICES
// ============================================================================

export {
  googleAnalyticsService,
  mixpanelService,
  hotjarService,
  // Google Analytics types
  type GAProperty,
  type GADataStream,
  type GAReportRequest,
  type GAReportResponse,
  type GARealTimeData,
  // Mixpanel types
  type MixpanelEvent,
  type MixpanelProfile,
  type MixpanelQueryResult,
  type MixpanelInsightsResult,
  type MixpanelFunnelResult,
  type MixpanelRetentionResult,
  // Hotjar types
  type HotjarSite,
  type HotjarSurvey,
  type HotjarSurveyResponse,
  type HotjarFeedback,
  type HotjarRecording,
  type HotjarHeatmap,
} from './analytics-service';

// ============================================================================
// SERVICE REGISTRY
// ============================================================================

import { googleService } from './google-service';
import { microsoftService } from './microsoft-service';
import { linkedInService, twitterService, facebookService, instagramService, tiktokService } from './social-service';
import { hubspotService, salesforceService, pipedriveService } from './crm-service';
import { quickbooksService, stripeService, paypalService, xeroService } from './finance-service';
import { stravaService, fitbitService, garminService } from './fitness-service';
import { notionService, slackService, dropboxService } from './productivity-service';
import { googleAnalyticsService, mixpanelService, hotjarService } from './analytics-service';

/**
 * Service registry for dynamic service access
 */
export const serviceRegistry = {
  // Google
  google: googleService,
  gmail: googleService, // Alias
  google_calendar: googleService, // Alias
  google_drive: googleService, // Alias

  // Microsoft
  microsoft: microsoftService,
  outlook: microsoftService, // Alias
  outlook_calendar: microsoftService, // Alias
  onedrive: microsoftService, // Alias

  // Social Media
  linkedin: linkedInService,
  twitter: twitterService,
  facebook: facebookService,
  instagram: instagramService,
  tiktok: tiktokService,

  // CRM
  hubspot: hubspotService,
  salesforce: salesforceService,
  pipedrive: pipedriveService,

  // Finance
  quickbooks: quickbooksService,
  stripe: stripeService,
  paypal: paypalService,
  xero: xeroService,

  // Fitness
  strava: stravaService,
  fitbit: fitbitService,
  garmin: garminService,

  // Productivity
  notion: notionService,
  slack: slackService,
  dropbox: dropboxService,

  // Analytics
  google_analytics: googleAnalyticsService,
  mixpanel: mixpanelService,
  hotjar: hotjarService,
} as const;

export type ServiceName = keyof typeof serviceRegistry;

/**
 * Get a service by provider name
 */
export function getService(provider: string) {
  return serviceRegistry[provider as ServiceName];
}

/**
 * Check if a service exists for the given provider
 */
export function hasService(provider: string): boolean {
  return provider in serviceRegistry;
}

/**
 * Get all available service names
 */
export function getAvailableServices(): ServiceName[] {
  return Object.keys(serviceRegistry) as ServiceName[];
}

/**
 * Test connection for a specific provider
 */
export async function testProviderConnection(provider: string, userId: string): Promise<boolean> {
  const service = getService(provider);
  if (!service) {
    return false;
  }

  try {
    return await service.testConnection(userId);
  } catch {
    return false;
  }
}
