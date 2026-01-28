# 🔐 SINTRA Integrations Panel - OAuth2 Design & Implementation Guide

**Status:** 📋 **Design Document**
**Version:** 2.0.0
**Date:** 2025-10-27
**Design Philosophy:** Secure, Enterprise-Grade Integration Hub

---

## 📊 Executive Summary

This document outlines a complete redesign of the Integrations Panel with full OAuth2 support for external services (Gmail, Google Calendar, Slack, GitHub, etc.), inspired by **Notion**, **Linear**, and **Vercel**.

### Key Objectives

1. ✅ **Modern Visual Design** - Glassmorphism cards, status indicators, animations
2. ✅ **OAuth2 Flow** - Secure Google/Microsoft/Slack authentication
3. ✅ **User Experience** - Clear connect/disconnect flows, error handling
4. ✅ **Enterprise Security** - Token encryption, PKCE, audit logging
5. ✅ **Accessibility** - WCAG AAA, keyboard navigation, screen readers

---

## 🎨 Visual Design Analysis

### Current State (Problems)

| Issue | Current | Impact |
|-------|---------|--------|
| **Card Design** | Basic panels, flat colors | Generic, not premium |
| **Status Indicators** | Simple badges | Unclear connection state |
| **Buttons** | Generic "Verbinden" | No brand identity (Google, etc.) |
| **No OAuth UI** | Direct API calls | No user auth flow |
| **No Loading States** | Instant connect | Confusing UX |
| **No Error Handling** | Console.error only | Users don't see failures |
| **No Profile Display** | No user info | Can't see who's connected |
| **Limited Integrations** | Only 4 services | Missing Google, Microsoft |

### Modern Design Goals

```
✨ Glassmorphism Cards with gradient borders
🎯 Real OAuth2 buttons (Google, Microsoft branding)
⚡ Loading states, success animations, error toasts
👤 Connected profile display (avatar, email, name)
🔄 Sync status indicators (last synced, syncing now)
🎨 Category tabs (Communication, Development, Productivity)
📱 Responsive grid (1/2/3 columns)
♿ Full accessibility (keyboard, screen readers)
```

---

## 🏗️ Component Structure

### Layout Hierarchy

```
<IntegrationsSection>
  <IntegrationsHeader>
    <Title + Description>
    <CategoryTabs>
      [All] [Communication] [Development] [Productivity] [Google]
    </CategoryTabs>
  </IntegrationsHeader>

  <IntegrationsGrid>
    <IntegrationCard> (glassmorphism)
      <CardHeader>
        <Icon (gradient)>
        <Title + Category Badge>
        <StatusIndicator> (Connected/Not Connected/Syncing/Error)
      </CardHeader>

      <CardBody>
        <Description>
        <FeaturesList> (scopes)

        {/* Not Connected State */}
        <OAuthButton provider="google">
          <GoogleIcon> Sign in with Google
        </OAuthButton>

        {/* Connected State */}
        <ConnectedProfile>
          <Avatar + Name + Email>
          <LastSyncTime>
          <Actions>
            [Resync] [Disconnect]
          </Actions>
        </ConnectedProfile>
      </CardBody>

      <CardFooter> (privacy, terms)
    </IntegrationCard>
  </IntegrationsGrid>

  <OAuthModal> (popup for auth flow)
  <DisconnectModal> (confirmation)
  <ErrorToast> (connection failures)
  <SuccessToast> (connection success)
</IntegrationsSection>
```

---

## 🎨 Design System - Integration Cards

### Card States & Visual Design

#### State 1: Not Connected (Default)

```
┌─────────────────────────────────────────────────┐
│  [Gmail Icon]  Gmail                  [Badge]   │
│                Email Integration                 │
├─────────────────────────────────────────────────┤
│  📧 Send and receive emails                     │
│  📅 Access calendar events                      │
│  🔔 Real-time notifications                     │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  [G] Sign in with Google                  │  │ ← Official Google button
│  └───────────────────────────────────────────┘  │
│                                                  │
│  🔒 We'll never access your data without       │
│      your permission. Learn more ›             │
└─────────────────────────────────────────────────┘

Visual Specs:
- Background: Glassmorphism (rgba(19,19,26,0.6), blur 12px)
- Border: 1px solid rgba(255,255,255,0.06)
- Border-radius: 1.25rem
- Padding: 1.5rem
- Icon: 48px gradient circle
- Google Button: Official design (#4285F4 background, white text)
```

