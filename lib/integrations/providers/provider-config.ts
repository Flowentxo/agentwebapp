/**
 * Comprehensive OAuth Provider Configuration
 * Supports all integration providers with their OAuth/API configurations
 */

export type ProviderCategory =
  | 'communication'
  | 'calendar'
  | 'crm'
  | 'files'
  | 'social'
  | 'analytics'
  | 'finance'
  | 'fitness'
  | 'automation'
  | 'productivity';

export type AuthType = 'oauth2' | 'oauth1' | 'api_key' | 'basic' | 'webhook';

export interface ProviderScope {
  id: string;
  name: string;
  description: string;
  required?: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  category: ProviderCategory;
  authType: AuthType;
  icon?: string;
  description?: string;

  // OAuth2 Configuration
  authUrl?: string;
  tokenUrl?: string;
  revokeUrl?: string;
  userInfoUrl?: string;

  // Environment variable names
  clientIdEnv: string;
  clientSecretEnv: string;

  // Scopes
  defaultScopes: string[];
  availableScopes: ProviderScope[];
  scopes?: string[];

  // API Configuration
  baseApiUrl: string;
  apiVersion?: string;

  // Features
  supportsRefreshToken: boolean;
  supportsPKCE: boolean;
  supportsWebhooks: boolean;

  // Rate Limits
  rateLimit?: {
    requests: number;
    period: 'second' | 'minute' | 'hour' | 'day';
  };

  // Custom configuration
  additionalAuthParams?: Record<string, string>;
  tokenExchangeMethod?: 'post_body' | 'basic_auth';

  // Documentation
  docsUrl: string;
  setupGuideUrl?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * All Provider Configurations
 */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  // ============================================
  // GOOGLE SERVICES
  // ============================================
  google: {
    id: 'google',
    name: 'Google Workspace',
    category: 'communication',
    authType: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    availableScopes: [
      { id: 'gmail.readonly', name: 'Gmail Read', description: 'Read email messages and settings', required: false },
      { id: 'gmail.send', name: 'Gmail Send', description: 'Send emails on your behalf', required: false },
      { id: 'gmail.modify', name: 'Gmail Modify', description: 'Modify email messages and labels', required: false },
      { id: 'calendar.readonly', name: 'Calendar Read', description: 'View calendar events', required: false },
      { id: 'calendar.events', name: 'Calendar Events', description: 'Create and edit calendar events', required: false },
      { id: 'drive.readonly', name: 'Drive Read', description: 'View files in Google Drive', required: false },
      { id: 'drive.file', name: 'Drive File', description: 'Create and edit files in Google Drive', required: false },
      { id: 'contacts.readonly', name: 'Contacts Read', description: 'View contacts', required: false },
      { id: 'tasks', name: 'Tasks', description: 'Manage tasks', required: false },
      { id: 'spreadsheets', name: 'Sheets', description: 'Create and edit spreadsheets', required: false },
    ],
    baseApiUrl: 'https://www.googleapis.com',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    additionalAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    docsUrl: 'https://developers.google.com/identity/protocols/oauth2',
  },

  gmail: {
    id: 'gmail',
    name: 'Gmail',
    category: 'communication',
    authType: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
    availableScopes: [
      { id: 'gmail.readonly', name: 'Read', description: 'Read email messages', required: true },
      { id: 'gmail.send', name: 'Send', description: 'Send emails', required: true },
      { id: 'gmail.modify', name: 'Modify', description: 'Modify emails and labels', required: false },
      { id: 'gmail.labels', name: 'Labels', description: 'Manage email labels', required: false },
    ],
    baseApiUrl: 'https://gmail.googleapis.com/gmail/v1',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    additionalAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    docsUrl: 'https://developers.google.com/gmail/api',
  },

  'google-calendar': {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    authType: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    availableScopes: [
      { id: 'calendar.readonly', name: 'Read', description: 'View calendar events', required: true },
      { id: 'calendar.events', name: 'Events', description: 'Create and edit events', required: true },
      { id: 'calendar.settings.readonly', name: 'Settings', description: 'View calendar settings', required: false },
    ],
    baseApiUrl: 'https://www.googleapis.com/calendar/v3',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    additionalAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    docsUrl: 'https://developers.google.com/calendar/api',
  },

