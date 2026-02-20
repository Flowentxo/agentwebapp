/**
 * Delivery Tracker Tool
 *
 * Manages delivery proof for legally relevant landlord-tenant communications.
 * Recommends the correct delivery method per notice type and tracks delivery status.
 */

import { NOTICE_TYPES, DELIVERY_METHODS, formatGermanDate, type DeliveryMethod } from '../config';
import { getDb } from '@/lib/db/connection';
import { tenantCommunications } from '@/lib/db/schema-tenant-comms';
import { eq, and, desc } from 'drizzle-orm';

// ── Types ─────────────────────────────────────────────────────────

export interface DeliveryTrackerInput {
  action: 'recommend' | 'track' | 'list' | 'verify';
  notice_type?: string;
  delivery_method?: DeliveryMethod;
  tracking_number?: string;
  tenant_id?: string;
  notice_id?: string;
  delivery_date?: string;
  witness_name?: string;
}

export interface DeliveryRecommendation {
  primary: {
    method: string;
    label: string;
    reason: string;
  };
  alternative: {
    method: string;
    label: string;
    reason: string;
  };
  avoid?: {
    method: string;
    label: string;
    reason: string;
  };
}

export interface DeliveryResult {
  recommendation?: DeliveryRecommendation;
  tracking_status?: string;
  entries?: Array<{
    id: string;
    method: string;
    status: string;
    date?: string;
    notice_type?: string;
  }>;
  legal_notes: string[];
  formatted_output: string;
}

// ── Tool Definition ───────────────────────────────────────────────

export const DELIVERY_TRACKER_TOOL = {
  name: 'delivery_tracker',
  description: 'Verwaltet Zustellnachweise fuer mietrechtliche Schreiben. Empfiehlt die korrekte Zustellmethode je nach Schreiben-Art und trackt den Zustellstatus.',
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['recommend', 'track', 'list', 'verify'],
        description: 'Aktion: Empfehlung, Tracking, Liste oder Verifizierung',
      },
      notice_type: {
        type: 'string',
        description: 'Art des Schreibens (fuer Empfehlung)',
      },
      delivery_method: {
        type: 'string',
        enum: Object.keys(DELIVERY_METHODS),
        description: 'Zustellmethode',
      },
      tracking_number: {
        type: 'string',
        description: 'Sendungsnummer (Post)',
      },
      tenant_id: {
        type: 'string',
        description: 'Mieter-Referenz',
      },
      notice_id: {
        type: 'string',
        description: 'Referenz auf gesendetes Schreiben',
      },
      delivery_date: {
        type: 'string',
        description: 'Zustelldatum DD.MM.YYYY',
      },
      witness_name: {
        type: 'string',
        description: 'Name des Boten/Zeugen (fuer Boten-Zustellung)',
      },
    },
    required: ['action'],
  },
};

// ── Executor ──────────────────────────────────────────────────────

export async function trackDelivery(input: DeliveryTrackerInput, userId: string): Promise<DeliveryResult> {
  switch (input.action) {
    case 'recommend':
      return getRecommendation(input.notice_type);
    case 'track':
      return trackDeliveryStatus(input, userId);
    case 'list':
      return listDeliveries(input, userId);
    case 'verify':
      return verifyDelivery(input);
    default:
      return {
        legal_notes: [],
        formatted_output: `Unbekannte Aktion: ${input.action}`,
      };
  }
}

// ── Recommendation ────────────────────────────────────────────────

