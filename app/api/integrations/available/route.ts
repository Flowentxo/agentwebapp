/**
 * Available Providers API
 * GET /api/integrations/available - Get all available OAuth providers
 * GET /api/integrations/available?category=crm - Get providers by category
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  PROVIDER_CONFIGS,
  isProviderConfigured,
  type ProviderCategory,
} from '@/lib/integrations/providers/provider-config';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const category = request.nextUrl.searchParams.get('category') as ProviderCategory | null;
    const onlyConfigured = request.nextUrl.searchParams.get('configured') === 'true';
    const onlyOAuth2 = request.nextUrl.searchParams.get('oauth2') === 'true';

    let providers = Object.entries(PROVIDER_CONFIGS);

    // Filter by category
    if (category) {
      providers = providers.filter(([, config]) => config.category === category);
    }

    // Filter to only OAuth2 providers
    if (onlyOAuth2) {
      providers = providers.filter(([, config]) => config.authType === 'oauth2');
    }

    // Map to response format
    const result = providers.map(([key, config]) => {
      const configured = isProviderConfigured(key);

      return {
        id: key,
        name: config.name,
        category: config.category,
        icon: config.icon,
        description: config.description,
        authType: config.authType,
        configured,
        scopes: config.scopes,
        features: getProviderFeatures(key),
      };
    });

    // Filter to only configured providers if requested
    const filteredResult = onlyConfigured
      ? result.filter(p => p.configured)
      : result;

    // Group by category
    const byCategory: Record<string, typeof filteredResult> = {};
    for (const provider of filteredResult) {
      if (!byCategory[provider.category]) {
        byCategory[provider.category] = [];
      }
      byCategory[provider.category].push(provider);
    }

    // Get category info
    const categories = [
      { id: 'communication', name: 'Communication', icon: 'Mail', description: 'Email, messaging, and communication tools' },
      { id: 'productivity', name: 'Productivity', icon: 'Layout', description: 'Productivity and collaboration tools' },
      { id: 'crm', name: 'CRM', icon: 'Users', description: 'Customer relationship management' },
      { id: 'social', name: 'Social Media', icon: 'Share2', description: 'Social media platforms' },
      { id: 'analytics', name: 'Analytics', icon: 'BarChart2', description: 'Analytics and tracking tools' },
      { id: 'finance', name: 'Finance', icon: 'DollarSign', description: 'Financial and accounting tools' },
      { id: 'fitness', name: 'Fitness', icon: 'Activity', description: 'Health and fitness tracking' },
      { id: 'storage', name: 'Storage', icon: 'HardDrive', description: 'Cloud storage providers' },
      { id: 'automation', name: 'Automation', icon: 'Zap', description: 'Workflow automation tools' },
    ];

    return NextResponse.json({
      providers: filteredResult,
      byCategory,
      categories,
      summary: {
        total: filteredResult.length,
        configured: filteredResult.filter(p => p.configured).length,
        oauth2: filteredResult.filter(p => p.authType === 'oauth2').length,
      },
    });
  } catch (error: any) {
    console.error(`[PROVIDERS_GET] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to get providers' },
      { status: 500 }
    );
  }
}

/**
 * Get features/capabilities for a provider
 */
function getProviderFeatures(provider: string): string[] {
  const features: Record<string, string[]> = {
    // Google
    google: ['Email', 'Calendar', 'Drive', 'Contacts'],
    gmail: ['Read emails', 'Send emails', 'Labels', 'Threads'],
    google_calendar: ['View events', 'Create events', 'Calendars'],
    google_drive: ['Files', 'Folders', 'Search', 'Download'],
    google_analytics: ['Reports', 'Real-time data', 'Audience insights'],
    youtube: ['Videos', 'Channels', 'Analytics'],

    // Microsoft
    microsoft: ['Outlook', 'Calendar', 'OneDrive', 'Contacts'],
    outlook: ['Read emails', 'Send emails', 'Folders'],
    outlook_calendar: ['View events', 'Create events', 'Calendars'],
    onedrive: ['Files', 'Folders', 'Search', 'Sharing'],

    // CRM
    hubspot: ['Contacts', 'Deals', 'Companies', 'Pipelines'],
    salesforce: ['Contacts', 'Opportunities', 'Accounts', 'SOQL'],
    pipedrive: ['Persons', 'Deals', 'Organizations', 'Activities'],

    // Social
    linkedin: ['Profile', 'Posts', 'Company pages'],
    twitter: ['Tweets', 'Mentions', 'Direct messages'],
    facebook: ['Pages', 'Posts', 'Insights'],
    instagram: ['Media', 'Insights', 'Stories'],
    tiktok: ['Videos', 'Profile', 'Analytics'],

    // Finance
    quickbooks: ['Invoices', 'Customers', 'Payments', 'Reports'],
    stripe: ['Customers', 'Payments', 'Subscriptions', 'Products'],
    paypal: ['Transactions', 'Orders', 'Payouts'],
    xero: ['Invoices', 'Contacts', 'Accounts', 'Reports'],

    // Fitness
    strava: ['Activities', 'Stats', 'Segments', 'Clubs'],
    fitbit: ['Activity', 'Sleep', 'Heart rate', 'Nutrition'],
    garmin: ['Activities', 'Wellness', 'Sleep', 'Heart rate'],

    // Productivity
    notion: ['Pages', 'Databases', 'Blocks', 'Search'],
    slack: ['Messages', 'Channels', 'Users', 'Files'],
    dropbox: ['Files', 'Folders', 'Sharing', 'Paper'],

    // Analytics
    mixpanel: ['Events', 'Funnels', 'Retention', 'Profiles'],
    hotjar: ['Heatmaps', 'Recordings', 'Surveys', 'Feedback'],
  };

  return features[provider] || [];
}
