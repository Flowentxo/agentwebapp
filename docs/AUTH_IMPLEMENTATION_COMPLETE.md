# SINTRA Auth System - Complete Implementation Guide

## ✅ Completed Core Infrastructure

### Database & Schema
- ✅ `lib/db/migrations/20251024_auth.sql` - Complete SQL migration
- ✅ `lib/db/schema.ts` - Auth tables added to Drizzle schema

### Core Utilities
- ✅ `lib/auth/types.ts` - Types, Zod schemas, error codes
- ✅ `lib/auth/crypto.ts` - Password hashing, token generation
- ✅ `lib/auth/cookies.ts` - Cookie management (session & CSRF)
- ✅ `lib/auth/user.ts` - User CRUD operations
- ✅ `lib/auth/session.ts` - Session management
- ✅ `lib/auth/rateLimit.ts` - Redis rate limiting & lockout
- ✅ `lib/auth/csrf.ts` - CSRF protection
- ✅ `lib/auth/mailer.ts` - Email sending (SMTP + dev bypass)

## 📋 Remaining Implementation Tasks

### 1. Install Dependencies

```bash
npm install bcryptjs nodemailer ioredis zod react-hook-form @hookform/resolvers
npm install --save-dev @types/bcryptjs @types/nodemailer
```

### 2. Run Database Migration

```bash
# Connect to PostgreSQL
psql -U postgres -d sintra_knowledge -f lib/db/migrations/20251024_auth.sql

# Or use the migrate script if available
npx tsx lib/db/migrate.ts
```

### 3. Update .env.local

```env
# Add these auth configuration variables
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sintra_knowledge
REDIS_URL=redis://localhost:6379
AUTH_JWT_SECRET=your-secret-key-change-this-in-production
AUTH_COOKIE_NAME=sintra.sid
AUTH_COOKIE_DOMAIN=localhost
AUTH_SESSION_TTL_DAYS=7
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=SINTRA <no-reply@sintra.local>
APP_BASE_URL=http://localhost:3000
```

### 4. Create API Routes

Each route needs to be created in `app/api/auth/`:

#### a. POST /api/auth/register

**File**: `app/api/auth/register/route.ts`

Key features:
- Validate input with Zod
- Check rate limit (3 req / 10 min)
- Check if email exists
- Hash password with bcrypt
- Create user with 'user' role
- Generate verification token
- Send verification email
- Return success (no session yet)

#### b. POST /api/auth/login

**File**: `app/api/auth/login/route.ts`

Key features:
- Check rate limit & lockout
- Validate credentials
- Check if user is active
- Create session
- Set session cookie
- Track login attempt
- Return user data with roles

#### c. POST /api/auth/logout

**File**: `app/api/auth/logout/route.ts`

Key features:
- Get current session
- Revoke session
- Clear session cookie
- Return success

#### d. POST /api/auth/verify-email

**File**: `app/api/auth/verify-email/route.ts`

Key features:
- Validate token
- Check if token is unused and not expired
- Mark email as verified
- Mark token as used
- Optionally send welcome email
- Return success

#### e. POST /api/auth/request-password-reset

**File**: `app/api/auth/request-password-reset/route.ts`

Key features:
- Check rate limit (3 req / 1 hour)
- Find user by email (fail silently if not found)
- Generate reset token
- Send reset email
- Return success (always, to prevent email enumeration)

#### f. POST /api/auth/reset-password

**File**: `app/api/auth/reset-password/route.ts`

Key features:
- Validate token and new password
- Check if token is unused and not expired
- Update user password
- Mark token as used
- Revoke all user sessions
- Return success

#### g. GET /api/auth/me

**File**: `app/api/auth/me/route.ts`

Key features:
- Require valid session
- Return user data with roles

### 5. Create UI Pages

Each page needs to be created with React Hook Form + Zod validation:

#### a. Login Page

**File**: `app/(public)/login/page.tsx`

Features:
- Email + password form
- Client-side validation
- Error handling (rate limit, invalid credentials, lockout)
- Redirect to dashboard on success
- Link to register and password reset

#### b. Register Page

**File**: `app/(public)/register/page.tsx`

Features:
- Email + password + display name form
- Password strength indicator
- Client-side validation
- Show success message with "check email" instruction
- Link to login

#### c. Email Verification Page

**File**: `app/(public)/verify/page.tsx`

Features:
- Auto-verify on page load using token from URL
- Show success/error message
- Redirect to login on success

#### d. Password Reset Request Page

**File**: `app/(public)/reset/page.tsx`

Features:
- Email input form
- Show success message always
- Link to login

#### e. Password Reset Confirm Page

**File**: `app/(public)/reset/confirm/page.tsx`

