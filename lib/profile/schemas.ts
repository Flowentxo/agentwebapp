/**
 * SINTRA Profile System - Zod Schemas
 * Type-safe validation for all profile operations
 */

import { z } from 'zod';

// =====================================================
// Base Schemas
// =====================================================

export const themeSchema = z.enum(['light', 'dark', 'system']);

export const localeSchema = z
  .string()
  .min(2, 'Locale must be at least 2 characters')
  .max(10, 'Locale must not exceed 10 characters')
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid locale format (e.g., de-DE, en-US)');

export const timezoneSchema = z
  .string()
  .min(3, 'Timezone must be at least 3 characters')
  .max(50, 'Timezone must not exceed 50 characters');

export const accessibilitySchema = z.object({
  reduceMotion: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  fontScale: z.number().min(0.8).max(1.5).default(1.0),
});

export const privacySettingsSchema = z.object({
  directoryOptOut: z.boolean().default(false),
  dataSharing: z
    .object({
      analytics: z.boolean().default(true),
      product: z.boolean().default(true),
    })
    .default({ analytics: true, product: true }),
  searchVisibility: z.boolean().default(true),
});

// =====================================================
// Profile Schemas
// =====================================================

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name must be at least 1 character')
    .max(255, 'Display name must not exceed 255 characters')
    .trim()
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio must not exceed 500 characters')
    .trim()
    .optional()
    .nullable(),
  locale: localeSchema.optional(),
  timezone: timezoneSchema.optional(),
  theme: themeSchema.optional(),
  pronouns: z
    .string()
    .max(50, 'Pronouns must not exceed 50 characters')
    .trim()
    .optional()
    .nullable(),
  location: z
    .string()
    .max(100, 'Location must not exceed 100 characters')
    .trim()
    .optional()
    .nullable(),
  orgTitle: z
    .string()
    .max(100, 'Organization title must not exceed 100 characters')
    .trim()
    .optional()
    .nullable(),
  accessibility: accessibilitySchema.optional(),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

// =====================================================
// Avatar Upload Schemas
// =====================================================

export const avatarUploadRequestSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .regex(/\.(jpg|jpeg|png|webp|gif)$/i, 'Invalid file extension (jpg, png, webp, gif allowed)'),
  contentType: z
    .string()
    .regex(/^image\/(jpeg|png|webp|gif)$/, 'Invalid content type'),
  fileSize: z
    .number()
    .min(1, 'File size must be greater than 0')
    .max(5 * 1024 * 1024, 'File size must not exceed 5MB')
    .optional(),
});

export type AvatarUploadRequest = z.infer<typeof avatarUploadRequestSchema>;

// =====================================================
// Email Change Schemas
// =====================================================

export const changeEmailRequestSchema = z.object({
  newEmail: z
    .string()
    .email('Invalid email address')
    .min(3)
    .max(255)
    .transform((email) => email.toLowerCase().trim()),
  currentPassword: z.string().min(1, 'Current password is required'),
});

export type ChangeEmailRequest = z.infer<typeof changeEmailRequestSchema>;

// Alias for API routes
export const requestEmailChangeSchema = changeEmailRequestSchema;
export type RequestEmailChangeRequest = ChangeEmailRequest;

export const confirmEmailRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type ConfirmEmailRequest = z.infer<typeof confirmEmailRequestSchema>;

// =====================================================
// Password Change Schema
// =====================================================

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

// Alias for API routes
export const changePasswordSchema = changePasswordRequestSchema;

// =====================================================
// MFA Schemas
// =====================================================

export const mfaEnableRequestSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
});

export type MfaEnableRequest = z.infer<typeof mfaEnableRequestSchema>;

// Alias for API routes
export const mfaEnableSchema = mfaEnableRequestSchema;

export const mfaDisableRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
});

export type MfaDisableRequest = z.infer<typeof mfaDisableRequestSchema>;

// Alias for API routes
export const mfaDisableSchema = mfaDisableRequestSchema;

export const mfaVerifyRequestSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
});

