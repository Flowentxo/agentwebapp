# 🧪 OAuth2 Integration - Manual Test Checklist

**Version:** 1.0.0
**Date:** 2025-10-27
**Tester:** _______________
**Environment:** ☐ Dev ☐ Staging ☐ Production

---

## 📋 Pre-Test Setup

### ☐ Environment Configuration
- [ ] `.env.local` file created with all required variables
- [ ] `ENCRYPTION_KEY` generated (64 characters)
- [ ] `GOOGLE_CLIENT_ID` configured
- [ ] `GOOGLE_CLIENT_SECRET` configured
- [ ] `NEXT_PUBLIC_APP_URL` set correctly
- [ ] `DATABASE_URL` accessible

### ☐ Database Setup
- [ ] Migration script executed successfully
- [ ] `integrations` table exists
- [ ] Indexes created (user, status, expires, provider)
- [ ] Trigger for `updated_at` working

### ☐ Google Cloud Console Setup
- [ ] OAuth 2.0 Client created
- [ ] Authorized redirect URIs configured:
  - [ ] `http://localhost:3000/api/oauth/google/callback` (Dev)
  - [ ] `https://yourdomain.com/api/oauth/google/callback` (Prod)
- [ ] APIs enabled:
  - [ ] Gmail API
  - [ ] Google Calendar API
  - [ ] Google Drive API
- [ ] Test users added (if in testing mode)

### ☐ Application Running
- [ ] Dev server running: `npm run dev`
- [ ] No compilation errors
- [ ] `/settings` page loads
- [ ] Integrations tab visible

---

## 🎯 Test Cases

## 1. UI/UX Tests

### 1.1 Integrations Page Load
- [ ] Navigate to `/settings?tab=integrations`
- [ ] Page loads without errors
- [ ] Header displays "Integrationen"
- [ ] Stats show correct counts (0 Connected, 7 Available)
- [ ] Category filters visible (All, Communication, Productivity, Development)
- [ ] 7 integration cards displayed
- [ ] All cards show "Not Connected" status

**Expected Result:** ✅ Page loads correctly with all 7 integrations

**Actual Result:** _______________________________________________

---

### 1.2 Integration Card Display
For each integration (Gmail, Calendar, Drive, Outlook, Teams, Slack, GitHub):

- [ ] **Icon** displays correctly with proper color
- [ ] **Name** is clear and readable
- [ ] **Category** badge visible
- [ ] **Description** is informative
- [ ] **Features list** shows 3-4 items with checkmarks
- [ ] **Required Permissions** collapsible works
- [ ] **OAuth Button** displays with correct provider branding
- [ ] **Status Badge** shows "Not Connected"

**Expected Result:** ✅ All cards display properly

**Actual Result:** _______________________________________________

---

### 1.3 Category Filtering
- [ ] Click "All Integrations" → Shows 7 cards
- [ ] Click "Communication" → Shows 4 cards (Gmail, Outlook, Teams, Slack)
- [ ] Click "Productivity" → Shows 2 cards (Calendar, Drive)
- [ ] Click "Development" → Shows 1 card (GitHub)
- [ ] Filter counts are correct
- [ ] Active filter has highlighted style
- [ ] Animations smooth between filters

**Expected Result:** ✅ Filtering works correctly

**Actual Result:** _______________________________________________

---

## 2. OAuth Flow Tests (Gmail)

### 2.1 OAuth Initiation
- [ ] Navigate to Gmail integration card
- [ ] Click "Sign in with Google" button
- [ ] Button shows loading state (spinner + "Connecting...")
- [ ] Button is disabled during loading
- [ ] Redirect to Google consent screen happens within 3 seconds
- [ ] Google consent screen shows correct app name
- [ ] Google consent screen lists all required scopes:
  - [ ] "Read your email messages and settings"
  - [ ] "Send email on your behalf"
  - [ ] "Manage drafts and compose messages"

**Expected Result:** ✅ Redirects to Google consent screen

**Actual Result:** _______________________________________________

---

### 2.2 OAuth Authorization
- [ ] Click "Continue" on Google consent screen
- [ ] Select test Google account
- [ ] Click "Allow" to grant permissions
- [ ] Redirect back to SINTRA app
- [ ] URL contains `?success=google_gmail_connected`
- [ ] Success toast notification appears:
  - Title: "Connected successfully!"
  - Message: "Gmail has been connected to your account"
- [ ] URL cleaned (no query parameters after 2 seconds)

**Expected Result:** ✅ Successfully authorized and redirected

**Actual Result:** _______________________________________________

---