  'google-drive': {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'files',
    authType: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ],
    availableScopes: [
      { id: 'drive.readonly', name: 'Read', description: 'View files', required: true },
      { id: 'drive.file', name: 'File', description: 'Create and edit files', required: true },
      { id: 'drive.metadata.readonly', name: 'Metadata', description: 'View file metadata', required: false },
    ],
    baseApiUrl: 'https://www.googleapis.com/drive/v3',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    additionalAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    docsUrl: 'https://developers.google.com/drive/api',
  },

  'google-analytics': {
    id: 'google-analytics',
    name: 'Google Analytics',
    category: 'analytics',
    authType: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/analytics.readonly',
    ],
    availableScopes: [
      { id: 'analytics.readonly', name: 'Read', description: 'View analytics data', required: true },
      { id: 'analytics.edit', name: 'Edit', description: 'Edit analytics data', required: false },
      { id: 'analytics.manage.users', name: 'Manage Users', description: 'Manage analytics users', required: false },
    ],
    baseApiUrl: 'https://analyticsdata.googleapis.com/v1beta',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: false,
    additionalAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    docsUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
  },

  youtube: {
    id: 'youtube',
    name: 'YouTube',
    category: 'social',
    authType: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.upload',
    ],
    availableScopes: [
      { id: 'youtube.readonly', name: 'Read', description: 'View YouTube data', required: true },
      { id: 'youtube.upload', name: 'Upload', description: 'Upload videos', required: false },
      { id: 'youtube.force-ssl', name: 'Manage', description: 'Manage YouTube account', required: false },
    ],
    baseApiUrl: 'https://www.googleapis.com/youtube/v3',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    additionalAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    docsUrl: 'https://developers.google.com/youtube/v3',
  },

  // ============================================
  // MICROSOFT SERVICES
  // ============================================
  'outlook-mail': {
    id: 'outlook-mail',
    name: 'Microsoft Outlook',
    category: 'communication',
    authType: 'oauth2',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'Mail.Read',
      'Mail.Send',
      'Mail.ReadWrite',
    ],
    availableScopes: [
      { id: 'Mail.Read', name: 'Read Mail', description: 'Read email messages', required: true },
      { id: 'Mail.Send', name: 'Send Mail', description: 'Send emails', required: true },
      { id: 'Mail.ReadWrite', name: 'Read/Write Mail', description: 'Full email access', required: false },
      { id: 'Contacts.Read', name: 'Read Contacts', description: 'View contacts', required: false },
    ],
    baseApiUrl: 'https://graph.microsoft.com/v1.0',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    docsUrl: 'https://docs.microsoft.com/en-us/graph/api/resources/mail-api-overview',
  },

  'outlook-calendar': {
    id: 'outlook-calendar',
    name: 'Microsoft Calendar',
    category: 'calendar',
    authType: 'oauth2',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'Calendars.Read',
      'Calendars.ReadWrite',
    ],
    availableScopes: [
      { id: 'Calendars.Read', name: 'Read Calendar', description: 'View calendar events', required: true },
      { id: 'Calendars.ReadWrite', name: 'Read/Write Calendar', description: 'Manage calendar events', required: true },
    ],
    baseApiUrl: 'https://graph.microsoft.com/v1.0',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    docsUrl: 'https://docs.microsoft.com/en-us/graph/api/resources/calendar',
  },

  outlook: {
    id: 'outlook',
    name: 'Microsoft 365',
    category: 'communication',
    authType: 'oauth2',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'User.Read',
      'Mail.Read',
      'Mail.Send',
      'Calendars.ReadWrite',
      'Files.ReadWrite',
    ],
    availableScopes: [
      { id: 'User.Read', name: 'User Profile', description: 'Read user profile', required: true },
      { id: 'Mail.Read', name: 'Read Mail', description: 'Read emails', required: true },
      { id: 'Mail.Send', name: 'Send Mail', description: 'Send emails', required: true },
      { id: 'Calendars.ReadWrite', name: 'Calendar', description: 'Manage calendar', required: true },
      { id: 'Files.ReadWrite', name: 'OneDrive', description: 'Access OneDrive files', required: false },
    ],
    baseApiUrl: 'https://graph.microsoft.com/v1.0',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    docsUrl: 'https://docs.microsoft.com/en-us/graph/',
  },

  // ============================================
  // CRM INTEGRATIONS
  // ============================================
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    authType: 'oauth2',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    userInfoUrl: 'https://api.hubapi.com/oauth/v1/access-tokens',
    clientIdEnv: 'HUBSPOT_CLIENT_ID',
    clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
    defaultScopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.objects.companies.read',
      'crm.objects.companies.write',
    ],
    availableScopes: [
      { id: 'crm.objects.contacts.read', name: 'Contacts Read', description: 'View contacts', required: true },
      { id: 'crm.objects.contacts.write', name: 'Contacts Write', description: 'Manage contacts', required: true },
      { id: 'crm.objects.deals.read', name: 'Deals Read', description: 'View deals', required: true },
      { id: 'crm.objects.deals.write', name: 'Deals Write', description: 'Manage deals', required: true },
      { id: 'crm.objects.companies.read', name: 'Companies Read', description: 'View companies', required: false },
      { id: 'crm.objects.companies.write', name: 'Companies Write', description: 'Manage companies', required: false },
      { id: 'sales-email-read', name: 'Sales Email', description: 'Read sales emails', required: false },
      { id: 'automation', name: 'Automation', description: 'Access workflows', required: false },
    ],
    baseApiUrl: 'https://api.hubapi.com',
    apiVersion: 'v3',
    supportsRefreshToken: true,
    supportsPKCE: false,
    supportsWebhooks: true,
    rateLimit: { requests: 100, period: 'second' },
    docsUrl: 'https://developers.hubspot.com/docs/api/overview',
  },

  salesforce: {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    authType: 'oauth2',
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    revokeUrl: 'https://login.salesforce.com/services/oauth2/revoke',
    userInfoUrl: 'https://login.salesforce.com/services/oauth2/userinfo',
    clientIdEnv: 'SALESFORCE_CLIENT_ID',
    clientSecretEnv: 'SALESFORCE_CLIENT_SECRET',
    defaultScopes: [
      'api',
      'refresh_token',
      'openid',
      'profile',
      'email',
    ],
    availableScopes: [
      { id: 'api', name: 'API Access', description: 'Full API access', required: true },
      { id: 'refresh_token', name: 'Refresh Token', description: 'Offline access', required: true },
      { id: 'chatter_api', name: 'Chatter', description: 'Access Chatter feeds', required: false },
      { id: 'wave_api', name: 'Analytics', description: 'Access Analytics', required: false },
    ],
    baseApiUrl: '', // Dynamic based on instance URL
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    rateLimit: { requests: 100000, period: 'day' },
    docsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/',
  },

  pipedrive: {
    id: 'pipedrive',
    name: 'Pipedrive',
    category: 'crm',
    authType: 'oauth2',
    authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
    clientIdEnv: 'PIPEDRIVE_CLIENT_ID',
    clientSecretEnv: 'PIPEDRIVE_CLIENT_SECRET',
    defaultScopes: [
      'deals:read',
      'deals:write',
      'contacts:read',
      'contacts:write',
      'activities:read',
      'activities:write',
    ],
    availableScopes: [
      { id: 'deals:read', name: 'Deals Read', description: 'View deals', required: true },
      { id: 'deals:write', name: 'Deals Write', description: 'Manage deals', required: true },
      { id: 'contacts:read', name: 'Contacts Read', description: 'View contacts', required: true },
      { id: 'contacts:write', name: 'Contacts Write', description: 'Manage contacts', required: true },
      { id: 'activities:read', name: 'Activities Read', description: 'View activities', required: false },
      { id: 'activities:write', name: 'Activities Write', description: 'Manage activities', required: false },
    ],
    baseApiUrl: 'https://api.pipedrive.com/v1',
    supportsRefreshToken: true,
    supportsPKCE: false,
    supportsWebhooks: true,
    rateLimit: { requests: 100, period: 'second' },
    docsUrl: 'https://developers.pipedrive.com/docs/api/v1',
  },

  // ============================================
  // SOCIAL MEDIA
  // ============================================
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'social',
    authType: 'oauth2',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'profile',
      'email',
      'w_member_social',
    ],
    availableScopes: [
      { id: 'openid', name: 'OpenID', description: 'OpenID Connect', required: true },
      { id: 'profile', name: 'Profile', description: 'View profile', required: true },
      { id: 'email', name: 'Email', description: 'View email address', required: true },
      { id: 'w_member_social', name: 'Post', description: 'Post on LinkedIn', required: false },
      { id: 'r_organization_social', name: 'Organization', description: 'View organization posts', required: false },
    ],
    baseApiUrl: 'https://api.linkedin.com/v2',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    rateLimit: { requests: 100, period: 'day' },
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/',
  },

  instagram: {
    id: 'instagram',
    name: 'Instagram',
    category: 'social',
    authType: 'oauth2',
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    clientIdEnv: 'INSTAGRAM_CLIENT_ID',
    clientSecretEnv: 'INSTAGRAM_CLIENT_SECRET',
    defaultScopes: [
      'user_profile',
      'user_media',
    ],
    availableScopes: [
      { id: 'user_profile', name: 'Profile', description: 'View profile', required: true },
      { id: 'user_media', name: 'Media', description: 'View media', required: true },
      { id: 'instagram_graph_user_profile', name: 'Graph Profile', description: 'Graph API profile', required: false },
      { id: 'instagram_graph_user_media', name: 'Graph Media', description: 'Graph API media', required: false },
    ],
    baseApiUrl: 'https://graph.instagram.com',
    supportsRefreshToken: true,
    supportsPKCE: false,
    supportsWebhooks: true,
    rateLimit: { requests: 200, period: 'hour' },
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/',
  },

  facebook: {
    id: 'facebook',
    name: 'Facebook',
    category: 'social',
    authType: 'oauth2',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/me',
    clientIdEnv: 'FACEBOOK_APP_ID',
    clientSecretEnv: 'FACEBOOK_APP_SECRET',
    defaultScopes: [
      'public_profile',
      'email',
      'pages_show_list',
      'pages_read_engagement',
    ],
    availableScopes: [
      { id: 'public_profile', name: 'Profile', description: 'View public profile', required: true },
      { id: 'email', name: 'Email', description: 'View email', required: true },
      { id: 'pages_show_list', name: 'Pages List', description: 'View managed pages', required: false },
      { id: 'pages_read_engagement', name: 'Page Insights', description: 'View page insights', required: false },
      { id: 'pages_manage_posts', name: 'Page Posts', description: 'Manage page posts', required: false },
      { id: 'instagram_basic', name: 'Instagram Basic', description: 'Basic Instagram access', required: false },
    ],
    baseApiUrl: 'https://graph.facebook.com/v18.0',
    supportsRefreshToken: true,
    supportsPKCE: false,
    supportsWebhooks: true,
    rateLimit: { requests: 200, period: 'hour' },
    docsUrl: 'https://developers.facebook.com/docs/graph-api/',
  },

  twitter: {
    id: 'twitter',
    name: 'Twitter (X)',
    category: 'social',
    authType: 'oauth2',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    revokeUrl: 'https://api.twitter.com/2/oauth2/revoke',
    userInfoUrl: 'https://api.twitter.com/2/users/me',
    clientIdEnv: 'TWITTER_CLIENT_ID',
    clientSecretEnv: 'TWITTER_CLIENT_SECRET',
    defaultScopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access',
    ],
    availableScopes: [
      { id: 'tweet.read', name: 'Read Tweets', description: 'View tweets', required: true },
      { id: 'tweet.write', name: 'Write Tweets', description: 'Post tweets', required: false },
      { id: 'users.read', name: 'Read Users', description: 'View user profiles', required: true },
      { id: 'offline.access', name: 'Offline', description: 'Refresh token access', required: true },
      { id: 'dm.read', name: 'Read DMs', description: 'View direct messages', required: false },
      { id: 'dm.write', name: 'Write DMs', description: 'Send direct messages', required: false },
    ],
    baseApiUrl: 'https://api.twitter.com/2',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    additionalAuthParams: {
      code_challenge_method: 'S256',
    },
    rateLimit: { requests: 300, period: 'minute' },
    docsUrl: 'https://developer.twitter.com/en/docs/twitter-api',
  },

  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    category: 'social',
    authType: 'oauth2',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    revokeUrl: 'https://open.tiktokapis.com/v2/oauth/revoke/',
    userInfoUrl: 'https://open.tiktokapis.com/v2/user/info/',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    defaultScopes: [
      'user.info.basic',
      'video.list',
    ],
    availableScopes: [
      { id: 'user.info.basic', name: 'User Info', description: 'View profile', required: true },
      { id: 'video.list', name: 'Video List', description: 'View videos', required: true },
      { id: 'video.upload', name: 'Video Upload', description: 'Upload videos', required: false },
      { id: 'user.info.stats', name: 'User Stats', description: 'View statistics', required: false },
    ],
    baseApiUrl: 'https://open.tiktokapis.com/v2',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    rateLimit: { requests: 100, period: 'minute' },
    docsUrl: 'https://developers.tiktok.com/doc/',
  },

  // ============================================
  // FINANCE INTEGRATIONS
  // ============================================
  quickbooks: {
    id: 'quickbooks',
    name: 'QuickBooks',
    category: 'finance',
    authType: 'oauth2',
    authUrl: 'https://appcenter.intuit.com/connect/oauth2',
    tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    revokeUrl: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
    userInfoUrl: 'https://accounts.platform.intuit.com/v1/openid_connect/userinfo',
    clientIdEnv: 'QUICKBOOKS_CLIENT_ID',
    clientSecretEnv: 'QUICKBOOKS_CLIENT_SECRET',
    defaultScopes: [
      'com.intuit.quickbooks.accounting',
      'openid',
      'profile',
      'email',
    ],
    availableScopes: [
      { id: 'com.intuit.quickbooks.accounting', name: 'Accounting', description: 'Full accounting access', required: true },
      { id: 'com.intuit.quickbooks.payment', name: 'Payments', description: 'Payment processing', required: false },
      { id: 'openid', name: 'OpenID', description: 'OpenID Connect', required: true },
    ],
    baseApiUrl: 'https://quickbooks.api.intuit.com/v3',
    supportsRefreshToken: true,
    supportsPKCE: false,
    supportsWebhooks: true,
    rateLimit: { requests: 500, period: 'minute' },
    docsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
  },

  stripe: {
    id: 'stripe',
    name: 'Stripe',
    category: 'finance',
    authType: 'oauth2',
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    revokeUrl: 'https://connect.stripe.com/oauth/deauthorize',
    clientIdEnv: 'STRIPE_CLIENT_ID',
    clientSecretEnv: 'STRIPE_SECRET_KEY',
    defaultScopes: [
      'read_write',
    ],
    availableScopes: [
      { id: 'read_write', name: 'Read/Write', description: 'Full account access', required: true },
      { id: 'read_only', name: 'Read Only', description: 'View only access', required: false },
    ],
    baseApiUrl: 'https://api.stripe.com/v1',
    supportsRefreshToken: true,
    supportsPKCE: false,
    supportsWebhooks: true,
    rateLimit: { requests: 100, period: 'second' },
    docsUrl: 'https://stripe.com/docs/api',
  },

  paypal: {
    id: 'paypal',
    name: 'PayPal',
    category: 'finance',
    authType: 'oauth2',
    authUrl: 'https://www.paypal.com/signin/authorize',
    tokenUrl: 'https://api-m.paypal.com/v1/oauth2/token',
    userInfoUrl: 'https://api-m.paypal.com/v1/identity/oauth2/userinfo',
    clientIdEnv: 'PAYPAL_CLIENT_ID',
    clientSecretEnv: 'PAYPAL_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'profile',
      'email',
      'https://uri.paypal.com/services/paypalattributes',
    ],
    availableScopes: [
      { id: 'openid', name: 'OpenID', description: 'OpenID Connect', required: true },
      { id: 'profile', name: 'Profile', description: 'View profile', required: true },
      { id: 'email', name: 'Email', description: 'View email', required: true },
      { id: 'https://uri.paypal.com/services/payments/payment', name: 'Payments', description: 'Process payments', required: false },
    ],
    baseApiUrl: 'https://api-m.paypal.com/v2',
    supportsRefreshToken: true,
    supportsPKCE: false,
    supportsWebhooks: true,
    tokenExchangeMethod: 'basic_auth',
    rateLimit: { requests: 30, period: 'second' },
    docsUrl: 'https://developer.paypal.com/docs/api/overview/',
  },

  xero: {
    id: 'xero',
    name: 'Xero',
    category: 'finance',
    authType: 'oauth2',
    authUrl: 'https://login.xero.com/identity/connect/authorize',
    tokenUrl: 'https://identity.xero.com/connect/token',
    revokeUrl: 'https://identity.xero.com/connect/revocation',
    userInfoUrl: 'https://api.xero.com/api.xro/2.0/Users',
    clientIdEnv: 'XERO_CLIENT_ID',
    clientSecretEnv: 'XERO_CLIENT_SECRET',
    defaultScopes: [
      'openid',
      'profile',
      'email',
      'accounting.transactions',
      'accounting.contacts',
      'offline_access',
    ],
    availableScopes: [
      { id: 'accounting.transactions', name: 'Transactions', description: 'View transactions', required: true },
      { id: 'accounting.contacts', name: 'Contacts', description: 'View contacts', required: true },
      { id: 'accounting.settings', name: 'Settings', description: 'View settings', required: false },
      { id: 'accounting.reports.read', name: 'Reports', description: 'View reports', required: false },
      { id: 'offline_access', name: 'Offline', description: 'Refresh token', required: true },
    ],
    baseApiUrl: 'https://api.xero.com/api.xro/2.0',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    rateLimit: { requests: 60, period: 'minute' },
    docsUrl: 'https://developer.xero.com/documentation/api/accounting/overview',
  },

  // ============================================
  // FITNESS INTEGRATIONS
  // ============================================
  strava: {
    id: 'strava',
    name: 'Strava',
    category: 'fitness',
    authType: 'oauth2',
    authUrl: 'https://www.strava.com/oauth/authorize',
    tokenUrl: 'https://www.strava.com/oauth/token',
    revokeUrl: 'https://www.strava.com/oauth/deauthorize',
    clientIdEnv: 'STRAVA_CLIENT_ID',
    clientSecretEnv: 'STRAVA_CLIENT_SECRET',
    defaultScopes: [
      'read',
      'activity:read_all',
      'profile:read_all',
    ],
    availableScopes: [
      { id: 'read', name: 'Read', description: 'View public segments and routes', required: true },
      { id: 'activity:read', name: 'Activity Read', description: 'View activities', required: true },
      { id: 'activity:read_all', name: 'Activity Read All', description: 'View all activities', required: false },
      { id: 'activity:write', name: 'Activity Write', description: 'Create activities', required: false },
      { id: 'profile:read_all', name: 'Profile Read', description: 'View full profile', required: true },
    ],
    baseApiUrl: 'https://www.strava.com/api/v3',
    supportsRefreshToken: true,
    supportsPKCE: false,
    supportsWebhooks: true,
    rateLimit: { requests: 200, period: 'minute' },
    docsUrl: 'https://developers.strava.com/docs/reference/',
  },

  fitbit: {
    id: 'fitbit',
    name: 'Fitbit',
    category: 'fitness',
    authType: 'oauth2',
    authUrl: 'https://www.fitbit.com/oauth2/authorize',
    tokenUrl: 'https://api.fitbit.com/oauth2/token',
    revokeUrl: 'https://api.fitbit.com/oauth2/revoke',
    userInfoUrl: 'https://api.fitbit.com/1/user/-/profile.json',
    clientIdEnv: 'FITBIT_CLIENT_ID',
    clientSecretEnv: 'FITBIT_CLIENT_SECRET',
    defaultScopes: [
      'activity',
      'heartrate',
      'profile',
      'sleep',
      'weight',
    ],
    availableScopes: [
      { id: 'activity', name: 'Activity', description: 'View activity data', required: true },
      { id: 'heartrate', name: 'Heart Rate', description: 'View heart rate data', required: true },
      { id: 'profile', name: 'Profile', description: 'View profile', required: true },
      { id: 'sleep', name: 'Sleep', description: 'View sleep data', required: false },
      { id: 'weight', name: 'Weight', description: 'View weight data', required: false },
      { id: 'nutrition', name: 'Nutrition', description: 'View nutrition data', required: false },
    ],
    baseApiUrl: 'https://api.fitbit.com/1',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    tokenExchangeMethod: 'basic_auth',
    rateLimit: { requests: 150, period: 'hour' },
    docsUrl: 'https://dev.fitbit.com/build/reference/web-api/',
  },

  garmin: {
    id: 'garmin',
    name: 'Garmin',
    category: 'fitness',
    authType: 'oauth1',
    authUrl: 'https://connect.garmin.com/oauthConfirm',
    tokenUrl: 'https://connectapi.garmin.com/oauth-service/oauth/access_token',
    clientIdEnv: 'GARMIN_CONSUMER_KEY',
    clientSecretEnv: 'GARMIN_CONSUMER_SECRET',
    defaultScopes: [],
    availableScopes: [
      { id: 'activities', name: 'Activities', description: 'View activities', required: true },
      { id: 'wellness', name: 'Wellness', description: 'View wellness data', required: false },
    ],
    baseApiUrl: 'https://apis.garmin.com',
    supportsRefreshToken: false,
    supportsPKCE: false,
    supportsWebhooks: true,
    docsUrl: 'https://developer.garmin.com/gc-developer-program/overview/',
  },

  // ============================================
  // PRODUCTIVITY
  // ============================================
  notion: {
    id: 'notion',
    name: 'Notion',
    category: 'productivity',
    authType: 'oauth2',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    clientIdEnv: 'NOTION_CLIENT_ID',
    clientSecretEnv: 'NOTION_CLIENT_SECRET',
    defaultScopes: [],
    availableScopes: [
      { id: 'read_content', name: 'Read Content', description: 'View content', required: true },
      { id: 'update_content', name: 'Update Content', description: 'Edit content', required: false },
      { id: 'insert_content', name: 'Insert Content', description: 'Create content', required: false },
    ],
    baseApiUrl: 'https://api.notion.com/v1',
    supportsRefreshToken: false,
    supportsPKCE: false,
    supportsWebhooks: false,
    tokenExchangeMethod: 'basic_auth',
    rateLimit: { requests: 3, period: 'second' },
    docsUrl: 'https://developers.notion.com/',
  },

  slack: {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    authType: 'oauth2',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    revokeUrl: 'https://slack.com/api/auth.revoke',
    userInfoUrl: 'https://slack.com/api/users.identity',
    clientIdEnv: 'SLACK_CLIENT_ID',
    clientSecretEnv: 'SLACK_CLIENT_SECRET',
    defaultScopes: [
      'channels:read',
      'chat:write',
      'users:read',
      'team:read',
    ],
    availableScopes: [
      { id: 'channels:read', name: 'Channels Read', description: 'View channels', required: true },
      { id: 'chat:write', name: 'Chat Write', description: 'Send messages', required: true },
      { id: 'users:read', name: 'Users Read', description: 'View users', required: true },
      { id: 'team:read', name: 'Team Read', description: 'View team info', required: false },
      { id: 'files:read', name: 'Files Read', description: 'View files', required: false },
      { id: 'files:write', name: 'Files Write', description: 'Upload files', required: false },
    ],
    baseApiUrl: 'https://slack.com/api',
    supportsRefreshToken: true,
    supportsPKCE: false,
    supportsWebhooks: true,
    rateLimit: { requests: 50, period: 'minute' },
    docsUrl: 'https://api.slack.com/docs',
  },

  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'files',
    authType: 'oauth2',
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    revokeUrl: 'https://api.dropboxapi.com/2/auth/token/revoke',
    userInfoUrl: 'https://api.dropboxapi.com/2/users/get_current_account',
    clientIdEnv: 'DROPBOX_APP_KEY',
    clientSecretEnv: 'DROPBOX_APP_SECRET',
    defaultScopes: [],
    availableScopes: [
      { id: 'files.metadata.read', name: 'Metadata Read', description: 'View file info', required: true },
      { id: 'files.content.read', name: 'Content Read', description: 'Download files', required: true },
      { id: 'files.content.write', name: 'Content Write', description: 'Upload files', required: false },
      { id: 'sharing.read', name: 'Sharing Read', description: 'View sharing settings', required: false },
    ],
    baseApiUrl: 'https://api.dropboxapi.com/2',
    supportsRefreshToken: true,
    supportsPKCE: true,
    supportsWebhooks: true,
    additionalAuthParams: {
      token_access_type: 'offline',
    },
    rateLimit: { requests: 1000, period: 'minute' },
    docsUrl: 'https://www.dropbox.com/developers/documentation',
  },

  // ============================================
  // AUTOMATION
  // ============================================
  zapier: {
    id: 'zapier',
    name: 'Zapier',
    category: 'automation',
    authType: 'webhook',
    clientIdEnv: 'ZAPIER_CLIENT_ID',
    clientSecretEnv: 'ZAPIER_CLIENT_SECRET',
    defaultScopes: [],
    availableScopes: [],
    baseApiUrl: 'https://hooks.zapier.com',
    supportsRefreshToken: false,
    supportsPKCE: false,
    supportsWebhooks: true,
    docsUrl: 'https://zapier.com/developer/documentation/v2/getting-started/',
  },

  make: {
    id: 'make',
    name: 'Make (Integromat)',
    category: 'automation',
    authType: 'api_key',
    clientIdEnv: 'MAKE_API_KEY',
    clientSecretEnv: '',
    defaultScopes: [],
    availableScopes: [],
    baseApiUrl: 'https://hook.eu1.make.com',
    supportsRefreshToken: false,
    supportsPKCE: false,
    supportsWebhooks: true,
    docsUrl: 'https://www.make.com/en/api-documentation',
  },

  n8n: {
    id: 'n8n',
    name: 'n8n',
    category: 'automation',
    authType: 'webhook',
    clientIdEnv: 'N8N_API_KEY',
    clientSecretEnv: '',
    defaultScopes: [],
    availableScopes: [],
    baseApiUrl: '', // Self-hosted, dynamic URL
    supportsRefreshToken: false,
    supportsPKCE: false,
    supportsWebhooks: true,
    docsUrl: 'https://docs.n8n.io/',
  },

  // ============================================
  // ANALYTICS
  // ============================================
  mixpanel: {
    id: 'mixpanel',
    name: 'Mixpanel',
    category: 'analytics',
    authType: 'api_key',
    clientIdEnv: 'MIXPANEL_TOKEN',
    clientSecretEnv: 'MIXPANEL_API_SECRET',
    defaultScopes: [],
    availableScopes: [],
    baseApiUrl: 'https://mixpanel.com/api/2.0',
    supportsRefreshToken: false,
    supportsPKCE: false,
    supportsWebhooks: true,
    rateLimit: { requests: 60, period: 'minute' },
    docsUrl: 'https://developer.mixpanel.com/docs',
  },

  hotjar: {
    id: 'hotjar',
    name: 'Hotjar',
    category: 'analytics',
    authType: 'api_key',
    clientIdEnv: 'HOTJAR_API_KEY',
    clientSecretEnv: '',
    defaultScopes: [],
    availableScopes: [],
    baseApiUrl: 'https://api.hotjar.com',
    supportsRefreshToken: false,
    supportsPKCE: false,
    supportsWebhooks: false,
    docsUrl: 'https://help.hotjar.com/hc/en-us/articles/115011819488',
  },
};

