/**
 * REVOLUTION API - AGENT TEMPLATES
 *
 * Provides pre-configured agent templates for quick start
 */

import { NextRequest, NextResponse } from 'next/server';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  agentType: string;
  industries: string[];
  useCases: string[];
  integrations: string[];
  tone: string;
  responseStyle: string;
  featured: boolean;
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  // ==================== SALES ====================
  {
    id: 'sales-b2b-machinery',
    name: 'B2B Maschinenbau Sales Agent',
    description:
      'Spezialisiert auf Lead-Qualifizierung und Vertrieb im Maschinenbau. Perfekt für B2B-Unternehmen in Worms, Karlsruhe, Mannheim.',
    icon: '🏭',
    color: '#ec4899',
    category: 'Vertrieb',
    agentType: 'sales',
    industries: ['manufacturing'],
    useCases: ['lead-qualification', 'follow-ups', 'crm-sync', 'meeting-booking'],
    integrations: ['hubspot', 'gmail', 'calendar'],
    tone: 'professional',
    responseStyle: 'detailed',
    featured: true,
  },
  {
    id: 'sales-enterprise',
    name: 'Enterprise Sales Agent',
    description:
      'Für große B2B-Deals mit langen Sales-Cycles. Automatisiert Follow-ups, Lead-Scoring und Account-Management.',
    icon: '🎯',
    color: '#ec4899',
    category: 'Vertrieb',
    agentType: 'sales',
    industries: ['it', 'consulting'],
    useCases: ['lead-qualification', 'follow-ups', 'crm-sync', 'competitor-analysis'],
    integrations: ['salesforce', 'gmail', 'calendar'],
    tone: 'professional',
    responseStyle: 'detailed',
    featured: true,
  },

  // ==================== SUPPORT ====================
  {
    id: 'support-whatsapp',
    name: 'WhatsApp Support Agent',
    description:
      'Beantwortet Kundenanfragen über WhatsApp Business. Ideal für schnellen Support und FAQ-Automation.',
    icon: '💬',
    color: '#25D366',
    category: 'Support',
    agentType: 'support',
    industries: ['ecommerce', 'realestate'],
    useCases: ['ticket-handling', 'faq-automation', 'multilingual'],
    integrations: ['whatsapp', 'slack', 'text'],
    tone: 'friendly',
    responseStyle: 'quick',
    featured: true,
  },
  {
    id: 'support-technical',
    name: 'Technischer Support Agent',
    description:
      'Für IT-Support und technische Anfragen. Kann Code analysieren, Fehler debuggen und Lösungen vorschlagen.',
    icon: '🛠️',
    color: '#3b82f6',
    category: 'Support',
    agentType: 'support',
    industries: ['it'],
    useCases: ['ticket-handling', 'escalation', 'faq-automation'],
    integrations: ['slack', 'gmail', 'text'],
    tone: 'technical',
    responseStyle: 'detailed',
    featured: false,
  },

  // ==================== OPERATIONS ====================
  {
    id: 'operations-reporting',
    name: 'Automatisches Reporting',
    description:
      'Erstellt tägliche/wöchentliche Reports aus verschiedenen Datenquellen. Versendet sie automatisch an das Team.',
    icon: '📊',
    color: '#8b5cf6',
    category: 'Betrieb',
    agentType: 'operations',
    industries: ['manufacturing', 'consulting'],
    useCases: ['reporting', 'data-sync', 'notification'],
    integrations: ['postgresql', 'gmail', 'slack'],
    tone: 'professional',
    responseStyle: 'detailed',
    featured: true,
  },
  {
    id: 'operations-workflow',
    name: 'Workflow Automation Agent',
    description:
      'Automatisiert wiederkehrende Prozesse zwischen verschiedenen Tools. Perfekt für Prozessoptimierung.',
    icon: '⚙️',
    color: '#8b5cf6',
    category: 'Betrieb',
    agentType: 'operations',
    industries: ['it', 'logistics'],
    useCases: ['workflow-automation', 'data-sync', 'quality-check'],
    integrations: ['notion', 'slack', 'calendar'],
    tone: 'technical',
    responseStyle: 'quick',
    featured: false,
  },

  // ==================== MARKETING ====================
  {
    id: 'marketing-content',
    name: 'Content Marketing Agent',
    description:
      'Erstellt SEO-optimierte Blog-Artikel, Social-Media-Posts und Newsletter. Spart Zeit bei der Content-Erstellung.',
    icon: '📝',
    color: '#f59e0b',
    category: 'Marketing',
    agentType: 'marketing',
    industries: ['ecommerce', 'consulting'],
    useCases: ['content-generation', 'seo-optimization', 'social-scheduling'],
    integrations: ['notion', 'slack', 'url'],
    tone: 'casual',
    responseStyle: 'detailed',
    featured: true,
  },

  // ==================== HR ====================
  {
    id: 'hr-recruiting',
    name: 'Recruiting Agent',
    description:
      'Screent Bewerbungen, koordiniert Interviews und automatisiert den Recruiting-Prozess.',
    icon: '👥',
    color: '#a855f7',
    category: 'Personal',
    agentType: 'hr',
    industries: ['it', 'consulting'],
    useCases: ['candidate-screening', 'interview-scheduling', 'onboarding'],
    integrations: ['gmail', 'calendar', 'notion'],
    tone: 'friendly',
    responseStyle: 'detailed',
    featured: false,
  },

  // ==================== FINANCE ====================
  {
    id: 'finance-invoices',
    name: 'Rechnungsmanagement Agent',
    description:
      'Verarbeitet Eingangsrechnungen, versendet Zahlungserinnerungen und erstellt Finanzberichte.',
    icon: '💰',
    color: '#10b981',
    category: 'Finanzen',
    agentType: 'finance',
    industries: ['manufacturing', 'consulting'],
    useCases: ['invoice-processing', 'payment-reminders', 'financial-reporting'],
    integrations: ['gmail', 'notion', 'pdf'],
    tone: 'professional',
    responseStyle: 'detailed',
    featured: false,
  },
];

/**
 * GET /api/revolution/templates
 *
 * Returns available agent templates
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const industry = searchParams.get('industry');
    const featuredOnly = searchParams.get('featured') === 'true';

    // Filter templates
    let filteredTemplates = [...AGENT_TEMPLATES];

    if (category) {
      filteredTemplates = filteredTemplates.filter((t) => t.category === category);
    }

    if (industry) {
      filteredTemplates = filteredTemplates.filter((t) => t.industries.includes(industry));
    }

    if (featuredOnly) {
      filteredTemplates = filteredTemplates.filter((t) => t.featured);
    }

    return NextResponse.json({
      success: true,
      templates: filteredTemplates,
      total: filteredTemplates.length,
    });
  } catch (error: any) {
    console.error('[REVOLUTION_API] Error fetching templates:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch templates',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/revolution/templates/:id
 *
 * Returns a specific template by ID
 */
export async function getTemplateById(id: string): Promise<AgentTemplate | null> {
  return AGENT_TEMPLATES.find((t) => t.id === id) || null;
}
