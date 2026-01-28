/**
 * DATABASE CONNECTIONS SCHEMA
 *
 * Schema for storing database connection configurations
 * Used by Agent Studio for workflow database queries
 */

import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const dbConnections = pgTable('db_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: varchar('workspace_id', { length: 255 }),

  // Connection details
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'postgresql', 'mysql', 'mongodb', 'sqlite'
  host: varchar('host', { length: 255 }).notNull(),
  port: integer('port').notNull(),
  database: varchar('database', { length: 255 }).notNull(),

  // Credentials (password will be encrypted)
  username: varchar('username', { length: 255 }),
  password: text('password'), // Encrypted

  // Options
  ssl: boolean('ssl').default(false),

  // Connection status (cached, updated on test)
  status: varchar('status', { length: 50 }).default('untested'), // 'connected', 'error', 'testing', 'untested'
  lastTested: timestamp('last_tested'),
  lastError: text('last_error'),

  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type DbConnection = typeof dbConnections.$inferSelect;
export type NewDbConnection = typeof dbConnections.$inferInsert;