/**
 * Get provider configuration by ID
 */
export function getProviderConfig(providerId: string): ProviderConfig | null {
  return PROVIDER_CONFIGS[providerId] || null;
}

/**
 * Get all providers by category
 */
export function getProvidersByCategory(category: ProviderCategory): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter(p => p.category === category);
}

/**
 * Get all OAuth2 providers
 */
export function getOAuth2Providers(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter(p => p.authType === 'oauth2');
}

/**
 * Check if provider is configured (has credentials)
 */
export function isProviderConfigured(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  if (!config) return false;

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = config.clientSecretEnv ? process.env[config.clientSecretEnv] : true;

  return !!(clientId && clientSecret);
}

/**
 * Get redirect URI for provider
 */
export function getRedirectUri(providerId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl}/api/oauth/${providerId}/callback`;
}

/**
 * Build full scopes with Google API prefix
 */
export function buildGoogleScopes(scopeIds: string[]): string[] {
  return scopeIds.map(scope => {
    if (scope.startsWith('https://')) return scope;
    return `https://www.googleapis.com/auth/${scope}`;
  });
}

/**
 * Get provider credentials from environment
 */
export function getProviderCredentials(providerId: string): {
  clientId: string | undefined;
  clientSecret: string | undefined;
  configured: boolean;
} {
  const config = getProviderConfig(providerId);
  if (!config) {
    return { clientId: undefined, clientSecret: undefined, configured: false };
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = config.clientSecretEnv ? process.env[config.clientSecretEnv] : undefined;

  return {
    clientId,
    clientSecret,
    configured: !!(clientId && (clientSecret || !config.clientSecretEnv)),
  };
}

/**
 * Get all configured providers (those with credentials set)
 */
export function getConfiguredProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter(config => {
    const clientId = process.env[config.clientIdEnv];
    const clientSecret = config.clientSecretEnv ? process.env[config.clientSecretEnv] : true;
    return !!(clientId && clientSecret);
  });
}