### 2.3 Connected State Display
- [ ] Gmail card status changes to "Connected"
- [ ] Status badge shows green "Connected" with glow
- [ ] Connected profile displays:
  - [ ] User avatar (or initial letter)
  - [ ] User name
  - [ ] User email
  - [ ] "Synced X ago" timestamp
- [ ] "Resync" button visible
- [ ] "Disconnect" button visible (red)
- [ ] OAuth button hidden

**Expected Result:** ✅ Card shows connected state

**Actual Result:** _______________________________________________

---

### 2.4 Database Verification
Open database and run:
```sql
SELECT * FROM integrations WHERE user_id = 'demo-user' AND service = 'gmail';
```

- [ ] Record exists
- [ ] `provider` = 'google'
- [ ] `service` = 'gmail'
- [ ] `status` = 'connected'
- [ ] `access_token` is encrypted (not plaintext)
- [ ] `refresh_token` is encrypted
- [ ] `expires_at` is in future
- [ ] `connected_email` matches user email
- [ ] `connected_name` matches user name
- [ ] `connected_avatar` URL present
- [ ] `connected_at` timestamp correct
- [ ] `scopes` JSONB contains granted scopes

**Expected Result:** ✅ Database record correct

**Actual Result:** _______________________________________________

---

### 2.5 Token Refresh Test
- [ ] Wait until `expires_at` - 5 minutes (or manually set in DB)
- [ ] Click "Resync" button
- [ ] Button shows loading state
- [ ] After 1-2 seconds, success toast appears
- [ ] "Synced X ago" updates to "just now"
- [ ] Button returns to normal state

Check database:
- [ ] `access_token` changed (new encrypted value)
- [ ] `expires_at` updated (1 hour in future)
- [ ] `last_sync_at` updated
- [ ] `updated_at` updated

**Expected Result:** ✅ Token refreshed successfully

**Actual Result:** _______________________________________________

---

### 2.6 Disconnect Test
- [ ] Click "Disconnect" button
- [ ] Confirmation dialog appears: "Disconnect Gmail?"
- [ ] Click "OK" to confirm
- [ ] Card shows loading state briefly
- [ ] Success toast appears: "Disconnected successfully"
- [ ] Card returns to "Not Connected" state
- [ ] OAuth button visible again
- [ ] Connected profile hidden

Check database:
```sql
SELECT * FROM integrations WHERE user_id = 'demo-user' AND service = 'gmail';
```
- [ ] Record deleted (should return 0 rows)

**Expected Result:** ✅ Disconnected successfully

**Actual Result:** _______________________________________________

---

## 3. Error Handling Tests

### 3.1 OAuth Denial
- [ ] Click "Sign in with Google"
- [ ] On Google consent screen, click "Cancel" or deny access
- [ ] Redirect back to app with `?error=access_denied`
- [ ] Error toast appears:
  - Title: "Connection failed"
  - Message: "You denied access. You can try again anytime."
- [ ] Card remains in "Not Connected" state
- [ ] No database record created

**Expected Result:** ✅ Error handled gracefully

**Actual Result:** _______________________________________________

---

### 3.2 Network Error
- [ ] Disconnect internet
- [ ] Click "Sign in with Google"
- [ ] After timeout, error toast appears
- [ ] Card shows error state (red)
- [ ] Retry button visible
- [ ] Reconnect internet
- [ ] Click retry button
- [ ] OAuth flow works normally

**Expected Result:** ✅ Network error handled

**Actual Result:** _______________________________________________

---

### 3.3 Invalid State Parameter (CSRF Attack Simulation)
Manually test CSRF protection:
1. Start OAuth flow, copy authorization URL
2. Clear browser cookies
3. Paste URL and complete authorization
4. Should redirect with `?error=invalid_state`
5. Error toast: "Security validation failed. Please try again."

- [ ] CSRF attack blocked
- [ ] Error message displayed
- [ ] No database record created

**Expected Result:** ✅ CSRF protection works

**Actual Result:** _______________________________________________

---

### 3.4 Expired Token
Simulate expired token:
1. Connect Gmail
2. Manually update `expires_at` in database to past date
3. Refresh page
4. Card should show error state or auto-refresh

- [ ] Card detects expired token
- [ ] Auto-refresh attempted
- [ ] If refresh fails, error state shown
- [ ] Retry button works

**Expected Result:** ✅ Expired token handled

**Actual Result:** _______________________________________________

---

## 4. Responsive Design Tests

### 4.1 Desktop (1920x1080)
- [ ] 3-column grid layout
- [ ] All elements properly sized
- [ ] No horizontal scroll
- [ ] Cards have proper spacing
- [ ] Buttons accessible
- [ ] Text readable