function getRecommendation(noticeType?: string): DeliveryResult {
  const legalNotes: string[] = [];

  if (!noticeType) {
    return {
      recommendation: {
        primary: {
          method: 'einschreiben_einwurf',
          label: DELIVERY_METHODS.einschreiben_einwurf.label,
          reason: 'Allgemein empfohlen fuer mietrechtliche Schreiben. Sicherer Zugangsnachweis.',
        },
        alternative: {
          method: 'bote',
          label: DELIVERY_METHODS.bote.label,
          reason: 'Ebenfalls sicherer Zugangsnachweis. Bote muss Inhalt kennen.',
        },
      },
      legal_notes: ['Ohne Angabe des Schreiben-Typs: Einschreiben/Einwurf ist die sicherste Standardmethode.'],
      formatted_output: '📮 **Zustellempfehlung (allgemein):**\n\n' +
        `**Empfohlen:** ${DELIVERY_METHODS.einschreiben_einwurf.label}\n` +
        `> ${DELIVERY_METHODS.einschreiben_einwurf.legalNote}\n\n` +
        `**Alternative:** ${DELIVERY_METHODS.bote.label}\n` +
        `> ${DELIVERY_METHODS.bote.legalNote}`,
    };
  }

  const config = NOTICE_TYPES[noticeType as keyof typeof NOTICE_TYPES];
  const isFormBound = config?.requiresWrittenForm || false;
  const label = config?.label || noticeType;

  let recommendation: DeliveryRecommendation;

  if (noticeType.startsWith('kuendigung')) {
    // Kuendigung: Spezialfall — Einschreiben/Rueckschein NICHT empfohlen!
    recommendation = {
      primary: {
        method: 'einschreiben_einwurf',
        label: DELIVERY_METHODS.einschreiben_einwurf.label,
        reason: 'Zugang wird durch Einlieferungsbeleg + Einwurfbestaetigung der Post nachgewiesen.',
      },
      alternative: {
        method: 'bote',
        label: DELIVERY_METHODS.bote.label,
        reason: 'Bote wirft Schreiben in Briefkasten und kann als Zeuge aussagen. Muss Inhalt des Schreibens kennen.',
      },
      avoid: {
        method: 'einschreiben_rueckschein',
        label: DELIVERY_METHODS.einschreiben_rueckschein.label,
        reason: 'NICHT empfohlen! Empfaenger kann Annahme verweigern — dann gilt das Schreiben als NICHT zugegangen.',
      },
    };
    legalNotes.push('Kuendigung erfordert Schriftform (§568 BGB) — eigenhaendige Unterschrift erforderlich.');
    legalNotes.push('ACHTUNG: Einschreiben/Rueckschein ist bei Kuendigungen riskant!');
  } else if (noticeType.startsWith('mieterhoehung')) {
    recommendation = {
      primary: {
        method: 'einschreiben_einwurf',
        label: DELIVERY_METHODS.einschreiben_einwurf.label,
        reason: 'Sicherer Zugangsnachweis fuer Mieterhoehungsverlangen.',
      },
      alternative: {
        method: 'persoenlich_quittung',
        label: DELIVERY_METHODS.persoenlich_quittung.label,
        reason: 'Persoenliche Uebergabe mit unterschriebener Empfangsbestaetigung.',
      },
    };
    legalNotes.push('Mieterhoehung muss in Textform zugehen (§558a BGB).');
  } else if (noticeType === 'mahnung_miete') {
    recommendation = {
      primary: {
        method: 'einschreiben_einwurf',
        label: DELIVERY_METHODS.einschreiben_einwurf.label,
        reason: 'Sicherer Zugangsnachweis, wichtig fuer spaetere Kuendigung.',
      },
      alternative: {
        method: 'email',
        label: DELIVERY_METHODS.email.label,
        reason: 'Fuer erste Mahnung ausreichend, da keine Formvorschrift.',
      },
    };
    legalNotes.push('Mahnung hat keine Formvorschrift, aber Zugangsnachweis ist wichtig fuer eventuelle Kuendigung.');
  } else if (noticeType === 'info_schreiben') {
    recommendation = {
      primary: {
        method: 'email',
        label: DELIVERY_METHODS.email.label,
        reason: 'Fuer reine Informationsschreiben ausreichend.',
      },
      alternative: {
        method: 'einschreiben_einwurf',
        label: DELIVERY_METHODS.einschreiben_einwurf.label,
        reason: 'Falls Zugangsnachweis gewuenscht.',
      },
    };
  } else {
    // Default for all other types
    recommendation = {
      primary: {
        method: 'einschreiben_einwurf',
        label: DELIVERY_METHODS.einschreiben_einwurf.label,
        reason: 'Standardmethode mit sicherem Zugangsnachweis.',
      },
      alternative: {
        method: 'bote',
        label: DELIVERY_METHODS.bote.label,
        reason: 'Alternative mit Zeugennachweis.',
      },
    };
  }

  if (isFormBound) {
    legalNotes.push(`${label} erfordert Schriftform — E-Mail oder Fax reicht NICHT aus.`);
  }

  const lines = [
    `📮 **Zustellempfehlung fuer: ${label}**`,
    '',
    `✅ **Empfohlen:** ${recommendation.primary.label}`,
    `> ${recommendation.primary.reason}`,
    '',
    `🔄 **Alternative:** ${recommendation.alternative.label}`,
    `> ${recommendation.alternative.reason}`,
  ];

  if (recommendation.avoid) {
    lines.push('');
    lines.push(`❌ **Vermeiden:** ${recommendation.avoid.label}`);
    lines.push(`> ${recommendation.avoid.reason}`);
  }

  if (legalNotes.length > 0) {
    lines.push('');
    lines.push('**Rechtliche Hinweise:**');
    lines.push(...legalNotes.map(n => `- ${n}`));
  }

  return {
    recommendation,
    legal_notes: legalNotes,
    formatted_output: lines.join('\n'),
  };
}

