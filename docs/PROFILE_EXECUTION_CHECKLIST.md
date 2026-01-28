# 🚀 SINTRA Profile System - Final Execution Checklist

**Version**: 1.2.0
**Date**: 2025-10-24
**Status**: Ready for Execution

---

## ✅ Completed Components

### Infrastructure (100%)
- [x] Database migration created and tested
- [x] Dependencies installed (sharp, speakeasy, qrcode, AWS SDK)
- [x] Zod schemas complete
- [x] Audit utility complete
- [x] **Crypto utility complete** (`lib/profile/crypto.ts`)

### Foundation Files
- [x] `lib/db/migrations/20251024_profile.sql`
- [x] `lib/profile/schemas.ts`
- [x] `lib/profile/audit.ts`
- [x] `lib/profile/crypto.ts` ← **NEW**

---

## 📋 Remaining Implementation (8-10 hours)

### Phase 1: Core Utilities (1-2 hours)

#### ☐ 1.1 Update Environment Variables

**File**: `.env`

Add these lines:
```env
# Profile System
PROFILE_ENCRYPTION_KEY=<run: openssl rand -hex 32>
UPLOAD_DIR=./public/uploads

# Optional: S3 Configuration
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

**Test encryption key**:
```bash
node -e "require('./lib/profile/crypto').validateEncryptionKey() ? console.log('✓ Key valid') : console.log('✗ Key invalid')"
```

#### ☐ 1.2 Implement Upload Utility

**File**: `lib/profile/uploads.ts`

**Copy this complete implementation**:

```typescript
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const IMAGE_SIZE = 512; // Max dimensions

// S3 configuration
const useS3 = Boolean(
  process.env.S3_ENDPOINT &&
  process.env.S3_BUCKET &&
  process.env.S3_ACCESS_KEY &&
  process.env.S3_SECRET_KEY
);

let s3Client: S3Client | null = null;

if (useS3) {
  s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
}

export interface UploadResult {
  uploadUrl?: string;
  avatarUrl: string;
  requiresUpload: boolean;
}

