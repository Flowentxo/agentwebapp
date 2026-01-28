const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrateRemainingData() {
  const localPool = new Pool({
    host: 'localhost',
    port: 5435,
    user: 'postgres',
    password: 'postgres_password_local',
    database: 'brain_ai'
  });

  const supabasePool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('=== Migrating Remaining Tables to Supabase ===\n');

  try {
    // 1. Migrate workspaces
    console.log('1. Migrating workspaces...');
    const workspaces = await localPool.query('SELECT * FROM workspaces');
    let wsInserted = 0;

    for (const row of workspaces.rows) {
      try {
        await supabasePool.query(`
          INSERT INTO workspaces (id, name, slug, description, owner_id, settings, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [
          row.id, row.name, row.slug, row.description, row.owner_id,
          row.settings ? JSON.stringify(row.settings) : null,
          row.created_at, row.updated_at
        ]);
        wsInserted++;
      } catch (e) {
        console.error('  Workspace error:', e.message.slice(0, 100));
      }
    }
    console.log(`   workspaces: ${wsInserted}/${workspaces.rows.length} migrated`);

    // 2. Migrate user_command_preferences
    console.log('2. Migrating user_command_preferences...');
    const cmdPrefs = await localPool.query('SELECT * FROM user_command_preferences');
    let cmdInserted = 0;

    for (const row of cmdPrefs.rows) {
      try {
        await supabasePool.query(`
          INSERT INTO user_command_preferences (id, user_id, default_view, show_suggestions, enable_voice_commands, compact_mode, pinned_commands, pinned_agents, favorite_intents, recent_agents, auto_execute_confidence, enable_context_awareness, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (user_id) DO NOTHING
        `, [
          row.id, row.user_id, row.default_view, row.show_suggestions, row.enable_voice_commands,
          row.compact_mode,
          JSON.stringify(row.pinned_commands || []),
          JSON.stringify(row.pinned_agents || []),
          JSON.stringify(row.favorite_intents || []),
          JSON.stringify(row.recent_agents || []),
          row.auto_execute_confidence, row.enable_context_awareness, row.updated_at
        ]);
        cmdInserted++;
      } catch (e) {
        console.error('  Command prefs error:', e.message.slice(0, 100));
      }
    }
    console.log(`   user_command_preferences: ${cmdInserted}/${cmdPrefs.rows.length} migrated`);

    // 3. Migrate user_notification_prefs
    console.log('3. Migrating user_notification_prefs...');
    const notifPrefs = await localPool.query('SELECT * FROM user_notification_prefs');
    let notifInserted = 0;

    for (const row of notifPrefs.rows) {
      try {
        await supabasePool.query(`
          INSERT INTO user_notification_prefs (user_id, email_digest, product_updates, security_alerts, web_push, sms, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_id) DO NOTHING
        `, [
          row.user_id, row.email_digest, row.product_updates, row.security_alerts,
          row.web_push, row.sms, row.created_at, row.updated_at
        ]);
        notifInserted++;
      } catch (e) {
        console.error('  Notification prefs error:', e.message.slice(0, 100));
      }
    }
    console.log(`   user_notification_prefs: ${notifInserted}/${notifPrefs.rows.length} migrated`);

    // 4. Migrate agent_creation_requests
    console.log('4. Migrating agent_creation_requests...');
    const agentReqs = await localPool.query('SELECT * FROM agent_creation_requests');
    let reqInserted = 0;

    for (const row of agentReqs.rows) {
      try {
        await supabasePool.query(`
          INSERT INTO agent_creation_requests (id, user_id, request, analyzed_requirements, proposed_blueprint_id, creation_team_id, status, created_agent_id, error, started_at, completed_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
        `, [
          row.id, row.user_id, row.request,
          row.analyzed_requirements ? JSON.stringify(row.analyzed_requirements) : null,
          row.proposed_blueprint_id, row.creation_team_id, row.status,
          row.created_agent_id, row.error, row.started_at, row.completed_at
        ]);
        reqInserted++;
      } catch (e) {
        console.error('  Agent request error:', e.message.slice(0, 100));
      }
    }
    console.log(`   agent_creation_requests: ${reqInserted}/${agentReqs.rows.length} migrated`);

    // 5. Migrate brain_memory_stats
    console.log('5. Migrating brain_memory_stats...');
    const memStats = await localPool.query('SELECT * FROM brain_memory_stats');
    let statsInserted = 0;

    for (const row of memStats.rows) {
      try {
        await supabasePool.query(`
          INSERT INTO brain_memory_stats (id, agent_id, total_memories, avg_importance, last_memory_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (agent_id) DO NOTHING
        `, [
          row.id, row.agent_id, row.total_memories, row.avg_importance,
          row.last_memory_at, row.created_at, row.updated_at
        ]);
        statsInserted++;
      } catch (e) {
        console.error('  Memory stats error:', e.message.slice(0, 100));
      }
    }
    console.log(`   brain_memory_stats: ${statsInserted}/${memStats.rows.length} migrated`);

    console.log('\n=== Additional Migration Complete ===');

    // Full Verification
    console.log('\n=== FULL VERIFICATION: Local vs Supabase ===\n');

    const tablesToVerify = [
      'brain_memories',
      'brain_memory_tags',
      'brain_memory_stats',
      'agent_blueprints',
      'agent_creation_requests',
      'prompt_templates',
      'custom_agents',
      'user_budgets',
      'user_command_preferences',
      'user_notification_prefs',
      'workspaces'
    ];

    console.log('Table                        | Local | Supabase | Status');
    console.log('-----------------------------|-------|----------|--------');

    for (const table of tablesToVerify) {
      try {
        const localCount = await localPool.query(`SELECT COUNT(*) FROM ${table}`);
        const supabaseCount = await supabasePool.query(`SELECT COUNT(*) FROM ${table}`);
        const local = parseInt(localCount.rows[0].count);
        const supa = parseInt(supabaseCount.rows[0].count);
        const status = local <= supa ? '✅' : '❌';
        console.log(`${table.padEnd(28)} | ${String(local).padStart(5)} | ${String(supa).padStart(8)} | ${status}`);
      } catch (e) {
        console.log(`${table.padEnd(28)} | Error: ${e.message.slice(0, 30)}`);
      }
    }

  } catch (error) {
    console.error('Migration failed:', error);
  }

  await localPool.end();
  await supabasePool.end();
}

migrateRemainingData();