/**
 * Get provider icon component name
 */
export function getProviderIcon(providerId: string): string {
  const iconMap: Record<string, string> = {
    // Google
    google: 'Mail',
    gmail: 'Mail',
    'google-calendar': 'Calendar',
    'google-drive': 'HardDrive',
    'google-analytics': 'BarChart2',
    youtube: 'Youtube',

    // Microsoft
    outlook: 'Mail',
    'outlook-mail': 'Mail',
    'outlook-calendar': 'Calendar',

    // CRM
    hubspot: 'Users',
    salesforce: 'Cloud',
    pipedrive: 'TrendingUp',

    // Social
    linkedin: 'Linkedin',
    instagram: 'Instagram',
    facebook: 'Facebook',
    twitter: 'Twitter',
    tiktok: 'Music',

    // Finance
    quickbooks: 'DollarSign',
    stripe: 'CreditCard',
    paypal: 'DollarSign',
    xero: 'FileText',

    // Fitness
    strava: 'Activity',
    fitbit: 'Heart',
    garmin: 'Watch',

    // Productivity
    notion: 'FileText',
    slack: 'MessageSquare',
    dropbox: 'Droplet',

    // Analytics
    mixpanel: 'PieChart',
    hotjar: 'MousePointer',

    // Automation
    zapier: 'Zap',
    make: 'GitBranch',
    n8n: 'Workflow',
  };

  return iconMap[providerId] || 'Link';
}

