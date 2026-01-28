# Integration Setup Guide

This guide explains how to configure OAuth providers for the AI Agent System.

## Quick Start

1. Copy `.env.integrations.example` to `.env.local`
2. Follow the provider-specific instructions below to obtain credentials
3. Add credentials to `.env.local`
4. Run `npx ts-node scripts/validate-integrations.ts` to verify configuration
5. Restart the application

## Provider Configuration

### Google (Gmail, Calendar, Drive, Analytics, YouTube)

**Console:** https://console.cloud.google.com/apis/credentials

**Steps:**
1. Create a new project or select existing
2. Enable required APIs:
   - Gmail API
   - Google Calendar API
   - Google Drive API
   - Google Analytics Data API (for Analytics)
   - YouTube Data API v3 (for YouTube)
3. Go to "Credentials" > "Create Credentials" > "OAuth Client ID"
4. Application type: "Web application"
5. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/oauth/google/callback
   http://localhost:3000/api/oauth/gmail/callback
   http://localhost:3000/api/oauth/google_calendar/callback
   http://localhost:3000/api/oauth/google_drive/callback
   http://localhost:3000/api/oauth/google_analytics/callback
   http://localhost:3000/api/oauth/youtube/callback
   ```
6. Copy Client ID and Client Secret

**Environment Variables:**
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

### Microsoft (Outlook, OneDrive, Calendar)

**Console:** https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps

**Steps:**
1. Register a new application
2. Set "Supported account types" to "Accounts in any organizational directory and personal Microsoft accounts"
3. Add redirect URI:
   - Platform: Web
   - URI: `http://localhost:3000/api/oauth/microsoft/callback`
4. Go to "Certificates & secrets" > "New client secret"
5. Go to "API permissions" and add:
   - Microsoft Graph: User.Read, Mail.Read, Mail.Send, Calendars.Read, Calendars.ReadWrite, Files.Read, Files.ReadWrite

**Environment Variables:**
```bash
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret-value
```

---

### HubSpot

**Console:** https://developers.hubspot.com/

**Steps:**
1. Create a developer account
2. Create a new app
3. Go to "Auth" tab
4. Add redirect URI: `http://localhost:3000/api/oauth/hubspot/callback`
5. Select required scopes:
   - crm.objects.contacts.read
   - crm.objects.contacts.write
   - crm.objects.deals.read
   - crm.objects.deals.write
   - crm.objects.companies.read
   - sales-email-read
6. Copy Client ID and Client Secret

**Environment Variables:**
```bash
HUBSPOT_CLIENT_ID=your-client-id
HUBSPOT_CLIENT_SECRET=your-client-secret
```

---

### Salesforce

**Console:** https://developer.salesforce.com/

**Steps:**
1. Create a Connected App in Setup
2. Enable OAuth Settings
3. Add callback URL: `http://localhost:3000/api/oauth/salesforce/callback`
4. Select OAuth Scopes:
   - Access and manage your data (api)
   - Perform requests on your behalf at any time (refresh_token, offline_access)
   - Access your basic information (id, profile, email, address, phone)
5. Save and wait for Consumer Key activation

**Environment Variables:**
```bash
SALESFORCE_CLIENT_ID=your-consumer-key
SALESFORCE_CLIENT_SECRET=your-consumer-secret
```

---

### Slack

**Console:** https://api.slack.com/apps

**Steps:**
1. Create a new app "From scratch"
2. Go to "OAuth & Permissions"
3. Add redirect URL: `http://localhost:3000/api/oauth/slack/callback`
4. Add Bot Token Scopes:
   - channels:read
   - chat:write
   - users:read
   - users:read.email
   - channels:history
   - im:history
5. Install to workspace

**Environment Variables:**
```bash
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
```

---

### Notion

**Console:** https://www.notion.so/my-integrations

**Steps:**
1. Create a new integration
2. Set as "Public" integration
3. Add redirect URI: `http://localhost:3000/api/oauth/notion/callback`
4. Select capabilities:
   - Read content
   - Update content
   - Insert content
   - Read user information

**Environment Variables:**
```bash
NOTION_CLIENT_ID=your-oauth-client-id
NOTION_CLIENT_SECRET=your-oauth-client-secret
```

---

### Dropbox

**Console:** https://www.dropbox.com/developers/apps

**Steps:**
1. Create app with "Full Dropbox" access
2. Add redirect URI: `http://localhost:3000/api/oauth/dropbox/callback`
3. Enable permissions:
   - files.content.read
   - files.content.write
   - sharing.read

**Environment Variables:**
```bash
DROPBOX_APP_KEY=your-app-key
DROPBOX_APP_SECRET=your-app-secret
```

---

### Stripe (Connect)

**Console:** https://dashboard.stripe.com/settings/connect

**Steps:**
1. Enable Connect in your Stripe account
2. Go to Settings > Connect settings
3. Configure redirect URI: `http://localhost:3000/api/oauth/stripe/callback`
4. Copy your platform's client ID

