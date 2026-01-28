# 🔐 Phase 2: OAuth Integrations - Setup Guide

**Status:** In Progress
**Goal:** Enable Gmail and Slack integrations for Agent Studio workflows

---

## ✅ What's Been Implemented (So Far)

###1. Database Schema ✅
**File:** `lib/db/schema-integrations.ts`

**Tables Created:**
- `oauth_connections` - Stores OAuth tokens and connection details
- `integration_settings` - User preferences for each integration
- `integration_usage` - API usage logs for analytics and rate limiting

**Migration:** `lib/db/migrations/0004_integrations.sql`

---

### 2. Gmail OAuth Service ✅
**File:** `server/services/GmailOAuthService.ts`

**Features:**
- OAuth 2.0 flow (authorization + callback)
- Token management (store, refresh, validate)
- Gmail API integration (send emails)
- Usage tracking
- Error handling

**Methods:**
```typescript
getAuthUrl(userId): string
handleCallback(code, userId): Promise<{success, error?}>
sendEmail(userId, options): Promise<{success, messageId?, error?}>
isConnected(userId): Promise<boolean>
disconnect(userId): Promise<void>
```

---

### 3. OAuth API Routes ✅
**File:** `server/routes/oauth-integrations.ts`

**Endpoints:**
```
GET  /api/integrations/gmail/connect      - Start OAuth flow
GET  /api/integrations/gmail/callback     - Handle OAuth callback
GET  /api/integrations/gmail/status       - Check connection status
POST /api/integrations/gmail/disconnect   - Disconnect Gmail

GET  /api/integrations/slack/connect      - Start OAuth (TODO)
GET  /api/integrations/slack/callback     - Handle callback (TODO)
GET  /api/integrations/slack/status       - Check connection status

GET  /api/integrations                    - List all integrations
```

---

### 4. Server Registration ✅
**File:** `server/index.ts`

**Route registered:**
```typescript
app.use('/api/integrations', oauthIntegrationsRouter)
```

---

### 5. Dependencies Installed ✅
```bash
npm install googleapis @slack/web-api
```

---

## 🔧 Next Steps to Complete Gmail Integration

### Step 1: Set Up Google Cloud Console

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/

2. **Create/Select Project:**
   - Create new project: "Flowent AI Agent System"
   - Or select existing project

3. **Enable Gmail API:**
   - Navigate to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Flowent AI - Gmail Integration"

   **Authorized redirect URIs:**
   ```
   http://localhost:3001/api/integrations/gmail/callback
   http://localhost:4000/api/integrations/gmail/callback
   ```

5. **Download Credentials:**
   - Copy **Client ID**
   - Copy **Client Secret**

---

### Step 2: Add Environment Variables

Update `.env` or `.env.local`:

```bash
# Gmail OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/integrations/gmail/callback
```

---

### Step 3: Run Database Migration

```bash
# Apply the integrations migration
psql -U postgres -d flowent_ai -f lib/db/migrations/0004_integrations.sql

# Or use the migration script
npm run db:migrate
```

---

### Step 4: Update Workflow Execution Engine

**File:** `server/services/WorkflowExecutionEngine.ts`

**Update API Call Executor to use Gmail:**

```typescript
// In APICallExecutor.execute()
if (node.data.moduleType === 'api_call' && node.data.url === '/api/emails/send') {
  // Use Gmail OAuth Service instead of generic HTTP
  const gmailResult = await gmailOAuthService.sendEmail(context.userId, {
    to: this.interpolate(node.data.body.to, input),
    subject: this.interpolate(node.data.body.subject, input),
    body: this.interpolate(node.data.body.body, input),
  });

  return gmailResult.success ? gmailResult : { error: gmailResult.error };
}
```

---

### Step 5: Create Integration Settings UI

**File:** `app/(app)/settings/integrations/page.tsx` (NEW)

**Features needed:**
- List connected integrations (Gmail, Slack, Calendar)
- "Connect" buttons for each integration
- OAuth flow handling
- Disconnect functionality
- Connection status indicators

