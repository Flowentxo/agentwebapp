/**
 * Pain Points Library for the Discovery Engine
 *
 * Each pain point maps to workflow patterns that seed the AI generation prompt.
 * Pain points are filtered by the selected business persona.
 */

export interface PainPoint {
  id: string;
  titleDE: string;
  descriptionDE: string;
  severity: 'high' | 'medium' | 'low';
  workflowHints: string[];
  applicablePersonas: string[];
}

export const PAIN_POINTS: PainPoint[] = [
  // --- Lead & Sales ---
  {
    id: 'lead-followup',
    titleDE: 'Lead-Nachverfolgung dauert zu lange',
    descriptionDE:
      'Neue Anfragen bleiben stunden- oder tagelang unbeantwortet. Potenzielle Kunden springen ab.',
    severity: 'high',
    workflowHints: ['trigger:webhook', 'agent:dexter', 'action:email', 'delay', 'human-approval'],
    applicablePersonas: ['craftsman', 'realtor', 'agency'],
  },
  {
    id: 'lead-qualification',
    titleDE: 'Keine automatische Lead-Qualifizierung',
    descriptionDE:
      'Jeder Lead wird manuell bewertet. Es fehlt ein System um vielversprechende von schwachen Leads zu unterscheiden.',
    severity: 'high',
    workflowHints: ['agent:dexter', 'condition', 'action:hubspot', 'human-approval'],
    applicablePersonas: ['realtor', 'agency', 'ecommerce'],
  },
  // --- Scheduling ---
  {
    id: 'manual-scheduling',
    titleDE: 'Terminplanung ist manuell und fehleranfällig',
    descriptionDE:
      'Termine werden per Telefon oder E-Mail vereinbart. Doppelbuchungen und vergessene Termine sind häufig.',
    severity: 'medium',
    workflowHints: ['trigger:webhook', 'action:email', 'delay', 'action:slack'],
    applicablePersonas: ['craftsman', 'realtor', 'coach'],
  },
  // --- Customer Communication ---
  {
    id: 'customer-communication',
    titleDE: 'Kundenkommunikation ist inkonsistent',
    descriptionDE:
      'Kunden erhalten keine regelmäßigen Updates. Die Kommunikation variiert je nach Mitarbeiter.',
    severity: 'medium',
    workflowHints: ['trigger:schedule', 'agent:emmie', 'action:email', 'human-approval'],
    applicablePersonas: ['craftsman', 'realtor', 'coach', 'agency'],
  },
  // --- Support ---
  {
    id: 'customer-support-overload',
    titleDE: 'Support-Team ist überlastet',
    descriptionDE:
      'Immer gleiche Fragen werden manuell beantwortet. Das Team hat keine Zeit für komplexe Anfragen.',
    severity: 'high',
    workflowHints: ['trigger:webhook', 'agent:cassie', 'condition', 'action:email', 'human-approval'],
    applicablePersonas: ['ecommerce', 'coach'],
  },
  // --- Onboarding ---
  {
    id: 'customer-onboarding',
    titleDE: 'Kunden-Onboarding ist nicht strukturiert',
    descriptionDE:
      'Neue Kunden erhalten keine einheitliche Begrüßung und Einführung. Wichtige Schritte werden vergessen.',
    severity: 'medium',
    workflowHints: ['trigger:webhook', 'agent:emmie', 'delay', 'action:email', 'action:slack'],
    applicablePersonas: ['coach', 'agency'],
  },
  // --- Content & Marketing ---
  {
    id: 'content-distribution',
    titleDE: 'Content-Verteilung kostet zu viel Zeit',
    descriptionDE:
      'Neue Inhalte müssen manuell auf verschiedenen Kanälen verteilt werden. Social Media, Newsletter, Blog.',
    severity: 'low',
    workflowHints: ['trigger:schedule', 'agent:emmie', 'action:slack', 'action:email'],
    applicablePersonas: ['coach', 'ecommerce', 'agency'],
  },
  // --- Finance ---
  {
    id: 'invoice-tracking',
    titleDE: 'Rechnungsverfolgung ist manuell',
    descriptionDE:
      'Offene Rechnungen werden nicht automatisch nachverfolgt. Zahlungserinnerungen werden vergessen.',
    severity: 'medium',
    workflowHints: ['trigger:schedule', 'condition', 'action:email', 'human-approval', 'delay'],
    applicablePersonas: ['craftsman', 'coach'],
  },
  // --- Data ---
  {
    id: 'data-enrichment',
    titleDE: 'Kundendaten sind unvollständig',
    descriptionDE:
      'CRM-Daten sind lückenhaft. Informationen müssen manuell aus verschiedenen Quellen zusammengetragen werden.',
    severity: 'medium',
    workflowHints: ['trigger:webhook', 'agent:dexter', 'action:hubspot', 'transform'],
    applicablePersonas: ['realtor', 'ecommerce'],
  },
  // --- Segmentation ---
  {
    id: 'customer-segmentation',
    titleDE: 'Keine Kundensegmentierung',
    descriptionDE:
      'Alle Kunden werden gleich behandelt. Es gibt keine automatische Einteilung nach Wert, Verhalten oder Interessen.',
    severity: 'medium',
    workflowHints: ['agent:dexter', 'condition', 'transform', 'action:hubspot'],
    applicablePersonas: ['ecommerce', 'agency'],
  },
  // --- Quotes ---
  {
    id: 'quote-management',
    titleDE: 'Angebotserstellung dauert zu lange',
    descriptionDE:
      'Jedes Angebot wird von Grund auf erstellt. Es fehlen Vorlagen und automatische Kalkulationen.',
    severity: 'high',
    workflowHints: ['trigger:webhook', 'agent:dexter', 'transform', 'action:email', 'human-approval'],
    applicablePersonas: ['craftsman'],
  },
  // --- Order Processing ---
  {
    id: 'order-processing',
    titleDE: 'Bestellabwicklung hat zu viele manuelle Schritte',
    descriptionDE:
      'Bestellungen müssen manuell geprüft, bestätigt und weitergeleitet werden.',
    severity: 'high',
    workflowHints: ['trigger:webhook', 'condition', 'action:email', 'action:slack', 'human-approval'],
    applicablePersonas: ['ecommerce'],
  },
  // --- Reporting ---
  {
    id: 'reporting-manual',
    titleDE: 'Reporting ist zeitaufwändig',
    descriptionDE:
      'Berichte werden manuell in Spreadsheets erstellt. Daten aus verschiedenen Tools müssen zusammengeführt werden.',
    severity: 'low',
    workflowHints: ['trigger:schedule', 'agent:dexter', 'transform', 'action:email'],
    applicablePersonas: ['agency'],
  },
  // --- Handoff ---
  {
    id: 'project-handoff',
    titleDE: 'Projektübergaben sind chaotisch',
    descriptionDE:
      'Informationen gehen bei der Übergabe zwischen Teams oder Mitarbeitern verloren.',
    severity: 'medium',
    workflowHints: ['trigger:manual', 'agent:emmie', 'action:slack', 'action:email'],
    applicablePersonas: ['agency'],
  },
];

/**
 * Get pain points for a specific persona.
 * For 'custom' persona, returns all pain points.
 */
export function getPainPointsForPersona(personaId: string): PainPoint[] {
  if (personaId === 'custom') {
    return PAIN_POINTS;
  }
  return PAIN_POINTS.filter((pp) => pp.applicablePersonas.includes(personaId));
}

export function getPainPointById(id: string): PainPoint | undefined {
  return PAIN_POINTS.find((pp) => pp.id === id);
}