#### State 2: Connecting (Loading)

```
┌─────────────────────────────────────────────────┐
│  [Gmail Icon]  Gmail          [Syncing Badge]   │
│                Email Integration                 │
├─────────────────────────────────────────────────┤
│                                                  │
│        [Spinner] Connecting to Google...        │
│                                                  │
│        Waiting for authorization...             │
│                                                  │
└─────────────────────────────────────────────────┘

Visual Specs:
- Spinner: 32px rotating circle (accent color)
- Text: Muted color, animated dots
- Disable all interactions
```

#### State 3: Connected (Active)

```
┌─────────────────────────────────────────────────┐
│  [Gmail Icon]  Gmail          [Connected Badge] │
│                Email Integration                 │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ [Avatar] John Doe                       │   │
│  │          john@company.com               │   │
│  │          Last synced: 2 minutes ago     │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ✅ Email sync active                           │
│  ✅ Calendar access enabled                     │
│                                                  │
│  [Resync] [Settings] [Disconnect]               │
└─────────────────────────────────────────────────┘

Visual Specs:
- Connected Badge: Green (#10B981) with glow
- Avatar: 40px circle with border
- Profile Box: Elevated surface (--inbox-surface-elevated)
- Action Buttons: Secondary style (outlined)
```

#### State 4: Error (Failed)

```
┌─────────────────────────────────────────────────┐
│  [Gmail Icon]  Gmail            [Error Badge]   │
│                Email Integration                 │
├─────────────────────────────────────────────────┤
│  ⚠️ Connection failed                           │
│                                                  │
│  Token expired or revoked. Please reconnect.   │
│                                                  │
│  [Retry Connection] [Learn More]                │
└─────────────────────────────────────────────────┘

Visual Specs:
- Error Badge: Red (#EF4444) with border
- Error Message: Red/amber text
- Retry Button: Primary style
```

---

## 🔐 OAuth2 Flow Design

### User Journey - Gmail Connection

```
Step 1: User clicks "Sign in with Google"
   ↓
Step 2: System initiates OAuth2 PKCE flow
   - Generate code_verifier (random 128 chars)
   - Create code_challenge = SHA256(code_verifier)
   - Store in session/localStorage
   ↓
Step 3: Redirect to Google OAuth consent screen
   URL: https://accounts.google.com/o/oauth2/v2/auth?
        client_id=YOUR_CLIENT_ID
        &redirect_uri=https://yourapp.com/api/oauth/google/callback
        &response_type=code
        &scope=https://www.googleapis.com/auth/gmail.readonly
                https://www.googleapis.com/auth/calendar.readonly
        &code_challenge=BASE64URL(SHA256(code_verifier))
        &code_challenge_method=S256
        &state=RANDOM_STATE_TOKEN
        &access_type=offline
        &prompt=consent
   ↓
Step 4: User approves permissions
   ↓
Step 5: Google redirects back with auth code
   URL: https://yourapp.com/api/oauth/google/callback?
        code=AUTH_CODE
        &state=STATE_TOKEN
   ↓
Step 6: Backend exchanges code for tokens
   POST https://oauth2.googleapis.com/token
   Body:
     - code: AUTH_CODE
     - code_verifier: code_verifier (from session)
     - client_id: YOUR_CLIENT_ID
     - client_secret: YOUR_CLIENT_SECRET
     - redirect_uri: SAME_AS_STEP_3
     - grant_type: authorization_code
   ↓
Step 7: Receive tokens
   Response:
     - access_token: SHORT_LIVED_TOKEN
     - refresh_token: LONG_LIVED_TOKEN
     - expires_in: 3600 (seconds)
     - scope: granted scopes
   ↓
Step 8: Store tokens securely
   - Encrypt tokens with AES-256
   - Store in database with user_id
   - Save expiry time
   - Log connection in audit trail
   ↓
Step 9: Fetch user profile
   GET https://www.googleapis.com/oauth2/v3/userinfo
   Headers: Authorization: Bearer ACCESS_TOKEN
   ↓
Step 10: Update UI
   - Show connected profile
   - Display success toast
   - Enable sync features
```

### OAuth2 Security Flow (PKCE)