export async function generateAvatarUploadUrl(
  userId: string,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  if (!ALLOWED_MIMES.includes(contentType)) {
    throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const hash = crypto.randomBytes(8).toString('hex');
  const newFileName = `avatar_${hash}.${ext}`;

  if (useS3 && s3Client) {
    const key = `avatars/${userId}/${newFileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;

    return { uploadUrl, avatarUrl: publicUrl, requiresUpload: true };
  } else {
    const publicUrl = `/uploads/${userId}/${newFileName}`;
    return { avatarUrl: publicUrl, requiresUpload: false };
  }
}

export async function processLocalUpload(
  userId: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size: 5MB');
  }

  if (!ALLOWED_MIMES.includes(contentType)) {
    throw new Error('Invalid file type');
  }

  const processed = await sharp(fileBuffer, {
    limitInputPixels: 16777216, // 4096x4096 max
  })
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover', position: 'center' })
    .withMetadata({ orientation: 1 }) // Strip EXIF but keep basic
    .jpeg({ quality: 90 })
    .toBuffer();

  const hash = crypto.createHash('md5').update(processed).digest('hex').slice(0, 12);
  const fileName = `avatar_${hash}.jpg`;
  const userDir = path.join(UPLOAD_DIR, userId);

  await fs.mkdir(userDir, { recursive: true });
  await fs.writeFile(path.join(userDir, fileName), processed);

  return `/uploads/${userId}/${fileName}`;
}

export async function deleteOldAvatars(userId: string, keepUrl: string): Promise<void> {
  try {
    const userDir = path.join(UPLOAD_DIR, userId);
    const files = await fs.readdir(userDir);
    const keepFileName = path.basename(keepUrl);

    for (const file of files) {
      if (file.startsWith('avatar_') && file !== keepFileName) {
        await fs.unlink(path.join(userDir, file)).catch(() => {});
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}
```

**Test upload utility**:
```bash
mkdir -p ./public/uploads/test
echo "Upload directory created"
```

---

### Phase 2: Service Layer (2-3 hours)

#### ☐ 2.1 Create Service File

**File**: `lib/profile/service.ts`

**Pattern to follow** (based on auth services):

```typescript
import { eq } from 'drizzle-orm';
import { getDb } from '../db/connection';
import { users } from '../db/schema';
import { getUserRoles } from '../auth/user';
import { recordUserEventSimple, AuditAction } from './audit';

// Example: getProfile
export async function getProfile(userId: string) {
  const db = getDb();

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user[0]) {
    throw new Error('User not found');
  }

  const roles = await getUserRoles(userId);

  return {
    id: user[0].id,
    email: user[0].email,
    emailVerified: user[0].emailVerifiedAt !== null,
    displayName: user[0].displayName,
    // ... map all profile fields
    roles,
  };
}

// Example: updateProfile
export async function updateProfile(userId: string, input: UpdateProfileRequest) {
  const db = getDb();

  // Validate theme
  if (input.theme && !['light', 'dark', 'system'].includes(input.theme)) {
    throw new Error('Invalid theme');
  }

  await db.update(users)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await recordUserEventSimple(userId, AuditAction.PROFILE_UPDATE, {
    fields: Object.keys(input),
  });

  return getProfile(userId);
}
```

**Implement these functions** (15 total):
1. ✓ `getProfile(userId)`
2. ✓ `updateProfile(userId, input)`
3. `requestEmailChange(userId, newEmail, currentPassword)`
4. `confirmEmailChange(token)`
5. `changePassword(userId, currentPassword, newPassword)`
6. `mfaSetup(userId)`
7. `mfaEnable(userId, code, tempToken)`
8. `mfaDisable(userId, currentPassword)`
9. `listSessions(userId)`
10. `revokeSession(userId, sessionId)`
11. `getNotifications(userId)`
12. `updateNotifications(userId, prefs)`
13. `getPrivacy(userId)`
14. `updatePrivacy(userId, settings)`
15. `getAudit(userId, limit)`

**Each function should**:
- Validate inputs
- Check permissions
- Update database
- Record audit event
- Return typed DTO

---

### Phase 3: API Routes (2-3 hours)

#### ☐ 3.1 Create Base Profile Route

**File**: `app/api/profile/route.ts`

**Complete implementation**:

```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { updateProfileSchema, ProfileErrorCode, type ApiResponse } from '@/lib/profile/schemas';
import { getProfile, updateProfile } from '@/lib/profile/service';
import { checkRateLimit, incrementRateLimit, RATE_LIMITS } from '@/lib/auth/rateLimit';
import { validateCsrfToken } from '@/lib/auth/csrf';

export async function GET() {
  try {
    const session = await requireSession();

    const profile = await getProfile(session.user.id);

    return NextResponse.json({
      ok: true,
      data: profile,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code || ProfileErrorCode.INTERNAL_ERROR,
          message: error.message || 'Failed to load profile',
        },
      },
      { status: error.code === 'AUTH_UNAUTHORIZED' ? 401 : 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireSession();

    // CSRF validation
    const csrfToken = request.headers.get('x-csrf-token');
    const csrfValid = await validateCsrfToken(csrfToken);

    if (!csrfValid) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'CSRF_INVALID',
            message: 'Invalid CSRF token',
          },
        },
        { status: 403 }
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitKey = `profile:update:${session.user.id}:${ip}`;

    const rateLimit = await checkRateLimit(rateLimitKey, { maxAttempts: 5, windowMs: 60000 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: ProfileErrorCode.RATE_LIMITED,
            message: 'Too many requests',
          },
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
      );
    }

    await incrementRateLimit(rateLimitKey, { maxAttempts: 5, windowMs: 60000 });

    // Validate input
    const body = await request.json();
    const parseResult = updateProfileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: ProfileErrorCode.INVALID,
            message: 'Invalid input',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const profile = await updateProfile(session.user.id, parseResult.data);

    return NextResponse.json({
      ok: true,
      data: profile,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code || ProfileErrorCode.INTERNAL_ERROR,
          message: error.message || 'Failed to update profile',
        },
      },
      { status: 500 }
    );
  }
}
```

**Create remaining 13 routes using this pattern**:
- Each route follows same structure
- Always: session check → CSRF (mutations) → rate limit → validation → service → response
- Error codes mapped to HTTP status

---

### Phase 4: UI Implementation (2-3 hours)

#### ☐ 4.1 Create Profile Page

**File**: `app/profile/page.tsx`

**Structure**:
```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { updateProfileSchema } from '@/lib/profile/schemas';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="personal">
          <PersonalTab />
        </TabsContent>

        {/* ... remaining tabs */}
      </Tabs>
    </div>
  );
}
```

**Each tab component**:
- Uses React Hook Form
- Zod validation
- API calls with error handling
- Loading states
- Toast notifications

---

### Phase 5: Testing (1-2 hours)

#### ☐ 5.1 Unit Tests

**File**: `tests/unit/profile.crypto.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { encryptSecret, decryptSecret, generateRecoveryCodes, maskSecret } from '@/lib/profile/crypto';

describe('Profile Crypto', () => {
  test('encrypts and decrypts correctly', () => {
    const plaintext = 'test secret';
    const encrypted = encryptSecret(plaintext);
    const decrypted = decryptSecret(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  test('generates unique recovery codes', () => {
    const codes = generateRecoveryCodes(10);

    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10); // All unique
    expect(codes[0]).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  test('masks secret correctly', () => {
    const secret = 'ABCDEFGHIJKLMNOP';
    const masked = maskSecret(secret, 4);

    expect(masked).toBe('ABCD...MNOP');
  });
});
```

#### ☐ 5.2 E2E Tests

**File**: `tests/e2e/profile.e2e.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Profile Management', () => {
  test('updates profile successfully', async ({ page }) => {
    // Login
    await page.goto('/login');
    // ... login flow

    // Navigate to profile
    await page.goto('/profile');

    // Update display name
    await page.fill('[name="displayName"]', 'New Name');
    await page.click('button:has-text("Save")');

    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

---

## 🎯 Quick Win Strategy

**If time is limited, implement in this order**:

### Must-Have (4 hours)
1. ✅ Crypto utility (done)
2. ☐ Upload utility (30 min)
3. ☐ Service: getProfile, updateProfile (30 min)
4. ☐ API: GET/PUT `/api/profile` (30 min)
5. ☐ UI: Overview + Personal tabs (2 hours)

### Should-Have (2 hours)
6. ☐ Service: changePassword (30 min)
7. ☐ API: POST `/api/profile/password` (30 min)
8. ☐ UI: Security tab (1 hour)

### Nice-to-Have (2 hours)
9. ☐ MFA routes (all 3)
10. ☐ Sessions routes
11. ☐ Remaining tabs

---

## ✅ Final Checklist Before Deployment

- [ ] Database migration run successfully
- [ ] PROFILE_ENCRYPTION_KEY set and validated
- [ ] All 14 API routes respond with `{ ok: true }`
- [ ] UI loads without errors
- [ ] Can update profile fields
- [ ] Password change works
- [ ] Sessions list displays
- [ ] Audit log shows events
- [ ] Rate limits enforced
- [ ] CSRF validation works
- [ ] All tests pass

---

## 📚 Resources

- Auth system patterns: `lib/auth/*`, `app/api/auth/*`
- Database: `lib/db/schema.ts`
- Error codes: `lib/profile/schemas.ts`
- Audit actions: `lib/profile/audit.ts`

---

**Total Estimated Time**: 8-10 hours for complete implementation

**Status**: Foundation 100% complete, utilities 50% complete, ready for rapid development using provided patterns
