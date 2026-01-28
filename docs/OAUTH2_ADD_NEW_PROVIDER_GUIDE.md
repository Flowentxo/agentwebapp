# 🔌 OAuth2 - Adding New Providers Guide

## Quick Steps to Add Microsoft/Slack/GitHub

### 1. Add Provider Credentials (5 min)

```bash
# .env.local
MICROSOFT_CLIENT_ID=your-id
MICROSOFT_CLIENT_SECRET=your-secret

SLACK_CLIENT_ID=your-id
SLACK_CLIENT_SECRET=your-secret

GITHUB_CLIENT_ID=your-id
GITHUB_CLIENT_SECRET=your-secret
```

### 2. Add to oauth.ts (10 min)

**File:** `lib/auth/oauth.ts`

```typescript
// Add provider config
const OAUTH_PROVIDERS = {
  google: { /* existing */ },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    userInfoUrl: 'https://slack.com/api/users.identity',
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },
};
```

### 3. Create API Endpoints (5 min each)

**Copy existing Google endpoints:**

```bash
# Create Microsoft endpoints
cp -r app/api/oauth/google app/api/oauth/microsoft

# Create Slack endpoints
cp -r app/api/oauth/google app/api/oauth/slack

# Create GitHub endpoints
cp -r app/api/oauth/google app/api/oauth/github

# Update provider name in each
```

### 4. Add Integration Definitions (10 min)

**File:** `lib/integrations/definitions.tsx`

```typescript
{
  id: 'microsoft-outlook',
  name: 'Outlook',
  provider: 'microsoft',
  service: 'outlook',
  category: 'communication',
  icon: Mail,
  color: '#0078D4',
  description: 'Connect Outlook email',
  features: ['Email sync', 'Calendar', 'Contacts'],
  scopes: [
    { scope: 'Mail.ReadWrite', description: 'Access mail', required: true },
    { scope: 'Mail.Send', description: 'Send mail', required: true },
  ],
}
```

### 5. Test New Provider (10 min)

```bash
# Start dev server
npm run dev

# Navigate to integrations
# Click "Sign in with Microsoft"
# Complete OAuth flow
# Verify in database
```

---

## Provider-Specific Notes

### Microsoft
- Requires tenant ID in auth URL
- Uses Graph API for user info
- Scopes: `Mail.ReadWrite`, `Calendars.ReadWrite`

### Slack
- Workspace-based authentication
- Bot vs User tokens
- Scopes: `chat:write`, `channels:read`

### GitHub
- Personal vs Organization access
- Scopes: `repo`, `read:user`, `workflow`

---

**Total Time: ~45 minutes per provider**
**Difficulty: Easy** (copy existing Google implementation)

---

**Last Updated:** 2025-10-27