```typescript
// Frontend: Initiate OAuth
const initiateOAuth = async (provider: 'google' | 'microsoft') => {
  // Generate PKCE challenge
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await sha256(codeVerifier);

  // Store verifier in session
  sessionStorage.setItem('oauth_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', generateRandomString(32));

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/api/oauth/google/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: sessionStorage.getItem('oauth_state'),
    access_type: 'offline',
    prompt: 'consent'
  });

  // Open in popup or redirect
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

// Backend: Handle callback
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  // Validate state (CSRF protection)
  if (state !== req.cookies.get('oauth_state')?.value) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: req.cookies.get('oauth_code_verifier')?.value,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google/callback`,
      grant_type: 'authorization_code'
    })
  });

  const tokens = await tokenResponse.json();

  // Encrypt and store tokens
  const encryptedAccessToken = encrypt(tokens.access_token);
  const encryptedRefreshToken = encrypt(tokens.refresh_token);

  await db.integration.upsert({
    where: { userId_provider: { userId: session.userId, provider: 'google' } },
    update: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      status: 'connected',
      connectedAt: new Date()
    },
    create: {
      userId: session.userId,
      provider: 'google',
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      status: 'connected'
    }
  });

  // Redirect back to settings with success
  return NextResponse.redirect('/settings?tab=integrations&success=google_connected');
}
```

---

## 🎨 Google Sign-In Button Design

### Official Google Button (Recommended)

```tsx
// Google Identity Services Button
<div
  id="g_id_onload"
  data-client_id="YOUR_CLIENT_ID"
  data-context="signin"
  data-ux_mode="popup"
  data-callback="handleGoogleCallback"
  data-auto_prompt="false">
</div>

<div
  className="g_id_signin"
  data-type="standard"
  data-shape="rectangular"
  data-theme="filled_blue"
  data-text="signin_with"
  data-size="large"
  data-logo_alignment="left"
  data-width="280">
</div>

// Custom styled button (matching your design system)
<button className="oauth-btn oauth-btn-google">
  <svg className="oauth-btn-icon" viewBox="0 0 48 48">
    {/* Google Logo SVG */}
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
  Sign in with Google
</button>
```

### Button Styles (CSS)

```css
/* Google OAuth Button */
.oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;

  width: 100%;
  padding: 0.75rem 1.5rem;

  font-size: 0.9375rem;
  font-weight: 500;
  font-family: 'Roboto', sans-serif;

  border-radius: 0.5rem;
  border: none;

  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.oauth-btn-google {
  background: #4285F4;
  color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.oauth-btn-google:hover {
  background: #357AE8;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.16), 0 2px 4px rgba(0, 0, 0, 0.23);
  transform: translateY(-1px);
}

.oauth-btn-google:active {
  background: #2A66C4;
  transform: translateY(0);
}

.oauth-btn-icon {
  width: 18px;
  height: 18px;
}

/* Microsoft Button */
.oauth-btn-microsoft {
  background: #2F2F2F;
  color: white;
}

.oauth-btn-microsoft:hover {
  background: #1F1F1F;
}

/* Slack Button */
.oauth-btn-slack {
  background: white;
  color: #000;
  border: 1px solid #ddd;
}

.oauth-btn-slack:hover {
  background: #f8f8f8;
}
```

---

## 📊 Integration Categories

### Category Structure

```typescript
interface IntegrationCategory {
  id: string;
  name: string;
  icon: React.ComponentType;
  color: string;
}

const categories: IntegrationCategory[] = [
  { id: 'all', name: 'All', icon: Grid, color: '#8B5CF6' },
  { id: 'communication', name: 'Communication', icon: MessageSquare, color: '#3B82F6' },
  { id: 'development', name: 'Development', icon: Code, color: '#10B981' },
  { id: 'productivity', name: 'Productivity', icon: Calendar, color: '#F59E0B' },
  { id: 'google', name: 'Google Workspace', icon: Chrome, color: '#4285F4' },
];
```

### Integration Definitions

```typescript
interface Integration {
  id: string;
  name: string;
  provider: 'google' | 'microsoft' | 'slack' | 'github' | 'vercel' | 'sentry';
  category: 'communication' | 'development' | 'productivity';
  icon: React.ComponentType;
  color: string;
  description: string;
  features: string[];
  scopes: string[];
  oauthUrl?: string;
  status: 'not_connected' | 'connecting' | 'connected' | 'error';
  connectedUser?: {
    name: string;
    email: string;
    avatar?: string;
    lastSync?: Date;
  };
}

const integrations: Integration[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    provider: 'google',
    category: 'communication',
    icon: Mail,
    color: '#EA4335',
    description: 'Send and receive emails directly from SINTRA',
    features: [
      'Read and send emails',
      'Manage labels and threads',
      'Real-time notifications',
      'Full-text search'
    ],
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ],
    status: 'not_connected'
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    provider: 'google',
    category: 'productivity',
    icon: Calendar,
    color: '#4285F4',
    description: 'Sync your calendar and schedule meetings',
    features: [
      'View and create events',
      'Manage multiple calendars',
      'Meeting reminders',
      'Availability tracking'
    ],
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    status: 'not_connected'
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    provider: 'google',
    category: 'productivity',
    icon: HardDrive,
    color: '#34A853',
    description: 'Access and manage your Google Drive files',
    features: [
      'Browse and upload files',
      'Share documents',
      'Real-time collaboration',
      'File search'
    ],
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ],
    status: 'not_connected'
  },
  // ... Microsoft, Slack, GitHub, etc.
];
```

---

## 🎬 User Interaction Flows

### Flow 1: Connect Gmail (Happy Path)

```
1. User navigates to Settings → Integrations
   UI: Shows grid of integration cards