export type MfaVerifyRequest = z.infer<typeof mfaVerifyRequestSchema>;

// =====================================================
// Notifications Schemas
// =====================================================

export const notificationPrefsSchema = z.object({
  emailDigest: z.boolean().default(true),
  productUpdates: z.boolean().default(true),
  securityAlerts: z.boolean().default(true),
  webPush: z.boolean().default(false),
  sms: z.boolean().default(false),
});

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

// Alias for API routes
export const updateNotificationsSchema = notificationPrefsSchema;
export type UpdateNotificationsRequest = NotificationPrefs;

// =====================================================
// Privacy Schemas
// =====================================================

export const updatePrivacySchema = privacySettingsSchema;

export type UpdatePrivacyRequest = z.infer<typeof updatePrivacySchema>;

// =====================================================
// Response DTOs
// =====================================================

export interface ProfileResponse {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  locale: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  pronouns: string | null;
  location: string | null;
  orgTitle: string | null;
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    fontScale: number;
  };
  privacySettings: {
    directoryOptOut: boolean;
    dataSharing: {
      analytics: boolean;
      product: boolean;
    };
    searchVisibility: boolean;
  };
  mfaEnabled: boolean;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  /** Sudo session timeout in minutes (0 = always ask) */
  sudoSessionTimeout?: number;
}

export interface SessionInfo {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

export interface AuditEntry {
  id: string;
  action: string;
  ip: string | null;
  userAgent: string | null;
  details: Record<string, any>;
  createdAt: Date;
}

export interface MfaSetupResponse {
  otpauthUrl: string;
  secret: string; // masked, e.g., "XXXX...XXXX"
  qrDataUrl?: string; // Base64 QR code (dev mode only)
}

export interface SessionResponse {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface NotificationsResponse {
  email: boolean;
  push: boolean;
  sms: boolean;
  agentActivity: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
}

export interface PrivacyResponse {
  directoryOptOut: boolean;
  dataSharing: {
    analytics: boolean;
    product: boolean;
  };
  searchVisibility: boolean;
}

export interface AuditLogResponse {
  id: string;
  action: string;
  ip: string | null;
  userAgent: string | null;
  details: Record<string, any>;
  createdAt: Date;
}

// =====================================================
// Error Codes
// =====================================================

export const ProfileErrorCode = {
  INVALID: 'PROFILE_INVALID',
  RATE_LIMITED: 'PROFILE_RATE_LIMITED',
  NEEDS_REAUTH: 'PROFILE_NEEDS_REAUTH',
  UPLOAD_DENIED: 'PROFILE_UPLOAD_DENIED',
  UPLOAD_SIZE_EXCEEDED: 'PROFILE_UPLOAD_SIZE_EXCEEDED',
  UPLOAD_INVALID_TYPE: 'PROFILE_UPLOAD_INVALID_TYPE',
  TOKEN_INVALID: 'PROFILE_TOKEN_INVALID',
  TOKEN_EXPIRED: 'PROFILE_TOKEN_EXPIRED',
  SESSION_NOT_FOUND: 'PROFILE_SESSION_NOT_FOUND',
  SESSION_CURRENT: 'PROFILE_SESSION_CURRENT',
  EMAIL_TAKEN: 'PROFILE_EMAIL_TAKEN',
  PASSWORD_INCORRECT: 'PROFILE_PASSWORD_INCORRECT',
  MFA_ALREADY_ENABLED: 'PROFILE_MFA_ALREADY_ENABLED',
  MFA_NOT_ENABLED: 'PROFILE_MFA_NOT_ENABLED',
  MFA_INVALID_CODE: 'PROFILE_MFA_INVALID_CODE',
  MFA_SETUP_REQUIRED: 'PROFILE_MFA_SETUP_REQUIRED',
  INTERNAL_ERROR: 'PROFILE_INTERNAL_ERROR',
} as const;

export type ProfileErrorCode = (typeof ProfileErrorCode)[keyof typeof ProfileErrorCode];

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
