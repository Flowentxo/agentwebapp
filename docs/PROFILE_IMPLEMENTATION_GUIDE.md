# 🧑‍💼 SINTRA Profile System - Complete Implementation Guide

**Status**: ✅ Database & Core Utilities Complete | 🔨 API Routes & UI In Progress

**Date**: October 24, 2025
**Version**: 1.0.0
**Scope**: Enterprise-grade user profile management with security, audit, and privacy features

---

## ✅ Completed Components

### Database Layer
- ✅ `lib/db/migrations/20251024_profile.sql` - Complete migration
  - Extended `users` table with 14 new fields
  - Created `user_audit` table for complete audit trail
  - Created `user_notification_prefs` table
  - Added indexes, constraints, triggers
  - Includes helper functions for cleanup

### Core Utilities
- ✅ `lib/profile/schemas.ts` - Complete Zod schemas for all operations
- ✅ `lib/profile/audit.ts` - Audit trail recording and retrieval

---

## 📋 Remaining Implementation (Required)

### 1. Install Additional Dependencies

```bash
npm install sharp speakeasy qrcode @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install --save-dev @types/qrcode @types/speakeasy
```

### 2. Uploads Utility

**File**: `lib/profile/uploads.ts`

Key features:
- S3 presigned URL generation (production)
- Local file upload with `sharp` for image processing
- Generate thumbnails (48x48, 128x128, 256x256)
- MIME type validation
- File size limits (5MB)
- Secure filename generation
- Old avatar cleanup

```typescript
// Pseudo-code structure
export async function generateAvatarUploadUrl(userId: string, fileName: string): Promise<{uploadUrl?: string, avatarUrl: string}>
export async function processLocalUpload(userId: string, file: Buffer, contentType: string): Promise<string>
export async function deleteOldAvatars(userId: string, keepCurrent: string): Promise<void>
```

### 3. Profile Service Layer

**File**: `lib/profile/service.ts`

Core business logic functions:

```typescript
// Profile operations
export async function getProfile(userId: string): Promise<ProfileResponse>
export async function updateProfile(userId: string, updates: UpdateProfileRequest): Promise<ProfileResponse>

// Email management
export async function requestEmailChange(userId: string, newEmail: string, currentPassword: string): Promise<void>
export async function confirmEmailChange(token: string): Promise<void>

// Password management
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>

// MFA/2FA operations
export async function setupMfa(userId: string): Promise<MfaSetupResponse>
export async function enableMfa(userId: string, code: string, secret: string): Promise<{recoveryCodes: string[]}>
export async function disableMfa(userId: string, currentPassword: string): Promise<void>
export async function verifyMfaCode(userId: string, code: string): Promise<boolean>

// Sessions management
export async function listUserSessions(userId: string, currentSessionId: string): Promise<SessionInfo[]>
export async function revokeSession(userId: string, sessionId: string, currentSessionId: string): Promise<void>

// Notifications
export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs>
export async function updateNotificationPrefs(userId: string, prefs: NotificationPrefs): Promise<void>

// Privacy
export async function getPrivacySettings(userId: string): Promise<PrivacySettings>
export async function updatePrivacySettings(userId: string, settings: PrivacySettings): Promise<void>

// Audit
export async function getUserAudit(userId: string, limit: number): Promise<AuditEntry[]>
```

### 4. API Routes (14 routes total)

#### a. `app/api/profile/route.ts`

**GET** - Retrieve current user profile
- Require session
- Return full profile with roles
- Include MFA status (boolean only, not secrets)

**PUT** - Update profile fields
- Validate with `updateProfileSchema`
- Check CSRF
- Rate limit: 5 req/min
- Record audit
- Return updated profile

#### b. `app/api/profile/avatar/route.ts`

**POST** - Upload avatar
- Validate file name and content type
- Check rate limit: 3 req/10min
- Generate presigned URL (S3) OR process local upload
- Update `users.avatar_url`
- Delete old avatars (async)
- Record audit: `avatar_updated`