**Environment Variables:**
```bash
STRIPE_CLIENT_ID=ca_xxxxx
STRIPE_SECRET_KEY=flwnt_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

---

### PayPal

**Console:** https://developer.paypal.com/developer/applications

**Steps:**
1. Create app (Sandbox for testing, Live for production)
2. Note the Client ID and Secret
3. Add return URL: `http://localhost:3000/api/oauth/paypal/callback`
4. Enable features: "Accept Payments", "Log In with PayPal"

**Environment Variables:**
```bash
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret
PAYPAL_MODE=sandbox  # or 'live' for production
```

---

### QuickBooks

**Console:** https://developer.intuit.com/app/developer/dashboard

**Steps:**
1. Create an app
2. Select "Accounting" for APIs
3. Add redirect URI: `http://localhost:3000/api/oauth/quickbooks/callback`
4. Select scopes:
   - com.intuit.quickbooks.accounting

**Environment Variables:**
```bash
QUICKBOOKS_CLIENT_ID=your-client-id
QUICKBOOKS_CLIENT_SECRET=your-client-secret
QUICKBOOKS_ENVIRONMENT=sandbox  # or 'production'
```

---

### LinkedIn

**Console:** https://www.linkedin.com/developers/apps

**Steps:**
1. Create an app
2. Request "Sign In with LinkedIn" product
3. Add redirect URL: `http://localhost:3000/api/oauth/linkedin/callback`
4. Note the Client ID and Secret

**Environment Variables:**
```bash
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
```

---

### Twitter/X

**Console:** https://developer.twitter.com/en/portal/dashboard

**Steps:**
1. Create a project and app
2. Enable OAuth 2.0 (with PKCE)
3. Set app type to "Web App"
4. Add callback URL: `http://localhost:3000/api/oauth/twitter/callback`
5. Select scopes: tweet.read, users.read, offline.access

**Environment Variables:**
```bash
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret
```

---

### Facebook / Instagram

**Console:** https://developers.facebook.com/apps

**Steps:**
1. Create an app (Business type)
2. Add "Facebook Login" and "Instagram Basic Display" products
3. Configure OAuth redirect URIs:
   - `http://localhost:3000/api/oauth/facebook/callback`
   - `http://localhost:3000/api/oauth/instagram/callback`
4. Request permissions through App Review for production

**Environment Variables:**
```bash
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
INSTAGRAM_APP_ID=your-app-id  # Usually same as Facebook
INSTAGRAM_APP_SECRET=your-app-secret
```

---

### Strava

**Console:** https://www.strava.com/settings/api

**Steps:**
1. Create an application
2. Add callback domain: `localhost` (for dev) or your production domain
3. Set authorization callback: `http://localhost:3000/api/oauth/strava/callback`

**Environment Variables:**
```bash
STRAVA_CLIENT_ID=your-client-id
STRAVA_CLIENT_SECRET=your-client-secret
```

---

### Fitbit

**Console:** https://dev.fitbit.com/apps

**Steps:**
1. Register an application
2. OAuth 2.0 Application Type: "Server"
3. Callback URL: `http://localhost:3000/api/oauth/fitbit/callback`
4. Select scopes: activity, heartrate, profile, sleep, weight

**Environment Variables:**
```bash
FITBIT_CLIENT_ID=your-client-id
FITBIT_CLIENT_SECRET=your-client-secret
```

---

## Security Configuration

### Token Encryption

Generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env.local`:
```bash
INTEGRATION_ENCRYPTION_KEY=your-64-character-hex-key
```

### Production URLs

Update for production deployment:
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Then update all redirect URIs in provider consoles to use HTTPS.

---

## Testing Connections

### Using the Validation Script

```bash
# Validate all providers
npx ts-node scripts/validate-integrations.ts

# Validate specific provider
npx ts-node scripts/validate-integrations.ts --provider=google

# Verbose output
npx ts-node scripts/validate-integrations.ts --verbose
```

### Testing OAuth Flow

1. Start the application: `npm run dev`
2. Navigate to `/agents/integrations`
3. Click on a provider to connect
4. Complete OAuth authorization
5. Check connection status on the integrations page

---

## Troubleshooting

### Common Issues

**"Provider not configured" error:**
- Ensure environment variables are set in `.env.local`
- Restart the Next.js dev server after adding variables

**"Invalid redirect URI" error:**
- Check that the callback URL in your provider console matches exactly
- Ensure no trailing slashes
- For localhost, some providers require `http://` not `https://`

**"Token exchange failed" error:**
- Verify client secret is correct
- Check that all required scopes are enabled in provider console

**"Access denied" error:**
- User may have denied the authorization
- Check if app requires verification/review (Google, Facebook, etc.)

### Debug Logging

Enable verbose logging:
```bash
DEBUG=oauth:* npm run dev
```

Check server logs for `[OAUTH_*]` prefixed messages.

---

## Support

For issues with specific providers, check their developer documentation:

- Google: https://developers.google.com/identity/protocols/oauth2
- Microsoft: https://docs.microsoft.com/en-us/azure/active-directory/develop/
- HubSpot: https://developers.hubspot.com/docs/api/oauth-quickstart-guide
- Slack: https://api.slack.com/authentication/oauth-v2
- Notion: https://developers.notion.com/docs/authorization
