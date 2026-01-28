import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { customAgents, NewCustomAgent } from '@/lib/db/schema-custom-agents';
import { getSessionToken } from '@/lib/auth/cookies';
import { getSessionByToken } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to get user ID from session
async function getUserId(req: NextRequest): Promise<string> {
  try {
    const token = await getSessionToken();
    if (token) {
      const session = await getSessionByToken(token);
      if (session?.userId) {
        return session.userId;
      }
    }
  } catch (error) {
    console.log('[AUTH] No valid session, using default user');
  }
  return 'default-user';
}

// Agent configuration analysis based on user prompt
function analyzeAgentPrompt(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Determine agent type and capabilities based on keywords
  let agentType = 'Chat Assistant';
  let icon = '🤖';
  let color = '#3B82F6';
  let capabilities = {
    webBrowsing: false,
    codeInterpreter: false,
    imageGeneration: false,
    knowledgeBase: false,
    customActions: false
  };
  let systemInstructions = '';
  let tags: string[] = [];
  let model = 'gpt-4o-mini';
  let temperature = '0.7';
  
  // WhatsApp/Messaging
  if (lowerPrompt.includes('whatsapp') || lowerPrompt.includes('nachricht') || lowerPrompt.includes('kundenanfrage')) {
    agentType = 'WhatsApp Customer Support';
    icon = '💬';
    color = '#25D366';
    capabilities.webBrowsing = true;
    capabilities.customActions = true;
    tags.push('whatsapp', 'customer-support', 'messaging');
    
    systemInstructions = `Du bist ein professioneller WhatsApp-Kundensupport-Agent. Deine Aufgaben:
    
1. **Kundenanfragen bearbeiten**: Beantworte Kundenfragen freundlich und professionell auf WhatsApp
2. **Informationen bereitstellen**: Gib Auskunft zu Produkten, Services, Preisen und Verfügbarkeiten
3. **Probleme eskalieren**: Leite komplexe oder ungelöste Probleme an menschliche Mitarbeiter weiter
4. **Freundlicher Ton**: Antworte immer höflich, professionell und hilfsbereit
5. **Schnelle Antworten**: Halte Antworten kurz und prägnant für WhatsApp
    
**Wichtige Verhaltensregeln:**
- Verwende einen freundlichen, professionellen Ton
- Bei technischen Problemen: Sammle relevante Informationen und eskaliere
- Bei Verkaufsanfragen: Biete an, ein Verkaufsgespräch zu terminieren
- Bei Beschwerden: Zeige Verständnis und biete Lösungen an
- Antworte in der Regel innerhalb von 5 Minuten

**Deine Expertise:**
- Produktsupport und -beratung
- Bestellstatus und Tracking-Informationen
- Technischer Support (Grundlagen)
- Terminvereinbarungen
- Reklamationsbearbeitung`;
  }
  
  // Sales/Lead Management
  else if (lowerPrompt.includes('lead') || lowerPrompt.includes('verkauf') || lowerPrompt.includes('demo') || lowerPrompt.includes('termine')) {
    agentType = 'Sales Outreach Agent';
    icon = '📞';
    color = '#10B981';
    capabilities.webBrowsing = true;
    capabilities.knowledgeBase = true;
    tags.push('sales', 'lead-generation', 'outreach');
    
    systemInstructions = `Du bist ein professioneller Sales Outreach Agent. Deine Mission ist es, neue Leads zu kontaktieren, Demo-Termine zu vereinbaren und den Verkaufsprozess voranzutreiben.

**Deine Hauptaufgaben:**
1. **Lead-Kontaktierung**: Kontaktiere neue Leads aus der Pipeline
2. **Demo-Termine vereinbaren**: Koordiniere und buche Demos mit interessierten Prospects
3. **Follow-up Management**: Führe systematische Nachfass-E-Mails und -Anrufe durch
4. **Qualifizierung**: Bewerte Leads und priorisiere sie nach Kaufwahrscheinlichkeit
5. **Dokumentation**: Halte alle Interaktionen und Ergebnisse fest

**Dein Verkaufsprozess:**
1. **Initialer Kontakt**: Personalisierte Ansprache mit Mehrwert
2. **Interesse wecken**: Zeige Relevanz des Angebots für den Prospect
3. **Demo anbieten**: Vereinbare konkrete Termine für Produktvorführungen
4. **Follow-up**: Nächste Schritte nach 3 Tagen ohne Antwort
5. **Übergabe**: Leite qualifizierte Leads an Sales Manager weiter

**Tonalität:**
- Professionell aber zugänglich
- Lösungsorientiert
- Verkaufsfördernd aber nicht aufdringlich`;
  }
  
  // Churn Prevention/Customer Retention
  else if (lowerPrompt.includes('churn') || lowerPrompt.includes('kündigung') || lowerPrompt.includes('zufrieden') || lowerPrompt.includes('retention')) {
    agentType = 'Customer Retention Specialist';
    icon = '🛡️';
    color = '#F59E0B';
    capabilities.knowledgeBase = true;
    capabilities.webBrowsing = true;
    tags.push('retention', 'customer-success', 'churn-prevention');
    
    systemInstructions = `Du bist ein Customer Retention Specialist, der sich darauf spezialisiert hat, unzufriedene Kunden zu identifizieren und proaktiv zu kontaktieren, um Kündigungen zu verhindern.

**Deine Mission:**
1. **Unzufriedene Kunden identifizieren**: Analysiere Support-Tickets, Feedback und Nutzungsdaten
2. **Proaktive Kontaktaufnahme**: Kontaktiere at-risk Kunden vor einer Kündigung
3. **Lösungen anbieten**: Biete konkrete Verbesserungen und Support an
4. **Escalation**: Leite kritische Fälle an Customer Success Manager weiter
5. **Follow-up**: Überprüfe den Erfolg deiner Interventionen

**Deine Strategien:**
- **Sentiment-Analyse**: Erkenne Warnsignale in Kundenkommunikation
- **Personalisierte Lösungen**: Biete maßgeschneiderte Verbesserungen an
- **Wertverstärkung**: Hebe unentdeckte Vorteile des Produkts hervor
- **Support-Verbesserung**: Identifiziere und behebe Service-Probleme
- **Loyalitäts-Programme**: Biete Incentives für langfristige Kundenbindung

**Erfolgsmessung:**
- Reduzierung der Churn Rate
- Verbesserung des Customer Satisfaction Scores
- Erhöhung der Produktnutzung
- Positive Bewertungen und Testimonials`;
  }
  
  // Generic chat assistant
  else {
    agentType = 'AI Assistant';
    icon = '🤖';
    color = '#3B82F6';
    capabilities.webBrowsing = true;
    tags.push('general', 'assistant');
    
    systemInstructions = `Du bist ein vielseitiger AI-Assistent, der darauf spezialisiert ist, Nutzern bei einer Vielzahl von Aufgaben zu helfen.

**Deine Fähigkeiten:**
- Beantwortung von Fragen zu verschiedenen Themen
- Hilfestellung bei Problemlösungen
- Kreative Unterstützung bei Projekten
- Informationsrecherche und -aufbereitung
- Planung und Organisation von Aufgaben

**Deine Arbeitsweise:**
- Höre aufmerksam zu und verstehe die Anfrage vollständig
- Gib präzise, hilfreiche Antworten
- Stelle Folgefragen, wenn etwas unklar ist
- Biete verschiedene Lösungsansätze an
- Bleibe freundlich und professionell`;
  }
  
  // Detect additional capabilities
  if (lowerPrompt.includes('code') || lowerPrompt.includes('programm') || lowerPrompt.includes('entwickl')) {
    capabilities.codeInterpreter = true;
    tags.push('coding', 'development');
  }
  
  if (lowerPrompt.includes('bild') || lowerPrompt.includes('foto') || lowerPrompt.includes('visual')) {
    capabilities.imageGeneration = true;
    tags.push('image-generation', 'visual');
  }
  
  if (lowerPrompt.includes('wissen') || lowerPrompt.includes('dokument') || lowerPrompt.includes('datenbank')) {
    capabilities.knowledgeBase = true;
    tags.push('knowledge', 'documents');
  }

  return {
    name: agentType,
    description: prompt,
    icon,
    color,
    systemInstructions,
    capabilities,
    tags,
    model,
    temperature
  };
}