**Expected Result:** ✅ Desktop layout perfect

**Actual Result:** _______________________________________________

---

### 4.2 Tablet (768x1024)
- [ ] 2-column grid layout
- [ ] Cards stack properly
- [ ] Touch targets at least 44x44px
- [ ] No layout breaks
- [ ] Category filters work
- [ ] Scrolling smooth

**Expected Result:** ✅ Tablet layout works

**Actual Result:** _______________________________________________

---

### 4.3 Mobile (375x667 - iPhone SE)
- [ ] 1-column grid layout
- [ ] Cards full width with margin
- [ ] Category filters stack or scroll
- [ ] Buttons large enough to tap
- [ ] Text readable (no zoom needed)
- [ ] OAuth flow works on mobile
- [ ] Consent screen mobile-friendly
- [ ] Success toast visible

**Expected Result:** ✅ Mobile layout works

**Actual Result:** _______________________________________________

---

## 5. Accessibility Tests (WCAG AAA)

### 5.1 Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Tab order is logical
- [ ] Focus indicators visible on all elements
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals/dropdowns
- [ ] No keyboard traps

**Expected Result:** ✅ Fully keyboard accessible

**Actual Result:** _______________________________________________

---

### 5.2 Screen Reader (NVDA/JAWS/VoiceOver)
- [ ] Page title announced
- [ ] All cards announced with name and status
- [ ] Buttons have descriptive labels
- [ ] Status changes announced (aria-live)
- [ ] Error messages announced
- [ ] Loading states announced
- [ ] No "clickable span" or generic elements

**Expected Result:** ✅ Screen reader friendly

**Actual Result:** _______________________________________________

---

### 5.3 Color Contrast
- [ ] Text on background: >7:1 ratio (WCAG AAA)
- [ ] Button text: >7:1 ratio
- [ ] Status badges readable
- [ ] Links distinguishable
- [ ] Hover states visible
- [ ] Focus indicators high contrast

Use: https://webaim.org/resources/contrastchecker/

**Expected Result:** ✅ All contrast ratios pass

**Actual Result:** _______________________________________________

---

### 5.4 Alt Text & ARIA
- [ ] All images have alt text
- [ ] Icons have aria-hidden or aria-label
- [ ] Buttons have aria-label
- [ ] Loading states have aria-busy
- [ ] Error regions have role="alert"
- [ ] Status badges have role="status"

**Expected Result:** ✅ ARIA properly implemented

**Actual Result:** _______________________________________________

---

## 6. Performance Tests

### 6.1 Page Load
- [ ] First Contentful Paint (FCP): <1.8s
- [ ] Largest Contentful Paint (LCP): <2.5s
- [ ] Time to Interactive (TTI): <3.8s
- [ ] Cumulative Layout Shift (CLS): <0.1
- [ ] No layout jumps on data load

Use: Chrome DevTools Lighthouse

**Expected Result:** ✅ All Core Web Vitals green

**Actual Result:** _______________________________________________

---

### 6.2 API Response Times
- [ ] GET `/api/integrations`: <500ms
- [ ] POST `/api/oauth/google/initiate`: <200ms
- [ ] GET `/api/oauth/google/callback`: <1000ms
- [ ] DELETE `/api/oauth/disconnect`: <300ms
- [ ] POST `/api/oauth/refresh`: <800ms

Use: Chrome DevTools Network tab

**Expected Result:** ✅ All responses fast

**Actual Result:** _______________________________________________

---

### 6.3 Bundle Size
```bash
npm run build
```

Check output:
- [ ] Page bundle: <250 KB
- [ ] First Load JS: <100 KB
- [ ] No duplicate dependencies
- [ ] Images optimized

**Expected Result:** ✅ Bundle size optimized

**Actual Result:** _______________________________________________

---

## 7. Security Tests

### 7.1 Token Encryption
- [ ] Access tokens encrypted in database
- [ ] Refresh tokens encrypted in database
- [ ] Tokens never exposed in API responses
- [ ] Tokens never logged to console
- [ ] Encryption key not in source code

**Expected Result:** ✅ Tokens properly encrypted

**Actual Result:** _______________________________________________

---

### 7.2 PKCE Verification
Check OAuth flow:
- [ ] `code_verifier` generated (128 chars)
- [ ] `code_challenge` = SHA256(verifier)
- [ ] `code_challenge_method` = S256
- [ ] Verifier stored in httpOnly cookie
- [ ] Verifier sent on token exchange
- [ ] Token exchange fails without correct verifier

