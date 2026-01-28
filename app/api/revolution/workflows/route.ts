/**
 * REVOLUTION API - WORKFLOW CREATION
 *
 * Creates workflows based on agent use cases
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { workflows } from '@/lib/db/schema-workflows';
import { z } from 'zod';
import { Node, Edge } from 'reactflow';

// Validation Schema
const createWorkflowSchema = z.object({
  agentId: z.string().uuid(),
  agentType: z.enum(['sales', 'support', 'operations', 'marketing', 'hr', 'finance']),
  useCases: z.array(z.string()),
  integrations: z.array(z.string()),
  workflowName: z.string().optional(),
  userId: z.string().optional(),
  workspaceId: z.string().optional(),
});

type CreateWorkflowRequest = z.infer<typeof createWorkflowSchema>;

/**
 * POST /api/revolution/workflows
 *
 * Creates workflows for an agent based on selected use cases
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Get user ID from headers
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const workspaceId = req.headers.get('x-workspace-id') || undefined;

    // Validate input
    const validation = createWorkflowSchema.safeParse({
      ...body,
      userId,
      workspaceId,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Generate workflows based on use cases
    const createdWorkflows = [];
    const db = getDb();

    for (const useCase of data.useCases.slice(0, 3)) {
      // Limit to 3 workflows
      const workflowTemplate = generateWorkflowForUseCase(
        useCase,
        data.agentType,
        data.agentId,
        data.integrations
      );

      if (workflowTemplate) {
        const [workflow] = await db
          .insert(workflows)
          .values({
            name: workflowTemplate.name,
            description: workflowTemplate.description,
            nodes: workflowTemplate.nodes,
            edges: workflowTemplate.edges,
            status: 'active',
            visibility: 'private',
            isTemplate: false,
            tags: [data.agentType, useCase],
            userId,
            workspaceId: workspaceId || null,
            version: '1.0.0',
            executionCount: 0,
          })
          .returning();

        createdWorkflows.push(workflow);
        console.log(`[REVOLUTION_API] Created workflow: ${workflow.id} - ${workflow.name}`);
      }
    }

    return NextResponse.json({
      success: true,
      workflows: createdWorkflows.map((wf) => ({
        id: wf.id,
        name: wf.name,
        description: wf.description,
        status: wf.status,
        nodeCount: (wf.nodes as Node[]).length,
      })),
    });
  } catch (error: any) {
    console.error('[REVOLUTION_API] Error creating workflows:', error);
    return NextResponse.json(
      {
        error: 'Failed to create workflows',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// ========================================
// WORKFLOW TEMPLATES
// ========================================

interface WorkflowTemplate {
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Generates a workflow template for a specific use case
 */
