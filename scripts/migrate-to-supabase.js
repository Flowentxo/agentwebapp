const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrateData() {
  const localPool = new Pool({
    host: 'localhost',
    port: 5435,
    user: 'postgres',
    password: 'postgres_password_local',
    database: 'brain_ai'
  });

  const supabasePool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('=== Starting Data Migration to Supabase ===\n');

  try {
    // 1. Migrate brain_memories
    console.log('1. Migrating brain_memories...');
    await supabasePool.query('DELETE FROM brain_memory_tags');
    await supabasePool.query('DELETE FROM brain_memories');

    const memories = await localPool.query('SELECT * FROM brain_memories');
    let memInserted = 0;

    for (const row of memories.rows) {
      try {
        await supabasePool.query(`
          INSERT INTO brain_memories (id, agent_id, memory_type, content, importance_score, created_at, updated_at, expires_at, metadata, context, embeddings, tags, importance)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `, [
          row.id,
          row.agent_id,
          row.memory_type,
          JSON.stringify(row.content),
          row.importance_score,
          row.created_at,
          row.updated_at,
          row.expires_at,
          JSON.stringify(row.metadata || {}),
          JSON.stringify(row.context || {}),
          row.embeddings ? JSON.stringify(row.embeddings) : null,
          JSON.stringify(row.tags || []),
          row.importance
        ]);
        memInserted++;
      } catch (e) {
        console.error('  Memory error:', e.message.slice(0, 80));
      }
    }
    console.log(`   brain_memories: ${memInserted}/${memories.rows.length} migrated`);

    // 2. Migrate brain_memory_tags
    console.log('2. Migrating brain_memory_tags...');
    const tags = await localPool.query('SELECT * FROM brain_memory_tags');
    let tagsInserted = 0;
    for (const row of tags.rows) {
      try {
        await supabasePool.query(
          'INSERT INTO brain_memory_tags (id, memory_id, tag, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [row.id, row.memory_id, row.tag, row.created_at]
        );
        tagsInserted++;
      } catch (e) {}
    }
    console.log(`   brain_memory_tags: ${tagsInserted}/${tags.rows.length} migrated`);

    // 3. Migrate agent_blueprints
    console.log('3. Migrating agent_blueprints...');
    await supabasePool.query('DELETE FROM agent_blueprints');
    const blueprints = await localPool.query('SELECT * FROM agent_blueprints');
    let bpInserted = 0;

    for (const row of blueprints.rows) {
      try {
        await supabasePool.query(`
          INSERT INTO agent_blueprints (id, name, title, description, version, parent_id, personality, skills, tools, integrations, system_prompt, reasoning_style, learning_mode, can_collaborate, preferred_role, owner_id, is_public, category, tags, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        `, [
          row.id, row.name, row.title, row.description, row.version, row.parent_id,
          JSON.stringify(row.personality),
          JSON.stringify(row.skills),
          JSON.stringify(row.tools),
          JSON.stringify(row.integrations),
          row.system_prompt, row.reasoning_style, row.learning_mode,
          row.can_collaborate ? JSON.stringify(row.can_collaborate) : null,
          row.preferred_role, row.owner_id, row.is_public, row.category,
          row.tags ? JSON.stringify(row.tags) : null,
          row.created_at, row.updated_at
        ]);
        bpInserted++;
      } catch (e) {
        console.error('  Blueprint error:', e.message.slice(0, 80));
      }
    }
    console.log(`   agent_blueprints: ${bpInserted}/${blueprints.rows.length} migrated`);

    // 4. Migrate prompt_templates
    console.log('4. Migrating prompt_templates...');
    await supabasePool.query('DELETE FROM prompt_templates');
    const prompts = await localPool.query('SELECT * FROM prompt_templates');
    let promptsInserted = 0;

    for (const row of prompts.rows) {
      try {
        await supabasePool.query(
          'INSERT INTO prompt_templates (id, agent_id, name, description, prompt_text, category, is_public, created_by, use_count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
          [row.id, row.agent_id, row.name, row.description, row.prompt_text, row.category, row.is_public, row.created_by, row.use_count, row.created_at, row.updated_at]
        );
        promptsInserted++;
      } catch (e) {
        console.error('  Prompt error:', e.message.slice(0, 80));
      }
    }
    console.log(`   prompt_templates: ${promptsInserted}/${prompts.rows.length} migrated`);

    // 5. Migrate custom_agents
    console.log('5. Migrating custom_agents...');
    await supabasePool.query('DELETE FROM custom_agents');
    const agents = await localPool.query('SELECT * FROM custom_agents');
    let agentsInserted = 0;

    for (const row of agents.rows) {
      try {
        await supabasePool.query(`
          INSERT INTO custom_agents (id, name, description, icon, color, system_instructions, model, temperature, max_tokens, conversation_starters, capabilities, fallback_chain, response_format, visibility, status, created_by, workspace_id, usage_count, rating, tags, created_at, updated_at, published_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        `, [
          row.id, row.name, row.description, row.icon, row.color, row.system_instructions,
          row.model, row.temperature, row.max_tokens,
          JSON.stringify(row.conversation_starters || []),
          JSON.stringify(row.capabilities || {}),
          row.fallback_chain, row.response_format, row.visibility, row.status,
          row.created_by, row.workspace_id, row.usage_count, row.rating,
          JSON.stringify(row.tags || []),
          row.created_at, row.updated_at, row.published_at
        ]);
        agentsInserted++;
      } catch (e) {
        console.error('  Agent error:', e.message.slice(0, 80));
      }
    }
    console.log(`   custom_agents: ${agentsInserted}/${agents.rows.length} migrated`);

    // 6. Migrate user_budgets
    console.log('6. Migrating user_budgets...');
    const budgets = await localPool.query('SELECT * FROM user_budgets');
    let budgetsInserted = 0;

    for (const row of budgets.rows) {
      try {
        await supabasePool.query(`
          INSERT INTO user_budgets (id, user_id, monthly_token_limit, monthly_cost_limit_usd, daily_token_limit, daily_cost_limit_usd, max_tokens_per_request, max_requests_per_minute, current_month_tokens, current_month_cost_usd, current_day_tokens, current_day_cost_usd, month_reset_at, day_reset_at, is_active, notify_on_threshold, notify_threshold_percent, metadata, created_at, updated_at, max_requests_per_hour, max_requests_per_day, preferred_model, allowed_models)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          ON CONFLICT (user_id) DO NOTHING
        `, [
          row.id, row.user_id, row.monthly_token_limit, row.monthly_cost_limit_usd,
          row.daily_token_limit, row.daily_cost_limit_usd, row.max_tokens_per_request,
          row.max_requests_per_minute, row.current_month_tokens, row.current_month_cost_usd,
          row.current_day_tokens, row.current_day_cost_usd, row.month_reset_at, row.day_reset_at,
          row.is_active, row.notify_on_threshold, row.notify_threshold_percent,
          row.metadata ? JSON.stringify(row.metadata) : null,
          row.created_at, row.updated_at, row.max_requests_per_hour, row.max_requests_per_day,
          row.preferred_model, JSON.stringify(row.allowed_models || [])
        ]);
        budgetsInserted++;
      } catch (e) {
        console.error('  Budget error:', e.message.slice(0, 80));
      }
    }
    console.log(`   user_budgets: ${budgetsInserted}/${budgets.rows.length} migrated`);

    console.log('\n=== Migration Complete ===');

    // Verify
    console.log('\n=== Verification ===');
    const verifyTables = ['brain_memories', 'brain_memory_tags', 'agent_blueprints', 'prompt_templates', 'custom_agents', 'user_budgets'];
    for (const t of verifyTables) {
      const count = await supabasePool.query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`   ${t}: ${count.rows[0].count} rows`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
  }

  await localPool.end();
  await supabasePool.end();
}

migrateData();
