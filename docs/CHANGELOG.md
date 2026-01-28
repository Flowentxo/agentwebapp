# Changelog

All notable changes to the SINTRA AI Agent System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2025-10-24

### Added - Authentication System (v1.0.0)

#### Core Infrastructure
- **Database Schema**: PostgreSQL tables for users, user_roles, sessions, and verification_tokens
- **Drizzle ORM Integration**: Type-safe database access with schema definitions
- **Idempotent Migrations**: Forward and rollback support for auth tables

#### Security & Cryptography
- **Password Hashing**: Bcrypt with 12 rounds for secure password storage
- **Token Generation**: Cryptographically secure random tokens (32 bytes)
- **Token Hashing**: SHA-256 hashing for session and verification tokens
- **Timing-Safe Comparison**: Protection against timing attacks

#### Session Management
- **HttpOnly Cookies**: Secure session storage with `sintra.sid` cookie
- **Session Lifecycle**: Create, validate, revoke, and rotate sessions
- **Configurable TTL**: Default 7-day session lifetime (configurable via env)
- **Session Tracking**: IP address and User-Agent tracking for security
- **Session Cleanup**: Automatic expiry and revocation handling

#### Rate Limiting & Protection
- **Redis-Based Rate Limiting**: Token bucket algorithm for request throttling
- **Login Protection**: 5 attempts per minute, 10 attempts before lockout
- **Registration Throttling**: 3 attempts per 10 minutes per IP
- **Password Reset Limits**: 3 requests per hour per IP
- **Account Lockout**: 15-minute lockout after 10 failed login attempts
- **CSRF Protection**: Double-submit cookie pattern for state-changing requests

#### Email System
- **SMTP Integration**: Nodemailer with configurable SMTP settings
- **Dev Bypass Mode**: Console logging of email links for local development
- **HTML Templates**: Beautiful, responsive email templates
- **Email Verification**: Verification flow with token-based confirmation
- **Password Reset**: Secure password reset with time-limited tokens

#### RBAC (Role-Based Access Control)
- **Four Roles**: `user`, `editor`, `reviewer`, `admin`
- **Multi-Role Support**: Users can have multiple roles
- **Role Management**: Add, remove, and check user roles
- **ACL Integration**: Consistent with Knowledge Base access control

#### API Routes
- `POST /api/auth/register` - User registration with email verification
- `POST /api/auth/login` - Login with credentials and session creation
- `POST /api/auth/logout` - Logout with session revocation
- `POST /api/auth/verify-email` - Email address verification
- `POST /api/auth/request-password-reset` - Request password reset link
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/me` - Get current authenticated user

#### Utilities & Helpers
- `lib/auth/types.ts` - TypeScript types and Zod schemas
- `lib/auth/crypto.ts` - Cryptography utilities
- `lib/auth/cookies.ts` - Cookie management
- `lib/auth/session.ts` - Session lifecycle management
- `lib/auth/user.ts` - User CRUD operations
- `lib/auth/tokens.ts` - Verification token management
- `lib/auth/rateLimit.ts` - Rate limiting and lockout logic
- `lib/auth/csrf.ts` - CSRF protection utilities
- `lib/auth/mailer.ts` - Email sending and templates

#### Configuration
- Environment variables for auth configuration
- Configurable session TTL, cookie domain, and SMTP settings
- Redis URL configuration for rate limiting
- Application base URL for email links

#### Security Features
- Password policy enforcement (10+ chars, mixed case, numbers, special chars)
- Timing attack prevention with constant-time comparisons
- No sensitive data in logs (passwords, tokens)
- Session rotation on security events
- Token expiration and one-time use enforcement
- HttpOnly, Secure, and SameSite cookie attributes

#### Documentation
- `docs/AUTH_QUICKSTART.md` - Complete setup and testing guide
- `docs/AUTH_IMPLEMENTATION_COMPLETE.md` - Detailed implementation guide
- API documentation with request/response examples
- Error code documentation
- Production deployment checklist

### Dependencies Added
- `bcryptjs` - Password hashing
- `nodemailer` - Email sending
- `ioredis` - Redis client for rate limiting
- `zod` - Schema validation (already present)
- `react-hook-form` - Form handling (for future UI)
- `@hookform/resolvers` - Zod resolver for React Hook Form

### Changed
- Updated `lib/db/schema.ts` with auth table definitions
- Enhanced `.env` with auth configuration variables

### Developer Experience
- Comprehensive error codes for all auth operations
- Consistent API response format across all endpoints
- Dev mode email bypass with console logging
- Detailed logging for debugging auth flows
- Type-safe database operations with Drizzle ORM

### Testing
- cURL examples for all API endpoints
- Rate limiting test scenarios
- Lockout behavior verification
- Token validation testing
- Session lifecycle testing

---

## [3.0.0] - Prior to 2025-10-24

### Features
- Multi-agent AI system with 12 specialized agents
- Knowledge Base with RAG (Retrieval-Augmented Generation)
- Admin panel and user interface
- Workflow automation
- Real-time WebSocket communication
- Dashboard with analytics

[3.1.0]: https://github.com/yourusername/sintra/releases/tag/v3.1.0
[3.0.0]: https://github.com/yourusername/sintra/releases/tag/v3.0.0
