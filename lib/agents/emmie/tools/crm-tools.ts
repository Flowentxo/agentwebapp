/**
 * Emmie CRM Tools
 *
 * Contact lookup and management via HubSpot or internal CRM.
 */

import OpenAI from 'openai';

export interface CrmCheckContactInput {
  email?: string;
  name?: string;
  company?: string;
}

export interface CrmCheckContactResult {
  found: boolean;
  contact?: {
    email: string;
    name: string;
    company: string;
    lastInteraction?: string;
    tags: string[];
  };
  formatted_output: string;
}

export interface CrmCreateContactInput {
  email: string;
  name: string;
  company?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
}

export interface CrmCreateContactResult {
  success: boolean;
  contactId?: string;
  formatted_output: string;
}

export const CRM_CHECK_CONTACT_TOOL = {
  name: 'crm_check_contact',
  description: 'Pruefe ob ein Kontakt im CRM existiert. Suche nach E-Mail, Name oder Firma. Gibt Kontaktdetails zurueck wenn gefunden.',
  input_schema: {
    type: 'object',
    properties: {
      email: { type: 'string', description: 'E-Mail-Adresse des Kontakts' },
      name: { type: 'string', description: 'Name des Kontakts' },
      company: { type: 'string', description: 'Firmenname' },
    },
    required: [],
  },
};

export const CRM_CREATE_CONTACT_TOOL = {
  name: 'crm_create_contact',
  description: 'Erstelle einen neuen Kontakt im CRM. Erfordert mindestens E-Mail und Name.',
  input_schema: {
    type: 'object',
    properties: {
      email: { type: 'string', description: 'E-Mail-Adresse' },
      name: { type: 'string', description: 'Vollstaendiger Name' },
      company: { type: 'string', description: 'Firma (optional)' },
      phone: { type: 'string', description: 'Telefonnummer (optional)' },
      notes: { type: 'string', description: 'Notizen zum Kontakt (optional)' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags fuer den Kontakt (optional)',
      },
    },
    required: ['email', 'name'],
  },
};

// In-memory CRM store (will be replaced with HubSpot/DB integration)
const crmContacts = new Map<string, {
  id: string;
  email: string;
  name: string;
  company: string;
  phone: string;
  notes: string;
  tags: string[];
  lastInteraction: string;
  createdAt: string;
}>();

export async function checkContact(input: CrmCheckContactInput): Promise<CrmCheckContactResult> {
  const { email, name, company } = input;

  if (!email && !name && !company) {
    return {
      found: false,
      formatted_output: '❌ Mindestens ein Suchkriterium erforderlich (E-Mail, Name oder Firma).',
    };
  }

  // Search in-memory store
  for (const contact of crmContacts.values()) {
    const emailMatch = email && contact.email.toLowerCase() === email.toLowerCase();
    const nameMatch = name && contact.name.toLowerCase().includes(name.toLowerCase());
    const companyMatch = company && contact.company.toLowerCase().includes(company.toLowerCase());

    if (emailMatch || nameMatch || companyMatch) {
      return {
        found: true,
        contact: {
          email: contact.email,
          name: contact.name,
          company: contact.company,
          lastInteraction: contact.lastInteraction,
          tags: contact.tags,
        },
        formatted_output: [
          `✅ **Kontakt gefunden:**`,
          `- Name: ${contact.name}`,
          `- E-Mail: ${contact.email}`,
          ...(contact.company ? [`- Firma: ${contact.company}`] : []),
          ...(contact.tags.length > 0 ? [`- Tags: ${contact.tags.join(', ')}`] : []),
          ...(contact.lastInteraction ? [`- Letzte Interaktion: ${contact.lastInteraction}`] : []),
        ].join('\n'),
      };
    }
  }

  return {
    found: false,
    formatted_output: `ℹ️ Kein Kontakt gefunden fuer: ${email || name || company}`,
  };
}

export async function createContact(input: CrmCreateContactInput): Promise<CrmCreateContactResult> {
  const { email, name, company = '', phone = '', notes = '', tags = [] } = input;

  // Check if contact already exists
  const existing = await checkContact({ email });
  if (existing.found) {
    return {
      success: false,
      formatted_output: `⚠️ Kontakt mit E-Mail ${email} existiert bereits.`,
    };
  }

  const contactId = `crm-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  crmContacts.set(contactId, {
    id: contactId,
    email,
    name,
    company,
    phone,
    notes,
    tags,
    lastInteraction: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    contactId,
    formatted_output: [
      `✅ **Kontakt erstellt:**`,
      `- Name: ${name}`,
      `- E-Mail: ${email}`,
      ...(company ? [`- Firma: ${company}`] : []),
      ...(phone ? [`- Telefon: ${phone}`] : []),
      ...(tags.length > 0 ? [`- Tags: ${tags.join(', ')}`] : []),
      `- ID: ${contactId}`,
    ].join('\n'),
  };
}

export const EMMIE_CRM_TOOLS = [CRM_CHECK_CONTACT_TOOL, CRM_CREATE_CONTACT_TOOL];
