/**
 * Business Personas for the Discovery Engine
 *
 * Static data defining 6 business personas that seed the consultant flow.
 * Each persona maps to relevant pain points and workflow patterns.
 */

export interface BusinessPersona {
  id: string;
  icon: string; // Lucide icon name
  titleDE: string;
  titleEN: string;
  descriptionDE: string;
  color: string;
  painPointIds: string[];
}

export const BUSINESS_PERSONAS: BusinessPersona[] = [
  {
    id: 'craftsman',
    icon: 'Wrench',
    titleDE: 'Handwerksbetrieb',
    titleEN: 'Craftsman',
    descriptionDE:
      'Handwerksbetriebe, Installateure, Elektriker und Baufirmen die Auftragsabwicklung und Kundenmanagement automatisieren wollen.',
    color: '#F59E0B', // Amber
    painPointIds: [
      'lead-followup',
      'manual-scheduling',
      'quote-management',
      'customer-communication',
      'invoice-tracking',
    ],
  },
  {
    id: 'realtor',
    icon: 'Home',
    titleDE: 'Immobilien',
    titleEN: 'Real Estate',
    descriptionDE:
      'Immobilienmakler und -verwaltungen die Lead-Qualifizierung, Besichtigungen und Kundenbetreuung automatisieren wollen.',
    color: '#3B82F6', // Blue
    painPointIds: [
      'lead-followup',
      'lead-qualification',
      'manual-scheduling',
      'customer-communication',
      'data-enrichment',
    ],
  },
  {
    id: 'coach',
    icon: 'GraduationCap',
    titleDE: 'Coach & Berater',
    titleEN: 'Coach & Consultant',
    descriptionDE:
      'Coaches, Trainer und Berater die Terminbuchungen, Onboarding und Follow-ups automatisieren wollen.',
    color: '#8B5CF6', // Violet
    painPointIds: [
      'manual-scheduling',
      'customer-onboarding',
      'content-distribution',
      'customer-communication',
      'invoice-tracking',
    ],
  },
  {
    id: 'ecommerce',
    icon: 'ShoppingCart',
    titleDE: 'E-Commerce',
    titleEN: 'E-Commerce',
    descriptionDE:
      'Online-Shops und D2C-Marken die Bestellungen, Kundensupport und Marketing automatisieren wollen.',
    color: '#10B981', // Emerald
    painPointIds: [
      'customer-support-overload',
      'order-processing',
      'customer-segmentation',
      'content-distribution',
      'data-enrichment',
    ],
  },
  {
    id: 'agency',
    icon: 'Megaphone',
    titleDE: 'Agentur',
    titleEN: 'Agency',
    descriptionDE:
      'Marketing-, Design- und Digitalagenturen die Projektmanagement, Reporting und Kundenbetreuung automatisieren wollen.',
    color: '#EC4899', // Pink
    painPointIds: [
      'lead-followup',
      'reporting-manual',
      'content-distribution',
      'customer-communication',
      'project-handoff',
    ],
  },
  {
    id: 'custom',
    icon: 'Sparkles',
    titleDE: 'Individuell',
    titleEN: 'Custom',
    descriptionDE:
      'Beschreiben Sie Ihre Branche und Herausforderungen frei - unser KI-Berater findet die passende Lösung.',
    color: '#6366F1', // Indigo
    painPointIds: [], // All pain points available for custom
  },
];

export function getPersonaById(id: string): BusinessPersona | undefined {
  return BUSINESS_PERSONAS.find((p) => p.id === id);
}