**Basic Implementation:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Check, Mail, MessageSquare, Calendar } from 'lucide-react';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState({
    gmail: false,
    slack: false,
    calendar: false,
  });

  useEffect(() => {
    // Check integration status
    fetch('/api/integrations')
      .then(res => res.json())
      .then(data => setIntegrations(data.integrations));
  }, []);

  const connectGmail = async () => {
    const response = await fetch('/api/integrations/gmail/connect');
    const { authUrl } = await response.json();
    window.location.href = authUrl; // Redirect to Google OAuth
  };

  const disconnectGmail = async () => {
    await fetch('/api/integrations/gmail/disconnect', { method: 'POST' });
    setIntegrations({ ...integrations, gmail: false });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>

      {/* Gmail */}
      <div className="border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="font-semibold">Gmail</h3>
              <p className="text-sm text-gray-600">
                Send emails from your workflows
              </p>
            </div>
          </div>

          {integrations.gmail ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                Connected
              </span>
              <button
                onClick={disconnectGmail}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectGmail}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Connect Gmail
            </button>
          )}
        </div>
      </div>

      {/* Slack - TODO */}
      {/* Calendar - TODO */}
    </div>
  );
}
```

---

## 🧪 Testing the Integration

### Test 1: Connect Gmail

1. Navigate to Settings → Integrations
2. Click "Connect Gmail"
3. Authorize in Google OAuth screen
4. Verify redirect to `/settings/integrations?connected=gmail`
5. Check status shows "Connected"

### Test 2: Send Email from Workflow

1. Build workflow:
   ```
   Manual Trigger → Customer Support AI → Send Email
   ```

2. Configure Send Email node:
   ```
   to: "test@example.com"
   subject: "Test from Agent Studio"
   body: "{{llm_response}}"
   ```

3. Save workflow
4. Test Run with input:
   ```json
   {
     "inquiry": "Hello, testing email integration!"
   }
   ```

5. Check execution logs
6. Verify email received

### Test 3: Token Refresh

1. Wait for token to expire (or manually set expiration)
2. Send another email
3. Verify token refreshes automatically
4. Check logs for "Token expired, refreshing..."

---

## 🔒 Security Considerations

### Token Storage:
```typescript
// TODO: Encrypt tokens before storing in production
import crypto from 'crypto';

function encryptToken(token: string): string {
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'),
    iv
  );
  // ... encryption logic
}
```

### Rate Limiting:
- Gmail API: 250 emails/day (free tier)
- Implemented usage tracking in `integration_usage` table
- Add rate limit checks before sending

### OAuth Scopes:
Current scopes:
- `gmail.send` - Send emails only
- `gmail.readonly` - Read emails (for future features)

Minimal scope principle: Only request what's needed.

---

## 📊 Monitoring & Analytics

### Usage Tracking:
```sql
-- Most active integrations
SELECT provider, COUNT(*) as usage_count
FROM integration_usage
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider
ORDER BY usage_count DESC;

-- Error rates
SELECT provider,
       COUNT(*) as total,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
       ROUND(100.0 * SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) / COUNT(*), 2) as error_rate
FROM integration_usage
GROUP BY provider;
```

---

## 🚀 Roadmap

### ✅ Phase 2.1: Gmail Integration (Current)
- [x] Database schema
- [x] Gmail OAuth service
- [x] API routes
- [ ] Environment setup
- [ ] Database migration
- [ ] Workflow engine integration
- [ ] Settings UI
- [ ] Testing

### 📋 Phase 2.2: Slack Integration (Next)
- [ ] Slack OAuth service
- [ ] Slack Web API integration
- [ ] Send message functionality
- [ ] Channel/User selection UI

### 📋 Phase 2.3: Calendar Integration (Future)
- [ ] Google Calendar OAuth
- [ ] Create event functionality
- [ ] Schedule workflow triggers

---

## 💡 Tips

1. **Test with Personal Account First:**
   - Use your personal Gmail for initial testing
   - Switch to workspace account for production

2. **OAuth Consent Screen:**
   - Fill out "OAuth consent screen" in Google Cloud
   - Mark as "Internal" for testing
   - Submit for verification for public use

3. **Redirect URI:**
   - Must match exactly in Google Cloud Console
   - Include both localhost URLs for dev
   - Add production URL before deploying

4. **Token Expiration:**
   - Access tokens expire after 1 hour
   - Refresh tokens last indefinitely (until revoked)
   - Service handles refresh automatically

---

## 📚 Resources

- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Reference](https://developers.google.com/gmail/api/reference/rest)
- [googleapis Node.js](https://github.com/googleapis/google-api-nodejs-client)
- [Slack OAuth Guide](https://api.slack.com/authentication/oauth-v2)

---

**Status:** Ready for environment setup and testing!

**Next Action:** Set up Google Cloud Console credentials and add to `.env`