2. User finds Gmail card (not connected state)
   UI: Shows "Sign in with Google" button

3. User clicks "Sign in with Google"
   UI: Button → Loading state ("Connecting...")
   Backend: Initiates OAuth2 PKCE flow

4. Popup/redirect opens Google consent screen
   UI: Shows Google's permission dialog
   User sees: "SINTRA wants to access your Gmail"

5. User clicks "Allow"
   Google: Redirects to callback URL with auth code

6. Backend receives callback
   - Validates state (CSRF)
   - Exchanges code for tokens
   - Encrypts and stores tokens
   - Fetches user profile

7. UI updates automatically (WebSocket or polling)
   - Card transitions to "Connected" state
   - Shows user profile (avatar, name, email)
   - Success toast: "Gmail connected successfully!"
   - Green badge: "Connected"

8. User sees sync status
   UI: "Last synced: Just now"
```

### Flow 2: Connect Gmail (Error - User Denies)

```
1-4. [Same as happy path]

5. User clicks "Deny" or closes popup
   Google: Redirects with error=access_denied

6. Backend receives error callback
   - Logs denial in audit trail
   - Returns error response

7. UI shows error state
   - Card shows error message: "Connection cancelled"
   - Info toast: "You can reconnect anytime"
   - Button returns to "Sign in with Google"
```

### Flow 3: Token Refresh (Background)

```
1. System detects token expiring soon (< 5 min)
   Cron job runs every minute checking expiresAt

2. Fetch refresh_token from database (encrypted)
   Decrypt token

3. Request new access_token
   POST https://oauth2.googleapis.com/token
   Body: {
     grant_type: 'refresh_token',
     refresh_token: DECRYPTED_REFRESH_TOKEN,
     client_id: CLIENT_ID,
     client_secret: CLIENT_SECRET
   }

4. Receive new access_token
   Response: {
     access_token: NEW_TOKEN,
     expires_in: 3600
   }

5. Encrypt and update database
   Update expiresAt timestamp

6. Log refresh in audit trail
   No user interaction needed
```

### Flow 4: Disconnect Integration

```
1. User clicks "Disconnect" button
   UI: Shows confirmation modal

2. Modal displays:
   "Disconnect Gmail?"
   "This will stop email sync and revoke access."
   [Cancel] [Disconnect]

3. User clicks "Disconnect"
   UI: Modal shows loading

4. Backend revokes tokens
   POST https://oauth2.googleapis.com/revoke
   Body: { token: access_token }

5. Delete from database
   DELETE FROM integrations WHERE id = ...

6. Log disconnection
   Audit trail entry

7. UI updates
   - Card returns to "Not Connected" state
   - Toast: "Gmail disconnected"
   - Shows "Sign in with Google" button again
```

---

## 🔒 Security Best Practices

### 1. Token Security

```typescript
// Encryption service
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  const [ivHex, authTagHex, encryptedHex] = text.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### 2. PKCE Implementation

```typescript
// Generate code verifier (128 random characters)
function generateCodeVerifier(): string {
  const array = new Uint8Array(128);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Generate code challenge
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

### 3. State Parameter (CSRF Protection)

```typescript
// Generate random state
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Store in session
sessionStorage.setItem('oauth_state', generateState());

