/**
 * CREATE WORKFLOWS TABLE AND SEED ENTERPRISE TEMPLATES
 *
 * This script:
 * 1. Creates the workflows table with all required columns
 * 2. Creates required enums
 * 3. Seeds 6 enterprise-grade templates
 *
 * Usage:
 *   npx tsx scripts/create-workflows-and-seed.ts
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL or POSTGRES_URL not found in environment');
  process.exit(1);
}

const sql = postgres(connectionString);

// Template definitions
const ENTERPRISE_TEMPLATES = [
  {
    name: 'Lead-Qualifier Pro',
    description: 'Automatische Lead-Bewertung und intelligente Weiterleitung an das richtige Vertriebsteam basierend auf Unternehmensgröße und Branche.',
    templateCategory: 'sales',
    roiBadge: '💰 +35% Conversion-Rate',
    businessBenefit: 'Ihr Vertriebsteam fokussiert sich nur noch auf die vielversprechendsten Leads. Die KI bewertet jeden eingehenden Lead nach über 20 Kriterien und leitet Hot-Leads sofort an den zuständigen Vertriebler weiter.',
    complexity: 'intermediate',
    estimatedSetupMinutes: 8,
    isFeatured: true,
    downloadCount: 2847,
    rating: '4.9',
    ratingCount: 312,
    iconName: 'Target',
    colorAccent: '#F59E0B',
    tags: ['sales', 'lead-scoring', 'crm', 'automation'],
    targetAudience: ['sales-team', 'growth-team', 'b2b'],
    useCases: ['lead-generation', 'sales-automation', 'crm-enrichment'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Neuer Lead via Webhook', description: 'HubSpot, Salesforce oder Webformular', color: '#8B5CF6' } },
      { id: 'agent-1', type: 'agent', position: { x: 250, y: 180 }, data: { label: 'Lead analysieren', description: 'KI bewertet Firmendaten & Verhalten', color: '#06B6D4' } },
      { id: 'transform-1', type: 'transform', position: { x: 250, y: 310 }, data: { label: 'Score berechnen', description: 'Gewichtete Bewertung 0-100', color: '#F59E0B' } },
      { id: 'condition-1', type: 'condition', position: { x: 250, y: 440 }, data: { label: 'Hot Lead? (Score > 70)', description: 'Entscheidungslogik', color: '#6366F1' } },
      { id: 'action-1', type: 'action', position: { x: 80, y: 570 }, data: { label: 'Slack-Alert senden', description: 'Vertrieb sofort benachrichtigen', color: '#3B82F6' } },
      { id: 'action-2', type: 'action', position: { x: 420, y: 570 }, data: { label: 'Nurture-Kampagne', description: 'E-Mail-Sequenz starten', color: '#3B82F6' } }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'agent-1', target: 'transform-1', type: 'smoothstep' },
      { id: 'e3', source: 'transform-1', target: 'condition-1', type: 'smoothstep' },
      { id: 'e4', source: 'condition-1', target: 'action-1', sourceHandle: 'true', type: 'smoothstep', animated: true },
      { id: 'e5', source: 'condition-1', target: 'action-2', sourceHandle: 'false', type: 'smoothstep' }
    ]
  },
  {
    name: 'Morgen-Briefing Executive',
    description: 'Tägliche Zusammenfassung aller wichtigen Geschäftskennzahlen, Termine und Nachrichten direkt in Ihr Postfach.',
    templateCategory: 'automation',
    roiBadge: '⏱️ Spart 45min täglich',
    businessBenefit: 'Starten Sie jeden Tag informiert. Der Agent sammelt Ihre KPIs aus verschiedenen Quellen, fasst die wichtigsten News zusammen und erstellt einen personalisierten Briefing-Report.',
    complexity: 'beginner',
    estimatedSetupMinutes: 5,
    isFeatured: true,
    downloadCount: 4128,
    rating: '4.8',
    ratingCount: 487,
    iconName: 'Clock',
    colorAccent: '#8B5CF6',
    tags: ['productivity', 'email', 'daily', 'executive'],
    targetAudience: ['executives', 'managers', 'founders'],
    useCases: ['daily-briefing', 'kpi-reporting', 'news-digest'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Täglich 07:00 Uhr', description: 'Automatischer Start', color: '#8B5CF6' } },
      { id: 'agent-1', type: 'agent', position: { x: 100, y: 180 }, data: { label: 'KPIs sammeln', description: 'Dashboard-Daten abrufen', color: '#06B6D4' } },
      { id: 'agent-2', type: 'agent', position: { x: 400, y: 180 }, data: { label: 'News analysieren', description: 'Branchennews durchsuchen', color: '#06B6D4' } },
      { id: 'agent-3', type: 'agent', position: { x: 250, y: 330 }, data: { label: 'Briefing erstellen', description: 'Personalisierter Report', color: '#06B6D4' } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 460 }, data: { label: 'E-Mail versenden', description: 'Formatiertes Briefing', color: '#3B82F6' } }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'trigger-1', target: 'agent-2', type: 'smoothstep' },
      { id: 'e3', source: 'agent-1', target: 'agent-3', type: 'smoothstep' },
      { id: 'e4', source: 'agent-2', target: 'agent-3', type: 'smoothstep' },
      { id: 'e5', source: 'agent-3', target: 'action-1', type: 'smoothstep', animated: true }
    ]
  },
  {
    name: 'Support-Antwort mit Freigabe',
    description: 'KI-generierte Kundenantworten mit menschlicher Qualitätskontrolle vor dem Versand.',
    templateCategory: 'customer-support',
    roiBadge: '📧 80% schnellere Antworten',
    businessBenefit: 'Reduzieren Sie die Antwortzeit drastisch ohne Qualitätsverlust. Der Agent analysiert die Anfrage, entwirft eine passende Antwort und wartet auf Ihre Freigabe.',
    complexity: 'beginner',
    estimatedSetupMinutes: 3,
    isFeatured: true,
    downloadCount: 3521,
    rating: '4.7',
    ratingCount: 398,
    iconName: 'MessageSquare',
    colorAccent: '#06B6D4',
    tags: ['support', 'email', 'approval', 'customer-service'],
    targetAudience: ['support-team', 'customer-success', 'helpdesk'],
    useCases: ['ticket-automation', 'email-drafting', 'customer-response'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Neues Support-Ticket', description: 'Zendesk, Freshdesk, E-Mail', color: '#8B5CF6' } },
      { id: 'agent-1', type: 'agent', position: { x: 250, y: 180 }, data: { label: 'Anfrage analysieren', description: 'Kategorie & Sentiment erkennen', color: '#06B6D4' } },
      { id: 'agent-2', type: 'agent', position: { x: 250, y: 310 }, data: { label: 'Antwort generieren', description: 'Passende Lösungsvorlage', color: '#06B6D4' } },
      { id: 'approval-1', type: 'human-approval', position: { x: 250, y: 440 }, data: { label: 'Freigabe erteilen', description: 'Antwort prüfen & anpassen', color: '#F97316' } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 570 }, data: { label: 'Antwort senden', description: 'Als Ticket-Antwort', color: '#3B82F6' } }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'agent-1', target: 'agent-2', type: 'smoothstep' },
      { id: 'e3', source: 'agent-2', target: 'approval-1', type: 'smoothstep' },
      { id: 'e4', source: 'approval-1', target: 'action-1', type: 'smoothstep', animated: true }
    ]
  },
  {
    name: 'Social Media Autopilot',
    description: 'Automatische Content-Erstellung und -Planung für LinkedIn, Twitter und Instagram.',
    templateCategory: 'marketing',
    roiBadge: '📱 10x mehr Content',
    businessBenefit: 'Konsistente Social-Media-Präsenz ohne den Zeitaufwand. Der Agent erstellt wöchentlich Content-Vorschläge basierend auf Ihren Themen und plant diese automatisch ein.',
    complexity: 'intermediate',
    estimatedSetupMinutes: 10,
    isFeatured: false,
    downloadCount: 2156,
    rating: '4.6',
    ratingCount: 234,
    iconName: 'Share2',
    colorAccent: '#EC4899',
    tags: ['social-media', 'content', 'marketing', 'scheduling'],
    targetAudience: ['marketing-team', 'content-creators', 'solopreneurs'],
    useCases: ['content-creation', 'social-scheduling', 'brand-awareness'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Wöchentlich Montags', description: 'Content-Planung starten', color: '#8B5CF6' } },
      { id: 'agent-1', type: 'agent', position: { x: 250, y: 180 }, data: { label: 'Themen recherchieren', description: 'Trends & Branchennews', color: '#06B6D4' } },
      { id: 'agent-2', type: 'agent', position: { x: 250, y: 310 }, data: { label: 'Posts generieren', description: '7 Posts für die Woche', color: '#06B6D4' } },
      { id: 'action-1', type: 'action', position: { x: 100, y: 440 }, data: { label: 'LinkedIn planen', description: 'Buffer/Hootsuite API', color: '#3B82F6' } },
      { id: 'action-2', type: 'action', position: { x: 250, y: 440 }, data: { label: 'Twitter planen', description: 'Mit Bildern', color: '#3B82F6' } },
      { id: 'action-3', type: 'action', position: { x: 400, y: 440 }, data: { label: 'Slack-Übersicht', description: 'Wochenplan senden', color: '#3B82F6' } }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'agent-1', target: 'agent-2', type: 'smoothstep' },
      { id: 'e3', source: 'agent-2', target: 'action-1', type: 'smoothstep' },
      { id: 'e4', source: 'agent-2', target: 'action-2', type: 'smoothstep' },
      { id: 'e5', source: 'agent-2', target: 'action-3', type: 'smoothstep', animated: true }
    ]
  },
  {
    name: 'CRM-Datenanreicherung',
    description: 'Automatische Anreicherung von Kontaktdaten mit Firmenprofilen, LinkedIn-Infos und Technologiestack.',
    templateCategory: 'data-analysis',
    roiBadge: '📊 100% vollständige Daten',
    businessBenefit: 'Nie wieder unvollständige CRM-Einträge. Jeder neue Kontakt wird automatisch mit Firmendaten, Mitarbeiterzahl, Branche und Technologiestack angereichert.',
    complexity: 'advanced',
    estimatedSetupMinutes: 15,
    isFeatured: false,
    downloadCount: 1432,
    rating: '4.5',
    ratingCount: 156,
    iconName: 'Database',
    colorAccent: '#10B981',
    tags: ['data', 'crm', 'enrichment', 'b2b'],
    targetAudience: ['sales-ops', 'data-team', 'revenue-ops'],
    useCases: ['data-enrichment', 'crm-cleanup', 'lead-enrichment'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Neuer CRM-Kontakt', description: 'HubSpot/Salesforce Webhook', color: '#8B5CF6' } },
      { id: 'action-1', type: 'action', position: { x: 100, y: 180 }, data: { label: 'Clearbit Lookup', description: 'Firmendaten abrufen', color: '#3B82F6' } },
      { id: 'action-2', type: 'action', position: { x: 400, y: 180 }, data: { label: 'LinkedIn Scrape', description: 'Profildaten sammeln', color: '#3B82F6' } },
      { id: 'transform-1', type: 'transform', position: { x: 250, y: 310 }, data: { label: 'Daten zusammenführen', description: 'Duplikate entfernen', color: '#F59E0B' } },
      { id: 'agent-1', type: 'agent', position: { x: 250, y: 440 }, data: { label: 'Qualität prüfen', description: 'KI-Validierung', color: '#06B6D4' } },
      { id: 'action-3', type: 'action', position: { x: 250, y: 570 }, data: { label: 'CRM aktualisieren', description: 'Angereicherte Daten speichern', color: '#3B82F6' } }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
      { id: 'e2', source: 'trigger-1', target: 'action-2', type: 'smoothstep' },
      { id: 'e3', source: 'action-1', target: 'transform-1', type: 'smoothstep' },
      { id: 'e4', source: 'action-2', target: 'transform-1', type: 'smoothstep' },
      { id: 'e5', source: 'transform-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e6', source: 'agent-1', target: 'action-3', type: 'smoothstep', animated: true }
    ]
  },
  {
    name: 'Meeting-Protokoll KI',
    description: 'Automatische Zusammenfassung von Meetings mit extrahierten Action Items und Follow-up-E-Mails.',
    templateCategory: 'automation',
    roiBadge: '📝 Nie mehr Protokolle schreiben',
    businessBenefit: 'Nach jedem Meeting erhalten alle Teilnehmer automatisch eine strukturierte Zusammenfassung mit klaren Verantwortlichkeiten und Deadlines.',
    complexity: 'intermediate',
    estimatedSetupMinutes: 7,
    isFeatured: true,
    downloadCount: 1876,
    rating: '4.8',
    ratingCount: 203,
    iconName: 'FileText',
    colorAccent: '#8B5CF6',
    tags: ['meetings', 'productivity', 'ai', 'automation'],
    targetAudience: ['executives', 'project-managers', 'team-leads'],
    useCases: ['meeting-notes', 'action-tracking', 'team-coordination'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Meeting beendet', description: 'Zoom/Teams Webhook', color: '#8B5CF6' } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Transkript abrufen', description: 'Otter.ai/Assembly AI', color: '#3B82F6' } },
      { id: 'agent-1', type: 'agent', position: { x: 250, y: 310 }, data: { label: 'Zusammenfassung erstellen', description: 'Kernpunkte extrahieren', color: '#06B6D4' } },
      { id: 'agent-2', type: 'agent', position: { x: 250, y: 440 }, data: { label: 'Action Items erkennen', description: 'Aufgaben & Deadlines', color: '#06B6D4' } },
      { id: 'action-2', type: 'action', position: { x: 100, y: 570 }, data: { label: 'E-Mail an Teilnehmer', description: 'Formatiertes Protokoll', color: '#3B82F6' } },
      { id: 'action-3', type: 'action', position: { x: 400, y: 570 }, data: { label: 'Tasks in Asana', description: 'Action Items anlegen', color: '#3B82F6' } }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
      { id: 'e2', source: 'action-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e3', source: 'agent-1', target: 'agent-2', type: 'smoothstep' },
      { id: 'e4', source: 'agent-2', target: 'action-2', type: 'smoothstep', animated: true },
      { id: 'e5', source: 'agent-2', target: 'action-3', type: 'smoothstep', animated: true }
    ]
  }
];

async function main() {
  console.log('🚀 Starting Workflows Table Creation and Template Seeding...\n');

  try {
    // Step 1: Create enums if they don't exist
    console.log('📋 Creating enums...');

    await sql`
      DO $$ BEGIN
        CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE workflow_visibility AS ENUM ('private', 'team', 'public');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE template_category AS ENUM (
          'customer-support', 'data-analysis', 'content-generation',
          'automation', 'research', 'sales', 'marketing', 'other'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE template_complexity AS ENUM ('beginner', 'intermediate', 'advanced');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `;

    console.log('✅ Enums created\n');

    // Step 2: Create workflows table
    console.log('📋 Creating workflows table...');

    await sql`
      CREATE TABLE IF NOT EXISTS workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
        edges JSONB NOT NULL DEFAULT '[]'::jsonb,
        status workflow_status NOT NULL DEFAULT 'draft',
        visibility workflow_visibility NOT NULL DEFAULT 'private',
        is_template BOOLEAN NOT NULL DEFAULT false,
        template_category template_category,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        roi_badge VARCHAR(100),
        business_benefit TEXT,
        complexity template_complexity DEFAULT 'beginner',
        estimated_setup_minutes INTEGER DEFAULT 5,
        is_featured BOOLEAN DEFAULT false,
        download_count INTEGER DEFAULT 0,
        rating NUMERIC(2, 1) DEFAULT 0.0,
        rating_count INTEGER DEFAULT 0,
        icon_name VARCHAR(50) DEFAULT 'Zap',
        color_accent VARCHAR(20) DEFAULT '#8B5CF6',
        target_audience JSONB DEFAULT '[]'::jsonb,
        use_cases JSONB DEFAULT '[]'::jsonb,
        user_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255),
        version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
        parent_workflow_id UUID,
        execution_count INTEGER DEFAULT 0,
        last_executed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        published_at TIMESTAMP
      );
    `;

    console.log('✅ Workflows table created\n');

    // Step 3: Create indexes
    console.log('📋 Creating indexes...');

    await sql`CREATE INDEX IF NOT EXISTS workflow_user_id_idx ON workflows(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS workflow_status_idx ON workflows(status);`;
    await sql`CREATE INDEX IF NOT EXISTS workflow_is_template_idx ON workflows(is_template);`;
    await sql`CREATE INDEX IF NOT EXISTS workflow_template_category_idx ON workflows(template_category);`;
    await sql`CREATE INDEX IF NOT EXISTS workflow_is_featured_idx ON workflows(is_featured);`;
    await sql`CREATE INDEX IF NOT EXISTS workflow_download_count_idx ON workflows(download_count);`;

    console.log('✅ Indexes created\n');

    // Step 4: Delete existing system templates
    console.log('📋 Cleaning up existing system templates...');
    await sql`DELETE FROM workflows WHERE user_id = 'system'`;
    console.log('✅ Cleaned up\n');

    // Step 5: Insert templates
    console.log('📋 Inserting enterprise templates...\n');

    for (const template of ENTERPRISE_TEMPLATES) {
      await sql`
        INSERT INTO workflows (
          name, description, nodes, edges, status, visibility,
          is_template, template_category, tags, roi_badge, business_benefit,
          complexity, estimated_setup_minutes, is_featured, download_count,
          rating, rating_count, icon_name, color_accent, target_audience,
          use_cases, user_id, version
        ) VALUES (
          ${template.name},
          ${template.description},
          ${JSON.stringify(template.nodes)}::jsonb,
          ${JSON.stringify(template.edges)}::jsonb,
          'active',
          'public',
          true,
          ${template.templateCategory}::template_category,
          ${JSON.stringify(template.tags)}::jsonb,
          ${template.roiBadge},
          ${template.businessBenefit},
          ${template.complexity}::template_complexity,
          ${template.estimatedSetupMinutes},
          ${template.isFeatured},
          ${template.downloadCount},
          ${template.rating},
          ${template.ratingCount},
          ${template.iconName},
          ${template.colorAccent},
          ${JSON.stringify(template.targetAudience)}::jsonb,
          ${JSON.stringify(template.useCases)}::jsonb,
          'system',
          '1.0.0'
        )
      `;
      console.log(`   ✅ Created: ${template.name}`);
    }

    // Verify
    const count = await sql`SELECT COUNT(*) as count FROM workflows WHERE is_template = true`;

    console.log('\n' + '='.repeat(50));
    console.log('📊 SEEDING COMPLETE');
    console.log('='.repeat(50));
    console.log(`   Total templates in database: ${count[0].count}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('\n👋 Database connection closed');
  }
}

main();
