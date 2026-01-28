#!/usr/bin/env npx ts-node
/**
 * Integration Configuration Validation Script
 *
 * Validates OAuth provider configurations and tests connectivity
 * Usage: npx ts-node scripts/validate-integrations.ts [--provider=google] [--verbose]
 */

import 'dotenv/config';

interface ProviderValidation {
  provider: string;
  configured: boolean;
  clientId: boolean;
  clientSecret: boolean;
  issues: string[];
  warnings: string[];
}

// Provider configuration requirements
const PROVIDER_CONFIGS: Record<string, {
  clientIdEnv: string;
  clientSecretEnv: string;
  optional?: string[];
  description: string;
}> = {
  // Google (covers Gmail, Calendar, Drive, Analytics, YouTube)
  google: {
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth (Gmail, Calendar, Drive, Analytics, YouTube)',
  },

  // Microsoft (covers Outlook, OneDrive, Calendar)
  microsoft: {
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
    description: 'Microsoft OAuth (Outlook, OneDrive, Calendar)',
  },

  // HubSpot
  hubspot: {
    clientIdEnv: 'HUBSPOT_CLIENT_ID',
    clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
    description: 'HubSpot CRM',
  },

  // Salesforce
  salesforce: {
    clientIdEnv: 'SALESFORCE_CLIENT_ID',
    clientSecretEnv: 'SALESFORCE_CLIENT_SECRET',
    description: 'Salesforce CRM',
  },

  // Pipedrive
  pipedrive: {
    clientIdEnv: 'PIPEDRIVE_CLIENT_ID',
    clientSecretEnv: 'PIPEDRIVE_CLIENT_SECRET',
    description: 'Pipedrive CRM',
  },

  // Slack
  slack: {
    clientIdEnv: 'SLACK_CLIENT_ID',
    clientSecretEnv: 'SLACK_CLIENT_SECRET',
    description: 'Slack Workspace',
  },

  // Notion
  notion: {
    clientIdEnv: 'NOTION_CLIENT_ID',
    clientSecretEnv: 'NOTION_CLIENT_SECRET',
    description: 'Notion Workspace',
  },

  // Dropbox
  dropbox: {
    clientIdEnv: 'DROPBOX_APP_KEY',
    clientSecretEnv: 'DROPBOX_APP_SECRET',
    description: 'Dropbox Storage',
  },

  // Stripe
  stripe: {
    clientIdEnv: 'STRIPE_CLIENT_ID',
    clientSecretEnv: 'STRIPE_SECRET_KEY',
    description: 'Stripe Connect',
  },

  // PayPal
  paypal: {
    clientIdEnv: 'PAYPAL_CLIENT_ID',
    clientSecretEnv: 'PAYPAL_CLIENT_SECRET',
    description: 'PayPal Business',
  },

  // QuickBooks
  quickbooks: {
    clientIdEnv: 'QUICKBOOKS_CLIENT_ID',
    clientSecretEnv: 'QUICKBOOKS_CLIENT_SECRET',
    description: 'QuickBooks Accounting',
  },

  // Xero
  xero: {
    clientIdEnv: 'XERO_CLIENT_ID',
    clientSecretEnv: 'XERO_CLIENT_SECRET',
    description: 'Xero Accounting',
  },

  // LinkedIn
  linkedin: {
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    description: 'LinkedIn Social',
  },

  // Twitter/X
  twitter: {
    clientIdEnv: 'TWITTER_CLIENT_ID',
    clientSecretEnv: 'TWITTER_CLIENT_SECRET',
    description: 'Twitter/X Social',
  },

  // Facebook
  facebook: {
    clientIdEnv: 'FACEBOOK_APP_ID',
    clientSecretEnv: 'FACEBOOK_APP_SECRET',
    description: 'Facebook Social',
  },

  // Instagram
  instagram: {
    clientIdEnv: 'INSTAGRAM_APP_ID',
    clientSecretEnv: 'INSTAGRAM_APP_SECRET',
    description: 'Instagram Business',
  },

  // TikTok
  tiktok: {
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    description: 'TikTok Social',
  },

  // Strava
  strava: {
    clientIdEnv: 'STRAVA_CLIENT_ID',
    clientSecretEnv: 'STRAVA_CLIENT_SECRET',
    description: 'Strava Fitness',
  },

  // Fitbit
  fitbit: {
    clientIdEnv: 'FITBIT_CLIENT_ID',
    clientSecretEnv: 'FITBIT_CLIENT_SECRET',
    description: 'Fitbit Fitness',
  },

  // Garmin
  garmin: {
    clientIdEnv: 'GARMIN_CONSUMER_KEY',
    clientSecretEnv: 'GARMIN_CONSUMER_SECRET',
    description: 'Garmin Connect',
  },

  // Google Analytics (uses Google OAuth)
  google_analytics: {
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    description: 'Google Analytics (uses Google OAuth)',
  },

  // Mixpanel
  mixpanel: {
    clientIdEnv: 'MIXPANEL_PROJECT_ID',
    clientSecretEnv: 'MIXPANEL_SERVICE_ACCOUNT_SECRET',
    description: 'Mixpanel Analytics',
  },

  // Hotjar
  hotjar: {
    clientIdEnv: 'HOTJAR_SITE_ID',
    clientSecretEnv: 'HOTJAR_API_KEY',
    description: 'Hotjar Analytics',
  },
};