// Validate on callback
const receivedState = req.nextUrl.searchParams.get('state');
const storedState = req.cookies.get('oauth_state')?.value;

if (receivedState !== storedState) {
  throw new Error('Invalid state parameter');
}
```

### 4. Token Rotation Strategy

```typescript
// Token refresh schedule
const refreshTokenIfNeeded = async (userId: string, provider: string) => {
  const integration = await db.integration.findUnique({
    where: { userId_provider: { userId, provider } }
  });

  if (!integration) return;

  // Refresh if expires in less than 5 minutes
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (integration.expiresAt < fiveMinutesFromNow) {
    const newTokens = await refreshAccessToken(integration.refreshToken);

    await db.integration.update({
      where: { id: integration.id },
      data: {
        accessToken: encrypt(newTokens.access_token),
        expiresAt: new Date(Date.now() + newTokens.expires_in * 1000)
      }
    });
  }
};

// Cron job (runs every minute)
cron.schedule('* * * * *', async () => {
  const expiringIntegrations = await db.integration.findMany({
    where: {
      expiresAt: { lt: new Date(Date.now() + 5 * 60 * 1000) },
      status: 'connected'
    }
  });

  for (const integration of expiringIntegrations) {
    await refreshTokenIfNeeded(integration.userId, integration.provider);
  }
});
```

### 5. Audit Logging

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: 'integration_connected' | 'integration_disconnected' | 'token_refreshed' | 'oauth_error';
  provider: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

async function logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>) {
  await db.auditLog.create({
    data: {
      ...log,
      timestamp: new Date()
    }
  });
}

// Usage
await logAudit({
  userId: session.userId,
  action: 'integration_connected',
  provider: 'google',
  ipAddress: req.headers.get('x-forwarded-for') || req.ip,
  userAgent: req.headers.get('user-agent'),
  metadata: { scopes: grantedScopes }
});
```

---

## 🎨 CSS Design System

```css
/* Integration Cards (Glassmorphism) */
.integration-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;

  /* Glassmorphism */
  background: rgba(19, 19, 26, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1.25rem;

  transition: all 350ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.integration-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.25);
  transform: translateY(-2px);
}

/* Gradient border on hover */
.integration-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg,
    var(--integration-color, #8B5CF6) 0%,
    transparent 50%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 350ms;
}

.integration-card:hover::before {
  opacity: 1;
}

/* Integration Icon */
.integration-icon {
  width: 48px;
  height: 48px;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;

  background: linear-gradient(135deg,
    var(--integration-color) 0%,
    color-mix(in srgb, var(--integration-color) 70%, black) 100%);

  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15),
              inset 0 1px 2px rgba(255, 255, 255, 0.15);

  transition: all 300ms;
}

.integration-card:hover .integration-icon {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25),
              0 0 0 4px rgba(var(--integration-color-rgb), 0.1);
}

/* Status Badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-badge.connected {
  background: rgba(16, 185, 129, 0.12);
  color: #10B981;
  border: 1px solid rgba(16, 185, 129, 0.2);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
}

.status-badge.connecting {
  background: rgba(59, 130, 246, 0.12);
  color: #3B82F6;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.status-badge.error {
  background: rgba(239, 68, 68, 0.12);
  color: #EF4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.status-badge.not-connected {
  background: rgba(107, 107, 119, 0.12);
  color: #6B6B77;
  border: 1px solid rgba(107, 107, 119, 0.2);
}

/* Connected Profile Box */
.connected-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(31, 31, 46, 0.8);
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.connected-profile-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.1);
  object-fit: cover;
}

.connected-profile-info {
  flex: 1;
}

.connected-profile-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--inbox-text-primary);
  margin: 0;
}

.connected-profile-email {
  font-size: 0.8125rem;
  color: var(--inbox-text-secondary);
  margin: 0;
}

.connected-profile-sync {
  font-size: 0.75rem;
  color: var(--inbox-text-tertiary);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

/* Feature List */
.integration-features {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.integration-feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--inbox-text-secondary);
}

.integration-feature-icon {
  width: 16px;
  height: 16px;
  color: var(--integration-color);
}

/* Loading Spinner */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 0.8s linear infinite;
  color: var(--inbox-accent-solid);
}

/* Success Animation */
@keyframes successPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
  }
}

.integration-card.success {
  animation: successPulse 1s ease-out;
}
```

---

## 📱 Responsive Design

