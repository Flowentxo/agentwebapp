import { getDb, closeDb } from '../lib/db/connection';
import { knowledgeBases, kbEntries, kbRevisions } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function seed() {
  console.log('🌱 Seeding knowledge base...\n');

  const db = getDb();

  try {
    // 1. Create default knowledge base
    console.log('📚 Creating knowledge base...');
    const [kb] = await db
      .insert(knowledgeBases)
      .values({
        name: 'SINTRA Documentation',
        slug: 'sintra-docs',
        visibility: 'org',
        createdBy: 'admin',
      })
      .returning();

    console.log(`✅ Knowledge base created: ${kb.name} (${kb.id})\n`);

    // 2. Create sample entries
    const sampleEntries = [
      {
        title: 'Getting Started with SINTRA',
        content: `# Getting Started with SINTRA

## Introduction
SINTRA is an enterprise AI agent system designed for autonomous workflow automation.

## Key Features
- Multi-agent orchestration
- Real-time monitoring
- Enterprise security
- RAG-powered knowledge base

## Quick Start
1. Set up your environment
2. Configure agents
3. Deploy workflows
4. Monitor performance

For more information, see the detailed documentation.`,
        category: 'Documentation',
        tags: ['getting-started', 'documentation', 'tutorial'],
      },
      {
        title: 'Agent Configuration Guide',
        content: `# Agent Configuration Guide

## Overview
Learn how to configure SINTRA agents for your specific use cases.

## Configuration Options
- **Name**: Unique identifier for the agent
- **Type**: Agent specialization (data, communication, workflow)
- **Capabilities**: List of available tools and APIs
- **Limits**: Rate limiting and resource constraints

## Example Configuration
\`\`\`json
{
  "name": "dexter",
  "type": "data-analysis",
  "capabilities": ["sql", "python", "visualization"],
  "limits": {
    "maxExecutionTime": 300,
    "maxMemory": "2GB"
  }
}
\`\`\`

## Best Practices
- Use descriptive names
- Set appropriate resource limits
- Monitor agent performance
- Regular capability updates`,
        category: 'Configuration',
        tags: ['agents', 'configuration', 'setup'],
      },
      {
        title: 'Security & Compliance',
        content: `# Security & Compliance

## Authentication
SINTRA uses JWT-based authentication with role-based access control (RBAC).

### Roles
- **user**: Read-only access
- **editor**: Create and edit content
- **reviewer**: Review and approve changes
- **admin**: Full system access

## Data Protection
- All sensitive data is encrypted at rest
- PII is automatically redacted in logs
- Audit trails for all operations
- GDPR compliant data retention policies

## Compliance
- SOC 2 Type II
- ISO 27001
- GDPR
- HIPAA (optional module)

## Rate Limiting
- API: 100 requests/minute
- Search: 10 requests/minute
- AI Q&A: 5 requests/minute`,
        category: 'Security',
        tags: ['security', 'compliance', 'authentication'],
      },
      {
        title: 'Workflow Automation Basics',
        content: `# Workflow Automation Basics

## What is a Workflow?
A workflow is a series of automated tasks executed by one or more agents.

## Creating a Workflow
1. Define the workflow goal
2. Break down into steps
3. Assign agents to steps
4. Configure triggers
5. Set up monitoring

## Example: Customer Onboarding
\`\`\`yaml
workflow:
  name: customer-onboarding
  trigger: new_customer_created
  steps:
    - agent: cassie
      task: send_welcome_email
    - agent: dexter
      task: create_analytics_profile
    - agent: aura
      task: schedule_follow_up
\`\`\`

## Monitoring
Monitor your workflows in real-time through the dashboard.`,
        category: 'Workflows',
        tags: ['workflows', 'automation', 'tutorial'],
      },
      {
        title: 'Knowledge Base FAQ',
        content: `# Knowledge Base FAQ

## Q: How do I search the knowledge base?
A: Use the search bar at the top of the page. You can filter by tags, category, or use semantic search.

## Q: Can agents access the knowledge base?
A: Yes! All SINTRA agents can query the knowledge base using the RAG API.

## Q: How do I add new content?
A: Navigate to the Editor tab and create a new entry. Use Markdown for formatting.

## Q: What is the approval process?
A: Draft → Request Review → Reviewer Approves → Published

## Q: Can I export knowledge base content?
A: Yes, you can export entries as PDF or Markdown files.

## Q: How is content indexed for search?
A: Content is automatically chunked and indexed using vector embeddings for semantic search.`,
        category: 'FAQ',
        tags: ['faq', 'help', 'knowledge-base'],
      },
    ];

    console.log(`📝 Creating ${sampleEntries.length} sample entries...\n`);

    for (const entryData of sampleEntries) {
      // Create entry
      const [entry] = await db
        .insert(kbEntries)
        .values({
          kbId: kb.id,
          title: entryData.title,
          status: 'published',
          authorId: 'admin',
          editorIds: ['admin'],
          tags: entryData.tags,
          category: entryData.category,
        })
        .returning();

      // Create revision
      const checksum = crypto
        .createHash('sha256')
        .update(entryData.content)
        .digest('hex');

      const [revision] = await db
        .insert(kbRevisions)
        .values({
          entryId: entry.id,
          version: 1,
          contentMd: entryData.content,
          sourceType: 'note',
          checksum,
          createdBy: 'admin',
        })
        .returning();

      // Update entry with current revision
      await db
        .update(kbEntries)
        .set({ currentRevisionId: revision.id })
        .where(eq(kbEntries.id, entry.id));

      console.log(`  ✅ ${entryData.title}`);
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Knowledge Base: ${kb.name}`);
    console.log(`   - Entries: ${sampleEntries.length}`);
    console.log(`   - Status: published`);
    console.log('\n💡 Next steps:');
    console.log('   1. Run indexing worker to generate embeddings');
    console.log('   2. Test search: GET /api/knowledge/search?q=getting started');
    console.log('   3. Test RAG: POST /api/agents/knowledge/retrieve');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

// Run seed
seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
