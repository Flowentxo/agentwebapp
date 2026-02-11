/**
 * Environment Variable Loader
 *
 * This file MUST be imported first before any other modules
 * to ensure DATABASE_URL and other env vars are available
 * when database connections are initialized.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get project root directory
const projectRoot = process.cwd();
const envLocalPath = path.join(projectRoot, '.env.local');
const envPath = path.join(projectRoot, '.env');

console.log('[ENV] ========================================');
console.log('[ENV] Project root:', projectRoot);
console.log('[ENV] Loading .env.local from:', envLocalPath);
console.log('[ENV] Loading .env from:', envPath);

// Load .env.local first (takes precedence over .env)
const envLocalResult = dotenv.config({ path: envLocalPath });
const envResult = dotenv.config({ path: envPath });

if (envLocalResult.error) {
  console.log('[ENV] ⚠️  .env.local not found or error:', envLocalResult.error.message);
}
if (envResult.error) {
  console.log('[ENV] ⚠️  .env not found or error:', envResult.error.message);
}

// Verify critical environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Support legacy PROFILE_ENCRYPTION_KEY as alias for ENCRYPTION_KEY
// This ensures backwards compatibility with existing deployments
let ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY && process.env.PROFILE_ENCRYPTION_KEY) {
  ENCRYPTION_KEY = process.env.PROFILE_ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = ENCRYPTION_KEY; // Set for other modules
  console.log('[ENV] ℹ️  Using PROFILE_ENCRYPTION_KEY as ENCRYPTION_KEY (legacy alias)');
}

console.log('[ENV] DATABASE_URL:', DATABASE_URL ? '✅ LOADED' : '❌ NOT FOUND');
console.log('[ENV] REDIS_URL:', REDIS_URL ? '✅ LOADED' : '❌ NOT FOUND');
console.log('[ENV] OPENAI_API_KEY:', OPENAI_API_KEY ? '✅ LOADED' : '❌ NOT FOUND');
console.log('[ENV] ENCRYPTION_KEY:', ENCRYPTION_KEY ? '✅ LOADED' : '❌ NOT FOUND');

// ============================================================================
// CRITICAL SECURITY CHECK: ENCRYPTION_KEY
// ============================================================================
// The ENCRYPTION_KEY is used to encrypt OAuth tokens stored in the database.
// Without a valid key, the server MUST NOT start as it would be insecure.
// ============================================================================
if (!ENCRYPTION_KEY) {
  console.error('[ENV] ❌ WARNING: ENCRYPTION_KEY is missing! OAuth token encryption will fail at runtime.');
} else if (!/^[a-fA-F0-9]{64}$/.test(ENCRYPTION_KEY)) {
  console.error(`[ENV] ❌ WARNING: ENCRYPTION_KEY is invalid (${ENCRYPTION_KEY.length} chars, need 64 hex). OAuth token encryption will fail at runtime.`);
} else {
  console.log('[ENV] ENCRYPTION_KEY: ✅ VALID (64 hex chars)');
}

if (!DATABASE_URL) {
  console.error('[ENV] ❌ CRITICAL: DATABASE_URL not found! Database connections will fail.');
  console.error('[ENV] Please ensure .env.local exists with DATABASE_URL set.');
}

if (!OPENAI_API_KEY) {
  console.warn('[ENV] ⚠️  OPENAI_API_KEY not found - AI features will use fallback/mock mode');
}

console.log('[ENV] ========================================');

// Export for verification if needed
export const envLoaded = true;