```css
/* Desktop (1024px+) */
.integrations-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

/* Tablet (768px - 1024px) */
@media (max-width: 1024px) {
  .integrations-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }
}

/* Mobile (< 768px) */
@media (max-width: 768px) {
  .integrations-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .oauth-btn {
    padding: 0.875rem 1.25rem;
    font-size: 0.875rem;
  }

  .integration-icon {
    width: 40px;
    height: 40px;
  }

  .connected-profile {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

---

## 🔧 Database Schema

```typescript
// Drizzle ORM Schema
import { pgTable, uuid, varchar, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // 'google', 'microsoft', 'slack', etc.
  service: varchar('service', { length: 50 }).notNull(), // 'gmail', 'calendar', 'drive', etc.

  // Encrypted tokens
  accessToken: varchar('access_token', { length: 500 }).notNull(),
  refreshToken: varchar('refresh_token', { length: 500 }),
  tokenType: varchar('token_type', { length: 50 }).default('Bearer'),
  expiresAt: timestamp('expires_at').notNull(),

  // OAuth metadata
  scopes: jsonb('scopes').$type<string[]>(),

  // Connected user info
  connectedEmail: varchar('connected_email', { length: 255 }),
  connectedName: varchar('connected_name', { length: 255 }),
  connectedAvatar: varchar('connected_avatar', { length: 500 }),

  // Status
  status: varchar('status', { length: 50 }).notNull().default('connected'), // 'connected', 'error', 'revoked'
  lastSyncAt: timestamp('last_sync_at'),
  lastErrorAt: timestamp('last_error_at'),
  lastErrorMessage: varchar('last_error_message', { length: 500 }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  connectedAt: timestamp('connected_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 50 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});
```

---

## 🎯 Figma Design Prompt

```
Create a modern SaaS integrations panel with the following specifications:

LAYOUT:
- Grid: 3 columns on desktop, 2 on tablet, 1 on mobile
- Gap: 1.5rem between cards
- Header: Title + category tabs (All, Communication, Development, Productivity)

CARDS:
- Glassmorphism: rgba(19,19,26,0.6), backdrop-blur 12px
- Border: 1px solid rgba(255,255,255,0.06) with gradient on hover
- Border-radius: 1.25rem
- Padding: 1.5rem
- Hover: Lift 2px, show gradient border, scale icon 1.05

CARD STRUCTURE:
1. Header:
   - Icon: 48px gradient circle (color varies by service)
   - Title: 1rem semibold, white
   - Status badge: Connected (green) / Not Connected (gray) / Error (red)

2. Body:
   - Description: 0.875rem, muted color
   - Features list: Checkmarks + text
   - OAuth button OR Connected profile

3. OAuth Button (Not Connected):
   - Official Google design: #4285F4 background, white text
   - Google logo + "Sign in with Google"
   - Width: 100%, padding: 0.75rem
   - Hover: Darken background, lift 1px

4. Connected Profile:
   - Avatar: 40px circle
   - Name + Email: Stack vertically
   - Last sync time: Small gray text
   - Actions: [Resync] [Disconnect] buttons

COLORS:
- Background: #0A0A0F
- Card surface: rgba(19,19,26,0.6)
- Text primary: #F5F5F7
- Text secondary: #A0A0AB
- Text tertiary: #6B6B77
- Google brand: #4285F4
- Success (connected): #10B981
- Error: #EF4444

SERVICES:
- Gmail (red #EA4335)
- Google Calendar (blue #4285F4)
- Google Drive (green #34A853)
- Slack (purple #4A154B)
- GitHub (black #181717)
- Microsoft (orange #F25022)

STATES:
- Not Connected: Show OAuth button
- Connecting: Show spinner + "Connecting..."
- Connected: Show profile box with avatar
- Error: Red badge + error message + Retry button

ANIMATIONS:
- Card hover: translateY(-2px), gradient border fade in
- Icon hover: scale(1.05)
- Success connection: Green pulse animation
- Loading: Rotating spinner

ACCESSIBILITY:
- Focus rings: 2px solid accent color
- Hover states: Clear visual feedback
- Button contrast: WCAG AAA
- Keyboard navigation: Tab order, Enter/Space activation

STYLE: Linear + Notion + Vercel inspired, dark mode, enterprise premium feel
```

---

**Status:** ✅ Design Document Complete
**Next Steps:** Implementation of components, OAuth endpoints, and UI

