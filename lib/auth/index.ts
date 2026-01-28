/**
 * SINTRA Auth System - Main Entry Point
 * Exports all auth utilities for easy importing
 */

// Types & Schemas
export * from './types';

// Core utilities
export * from './crypto';
export * from './cookies';
export * from './session';
export * from './user';
export * from './rateLimit';
export * from './csrf';
export * from './mailer';

// Re-export commonly used functions
export { hashPassword, verifyPassword, generateTokenPair } from './crypto';
export { setSessionCookie, clearSessionCookie, getSessionToken } from './cookies';
export { createSession, getSession, requireSession, revokeCurrentSession } from './session';
export { createUser, findUserByEmail, getUserWithRoles, addUserRole } from './user';
export { checkLoginRateLimit, recordLoginAttempt } from './rateLimit';
export { sendVerificationEmail, sendResetEmail } from './mailer';