#### c. `app/api/profile/change-email/route.ts`

**POST** - Request email change
- Require re-auth (validate `currentPassword`)
- Check if new email already exists
- Generate verification token (purpose: `email_verify`)
- Send email to NEW address
- Record audit: `email_change_requested`
- Return success (don't change email yet)

#### d. `app/api/profile/confirm-email/route.ts`

**POST** - Confirm email change
- Validate token
- Update `users.email` and `email_verified_at`
- Mark token as used
- Record audit: `email_changed`
- Return success

#### e. `app/api/profile/password/route.ts`

**POST** - Change password
- Require re-auth (validate `currentPassword`)
- Validate new password with policy
- Hash and update password
- Revoke all other sessions
- Optionally rotate current session
- Record audit: `password_changed`
- Return success

#### f. `app/api/profile/mfa/setup/route.ts`

**POST** - Setup MFA (generate secret)
- Generate TOTP secret using `speakeasy`
- Create otpauth URL
- Generate QR code (base64 data URL) - DEV only
- Store secret temporarily (Redis with 10min TTL)
- Return: `{otpauthUrl, secret: masked, qrDataUrl?}`

#### g. `app/api/profile/mfa/enable/route.ts`

**POST** - Enable MFA
- Retrieve temp secret from Redis
- Verify provided 6-digit code
- Encrypt secret (AES-256-GCM with env key)
- Generate 10 recovery codes (encrypted)
- Store in `users.mfa_secret` and `mfa_recovery_codes`
- Set `mfa_enabled = true`
- Record audit: `mfa_enabled`
- Return recovery codes (one-time display)

#### h. `app/api/profile/mfa/disable/route.ts`

**POST** - Disable MFA
- Require re-auth (`currentPassword`)
- Clear `mfa_secret`, `mfa_recovery_codes`
- Set `mfa_enabled = false`
- Record audit: `mfa_disabled`
- Return success

#### i. `app/api/profile/sessions/route.ts`

**GET** - List active sessions
- Query `sessions` table for user
- Filter active (not revoked, not expired)
- Mark current session
- Return array of sessions

#### j. `app/api/profile/sessions/[id]/route.ts`

**DELETE** - Revoke specific session
- Check session belongs to user
- Prevent revoking current session
- Update `sessions.revoked_at`
- Record audit: `session_revoked`
- Return success

#### k. `app/api/profile/notifications/route.ts`

**GET** - Get notification preferences
- Query `user_notification_prefs`
- Return preferences

**PUT** - Update notification preferences
- Validate with `notificationPrefsSchema`
- Upsert to `user_notification_prefs`
- Also update `users.comm_prefs` (JSONB)
- Record audit: `notifications_updated`
- Return updated preferences

#### l. `app/api/profile/privacy/route.ts`

**GET** - Get privacy settings
- Read from `users.privacy_settings` (JSONB)
- Return settings

**PUT** - Update privacy settings
- Validate with `updatePrivacySchema`
- Update `users.privacy_settings`
- Record audit: `privacy_updated`
- Return updated settings

#### m. `app/api/profile/audit/route.ts`

**GET** - Get audit log
- Query `user_audit` for current user
- Default limit: 50
- Support pagination via `?limit=50&offset=0`
- Return audit entries (sorted by created_at DESC)

### 5. UI Implementation

**File**: `app/profile/page.tsx`

**Structure**: Tabbed interface using shadcn/ui Tabs component

#### Tab 1: Overview
- Avatar display (clickable to upload)
- Display name
- Email with verification badge
- Roles (read-only chips)
- Account created date
- Last login timestamp
- Quick stats (sessions count, MFA status)

#### Tab 2: Personal
- Form fields:
  - Display Name (text input)
  - Bio (textarea, max 500 chars)
  - Pronouns (text input)
  - Location (text input)
  - Organization Title (text input)
- Save/Cancel buttons
- React Hook Form + Zod validation
- Optimistic updates

#### Tab 3: Preferences
- Locale selector (dropdown)
- Timezone selector (searchable dropdown)
- Theme toggle (Light/Dark/System)
- Accessibility section:
  - Reduce Motion (checkbox)
  - High Contrast (checkbox)
  - Font Scale (slider: 0.8 - 1.5)
- Save/Cancel buttons

#### Tab 4: Security
- **Change Password** section:
  - Current Password (password input)
  - New Password (password input)
  - Password strength indicator
  - Requires re-auth warning
  - Change button

- **Two-Factor Authentication** section:
  - Status badge (Enabled/Disabled)
  - If disabled:
    - "Enable 2FA" button
    - Shows QR code modal with setup instructions
  - If enabled:
    - "Disable 2FA" button (requires password)
    - "View Recovery Codes" button (download as txt)

- **Change Email** section:
  - Current email (read-only)
  - New email input
  - Current password input
  - "Request Change" button
  - Info: "Verification email will be sent to new address"

#### Tab 5: Sessions & Devices
- Table/list of active sessions:
  - Device/Browser (from User-Agent)
  - Location (from IP - approximate)
  - Created date
  - Expires date
  - "Current" badge
  - "Revoke" button (for other sessions)
- Refresh button
- "Revoke All Other Sessions" button

#### Tab 6: Notifications
- Email Digest (toggle)
- Product Updates (toggle)
- Security Alerts (toggle + warning: "Recommended")
- Web Push (toggle - stub)
- SMS (toggle - stub)
- Save button

#### Tab 7: Privacy & Data
- **Directory Settings**:
  - Opt out of user directory (toggle)
  - Search visibility (toggle)

- **Data Sharing**:
  - Analytics data sharing (toggle)
  - Product improvement data (toggle)

- **Data Management** (Danger Zone):
  - "Export My Data" button (stub - shows coming soon)
  - "Delete Account" button (stub - shows confirmation modal)

#### Tab 8: Audit Log
- Searchable table:
  - Timestamp
  - Action (badge with color coding)
  - IP Address
  - Device/Browser
  - Details (expandable)
- Pagination (50 per page)
- Filter by action type (dropdown)
- Date range filter

### 6. Encryption Utility

**File**: `lib/profile/crypto.ts`

For encrypting MFA secrets and recovery codes:

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || 'dev-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptSecret(ciphertext: string): string {
  const parts = ciphertext.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

---

## 🔒 Security Considerations

### Re-Authentication

Sensitive operations require recent password verification:
- Email change
- Password change
- MFA disable
- Account deletion (future)

**Implementation**:
```typescript
// Check if password was verified in last 5 minutes
const lastReauth = await getLastReauthTime(userId);
if (!lastReauth || Date.now() - lastReauth > 5 * 60 * 1000) {
  // Require password verification
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    return error('PROFILE_PASSWORD_INCORRECT');
  }
  await setLastReauthTime(userId, Date.now());
}
```

### Rate Limiting

Per-endpoint rate limits:
- Profile update: 5 req/min
- Avatar upload: 3 req/10min
- Password change: 3 req/hour
- Email change: 3 req/hour
- MFA operations: 5 req/min

### Audit Trail

All mutations must be audited:
```typescript
await recordUserEventFromRequest(userId, AuditAction.PROFILE_UPDATE, request, {
  fields: Object.keys(updates),
});
```

### CSRF Protection

All state-changing operations require CSRF token:
```typescript
const csrfValid = await validateCsrfToken(request.headers.get('x-csrf-token'));
if (!csrfValid) {
  return error('CSRF_INVALID');
}
```

---

## 🧪 Testing Guide

### Setup

1. **Run migration**:
   ```bash
   psql -U postgres -d sintra_knowledge -f lib/db/migrations/20251024_profile.sql
   ```

2. **Install dependencies**:
   ```bash
   npm install sharp speakeasy qrcode @aws-sdk/client-s3
   ```

3. **Add to `.env`**:
   ```env
   MFA_ENCRYPTION_KEY=your-32-byte-hex-key-here
   UPLOAD_DIR=./public/uploads
   ```

### Smoke Tests

```bash
# 1. Get profile
curl -s http://localhost:3000/api/profile \
  -H 'Cookie: sintra.sid=YOUR_SESSION'

# 2. Update profile
curl -s -X PUT http://localhost:3000/api/profile \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sintra.sid=YOUR_SESSION' \
  -H 'x-csrf-token: YOUR_CSRF' \
  -d '{"displayName":"Alice Wonder","timezone":"Europe/Berlin"}'

# 3. Change password
curl -s -X POST http://localhost:3000/api/profile/password \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sintra.sid=YOUR_SESSION' \
  -d '{"currentPassword":"old","newPassword":"NewStr0ng!Pass"}'

# 4. Setup MFA
curl -s -X POST http://localhost:3000/api/profile/mfa/setup \
  -H 'Cookie: sintra.sid=YOUR_SESSION'

# 5. Enable MFA (use code from authenticator app)
curl -s -X POST http://localhost:3000/api/profile/mfa/enable \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sintra.sid=YOUR_SESSION' \
  -d '{"code":"123456"}'

# 6. List sessions
curl -s http://localhost:3000/api/profile/sessions \
  -H 'Cookie: sintra.sid=YOUR_SESSION'

# 7. Update notifications
curl -s -X PUT http://localhost:3000/api/profile/notifications \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sintra.sid=YOUR_SESSION' \
  -d '{"emailDigest":true,"productUpdates":false}'

# 8. Get audit log
curl -s http://localhost:3000/api/profile/audit?limit=20 \
  -H 'Cookie: sintra.sid=YOUR_SESSION'
```

---

## 📊 Database Schema Summary

### Extended `users` Table

New columns:
- `avatar_url` - Avatar image URL
- `bio` - User biography
- `locale` - Preferred language
- `timezone` - User timezone
- `theme` - UI theme preference
- `pronouns` - User pronouns
- `location` - Location/city
- `org_title` - Organization title
- `accessibility` - Accessibility preferences (JSONB)
- `comm_prefs` - Communication preferences (JSONB)
- `privacy_settings` - Privacy settings (JSONB)
- `mfa_enabled` - MFA enabled flag
- `mfa_secret` - Encrypted TOTP secret
- `mfa_recovery_codes` - Encrypted recovery codes

### New Tables

**user_audit**:
- Tracks all profile changes
- Columns: id, user_id, action, ip, user_agent, details (JSONB), created_at
- Indexed by user_id, action, created_at

**user_notification_prefs**:
- Denormalized notification preferences
- Columns: user_id (PK), email_digest, product_updates, security_alerts, web_push, sms
- One-to-one with users

---

## 🎯 Next Steps

1. **Implement remaining utilities**:
   - `lib/profile/uploads.ts`
   - `lib/profile/service.ts`
   - `lib/profile/crypto.ts`

2. **Create all API routes** (14 routes)

3. **Build UI page** with 8 tabs

4. **Add MFA flow** with QR code generation

5. **Test all endpoints**

6. **Add i18n support** (optional)

7. **Performance optimization**:
   - Cache profile data in Redis
   - Optimize audit log queries
   - Lazy load tabs

8. **Accessibility audit**:
   - Keyboard navigation
   - Screen reader support
   - ARIA labels

---

## 📚 Additional Resources

- Speakeasy docs: https://github.com/speakeasyjs/speakeasy
- Sharp docs: https://sharp.pixelplumbing.com/
- QR Code generation: https://github.com/soldair/node-qrcode
- AWS S3 SDK: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/

---

## ✨ Summary

**Completed**:
- ✅ Database migration with all tables
- ✅ Zod schemas for all operations
- ✅ Audit trail utility

**Remaining** (~8-12 hours of development):
- 3 utility files
- 14 API routes
- 1 comprehensive UI page with 8 tabs
- MFA setup flow
- Avatar upload handling
- Testing and documentation

**Total Scope**: Enterprise-grade profile management with security, privacy, audit, and accessibility features.