/**
 * Get provider description
 */
export function getProviderDescription(providerId: string): string {
  const descriptions: Record<string, string> = {
    // Google
    google: 'Access Gmail, Calendar, Drive and more Google services',
    gmail: 'Read and send emails through Gmail',
    'google-calendar': 'Manage events and calendars',
    'google-drive': 'Access files and folders in Google Drive',
    'google-analytics': 'View website analytics and reports',
    youtube: 'Manage YouTube channel and videos',

    // Microsoft
    outlook: 'Complete Microsoft 365 integration',
    'outlook-mail': 'Read and send Outlook emails',
    'outlook-calendar': 'Manage Outlook calendar events',

    // CRM
    hubspot: 'Sync contacts, deals and companies',
    salesforce: 'Access Salesforce CRM data',
    pipedrive: 'Manage sales pipeline and deals',

    // Social
    linkedin: 'Post updates and view profile',
    instagram: 'Access Instagram media and insights',
    facebook: 'Manage pages and posts',
    twitter: 'Tweet and view timeline',
    tiktok: 'Access TikTok videos and profile',

    // Finance
    quickbooks: 'Manage invoices and accounting',
    stripe: 'Access payments and subscriptions',
    paypal: 'View transactions and process payments',
    xero: 'Accounting and invoicing',

    // Fitness
    strava: 'Sync workouts and activities',
    fitbit: 'Access health and fitness data',
    garmin: 'Sync Garmin wellness data',

    // Productivity
    notion: 'Access pages and databases',
    slack: 'Send messages and access channels',
    dropbox: 'Access files and folders',

    // Analytics
    mixpanel: 'View user analytics and events',
    hotjar: 'Access heatmaps and recordings',

    // Automation
    zapier: 'Connect with Zapier workflows',
    make: 'Trigger Make scenarios',
    n8n: 'Connect to n8n workflows',
  };

  return descriptions[providerId] || 'Connect your account';
}
