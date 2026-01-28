// ============================================================================
// LEVEL 14: PRISMA 7 CONFIGURATION
// Required for Prisma 7.x - connection URLs moved from schema to this file
// ============================================================================

import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(__dirname, '.env.local') });

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),

  // Database connection URL for db push, introspection, etc.
  datasource: {
    url: process.env.DATABASE_URL,
  },

  // Database connection URL for migrations
  migrate: {
    url: process.env.DATABASE_URL,
  },
});