Features:
- New password form with confirmation
- Token from URL parameter
- Password strength indicator
- Show success and redirect to login

### 6. Create Auth Helper/Index

**File**: `lib/auth/index.ts`

Export all auth utilities for easy importing:

```typescript
export * from './types';
export * from './crypto';
export * from './cookies';
export * from './session';
export * from './user';
export * from './rateLimit';
export * from './csrf';
export * from './mailer';
```

### 7. Bridge with Knowledge Base ACL

**File**: `lib/knowledge/acl.ts` (update existing)

Add function to get user from session:

```typescript
import { requireSession } from '../auth/session';

export async function getCurrentUser() {
  try {
    const session = await requireSession({ requireEmailVerified: true });
    return session.user;
  } catch {
    return null;
  }
}

export async function hasPermission(requiredRole: string) {
  const user = await getCurrentUser();
  if (!user) return false;

  // Admin has all permissions
  if (user.roles.includes('admin')) return true;

  // Check specific role
  return user.roles.includes(requiredRole as any);
}
```

### 8. Protect Routes with Middleware

**File**: `middleware.ts` (create if not exists)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionTokenFromRequest } from './lib/auth/cookies';
import { validateSession } from './lib/auth/session';

const PUBLIC_PATHS = ['/login', '/register', '/verify', '/reset'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Check session for protected routes
  if (path.startsWith('/app') || path.startsWith('/api')) {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Validate session (this is async, consider caching)
    // For now, allow through and let route handlers validate
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 9. Smoke Tests

Once everything is deployed, run these cURL tests:

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"Str0ngP@ssw0rd!","displayName":"Alice"}'

# Expected: {"ok":true}

# 2. Check server logs for verification link (DEV mode)
# Copy the verification token from logs

# 3. Verify email
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H 'Content-Type: application/json' \
  -d '{"token":"<token-from-logs>"}'

# Expected: {"ok":true}

# 4. Login
curl -i -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"Str0ngP@ssw0rd!"}'

# Expected: Set-Cookie header with sintra.sid

# 5. Get current user (with cookie from previous response)
curl -X GET http://localhost:3000/api/auth/me \
  -H 'Cookie: sintra.sid=<cookie-value>'

# Expected: {"ok":true,"data":{"user":{...}}}

# 6. Request password reset
curl -X POST http://localhost:3000/api/auth/request-password-reset \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com"}'

# Expected: {"ok":true}

# 7. Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H 'Cookie: sintra.sid=<cookie-value>'

# Expected: {"ok":true}
```

### 10. Testing Rate Limits

```bash
# Test login rate limit (5 attempts per minute)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done

# 6th request should return 429 Too Many Requests
```

### 11. Security Checklist

- [ ] Passwords hashed with bcrypt (12 rounds)
- [ ] Session tokens hashed with SHA-256
- [ ] HttpOnly cookies for sessions
- [ ] CSRF protection on state-changing endpoints
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after failed attempts
- [ ] Email verification required
- [ ] Secure password policy enforced
- [ ] No sensitive data in logs
- [ ] HTTPS in production
- [ ] SameSite=Lax cookies
- [ ] Session rotation on security events

### 12. Documentation Updates

Update these files:

**CHANGELOG.md**:
```markdown
## [3.1.0] - 2025-10-24

### Added
- Complete authentication system with login, register, email verification
- Password reset with email tokens
- Session management with httpOnly cookies
- Rate limiting and account lockout protection
- CSRF protection with double-submit cookies
- RBAC with user, editor, reviewer, admin roles
- Email sending with SMTP (dev bypass for local)
```

**KNOWLEDGE_STATUS.md**:
```markdown
## Authentication Status

- ✅ User registration with email verification
- ✅ Secure login with sessions
- ✅ Password reset flow
- ✅ Rate limiting & lockout protection
- ✅ CSRF protection
- ✅ RBAC integration with Knowledge Base
- ✅ Session management
```

## Summary

This authentication system provides enterprise-grade security features:

1. **Secure by Design**: Bcrypt password hashing, SHA-256 token hashing
2. **Session Management**: HttpOnly cookies, rotation, TTL, revocation
3. **Attack Prevention**: Rate limiting, lockout, CSRF protection
4. **Email Verification**: Required for access to protected resources
5. **RBAC**: Four roles (user, editor, reviewer, admin)
6. **Developer Experience**: Dev bypass for emails, comprehensive error codes
7. **Production Ready**: SMTP support, secure cookies, audit logging

All routes return consistent API responses:
```typescript
{ ok: boolean; data?: T; error?: { code: string; message: string; details?: unknown } }
```

Error codes are well-defined and client-friendly.