function generateWorkflowForUseCase(
  useCase: string,
  agentType: string,
  agentId: string,
  integrations: string[]
): WorkflowTemplate | null {
  // Sales - Lead Qualification
  if (useCase === 'lead-qualification') {
    return {
      name: 'Lead-Qualifizierung (BANT)',
      description: 'Qualifiziert eingehende Leads nach Budget, Authority, Need, Timeline',
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Neuer Lead',
            triggerType: 'webhook',
            config: { webhookUrl: '/webhooks/new-lead' },
          },
        },
        {
          id: '2',
          type: 'llm-agent',
          position: { x: 100, y: 250 },
          data: {
            label: 'BANT-Analyse',
            agentId,
            prompt:
              'Analysiere diesen Lead nach BANT-Kriterien:\n- Budget: Hat der Lead verfügbares Budget?\n- Authority: Hat der Kontakt Entscheidungsbefugnis?\n- Need: Gibt es einen konkreten Bedarf?\n- Timeline: Gibt es einen Zeitrahmen für den Kauf?\n\nLead-Daten: {{trigger.payload}}',
          },
        },
        {
          id: '3',
          type: 'condition',
          position: { x: 100, y: 400 },
          data: {
            label: 'Score > 70?',
            condition: {
              left: '{{llm-agent.score}}',
              operator: 'greater_than',
              right: '70',
            },
          },
        },
        {
          id: '4',
          type: 'api-call',
          position: { x: -100, y: 550 },
          data: {
            label: 'HubSpot: Deal erstellen',
            method: 'POST',
            url: '/api/integrations/hubspot/deals',
            body: {
              dealName: '{{trigger.payload.company}}',
              amount: '{{trigger.payload.budget}}',
              stage: 'qualified',
              properties: {
                bant_score: '{{llm-agent.score}}',
              },
            },
          },
        },
        {
          id: '5',
          type: 'api-call',
          position: { x: 300, y: 550 },
          data: {
            label: 'Gmail: Nachfass-E-Mail',
            method: 'POST',
            url: '/api/integrations/gmail/send',
            body: {
              to: '{{trigger.payload.email}}',
              subject: 'Follow-up zu Ihrer Anfrage',
              body: '{{llm-agent.followUpEmail}}',
            },
          },
        },
        {
          id: '6',
          type: 'output',
          position: { x: 100, y: 700 },
          data: {
            label: 'Ergebnis',
            output: {
              leadQualified: true,
              score: '{{llm-agent.score}}',
              dealId: '{{hubspot.dealId}}',
            },
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4', label: 'Ja' },
        { id: 'e3-5', source: '3', target: '5', label: 'Nein' },
        { id: 'e4-6', source: '4', target: '6' },
        { id: 'e5-6', source: '5', target: '6' },
      ],
    };
  }

  // Sales - Follow-ups
  if (useCase === 'follow-ups') {
    return {
      name: 'Automatische Follow-ups',
      description: 'Versendet zeitgesteuerte Follow-up-E-Mails an Leads',
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Täglich 9:00 Uhr',
            triggerType: 'schedule',
            config: { cron: '0 9 * * *' },
          },
        },
        {
          id: '2',
          type: 'api-call',
          position: { x: 100, y: 250 },
          data: {
            label: 'HubSpot: Leads ohne Antwort',
            method: 'GET',
            url: '/api/integrations/hubspot/contacts',
            query: {
              lastContactDaysAgo: '2',
              status: 'open',
            },
          },
        },
        {
          id: '3',
          type: 'llm-agent',
          position: { x: 100, y: 400 },
          data: {
            label: 'Follow-up E-Mail generieren',
            agentId,
            prompt:
              'Erstelle eine personalisierte Follow-up-E-Mail für:\n{{hubspot.contact}}\n\nLetzter Kontakt: {{hubspot.lastContact}}\nBeachte den bisherigen Gesprächsverlauf.',
          },
        },
        {
          id: '4',
          type: 'api-call',
          position: { x: 100, y: 550 },
          data: {
            label: 'Gmail: E-Mail versenden',
            method: 'POST',
            url: '/api/integrations/gmail/send',
            body: {
              to: '{{hubspot.contact.email}}',
              subject: '{{llm-agent.subject}}',
              body: '{{llm-agent.body}}',
            },
          },
        },
        {
          id: '5',
          type: 'output',
          position: { x: 100, y: 700 },
          data: {
            label: 'Fertig',
            output: {
              emailsSent: '{{gmail.count}}',
            },
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
        { id: 'e4-5', source: '4', target: '5' },
      ],
    };
  }

  // Support - Ticket Handling
  if (useCase === 'ticket-handling') {
    return {
      name: 'Automatische Ticket-Bearbeitung',
      description: 'Analysiert Kundenanfragen und erstellt Tickets',
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Neue E-Mail',
            triggerType: 'webhook',
            config: { webhookUrl: '/webhooks/new-email' },
          },
        },
        {
          id: '2',
          type: 'llm-agent',
          position: { x: 100, y: 250 },
          data: {
            label: 'Anfrage analysieren',
            agentId,
            prompt:
              'Analysiere diese Kundenanfrage:\n{{trigger.email}}\n\nBestimme:\n1. Kategorie (Technisch, Abrechnung, Allgemein)\n2. Priorität (Hoch, Mittel, Niedrig)\n3. Sentiment (Positiv, Neutral, Negativ)',
          },
        },
        {
          id: '3',
          type: 'condition',
          position: { x: 100, y: 400 },
          data: {
            label: 'Hohe Priorität?',
            condition: {
              left: '{{llm-agent.priority}}',
              operator: 'equals',
              right: 'Hoch',
            },
          },
        },
        {
          id: '4',
          type: 'api-call',
          position: { x: -100, y: 550 },
          data: {
            label: 'Slack: Team benachrichtigen',
            method: 'POST',
            url: '/api/integrations/slack/message',
            body: {
              channel: '#support-urgent',
              text: '🚨 Dringende Kundenanfrage: {{trigger.email.subject}}',
            },
          },
        },
        {
          id: '5',
          type: 'llm-agent',
          position: { x: 300, y: 550 },
          data: {
            label: 'Automatische Antwort',
            agentId,
            prompt: 'Erstelle eine hilfreiche Antwort auf: {{trigger.email}}',
          },
        },
        {
          id: '6',
          type: 'output',
          position: { x: 100, y: 700 },
          data: {
            label: 'Fertig',
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4', label: 'Ja' },
        { id: 'e3-5', source: '3', target: '5', label: 'Nein' },
        { id: 'e4-6', source: '4', target: '6' },
        { id: 'e5-6', source: '5', target: '6' },
      ],
    };
  }

  // Default: Simple workflow
  return {
    name: `${useCase} Workflow`,
    description: `Automatisierter Workflow für ${useCase}`,
    nodes: [
      {
        id: '1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Manueller Start',
          triggerType: 'manual',
        },
      },
      {
        id: '2',
        type: 'llm-agent',
        position: { x: 100, y: 250 },
        data: {
          label: 'Agent ausführen',
          agentId,
          prompt: `Führe folgenden Use-Case aus: ${useCase}\n\nInput: {{trigger.input}}`,
        },
      },
      {
        id: '3',
        type: 'output',
        position: { x: 100, y: 400 },
        data: {
          label: 'Ergebnis',
          output: {
            result: '{{llm-agent.response}}',
          },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ],
  };
}