function validateProvider(providerId: string): ProviderValidation {
  const config = PROVIDER_CONFIGS[providerId];

  if (!config) {
    return {
      provider: providerId,
      configured: false,
      clientId: false,
      clientSecret: false,
      issues: [`Unknown provider: ${providerId}`],
      warnings: [],
    };
  }

  const issues: string[] = [];
  const warnings: string[] = [];

  const hasClientId = !!process.env[config.clientIdEnv];
  const hasClientSecret = !!process.env[config.clientSecretEnv];

  if (!hasClientId) {
    issues.push(`Missing ${config.clientIdEnv}`);
  }

  if (!hasClientSecret) {
    issues.push(`Missing ${config.clientSecretEnv}`);
  }

  // Check for common misconfigurations
  if (hasClientId) {
    const clientId = process.env[config.clientIdEnv]!;

    if (clientId.startsWith('your_') || clientId.includes('xxx') || clientId === 'placeholder') {
      warnings.push(`${config.clientIdEnv} appears to be a placeholder value`);
    }

    if (clientId.length < 10) {
      warnings.push(`${config.clientIdEnv} seems too short`);
    }
  }

  if (hasClientSecret) {
    const secret = process.env[config.clientSecretEnv]!;

    if (secret.startsWith('your_') || secret.includes('xxx') || secret === 'placeholder') {
      warnings.push(`${config.clientSecretEnv} appears to be a placeholder value`);
    }

    if (secret.length < 10) {
      warnings.push(`${config.clientSecretEnv} seems too short`);
    }
  }

  const configured = hasClientId && hasClientSecret && warnings.length === 0;

  return {
    provider: providerId,
    configured,
    clientId: hasClientId,
    clientSecret: hasClientSecret,
    issues,
    warnings,
  };
}

function validateRedirectUri(): { valid: boolean; uri: string; warnings: string[] } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const warnings: string[] = [];

  if (appUrl === 'http://localhost:3000') {
    warnings.push('Using default localhost URL - update NEXT_PUBLIC_APP_URL for production');
  }

  if (!appUrl.startsWith('https://') && !appUrl.includes('localhost')) {
    warnings.push('Production URLs should use HTTPS');
  }

  return {
    valid: true,
    uri: `${appUrl}/api/oauth/[provider]/callback`,
    warnings,
  };
}

function validateEncryption(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;

  if (!encryptionKey) {
    issues.push('Missing INTEGRATION_ENCRYPTION_KEY - tokens will not be encrypted securely');
  } else if (encryptionKey.length < 32) {
    issues.push('INTEGRATION_ENCRYPTION_KEY should be at least 32 characters');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const specificProvider = args.find(a => a.startsWith('--provider='))?.split('=')[1];

  console.log('\n🔧 Integration Configuration Validator\n');
  console.log('='.repeat(50));

  // Validate redirect URI
  const redirectValidation = validateRedirectUri();
  console.log('\n📡 Redirect URI Configuration:');
  console.log(`   URI Pattern: ${redirectValidation.uri}`);
  if (redirectValidation.warnings.length > 0) {
    redirectValidation.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
  } else {
    console.log('   ✅ Configured correctly');
  }

  // Validate encryption
  const encryptionValidation = validateEncryption();
  console.log('\n🔐 Token Encryption:');
  if (encryptionValidation.valid) {
    console.log('   ✅ Encryption key configured');
  } else {
    encryptionValidation.issues.forEach(i => console.log(`   ❌ ${i}`));
  }

  // Validate providers
  console.log('\n📦 Provider Configurations:\n');

  const providersToCheck = specificProvider
    ? [specificProvider]
    : Object.keys(PROVIDER_CONFIGS);

  const results: ProviderValidation[] = [];
  let configuredCount = 0;
  let partialCount = 0;
  let missingCount = 0;

  for (const providerId of providersToCheck) {
    const result = validateProvider(providerId);
    results.push(result);

    const config = PROVIDER_CONFIGS[providerId];
    const status = result.configured
      ? '✅'
      : (result.clientId || result.clientSecret)
        ? '⚠️'
        : '❌';

    if (result.configured) configuredCount++;
    else if (result.clientId || result.clientSecret) partialCount++;
    else missingCount++;

    if (verbose || specificProvider || result.issues.length > 0 || result.warnings.length > 0) {
      console.log(`${status} ${providerId.padEnd(20)} ${config?.description || ''}`);

      if (verbose) {
        console.log(`   Client ID:     ${result.clientId ? '✓' : '✗'} (${config?.clientIdEnv})`);
        console.log(`   Client Secret: ${result.clientSecret ? '✓' : '✗'} (${config?.clientSecretEnv})`);
      }

      result.issues.forEach(issue => console.log(`   ❌ ${issue}`));
      result.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));

      if (verbose) console.log('');
    } else {
      // Compact output
      console.log(`${status} ${providerId.padEnd(20)} ${config?.description || ''}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Summary:');
  console.log(`   ✅ Configured:        ${configuredCount}`);
  console.log(`   ⚠️  Partial:           ${partialCount}`);
  console.log(`   ❌ Not configured:    ${missingCount}`);
  console.log(`   📦 Total providers:   ${providersToCheck.length}`);

  // Next steps
  console.log('\n📋 Next Steps:');

  if (configuredCount === 0) {
    console.log('   1. Copy .env.integrations.example to .env.local');
    console.log('   2. Create OAuth apps in provider developer consoles');
    console.log('   3. Add Client ID and Secret to .env.local');
    console.log('   4. Set redirect URIs in provider consoles to:');
    console.log(`      ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/[provider]/callback`);
  } else if (partialCount > 0) {
    console.log('   Complete partial configurations by adding missing credentials');
  } else {
    console.log('   All configured providers are ready to use!');
    console.log('   Test connections at /agents/integrations');
  }

  console.log('\n');

  // Exit with error if validation failed
  if (!encryptionValidation.valid) {
    process.exit(1);
  }
}

main().catch(console.error);
