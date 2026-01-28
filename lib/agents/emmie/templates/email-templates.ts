/**
 * Emmie Email Templates
 *
 * Pre-defined email templates that Emmie can use and customize.
 * Templates support variable substitution using {{variableName}} syntax.
 */

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'follow-up' | 'meeting' | 'intro' | 'reply' | 'sales' | 'support';
  description: string;
  subject: string;
  body: string;
  variables: string[];
  tags?: string[];
}

/**
 * Built-in email templates (German)
 */
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // ============================================================
  // FOLLOW-UP Templates
  // ============================================================
  {
    id: 'follow-up-general',
    name: 'Allgemeines Follow-up',
    category: 'follow-up',
    description: 'Nachfass-Email nach einem Gespräch oder Meeting',
    subject: 'Nachgang zu unserem Gespräch',
    body: `Hallo {{name}},

vielen Dank für das gute Gespräch {{meetingContext}}!

Wie besprochen, hier die nächsten Schritte:
{{nextSteps}}

Falls Sie Fragen haben, stehe ich Ihnen jederzeit zur Verfügung.

Mit freundlichen Grüßen`,
    variables: ['name', 'meetingContext', 'nextSteps'],
    tags: ['nachfassen', 'follow-up'],
  },
  {
    id: 'follow-up-proposal',
    name: 'Angebot Follow-up',
    category: 'follow-up',
    description: 'Nachfass-Email zu einem gesendeten Angebot',
    subject: 'Rückfrage zu unserem Angebot',
    body: `Hallo {{name}},

ich hoffe, Sie hatten Gelegenheit, unser Angebot vom {{proposalDate}} zu prüfen.

Gerne würde ich mit Ihnen über offene Fragen sprechen oder das Angebot nach Ihren Wünschen anpassen.

Wann wäre ein guter Zeitpunkt für ein kurzes Gespräch?

Mit freundlichen Grüßen`,
    variables: ['name', 'proposalDate'],
    tags: ['angebot', 'sales', 'follow-up'],
  },

  // ============================================================
  // MEETING Templates
  // ============================================================
  {
    id: 'meeting-request',
    name: 'Terminanfrage',
    category: 'meeting',
    description: 'Höfliche Anfrage für ein Meeting',
    subject: 'Terminanfrage: {{meetingTopic}}',
    body: `Hallo {{name}},

ich würde gerne einen Termin mit Ihnen vereinbaren, um {{meetingTopic}} zu besprechen.

Hätten Sie in der kommenden Woche Zeit für ein {{duration}}-Gespräch?

Folgende Termine würden mir passen:
{{proposedTimes}}

Alternativ können Sie mir auch Ihre Verfügbarkeit mitteilen.

Mit freundlichen Grüßen`,
    variables: ['name', 'meetingTopic', 'duration', 'proposedTimes'],
    tags: ['termin', 'meeting'],
  },
  {
    id: 'meeting-confirmation',
    name: 'Terminbestätigung',
    category: 'meeting',
    description: 'Bestätigung eines vereinbarten Termins',
    subject: 'Terminbestätigung: {{meetingTopic}} am {{date}}',
    body: `Hallo {{name}},

hiermit bestätige ich unseren Termin:

Thema: {{meetingTopic}}
Datum: {{date}}
Uhrzeit: {{time}}
{{#if location}}Ort: {{location}}{{/if}}
{{#if meetingLink}}Link: {{meetingLink}}{{/if}}

Ich freue mich auf unser Gespräch!

Mit freundlichen Grüßen`,
    variables: ['name', 'meetingTopic', 'date', 'time', 'location', 'meetingLink'],
    tags: ['termin', 'bestätigung'],
  },
  {
    id: 'meeting-reschedule',
    name: 'Terminverschiebung',
    category: 'meeting',
    description: 'Bitte um Terminverschiebung',
    subject: 'Terminverschiebung: {{meetingTopic}}',
    body: `Hallo {{name}},

leider muss ich Sie bitten, unseren Termin am {{originalDate}} zu verschieben.

Wären folgende alternative Termine möglich?
{{alternativeTimes}}

Ich entschuldige mich für die Unannehmlichkeiten.

Mit freundlichen Grüßen`,
    variables: ['name', 'meetingTopic', 'originalDate', 'alternativeTimes'],
    tags: ['termin', 'verschiebung'],
  },

  // ============================================================
  // INTRO Templates
  // ============================================================
  {
    id: 'intro-self',
    name: 'Selbstvorstellung',
    category: 'intro',
    description: 'Erste Kontaktaufnahme mit Selbstvorstellung',
    subject: 'Vorstellung: {{yourRole}} bei {{yourCompany}}',
    body: `Hallo {{name}},

mein Name ist {{yourName}} und ich bin {{yourRole}} bei {{yourCompany}}.

{{introContext}}

Ich würde mich freuen, wenn wir uns austauschen könnten.

Hätten Sie Zeit für ein kurzes Gespräch?

Mit freundlichen Grüßen`,
    variables: ['name', 'yourName', 'yourRole', 'yourCompany', 'introContext'],
    tags: ['vorstellung', 'intro', 'erstkontakt'],
  },
  {
    id: 'intro-referral',
    name: 'Empfehlungs-Intro',
    category: 'intro',
    description: 'Kontaktaufnahme über eine Empfehlung',
    subject: 'Empfehlung von {{referrerName}}',
    body: `Hallo {{name}},

{{referrerName}} hat mir empfohlen, Sie zu kontaktieren.

{{context}}

Ich würde mich über einen Austausch freuen.

Mit freundlichen Grüßen`,
    variables: ['name', 'referrerName', 'context'],
    tags: ['empfehlung', 'intro'],
  },

  // ============================================================
  // REPLY Templates
  // ============================================================
  {
    id: 'reply-thank-you',
    name: 'Danke-Antwort',
    category: 'reply',
    description: 'Höfliche Danksagung',
    subject: 'Re: {{originalSubject}}',
    body: `Hallo {{name}},

vielen Dank für {{thankYouReason}}!

{{additionalInfo}}

Mit freundlichen Grüßen`,
    variables: ['name', 'originalSubject', 'thankYouReason', 'additionalInfo'],
    tags: ['danke', 'antwort'],
  },
  {
    id: 'reply-acknowledgment',
    name: 'Empfangsbestätigung',
    category: 'reply',
    description: 'Bestätigung des Erhalts einer Nachricht',
    subject: 'Re: {{originalSubject}}',
    body: `Hallo {{name}},

vielen Dank für Ihre Nachricht.

Ich habe Ihre Anfrage erhalten und werde mich {{responseTime}} bei Ihnen melden.

Mit freundlichen Grüßen`,
    variables: ['name', 'originalSubject', 'responseTime'],
    tags: ['bestätigung', 'antwort'],
  },

  // ============================================================
  // SALES Templates
  // ============================================================
  {
    id: 'sales-pitch',
    name: 'Produkt-Pitch',
    category: 'sales',
    description: 'Kurze Produkt- oder Service-Vorstellung',
    subject: '{{productBenefit}} für {{companyName}}',
    body: `Hallo {{name}},

ich möchte Ihnen kurz {{productName}} vorstellen.

{{keyBenefits}}

Andere Unternehmen in Ihrer Branche konnten damit bereits {{successMetric}} erreichen.

Hätten Sie Interesse an einer kurzen Demo?

Mit freundlichen Grüßen`,
    variables: ['name', 'companyName', 'productName', 'productBenefit', 'keyBenefits', 'successMetric'],
    tags: ['sales', 'pitch'],
  },

  // ============================================================
  // SUPPORT Templates
  // ============================================================
  {
    id: 'support-response',
    name: 'Support-Antwort',
    category: 'support',
    description: 'Antwort auf eine Support-Anfrage',
    subject: 'Re: {{ticketSubject}} [Ticket #{{ticketId}}]',
    body: `Hallo {{name}},

vielen Dank für Ihre Anfrage.

{{solutionText}}

Falls Sie weitere Fragen haben, antworten Sie einfach auf diese Email.

Mit freundlichen Grüßen`,
    variables: ['name', 'ticketSubject', 'ticketId', 'solutionText'],
    tags: ['support', 'ticket'],
  },
  {
    id: 'support-escalation',
    name: 'Support-Eskalation',
    category: 'support',
    description: 'Information über Eskalation an höhere Instanz',
    subject: 'Re: {{ticketSubject}} - Eskalation [Ticket #{{ticketId}}]',
    body: `Hallo {{name}},

ich habe Ihre Anfrage an unser Spezialisten-Team weitergeleitet.

{{escalationDetails}}

Sie werden sich innerhalb von {{responseTime}} bei Ihnen melden.

Ticket-Referenz: #{{ticketId}}

Mit freundlichen Grüßen`,
    variables: ['name', 'ticketSubject', 'ticketId', 'escalationDetails', 'responseTime'],
    tags: ['support', 'eskalation'],
  },

  // ============================================================
  // NOTIFICATION Templates
  // ============================================================
  {
    id: 'notification-deadline',
    name: 'Deadline-Erinnerung',
    category: 'follow-up',
    description: 'Erinnerung an eine bevorstehende Deadline',
    subject: 'Erinnerung: {{deadlineTopic}} fällig am {{deadlineDate}}',
    body: `Hallo {{name}},

ich möchte Sie daran erinnern, dass {{deadlineTopic}} am {{deadlineDate}} fällig ist.

{{additionalDetails}}

Falls Sie Unterstützung benötigen, lassen Sie es mich wissen.

Mit freundlichen Grüßen`,
    variables: ['name', 'deadlineTopic', 'deadlineDate', 'additionalDetails'],
    tags: ['erinnerung', 'deadline', 'frist'],
  },
  {
    id: 'notification-update',
    name: 'Status-Update',
    category: 'follow-up',
    description: 'Informationen über Projekt- oder Aufgabenstatus',
    subject: 'Status-Update: {{projectName}}',
    body: `Hallo {{name}},

hier ein kurzes Update zu {{projectName}}:

**Aktueller Status:** {{currentStatus}}

**Fortschritt:**
{{progressDetails}}

**Nächste Schritte:**
{{nextSteps}}

Bei Fragen stehe ich zur Verfügung.

Mit freundlichen Grüßen`,
    variables: ['name', 'projectName', 'currentStatus', 'progressDetails', 'nextSteps'],
    tags: ['update', 'status', 'projekt'],
  },

  // ============================================================
  // NETWORKING Templates
  // ============================================================
  {
    id: 'networking-linkedin',
    name: 'LinkedIn Verbindungsanfrage',
    category: 'intro',
    description: 'Follow-up nach LinkedIn-Verbindung',
    subject: 'Schön, vernetzt zu sein!',
    body: `Hallo {{name}},

vielen Dank für die LinkedIn-Verbindung!

{{connectionContext}}

Ich würde mich über einen Austausch freuen. Hätten Sie Interesse an einem kurzen virtuellen Kaffee?

Mit freundlichen Grüßen`,
    variables: ['name', 'connectionContext'],
    tags: ['networking', 'linkedin'],
  },
  {
    id: 'networking-conference',
    name: 'Nach Konferenz/Event',
    category: 'intro',
    description: 'Kontaktaufnahme nach einem Event',
    subject: 'Schön, Sie auf {{eventName}} getroffen zu haben',
    body: `Hallo {{name}},

es war toll, Sie auf {{eventName}} kennenzulernen!

{{conversationHighlight}}

Ich würde unser Gespräch gerne fortsetzen. Wären Sie offen für einen weiteren Austausch?

Mit freundlichen Grüßen`,
    variables: ['name', 'eventName', 'conversationHighlight'],
    tags: ['networking', 'event', 'konferenz'],
  },

  // ============================================================
  // HR/RECRUITMENT Templates
  // ============================================================
  {
    id: 'hr-interview-invite',
    name: 'Interview-Einladung',
    category: 'meeting',
    description: 'Einladung zum Vorstellungsgespräch',
    subject: 'Einladung zum Vorstellungsgespräch - {{positionTitle}}',
    body: `Hallo {{name}},

vielen Dank für Ihre Bewerbung als {{positionTitle}}.

Wir möchten Sie gerne zu einem Vorstellungsgespräch einladen:

**Datum:** {{interviewDate}}
**Uhrzeit:** {{interviewTime}}
**Format:** {{interviewFormat}}
{{#if location}}**Ort:** {{location}}{{/if}}
{{#if meetingLink}}**Link:** {{meetingLink}}{{/if}}

Bitte bestätigen Sie den Termin oder teilen Sie uns alternative Zeiten mit.

Mit freundlichen Grüßen`,
    variables: ['name', 'positionTitle', 'interviewDate', 'interviewTime', 'interviewFormat', 'location', 'meetingLink'],
    tags: ['hr', 'interview', 'bewerbung'],
  },
  {
    id: 'hr-application-received',
    name: 'Bewerbungseingang',
    category: 'reply',
    description: 'Bestätigung des Bewerbungseingangs',
    subject: 'Ihre Bewerbung als {{positionTitle}} - Eingangsbestätigung',
    body: `Hallo {{name}},

vielen Dank für Ihre Bewerbung als {{positionTitle}}.

Wir haben Ihre Unterlagen erhalten und werden diese sorgfältig prüfen. Sie hören innerhalb von {{responseTime}} von uns.

Mit freundlichen Grüßen`,
    variables: ['name', 'positionTitle', 'responseTime'],
    tags: ['hr', 'bewerbung'],
  },

  // ============================================================
  // CANCELLATION Templates
  // ============================================================
  {
    id: 'cancel-meeting',
    name: 'Termin-Absage',
    category: 'meeting',
    description: 'Absage eines vereinbarten Termins',
    subject: 'Absage: {{meetingTopic}} am {{date}}',
    body: `Hallo {{name}},

leider muss ich unseren Termin am {{date}} absagen.

{{cancellationReason}}

Ich würde gerne einen neuen Termin vereinbaren. Wann würde es Ihnen passen?

Ich entschuldige mich für die Unannehmlichkeiten.

Mit freundlichen Grüßen`,
    variables: ['name', 'meetingTopic', 'date', 'cancellationReason'],
    tags: ['absage', 'termin'],
  },

  // ============================================================
  // OUT OF OFFICE Templates
  // ============================================================
  {
    id: 'ooo-vacation',
    name: 'Abwesenheit: Urlaub',
    category: 'reply',
    description: 'Automatische Abwesenheitsnotiz für Urlaub',
    subject: 'Abwesenheitsnotiz',
    body: `Vielen Dank für Ihre Nachricht.

Ich befinde mich vom {{startDate}} bis {{endDate}} im Urlaub und habe in dieser Zeit keinen Zugang zu E-Mails.

In dringenden Fällen wenden Sie sich bitte an {{contactPerson}} ({{contactEmail}}).

Ich werde mich nach meiner Rückkehr bei Ihnen melden.

Mit freundlichen Grüßen`,
    variables: ['startDate', 'endDate', 'contactPerson', 'contactEmail'],
    tags: ['abwesenheit', 'urlaub', 'ooo'],
  },

  // ============================================================
  // APOLOGY Templates
  // ============================================================
  {
    id: 'apology-delay',
    name: 'Entschuldigung: Verzögerung',
    category: 'reply',
    description: 'Entschuldigung für verspätete Antwort',
    subject: 'Re: {{originalSubject}}',
    body: `Hallo {{name}},

bitte entschuldigen Sie meine verspätete Antwort.

{{delayReason}}

{{responseContent}}

Vielen Dank für Ihr Verständnis.

Mit freundlichen Grüßen`,
    variables: ['name', 'originalSubject', 'delayReason', 'responseContent'],
    tags: ['entschuldigung', 'verzögerung'],
  },
  {
    id: 'apology-mistake',
    name: 'Entschuldigung: Fehler',
    category: 'reply',
    description: 'Entschuldigung für einen Fehler',
    subject: 'Entschuldigung - {{errorContext}}',
    body: `Hallo {{name}},

ich möchte mich aufrichtig für {{errorDescription}} entschuldigen.

{{correctionAction}}

Wir werden alles tun, um sicherzustellen, dass dies nicht wieder vorkommt.

Mit freundlichen Grüßen`,
    variables: ['name', 'errorContext', 'errorDescription', 'correctionAction'],
    tags: ['entschuldigung', 'fehler'],
  },

  // ============================================================
  // FEEDBACK Templates
  // ============================================================
  {
    id: 'feedback-request',
    name: 'Feedback-Anfrage',
    category: 'follow-up',
    description: 'Bitte um Feedback nach Zusammenarbeit',
    subject: 'Ihre Meinung ist uns wichtig',
    body: `Hallo {{name}},

ich hoffe, Sie sind mit {{projectOrService}} zufrieden.

Ihr Feedback ist uns sehr wichtig. Könnten Sie sich kurz Zeit nehmen, um uns mitzuteilen:

- Was hat Ihnen besonders gut gefallen?
- Wo sehen Sie Verbesserungspotential?

{{feedbackLink}}

Vielen Dank im Voraus!

Mit freundlichen Grüßen`,
    variables: ['name', 'projectOrService', 'feedbackLink'],
    tags: ['feedback', 'umfrage'],
  },
];

