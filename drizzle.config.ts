import type { Config } from 'drizzle-kit';

export default {
  // Include all schema files using glob pattern
  schema: './lib/db/schema*.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
