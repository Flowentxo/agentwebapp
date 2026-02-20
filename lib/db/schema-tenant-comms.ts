/**
 * Tenant Communications Schema
 *
 * Tracks all landlord-tenant communications for the Tenant Communicator agent.
 * Stores generated notices, delivery tracking, deadlines, and communication history.
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  varchar,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Tenant Communications Table
 *
 * Chronological log of all communications between landlord and tenant,
 * including generated notices, delivery tracking, and deadline management.
 */
export const tenantCommunications = pgTable('tenant_communications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  workspaceId: uuid('workspace_id'),

  // Mieter & Objekt
  tenantName: varchar('tenant_name', { length: 255 }).notNull(),
  propertyAddress: text('property_address').notNull(),
  unit: varchar('unit', { length: 50 }),

  // Ereignis
  eventType: varchar('event_type', { length: 50 }).notNull(),
  subject: text('subject').notNull(),
  content: text('content'),
  noticeType: varchar('notice_type', { length: 50 }),

  // Zustellung
  deliveryMethod: varchar('delivery_method', { length: 50 }),
  deliveryDate: timestamp('delivery_date'),
  deliveryStatus: varchar('delivery_status', { length: 20 }).default('pending'),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  witnessName: varchar('witness_name', { length: 255 }),

  // Fristen
  deadlineDate: timestamp('deadline_date'),
  deadlineStatus: varchar('deadline_status', { length: 20 }).default('active'),

  // Dokument
  generatedDocument: text('generated_document'),
  legalReferences: text('legal_references').array(),

  // Meta
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('idx_tenant_comms_user').on(table.userId),
  tenantIdx: index('idx_tenant_comms_tenant').on(table.tenantName, table.userId),
  propertyIdx: index('idx_tenant_comms_property').on(table.propertyAddress, table.userId),
  deadlineIdx: index('idx_tenant_comms_deadline').on(table.deadlineDate),
  createdIdx: index('idx_tenant_comms_created').on(table.createdAt),
}));
