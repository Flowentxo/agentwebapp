/**
 * Generiert dynamisch Agent-Eigenschaften basierend auf der Nutzerbeschreibung
 * Nutzt Keyword-Matching um passende Namen, Icons, Farben und Tags zu bestimmen
 */

export interface GeneratedAgent {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  tags: string[];
  type: 'standard' | 'enterprise';
  industry?: string;
  capabilities: {
    webBrowsing: boolean;
    codeInterpreter: boolean;
    imageGeneration: boolean;
    knowledgeBase: boolean;
    customActions: boolean;
  };
}

/**
 * Generiert eine eindeutige ID für den neuen Agent
 */
function generateId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hauptfunktion: Generiert Agent-Eigenschaften basierend auf Beschreibung
 */
export function generateAgentFromDescription(
  description: string,
  category: 'private' | 'business' = 'private'
): GeneratedAgent {
  const lowerDesc = description.toLowerCase();

  // SCHRITT 1: Enterprise-Detection
  const isEnterprise = lowerDesc.includes('enterprise') ||
                       lowerDesc.includes('b2b') ||
                       lowerDesc.includes('akquise') ||
                       lowerDesc.includes('großkunde') ||
                       lowerDesc.includes('konzern') ||
                       lowerDesc.includes('mittelstand');

  // SCHRITT 2: Industry-Detection
  let industry: string | undefined;
  if (lowerDesc.includes('maschinenbau')) {
    industry = 'Maschinenbau';
  } else if (lowerDesc.includes('versicherung')) {
    industry = 'Versicherung';
  } else if (lowerDesc.includes('industrie') || lowerDesc.includes('fertigung')) {
    industry = 'Industrie';
  } else if (lowerDesc.includes('pharma') || lowerDesc.includes('medizin')) {
    industry = 'Pharma & Medizin';
  } else if (lowerDesc.includes('finanzdienstleist') || lowerDesc.includes('banking')) {
    industry = 'Finanzdienstleistung';
  } else if (lowerDesc.includes('einzelhandel') || lowerDesc.includes('retail')) {
    industry = 'Einzelhandel';
  } else if (lowerDesc.includes('logistik') || lowerDesc.includes('transport')) {
    industry = 'Logistik';
  }

  // SCHRITT 3: Keyword-Gruppen für Spezialisierung (in Priorisierungs-Reihenfolge!)
  const keywordMatches = {
    sales: lowerDesc.includes('sales') || lowerDesc.includes('vertrieb') ||
           lowerDesc.includes('akquise') || lowerDesc.includes('lead') ||
           lowerDesc.includes('verkauf') || lowerDesc.includes('neukundengewinnung'),

    kunde: lowerDesc.includes('kund') || lowerDesc.includes('support') ||
           lowerDesc.includes('whatsapp') || lowerDesc.includes('anfrage') ||
           lowerDesc.includes('ticket') || lowerDesc.includes('service'),

    termin: lowerDesc.includes('termin') || lowerDesc.includes('kalender') ||
            lowerDesc.includes('organisier') || lowerDesc.includes('erinnerung') ||
            lowerDesc.includes('aufgabe') || lowerDesc.includes('planung'),

    finanzen: lowerDesc.includes('rechnung') || lowerDesc.includes('finanz') ||
              lowerDesc.includes('zahlung') || lowerDesc.includes('abo') ||
              lowerDesc.includes('budget') || lowerDesc.includes('kosten'),

    email: lowerDesc.includes('email') || lowerDesc.includes('e-mail') ||
           lowerDesc.includes('nachricht') || lowerDesc.includes('mail') ||
           lowerDesc.includes('kommunikation'),

    analyse: lowerDesc.includes('analys') || lowerDesc.includes('report') ||
             lowerDesc.includes('daten') || lowerDesc.includes('auswert') ||
             lowerDesc.includes('statistik') || lowerDesc.includes('dashboard'),

    dokumentation: lowerDesc.includes('dokument') || lowerDesc.includes('zusammenfass') ||
                   lowerDesc.includes('protokoll') || lowerDesc.includes('notiz'),

    code: lowerDesc.includes('code') || lowerDesc.includes('programm') ||
          lowerDesc.includes('entwickl') || lowerDesc.includes('script'),

    social: lowerDesc.includes('social') || lowerDesc.includes('linkedin') ||
            lowerDesc.includes('twitter') || lowerDesc.includes('post'),

    hr: lowerDesc.includes('bewerbung') || lowerDesc.includes('recruiting') ||
        lowerDesc.includes('interview') || lowerDesc.includes('kandidat'),

    account: lowerDesc.includes('account') || lowerDesc.includes('bestandskund') ||
             lowerDesc.includes('renewal') || lowerDesc.includes('upsell') ||
             lowerDesc.includes('cross-sell')
  };

  // PRIVATE AGENTS (simpler, no enterprise features)
  if (category === 'private') {
    // Termin-Organisator
    if (keywordMatches.termin) {
      return {
        id: generateId(),
        name: 'Termin-Organisator',
        icon: '📅',
        color: '#3b82f6', // blue
        description,
        tags: ['Planung', 'Erinnerungen', 'Kalender'],
        type: 'standard',
        capabilities: {
          webBrowsing: false,
          codeInterpreter: false,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // Finanz-Manager
    if (keywordMatches.finanzen) {
      return {
        id: generateId(),
        name: 'Finanz-Manager',
        icon: '💰',
        color: '#10b981', // green
        description,
        tags: ['Finanzen', 'Überwachung', 'Abos'],
        type: 'standard',
        capabilities: {
          webBrowsing: false,
          codeInterpreter: true,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // E-Mail-Assistent
    if (keywordMatches.email) {
      return {
        id: generateId(),
        name: 'E-Mail-Assistent',
        icon: '✉️',
        color: '#8b5cf6', // purple
        description,
        tags: ['E-Mail', 'Kommunikation', 'Antworten'],
        type: 'standard',
        capabilities: {
          webBrowsing: false,
          codeInterpreter: false,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // Dokumentations-Helfer
    if (keywordMatches.dokumentation) {
      return {
        id: generateId(),
        name: 'Dokumentations-Helfer',
        icon: '📝',
        color: '#f59e0b', // amber
        description,
        tags: ['Dokumentation', 'Zusammenfassungen', 'Notizen'],
        type: 'standard',
        capabilities: {
          webBrowsing: false,
          codeInterpreter: false,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // Default für Private
    return {
      id: generateId(),
      name: 'Persönlicher Assistent',
      icon: '🤖',
      color: '#06b6d4', // cyan
      description,
      tags: ['Assistent', 'Allgemein', 'Helfer'],
      type: 'standard',
      capabilities: {
        webBrowsing: true,
        codeInterpreter: false,
        imageGeneration: false,
        knowledgeBase: true,
        customActions: true
      }
    };
  }

  // BUSINESS AGENTS (mit Enterprise & Industry Support)
  if (category === 'business') {
    // PRIORISIERUNG: Sales > Account > Kunde > Termine > Finanzen > Email > Analyse > Rest

    // 1. SALES & AKQUISE
    if (keywordMatches.sales) {
      const tags = isEnterprise
        ? ['Enterprise', 'B2B', 'Sales', 'Lead-Qualifizierung']
        : ['Sales', 'Vertrieb', 'Leads'];

      if (industry) tags.push(industry);

      return {
        id: generateId(),
        name: isEnterprise ? 'Enterprise Sales Agent' : 'Sales Outreach Agent',
        icon: isEnterprise ? '🏢' : '🎯',
        color: '#ec4899', // pink
        description,
        tags,
        type: isEnterprise ? 'enterprise' : 'standard',
        industry,
        capabilities: {
          webBrowsing: true,
          codeInterpreter: false,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // 2. ACCOUNT MANAGEMENT
    if (keywordMatches.account) {
      const tags = ['Account Management', 'Bestandskunden', 'Renewals'];
      if (industry) tags.push(industry);

      return {
        id: generateId(),
        name: 'Account Manager Agent',
        icon: '🤝',
        color: '#10b981', // green
        description,
        tags,
        type: isEnterprise ? 'enterprise' : 'standard',
        industry,
        capabilities: {
          webBrowsing: true,
          codeInterpreter: false,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // 3. KUNDEN-SUPPORT
    if (keywordMatches.kunde) {
      const tags = ['Support', 'WhatsApp', 'Kommunikation'];
      if (industry) tags.push(industry);

      return {
        id: generateId(),
        name: 'Kunden-Support Agent',
        icon: '💬',
        color: '#f97316', // orange
        description,
        tags,
        type: 'standard',
        industry,
        capabilities: {
          webBrowsing: true,
          codeInterpreter: false,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // 4. TERMINE (auch für Business)
    if (keywordMatches.termin) {
      const tags = ['Planung', 'Termine', 'Koordination'];
      if (industry) tags.push(industry);

      return {
        id: generateId(),
        name: 'Termin-Koordinator',
        icon: '📅',
        color: '#3b82f6', // blue
        description,
        tags,
        type: 'standard',
        industry,
        capabilities: {
          webBrowsing: true,
          codeInterpreter: false,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // 5. FINANZEN
    if (keywordMatches.finanzen) {
      const tags = ['Finanzen', 'Buchhaltung', 'Zahlungen'];
      if (industry) tags.push(industry);

      return {
        id: generateId(),
        name: 'Finanz-Manager',
        icon: '💰',
        color: '#10b981', // green
        description,
        tags,
        type: 'standard',
        industry,
        capabilities: {
          webBrowsing: false,
          codeInterpreter: true,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // 6. EMAIL & KOMMUNIKATION
    if (keywordMatches.email) {
      const tags = ['E-Mail', 'Kommunikation', 'Antworten'];
      if (industry) tags.push(industry);

      return {
        id: generateId(),
        name: 'Kommunikations-Assistent',
        icon: '✉️',
        color: '#8b5cf6', // purple
        description,
        tags,
        type: 'standard',
        industry,
        capabilities: {
          webBrowsing: false,
          codeInterpreter: false,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // 7. ANALYSE & DATEN
    if (keywordMatches.analyse) {
      const tags = ['Analyse', 'Reporting', 'Daten'];
      if (industry) tags.push(industry);

      return {
        id: generateId(),
        name: 'Daten-Analyst',
        icon: '📈',
        color: '#06b6d4', // cyan
        description,
        tags,
        type: 'standard',
        industry,
        capabilities: {
          webBrowsing: true,
          codeInterpreter: true,
          imageGeneration: true,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // 8. CODE-ASSISTENT
    if (keywordMatches.code) {
      const tags = ['Code', 'Entwicklung', 'Programmierung'];

      return {
        id: generateId(),
        name: 'Code-Assistent',
        icon: '💻',
        color: '#8b5cf6', // purple
        description,
        tags,
        type: 'standard',
        capabilities: {
          webBrowsing: true,
          codeInterpreter: true,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // 9. SOCIAL MEDIA
    if (keywordMatches.social) {
      const tags = ['Social Media', 'Content', 'Posts'];

      return {
        id: generateId(),
        name: 'Social Media Manager',
        icon: '📱',
        color: '#14b8a6', // teal
        description,
        tags,
        type: 'standard',
        capabilities: {
          webBrowsing: true,
          codeInterpreter: false,
          imageGeneration: true,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // 10. HR
    if (keywordMatches.hr) {
      const tags = ['HR', 'Recruiting', 'Bewerbungen'];

      return {
        id: generateId(),
        name: 'HR-Assistent',
        icon: '👥',
        color: '#a855f7', // violet
        description,
        tags,
        type: 'standard',
        capabilities: {
          webBrowsing: true,
          codeInterpreter: false,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // 11. INDUSTRY SPECIALIST FALLBACK (wenn industry erkannt aber keine Spezialisierung)
    if (industry && isEnterprise) {
      return {
        id: generateId(),
        name: `${industry} Specialist`,
        icon: '🏭',
        color: '#f59e0b', // amber/yellow
        description,
        tags: ['Enterprise', 'Branchenspezialist', industry],
        type: 'enterprise',
        industry,
        capabilities: {
          webBrowsing: true,
          codeInterpreter: false,
          imageGeneration: false,
          knowledgeBase: true,
          customActions: true
        }
      };
    }

    // 12. IMPROVED DEFAULT FALLBACK
    const defaultTags = isEnterprise
      ? ['Enterprise', 'Business', 'Assistent']
      : ['Business', 'Allgemein', 'Assistent'];

    if (industry) defaultTags.push(industry);

    return {
      id: generateId(),
      name: isEnterprise ? 'Enterprise Business Assistent' : 'Business-Assistent',
      icon: isEnterprise ? '🏢' : '💼',
      color: '#06b6d4', // cyan
      description,
      tags: defaultTags,
      type: isEnterprise ? 'enterprise' : 'standard',
      industry,
      capabilities: {
        webBrowsing: true,
        codeInterpreter: false,
        imageGeneration: false,
        knowledgeBase: true,
        customActions: true
      }
    };
  }

  // Final Fallback (sollte nie erreicht werden, da wir immer private oder business haben)
  return {
    id: generateId(),
    name: 'Digitaler Helfer',
    icon: '🤖',
    color: '#6b7280', // gray
    description,
    tags: ['Assistent'],
    type: 'standard',
    capabilities: {
      webBrowsing: true,
      codeInterpreter: false,
      imageGeneration: false,
      knowledgeBase: true,
      customActions: true
    }
  };
}

/**
 * Hilfsfunktion: Erstellt Preview-Text für Agent-Beschreibung
 * Kürzt lange Beschreibungen auf maximal 150 Zeichen
 */
export function createAgentPreview(description: string, maxLength: number = 150): string {
  if (description.length <= maxLength) {
    return description;
  }
  return description.substring(0, maxLength - 3) + '...';
}