/**
 * Get all templates
 */
export function getAllTemplates(): EmailTemplate[] {
  return EMAIL_TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get template by name (fuzzy match)
 */
export function getTemplateByName(name: string): EmailTemplate | undefined {
  const lowerName = name.toLowerCase();
  return EMAIL_TEMPLATES.find(t =>
    t.name.toLowerCase().includes(lowerName) ||
    t.id.toLowerCase().includes(lowerName)
  );
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): EmailTemplate[] {
  const lowerQuery = query.toLowerCase();
  return EMAIL_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.category.toLowerCase().includes(lowerQuery) ||
    t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Fill template with variables
 */
export function fillTemplate(
  template: EmailTemplate,
  variables: Record<string, string>
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  // Replace all variables
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  }

  // Remove unfilled optional variables (those with {{#if ...}}...{{/if}})
  // Using split/join as ES2018 's' flag alternative for multiline matching
  body = body.split(/\{\{#if \w+\}\}/).map(part => part.split(/\{\{\/if\}\}/)[0]).join('');

  // Clean up remaining unfilled variables
  subject = subject.replace(/\{\{\w+\}\}/g, '');
  body = body.replace(/\{\{\w+\}\}/g, '');

  return { subject: subject.trim(), body: body.trim() };
}

/**
 * Get template categories with counts
 */
export function getTemplateCategoryStats(): Record<EmailTemplate['category'], number> {
  const stats: Record<string, number> = {};
  for (const template of EMAIL_TEMPLATES) {
    stats[template.category] = (stats[template.category] || 0) + 1;
  }
  return stats as Record<EmailTemplate['category'], number>;
}
