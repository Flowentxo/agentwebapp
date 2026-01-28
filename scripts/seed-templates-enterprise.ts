/**
 * ENTERPRISE PIPELINE TEMPLATES SEEDER
 *
 * Seeds 6 high-quality, business-centric pipeline templates
 * with realistic nodes, edges, and compelling German value propositions.
 *
 * Part of Phase 7: AI Workflow Wizard
 *
 * Usage:
 *   npx tsx scripts/seed-templates-enterprise.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { workflows } from '../lib/db/schema-workflows';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Node type definitions for React Flow
interface WorkflowNode {
  id: string;
  type: 'trigger' | 'agent' | 'action' | 'condition' | 'transform' | 'delay' | 'human-approval';
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    config?: Record<string, any>;
    color?: string;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
}

// Template definitions
const ENTERPRISE_TEMPLATES = [
  // =========================================================================
  // 1. LEAD QUALIFIER - Sales Kategorie
  // =========================================================================
  {
    name: 'Lead-Qualifier Pro',
    description: 'Automatische Lead-Bewertung und intelligente Weiterleitung an das richtige Vertriebsteam basierend auf Unternehmensgröße und Branche.',
    templateCategory: 'sales' as const,
    roiBadge: '💰 +35% Conversion-Rate',
    businessBenefit: 'Ihr Vertriebsteam fokussiert sich nur noch auf die vielversprechendsten Leads. Die KI bewertet jeden eingehenden Lead nach über 20 Kriterien und leitet Hot-Leads sofort an den zuständigen Vertriebler weiter.',
    complexity: 'intermediate' as const,
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
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { label: 'Neuer Lead via Webhook', description: 'HubSpot, Salesforce oder Webformular', color: '#8B5CF6' }
      },
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 250, y: 180 },
        data: { label: 'Lead analysieren', description: 'KI bewertet Firmendaten & Verhalten', color: '#06B6D4' }
      },
      {
        id: 'transform-1',
        type: 'transform',
        position: { x: 250, y: 310 },
        data: { label: 'Score berechnen', description: 'Gewichtete Bewertung 0-100', color: '#F59E0B' }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: 440 },
        data: { label: 'Hot Lead? (Score > 70)', description: 'Entscheidungslogik', color: '#6366F1' }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 80, y: 570 },
        data: { label: 'Slack-Alert senden', description: 'Vertrieb sofort benachrichtigen', color: '#3B82F6' }
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 420, y: 570 },
        data: { label: 'Nurture-Kampagne', description: 'E-Mail-Sequenz starten', color: '#3B82F6' }
      }
    ] as WorkflowNode[],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'agent-1', target: 'transform-1', type: 'smoothstep' },
      { id: 'e3', source: 'transform-1', target: 'condition-1', type: 'smoothstep' },
      { id: 'e4', source: 'condition-1', target: 'action-1', sourceHandle: 'true', type: 'smoothstep', animated: true },
      { id: 'e5', source: 'condition-1', target: 'action-2', sourceHandle: 'false', type: 'smoothstep' }
    ] as WorkflowEdge[]
  },

  // =========================================================================
  // 2. MORNING BRIEFING - Automation Kategorie
  // =========================================================================
  {
    name: 'Morgen-Briefing Executive',
    description: 'Tägliche Zusammenfassung aller wichtigen Geschäftskennzahlen, Termine und Nachrichten direkt in Ihr Postfach.',
    templateCategory: 'automation' as const,
    roiBadge: '⏱️ Spart 45min täglich',
    businessBenefit: 'Starten Sie jeden Tag informiert. Der Agent sammelt Ihre KPIs aus verschiedenen Quellen, fasst die wichtigsten News zusammen und erstellt einen personalisierten Briefing-Report.',
    complexity: 'beginner' as const,
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
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { label: 'Täglich 07:00 Uhr', description: 'Automatischer Start', color: '#8B5CF6' }
      },
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 100, y: 180 },
        data: { label: 'KPIs sammeln', description: 'Dashboard-Daten abrufen', color: '#06B6D4' }
      },
      {
        id: 'agent-2',
        type: 'agent',
        position: { x: 400, y: 180 },
        data: { label: 'News analysieren', description: 'Branchennews durchsuchen', color: '#06B6D4' }
      },
      {
        id: 'agent-3',
        type: 'agent',
        position: { x: 250, y: 330 },
        data: { label: 'Briefing erstellen', description: 'Personalisierter Report', color: '#06B6D4' }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 250, y: 460 },
        data: { label: 'E-Mail versenden', description: 'Formatiertes Briefing', color: '#3B82F6' }
      }
    ] as WorkflowNode[],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'trigger-1', target: 'agent-2', type: 'smoothstep' },
      { id: 'e3', source: 'agent-1', target: 'agent-3', type: 'smoothstep' },
      { id: 'e4', source: 'agent-2', target: 'agent-3', type: 'smoothstep' },
      { id: 'e5', source: 'agent-3', target: 'action-1', type: 'smoothstep', animated: true }
    ] as WorkflowEdge[]
  },

  // =========================================================================
  // 3. SUPPORT AUTO-REPLY - Customer Support Kategorie
  // =========================================================================
  {
    name: 'Support-Antwort mit Freigabe',
    description: 'KI-generierte Kundenantworten mit menschlicher Qualitätskontrolle vor dem Versand.',
    templateCategory: 'customer-support' as const,
    roiBadge: '📧 80% schnellere Antworten',
    businessBenefit: 'Reduzieren Sie die Antwortzeit drastisch ohne Qualitätsverlust. Der Agent analysiert die Anfrage, entwirft eine passende Antwort und wartet auf Ihre Freigabe.',
    complexity: 'beginner' as const,
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
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { label: 'Neues Support-Ticket', description: 'Zendesk, Freshdesk, E-Mail', color: '#8B5CF6' }
      },
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 250, y: 180 },
        data: { label: 'Anfrage analysieren', description: 'Kategorie & Sentiment erkennen', color: '#06B6D4' }
      },
      {
        id: 'agent-2',
        type: 'agent',
        position: { x: 250, y: 310 },
        data: { label: 'Antwort generieren', description: 'Passende Lösungsvorlage', color: '#06B6D4' }
      },
      {
        id: 'approval-1',
        type: 'human-approval',
        position: { x: 250, y: 440 },
        data: { label: 'Freigabe erteilen', description: 'Antwort prüfen & anpassen', color: '#F97316' }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 250, y: 570 },
        data: { label: 'Antwort senden', description: 'Als Ticket-Antwort', color: '#3B82F6' }
      }
    ] as WorkflowNode[],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'agent-1', target: 'agent-2', type: 'smoothstep' },
      { id: 'e3', source: 'agent-2', target: 'approval-1', type: 'smoothstep' },
      { id: 'e4', source: 'approval-1', target: 'action-1', type: 'smoothstep', animated: true }
    ] as WorkflowEdge[]
  },

  // =========================================================================
  // 4. CONTENT SCHEDULER - Marketing Kategorie
  // =========================================================================
  {
    name: 'Social Media Autopilot',
    description: 'Automatische Content-Erstellung und -Planung für LinkedIn, Twitter und Instagram.',
    templateCategory: 'marketing' as const,
    roiBadge: '📱 10x mehr Content',
    businessBenefit: 'Konsistente Social-Media-Präsenz ohne den Zeitaufwand. Der Agent erstellt wöchentlich Content-Vorschläge basierend auf Ihren Themen und plant diese automatisch ein.',
    complexity: 'intermediate' as const,
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
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { label: 'Wöchentlich Montags', description: 'Content-Planung starten', color: '#8B5CF6' }
      },
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 250, y: 180 },
        data: { label: 'Themen recherchieren', description: 'Trends & Branchennews', color: '#06B6D4' }
      },
      {
        id: 'agent-2',
        type: 'agent',
        position: { x: 250, y: 310 },
        data: { label: 'Posts generieren', description: '7 Posts für die Woche', color: '#06B6D4' }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 100, y: 440 },
        data: { label: 'LinkedIn planen', description: 'Buffer/Hootsuite API', color: '#3B82F6' }
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 250, y: 440 },
        data: { label: 'Twitter planen', description: 'Mit Bildern', color: '#3B82F6' }
      },
      {
        id: 'action-3',
        type: 'action',
        position: { x: 400, y: 440 },
        data: { label: 'Slack-Übersicht', description: 'Wochenplan senden', color: '#3B82F6' }
      }
    ] as WorkflowNode[],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e2', source: 'agent-1', target: 'agent-2', type: 'smoothstep' },
      { id: 'e3', source: 'agent-2', target: 'action-1', type: 'smoothstep' },
      { id: 'e4', source: 'agent-2', target: 'action-2', type: 'smoothstep' },
      { id: 'e5', source: 'agent-2', target: 'action-3', type: 'smoothstep', animated: true }
    ] as WorkflowEdge[]
  },

  // =========================================================================
  // 5. DATA ENRICHMENT - Data Analysis Kategorie
  // =========================================================================
  {
    name: 'CRM-Datenanreicherung',
    description: 'Automatische Anreicherung von Kontaktdaten mit Firmenprofilen, LinkedIn-Infos und Technologiestack.',
    templateCategory: 'data-analysis' as const,
    roiBadge: '📊 100% vollständige Daten',
    businessBenefit: 'Nie wieder unvollständige CRM-Einträge. Jeder neue Kontakt wird automatisch mit Firmendaten, Mitarbeiterzahl, Branche und Technologiestack angereichert.',
    complexity: 'advanced' as const,
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
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { label: 'Neuer CRM-Kontakt', description: 'HubSpot/Salesforce Webhook', color: '#8B5CF6' }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 100, y: 180 },
        data: { label: 'Clearbit Lookup', description: 'Firmendaten abrufen', color: '#3B82F6' }
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 400, y: 180 },
        data: { label: 'LinkedIn Scrape', description: 'Profildaten sammeln', color: '#3B82F6' }
      },
      {
        id: 'transform-1',
        type: 'transform',
        position: { x: 250, y: 310 },
        data: { label: 'Daten zusammenführen', description: 'Duplikate entfernen', color: '#F59E0B' }
      },
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 250, y: 440 },
        data: { label: 'Qualität prüfen', description: 'KI-Validierung', color: '#06B6D4' }
      },
      {
        id: 'action-3',
        type: 'action',
        position: { x: 250, y: 570 },
        data: { label: 'CRM aktualisieren', description: 'Angereicherte Daten speichern', color: '#3B82F6' }
      }
    ] as WorkflowNode[],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
      { id: 'e2', source: 'trigger-1', target: 'action-2', type: 'smoothstep' },
      { id: 'e3', source: 'action-1', target: 'transform-1', type: 'smoothstep' },
      { id: 'e4', source: 'action-2', target: 'transform-1', type: 'smoothstep' },
      { id: 'e5', source: 'transform-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e6', source: 'agent-1', target: 'action-3', type: 'smoothstep', animated: true }
    ] as WorkflowEdge[]
  },

  // =========================================================================
  // 6. MEETING SUMMARIZER - Automation Kategorie
  // =========================================================================
  {
    name: 'Meeting-Protokoll KI',
    description: 'Automatische Zusammenfassung von Meetings mit extrahierten Action Items und Follow-up-E-Mails.',
    templateCategory: 'automation' as const,
    roiBadge: '📝 Nie mehr Protokolle schreiben',
    businessBenefit: 'Nach jedem Meeting erhalten alle Teilnehmer automatisch eine strukturierte Zusammenfassung mit klaren Verantwortlichkeiten und Deadlines.',
    complexity: 'intermediate' as const,
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
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { label: 'Meeting beendet', description: 'Zoom/Teams Webhook', color: '#8B5CF6' }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 250, y: 180 },
        data: { label: 'Transkript abrufen', description: 'Otter.ai/Assembly AI', color: '#3B82F6' }
      },
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 250, y: 310 },
        data: { label: 'Zusammenfassung erstellen', description: 'Kernpunkte extrahieren', color: '#06B6D4' }
      },
      {
        id: 'agent-2',
        type: 'agent',
        position: { x: 250, y: 440 },
        data: { label: 'Action Items erkennen', description: 'Aufgaben & Deadlines', color: '#06B6D4' }
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 100, y: 570 },
        data: { label: 'E-Mail an Teilnehmer', description: 'Formatiertes Protokoll', color: '#3B82F6' }
      },
      {
        id: 'action-3',
        type: 'action',
        position: { x: 400, y: 570 },
        data: { label: 'Tasks in Asana', description: 'Action Items anlegen', color: '#3B82F6' }
      }
    ] as WorkflowNode[],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
      { id: 'e2', source: 'action-1', target: 'agent-1', type: 'smoothstep' },
      { id: 'e3', source: 'agent-1', target: 'agent-2', type: 'smoothstep' },
      { id: 'e4', source: 'agent-2', target: 'action-2', type: 'smoothstep', animated: true },
      { id: 'e5', source: 'agent-2', target: 'action-3', type: 'smoothstep', animated: true }
    ] as WorkflowEdge[]
  }
];

async function seedEnterpriseTemplates() {
  console.log('🚀 Starting Enterprise Pipeline Template Seeder...\n');

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL or POSTGRES_URL not found in environment');
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('📊 Connected to database');

    // First, clean up existing system templates (optional)
    const existingTemplates = await db
      .select({ id: workflows.id, name: workflows.name })
      .from(workflows)
      .where(eq(workflows.userId, 'system'));

    if (existingTemplates.length > 0) {
      console.log(`📦 Found ${existingTemplates.length} existing system templates`);
      console.log('   Existing templates will be updated if names match\n');
    }

    // Insert or update each template
    let inserted = 0;
    let updated = 0;

    for (const template of ENTERPRISE_TEMPLATES) {
      const existingTemplate = existingTemplates.find(t => t.name === template.name);

      const templateData = {
        name: template.name,
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
        status: 'active' as const,
        visibility: 'public' as const,
        isTemplate: true,
        templateCategory: template.templateCategory,
        tags: template.tags,
        roiBadge: template.roiBadge,
        businessBenefit: template.businessBenefit,
        complexity: template.complexity,
        estimatedSetupMinutes: template.estimatedSetupMinutes,
        isFeatured: template.isFeatured,
        downloadCount: template.downloadCount,
        rating: template.rating,
        ratingCount: template.ratingCount,
        iconName: template.iconName,
        colorAccent: template.colorAccent,
        targetAudience: template.targetAudience,
        useCases: template.useCases,
        userId: 'system',
        workspaceId: null,
        version: '1.0.0',
        executionCount: 0,
        updatedAt: new Date(),
      };

      if (existingTemplate) {
        // Update existing template
        await db
          .update(workflows)
          .set(templateData)
          .where(eq(workflows.id, existingTemplate.id));
        console.log(`   ✏️  Updated: ${template.name}`);
        updated++;
      } else {
        // Insert new template
        await db.insert(workflows).values({
          ...templateData,
          createdAt: new Date(),
        });
        console.log(`   ✅ Created: ${template.name}`);
        inserted++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 SEEDING COMPLETE');
    console.log('='.repeat(50));
    console.log(`   New templates created: ${inserted}`);
    console.log(`   Templates updated:     ${updated}`);
    console.log(`   Total templates:       ${ENTERPRISE_TEMPLATES.length}`);
    console.log('='.repeat(50));

    // Summary of templates
    console.log('\n📋 Template Summary:');
    for (const template of ENTERPRISE_TEMPLATES) {
      const featuredBadge = template.isFeatured ? '⭐' : '  ';
      console.log(`   ${featuredBadge} ${template.name}`);
      console.log(`      Category: ${template.templateCategory} | Complexity: ${template.complexity}`);
      console.log(`      ROI: ${template.roiBadge}`);
      console.log(`      Downloads: ${template.downloadCount} | Rating: ${template.rating}/5.0`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('👋 Database connection closed');
  }
}

// Run the seeder
seedEnterpriseTemplates();