**Expected Result:** ✅ PKCE implemented correctly

**Actual Result:** _______________________________________________

---

### 7.3 Cookie Security
Inspect cookies (DevTools → Application → Cookies):
- [ ] `oauth_state` cookie:
  - [ ] HttpOnly: true
  - [ ] Secure: true (production)
  - [ ] SameSite: Lax
  - [ ] Max-Age: 600 (10 minutes)
- [ ] `oauth_code_verifier` cookie:
  - [ ] HttpOnly: true
  - [ ] Secure: true (production)
  - [ ] SameSite: Lax
  - [ ] Max-Age: 600

**Expected Result:** ✅ Cookies properly secured

**Actual Result:** _______________________________________________

---

### 7.4 XSS Protection
Try injecting script:
1. Connect integration with name: `<script>alert('XSS')</script>`
2. Check if script executes

- [ ] Script NOT executed
- [ ] HTML entities escaped
- [ ] Name displayed as text

**Expected Result:** ✅ XSS prevented

**Actual Result:** _______________________________________________

---

## 8. Multi-Provider Tests

### 8.1 Google Calendar
- [ ] Connect Google Calendar
- [ ] Different scopes than Gmail
- [ ] Can have both Gmail + Calendar connected
- [ ] Database has 2 separate records
- [ ] Both show in UI correctly

**Expected Result:** ✅ Multi-service works

**Actual Result:** _______________________________________________

---

### 8.2 Multiple Providers (if configured)
- [ ] Connect Google (Gmail)
- [ ] Connect Microsoft (Outlook)
- [ ] Connect Slack
- [ ] Connect GitHub
- [ ] All show connected simultaneously
- [ ] Each has correct provider branding
- [ ] No conflicts between providers

**Expected Result:** ✅ Multi-provider works

**Actual Result:** _______________________________________________

---

## 9. Edge Cases

### 9.1 Rapid Connect/Disconnect
- [ ] Connect Gmail
- [ ] Immediately disconnect
- [ ] Immediately reconnect
- [ ] No race conditions
- [ ] Database consistent
- [ ] UI updates correctly

**Expected Result:** ✅ Handles rapid actions

**Actual Result:** _______________________________________________

---

### 9.2 Multiple Tabs
- [ ] Open `/settings` in 2 tabs
- [ ] Connect Gmail in Tab 1
- [ ] Refresh Tab 2
- [ ] Tab 2 shows connected state
- [ ] Disconnect in Tab 2
- [ ] Refresh Tab 1
- [ ] Tab 1 shows disconnected

**Expected Result:** ✅ Multi-tab consistent

**Actual Result:** _______________________________________________

---

### 9.3 Session Expiry
- [ ] Connect Gmail
- [ ] Clear session/cookies (simulated logout)
- [ ] Refresh page
- [ ] Should redirect to login or show error
- [ ] After re-login, integrations still connected

**Expected Result:** ✅ Session expiry handled

**Actual Result:** _______________________________________________

---

## 10. Production Readiness

### 10.1 Environment Variables
- [ ] No secrets in source code
- [ ] All ENV vars in `.env.local`
- [ ] `.env.local` in `.gitignore`
- [ ] Template file provided
- [ ] Production values different from dev

**Expected Result:** ✅ Secrets properly managed

**Actual Result:** _______________________________________________

---

### 10.2 Error Logging
- [ ] Errors logged to console with context
- [ ] No sensitive data in logs
- [ ] Stack traces available in dev
- [ ] Production logs sanitized
- [ ] Sentry/monitoring configured (if available)

**Expected Result:** ✅ Logging proper

**Actual Result:** _______________________________________________

---

### 10.3 HTTPS (Production Only)
- [ ] HTTPS enforced
- [ ] Secure cookies working
- [ ] Mixed content warnings resolved
- [ ] CSP headers configured
- [ ] HSTS enabled

**Expected Result:** ✅ HTTPS working

**Actual Result:** _______________________________________________

---

## 📊 Test Summary

**Total Test Cases:** 80+
**Passed:** _____
**Failed:** _____
**Blocked:** _____
**Pass Rate:** _____%

---

## 🐛 Bugs Found

| # | Severity | Description | Steps to Reproduce | Status |
|---|----------|-------------|-------------------|--------|
| 1 |          |             |                   |        |
| 2 |          |             |                   |        |
| 3 |          |             |                   |        |

---

## ✅ Sign-Off

**Tester:** _______________
**Date:** _______________
**Approved for Production:** ☐ Yes ☐ No

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________