// ── Track Delivery ────────────────────────────────────────────────

async function trackDeliveryStatus(input: DeliveryTrackerInput, userId: string): Promise<DeliveryResult> {
  const { notice_id, delivery_method, delivery_date, tracking_number, witness_name } = input;

  if (!notice_id) {
    return {
      legal_notes: [],
      formatted_output: 'Fehler: notice_id ist erforderlich fuer Tracking.',
    };
  }

  try {
    const db = getDb();
    await db.update(tenantCommunications)
      .set({
        deliveryMethod: delivery_method || null,
        deliveryDate: delivery_date ? new Date(delivery_date.split('.').reverse().join('-')) : new Date(),
        deliveryStatus: 'delivered',
        trackingNumber: tracking_number || null,
        witnessName: witness_name || null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(tenantCommunications.id, notice_id),
        eq(tenantCommunications.userId, userId),
      ));

    const methodInfo = delivery_method ? DELIVERY_METHODS[delivery_method as keyof typeof DELIVERY_METHODS] : null;
    const legalNotes: string[] = [];

    if (delivery_method === 'bote' && witness_name) {
      legalNotes.push(`Bote "${witness_name}" kann als Zeuge fuer den Zugang aussagen.`);
    }
    if (delivery_method === 'einschreiben_einwurf' && tracking_number) {
      legalNotes.push(`Sendungsnummer ${tracking_number} dient als Zugangsnachweis.`);
    }

    return {
      tracking_status: 'delivered',
      legal_notes: legalNotes,
      formatted_output: [
        `✅ **Zustellung erfasst**`,
        '',
        `Methode: ${methodInfo?.label || delivery_method || 'Nicht angegeben'}`,
        delivery_date ? `Datum: ${delivery_date}` : `Datum: ${formatGermanDate(new Date())}`,
        tracking_number ? `Sendungsnummer: ${tracking_number}` : '',
        witness_name ? `Zeuge: ${witness_name}` : '',
        '',
        ...legalNotes.map(n => `ℹ️ ${n}`),
      ].filter(Boolean).join('\n'),
    };
  } catch (error: any) {
    return {
      legal_notes: [],
      formatted_output: `Fehler beim Speichern: ${error.message}`,
    };
  }
}

// ── List Deliveries ───────────────────────────────────────────────