/**
 * POST /api/agents/create
 * Create a new agent based on user prompt
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'A valid prompt is required' },
        { status: 400 }
      );
    }

    // Analyze the prompt to configure the agent
    const agentConfig = analyzeAgentPrompt(prompt.trim());
    
    const db = getDb();

    // Create the agent using the existing custom agents API logic
    const newAgent: NewCustomAgent = {
      name: agentConfig.name,
      description: agentConfig.description,
      icon: agentConfig.icon,
      color: agentConfig.color,
      systemInstructions: agentConfig.systemInstructions,
      model: agentConfig.model,
      temperature: agentConfig.temperature,
      maxTokens: '4000',
      conversationStarters: [],
      capabilities: agentConfig.capabilities,
      fallbackChain: 'standard',
      visibility: 'private',
      status: 'active',
      createdBy: userId,
      tags: agentConfig.tags,
    };

    const [agent] = await db.insert(customAgents).values(newAgent).returning();

    console.log(`[AGENT_CREATION] Created agent: ${agent.name} (${agent.id}) for user: ${userId}`);

    return NextResponse.json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        icon: agent.icon,
        color: agent.color,
        status: agent.status,
        capabilities: agent.capabilities,
        tags: agent.tags,
        createdAt: agent.createdAt,
      },
      message: `Agent "${agent.name}" wurde erfolgreich erstellt!`
    });

  } catch (error) {
    console.error('[AGENT_CREATION]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}