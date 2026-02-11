/**
 * Database exports
 * Re-exports database connection and utilities
 */

export { getDb, getPool, checkDbHealth, enablePgVector, closeDb } from './connection';
export * from './schema';

// Brain AI v2.0 - Connected Intelligence Schema
export * from './schema-connected-intelligence';

// Observability Layer - Security Events & AI Request Traces
export * from './schema-observability';

// Deployments
export * from './schema-deployments';

// Admin Audit Logs
export * from './schema-admin-audit';

// Integrations v2 - Unified CRM/Customers/Tickets
export * from './schema-integrations-v2';