async function listDeliveries(input: DeliveryTrackerInput, userId: string): Promise<DeliveryResult> {
  try {
    const db = getDb();
    const entries = await db.select()
      .from(tenantCommunications)
      .where(eq(tenantCommunications.userId, userId))
      .orderBy(desc(tenantCommunications.createdAt))
      .limit(20);

    const formattedEntries = entries.map(e => ({
      id: e.id,
      method: e.deliveryMethod || 'none',
      status: e.deliveryStatus || 'pending',
      date: e.deliveryDate ? formatGermanDate(e.deliveryDate) : undefined,
      notice_type: e.noticeType || undefined,
    }));

    const lines = [
      `📋 **Zustelluebersicht** (${formattedEntries.length} Eintraege)`,
      '',
    ];

    if (formattedEntries.length === 0) {
      lines.push('Keine Zustellungen gefunden.');
    } else {
      for (const entry of formattedEntries) {
        const statusIcon = entry.status === 'delivered' ? '✅' : entry.status === 'pending' ? '⏳' : '❌';
        lines.push(`${statusIcon} **${entry.notice_type || 'Schreiben'}** — ${entry.method} (${entry.date || 'kein Datum'})`);
      }
    }

    return {
      entries: formattedEntries,
      legal_notes: [],
      formatted_output: lines.join('\n'),
    };
  } catch (error: any) {
    return {
      legal_notes: [],
      formatted_output: `Fehler beim Laden: ${error.message}`,
    };
  }
}

// ── Verify Delivery ───────────────────────────────────────────────

function verifyDelivery(input: DeliveryTrackerInput): DeliveryResult {
  const { delivery_method, tracking_number, witness_name } = input;
  const legalNotes: string[] = [];
  const lines: string[] = ['🔍 **Zustellnachweis-Pruefung**', ''];

  if (!delivery_method) {
    return {
      legal_notes: ['Keine Zustellmethode angegeben.'],
      formatted_output: 'Fehler: Zustellmethode ist erforderlich fuer Verifizierung.',
    };
  }

  const method = DELIVERY_METHODS[delivery_method as keyof typeof DELIVERY_METHODS];
  if (!method) {
    return {
      legal_notes: [],
      formatted_output: `Unbekannte Zustellmethode: ${delivery_method}`,
    };
  }

  lines.push(`**Methode:** ${method.label}`);
  lines.push(`**Beweisstärke:** ${method.proofLevel === 'high' ? '🟢 Hoch' : method.proofLevel === 'medium' ? '🟡 Mittel' : '🔴 Niedrig'}`);
  lines.push('');

  if (delivery_method === 'einschreiben_einwurf') {
    if (tracking_number) {
      lines.push(`✅ Sendungsnummer vorhanden: ${tracking_number}`);
      legalNotes.push('Einlieferungsbeleg + Einwurfbestaetigung bilden zusammen den Zugangsnachweis.');
    } else {
      lines.push('⚠️ Keine Sendungsnummer — Einlieferungsbeleg aufbewahren!');
    }
  } else if (delivery_method === 'bote') {
    if (witness_name) {
      lines.push(`✅ Zeuge: ${witness_name}`);
      legalNotes.push(`Bote "${witness_name}" muss den Inhalt des Schreibens kennen und als Zeuge aussagen koennen.`);
    } else {
      lines.push('⚠️ Kein Zeuge angegeben — Boten-Zustellung benoetigt einen benennbaren Zeugen!');
    }
  } else if (delivery_method === 'einschreiben_rueckschein') {
    lines.push('⚠️ Einschreiben/Rueckschein: Annahme kann verweigert werden!');
    legalNotes.push('Bei Annahmeverweigerung gilt das Schreiben als NICHT zugegangen.');
  } else if (delivery_method === 'email') {
    lines.push('⚠️ E-Mail erfuellt NICHT die Schriftform (§126 BGB).');
    legalNotes.push('E-Mail ist nur fuer formfreie Mitteilungen geeignet, nicht fuer Kuendigungen oder Mieterhoehungen.');
  }

  lines.push('');
  lines.push(`ℹ️ ${method.legalNote}`);

  return {
    legal_notes: legalNotes,
    formatted_output: lines.join('\n'),
  };
}
