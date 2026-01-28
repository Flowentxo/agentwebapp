/**
 * Run Agent Factory Migration
 */

import 'dotenv/config';
import { getDb } from '../lib/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('🏭 Running Agent Factory Migration...\n');

  const db = getDb();

  // Read migration file
  const migrationPath = path.join(process.cwd(), 'lib', 'db', 'migrations', '0003_agent_factory.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  try {
    // Execute migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Agent Factory migration completed successfully!');
    console.log('\nCreated tables:');
    console.log('  - agent_blueprints');
    console.log('  - agent_instances');
    console.log('  - agent_teams');
    console.log('  - team_members');
    console.log('  - agent_evolution');
    console.log('  - agent_messages');
    console.log('  - agent_tasks');
    console.log('  - agent_skills');
    console.log('  - agent_integrations');
    console.log('  - agent_creation_requests');
    console.log('\nFactory Agents initialized:');
    console.log('  - CREATOR (Agent Architect)');
    console.log('  - CODER (Implementation Specialist)');
    console.log('  - SAP-CONNECT (Enterprise Integration Master)');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
