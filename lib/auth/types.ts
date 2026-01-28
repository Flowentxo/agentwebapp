/**
 * SINTRA Auth System - Core Types & Schemas
 * Centralized type definitions and Zod validators for authentication
 */

import { z } from 'zod';

// =====================================================
// RBAC Roles (must match lib/knowledge/acl.ts)
// =====================================================
export const UserRole = {
  USER: 'user',
  EDITOR: 'editor',
  REVIEWER: 'reviewer',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const userRoleSchema = z.enum(['user', 'editor', 'reviewer', 'admin']);

// =====================================================
// Database Models
// =====================================================
export interface User {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  passwordHash: string;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  role: string;
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export type VerificationPurpose = 'email_verify' | 'password_reset' | 'email_change';

export interface VerificationToken {
  id: string;
  userId: string;
  tokenHash: string;
  purpose: VerificationPurpose;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}

// =====================================================
// Session Data (stored in cookie)
// =====================================================
export interface SessionData {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    roles: UserRole[];
    emailVerified: boolean;
  };
  sessionId: string;
}

// =====================================================
// Password Policy
// Minimum 10 characters, at least one uppercase, one lowercase, one number
// Consider using zxcvbn for strength checking in production
// =====================================================
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(3, 'Email must be at least 3 characters')
  .max(255, 'Email must not exceed 255 characters')
  .transform((email) => email.toLowerCase().trim());

export const displayNameSchema = z
  .string()
  .min(1, 'Display name must be at least 1 character')
  .max(255, 'Display name must not exceed 255 characters')
  .trim()
  .optional();

// =====================================================
// API Request/Response Schemas
// =====================================================

// Register
export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

// Login
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    roles: UserRole[];
    emailVerified: boolean;
  };
}

// Verify Email
export const verifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;

// Request Password Reset
export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export type RequestPasswordResetRequest = z.infer<typeof requestPasswordResetSchema>;

// Reset Password
export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: passwordSchema,
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

// =====================================================
// API Response Wrapper
// =====================================================
export interface ApiResponse<T = void> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// =====================================================
// Error Codes
// =====================================================
export const AuthErrorCode = {
  EMAIL_TAKEN: 'AUTH_EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  RATE_LIMITED: 'AUTH_RATE_LIMITED',
  TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  LOCKED: 'AUTH_LOCKED',
  UNVERIFIED_EMAIL: 'AUTH_UNVERIFIED_EMAIL',
  SESSION_INVALID: 'AUTH_SESSION_INVALID',
  SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  FORBIDDEN: 'AUTH_FORBIDDEN',
  USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  USER_INACTIVE: 'AUTH_USER_INACTIVE',
  VALIDATION_ERROR: 'AUTH_VALIDATION_ERROR',
  INTERNAL_ERROR: 'AUTH_INTERNAL_ERROR',
} as const;

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];

// =====================================================
// Auth Configuration
// =====================================================
export interface AuthConfig {
  jwtSecret: string;
  cookieName: string;
  cookieDomain: string;
  sessionTtlDays: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  appBaseUrl: string;
  isProd: boolean;
}

// =====================================================
// Rate Limit Config
// =====================================================
export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

// =====================================================
// Login Attempt Tracking
// =====================================================
export interface LoginAttempt {
  email: string;
  ip: string;
  timestamp: number;
  success: boolean;
}

// =====================================================
// Lockout Info
// =====================================================
export interface LockoutInfo {
  isLocked: boolean;
  unlocksAt?: Date;
  attemptsRemaining?: number;
}
