/**
 * WORKFLOW VALIDATOR SERVICE
 *
 * Post-generation validation & auto-injection of HumanApprovalNodes.
 * Scans generated workflows for risky action nodes (email, Slack, HubSpot, etc.)
 * and injects human-approval gates before them if missing.
 *
 * Part of Phase II: Semantic Translation Layer
 */

import { Node, Edge } from 'reactflow';
import { GeneratedWorkflow } from './WorkflowGenerator';

// ─── Risky Action Detection ─────────────────────────────────────────

/** Action types that require human approval before execution */
const RISKY_ACTION_TYPES = new Set([
  'email',
  'slack',
  'hubspot',
  'database',
  'webhook',
]);

/** Labels that hint at risky outbound actions (case-insensitive partial match) */
const RISKY_LABEL_PATTERNS = [
  /send/i,
  /senden/i,
  /publish/i,
  /veröffentlich/i,
  /post/i,
  /delete/i,
  /löschen/i,
  /update.*crm/i,
  /write.*database/i,
  /schreib/i,
  /notify/i,
  /benachrichtig/i,
];

// ─── Types ──────────────────────────────────────────────────────────

export interface InjectionReport {
  /** Number of approval nodes injected */
  injectedCount: number;
  /** Details per injection */
  injections: Array<{
    beforeNodeId: string;
    beforeNodeLabel: string;
    approvalNodeId: string;
    reason: string;
  }>;
}

export interface EnhancedWorkflow extends GeneratedWorkflow {
  /** Report of auto-injected approval nodes */
  injectionReport: InjectionReport;
}

// ─── Helpers ────────────────────────────────────────────────────────

function isRiskyNode(node: Node): boolean {
  const data = node.data || {};
  const nodeType = data.nodeType || node.type;
  const actionType = (data.actionType || '').toLowerCase();
  const label = (data.label || '').toLowerCase();

  // Already an approval node - skip
  if (nodeType === 'human-approval') return false;

  // Check actionType directly
  if (RISKY_ACTION_TYPES.has(actionType)) return true;

  // Check label patterns
  for (const pattern of RISKY_LABEL_PATTERNS) {
    if (pattern.test(label)) return true;
  }

  return false;
}

function getRiskReason(node: Node): string {
  const data = node.data || {};
  const actionType = (data.actionType || '').toLowerCase();
  const label = data.label || node.id;

  if (actionType === 'email') return `E-Mail-Versand: "${label}"`;
  if (actionType === 'slack') return `Slack-Nachricht: "${label}"`;
  if (actionType === 'hubspot') return `CRM-Schreibzugriff: "${label}"`;
  if (actionType === 'database') return `Datenbank-Schreibzugriff: "${label}"`;
  if (actionType === 'webhook') return `Externer Webhook: "${label}"`;
  return `Riskante Aktion: "${label}"`;
}

function hasPrecedingApproval(
  nodeId: string,
  edges: Edge[],
  nodes: Node[]
): boolean {
  // Find all direct parent nodes
  const parentEdges = edges.filter((e) => e.target === nodeId);
  const parentNodeIds = parentEdges.map((e) => e.source);

  // Check if any parent is a human-approval node
  for (const parentId of parentNodeIds) {
    const parentNode = nodes.find((n) => n.id === parentId);
    if (!parentNode) continue;

    const parentType =
      parentNode.data?.nodeType || parentNode.type;
    if (parentType === 'human-approval') return true;
  }

  return false;
}

// ─── Main Validator ─────────────────────────────────────────────────

/**
 * Validate and enhance a generated workflow by auto-injecting
 * HumanApprovalNodes before risky action nodes that lack them.
 */
export function validateAndEnhance(
  workflow: GeneratedWorkflow
): EnhancedWorkflow {
  const nodes = [...workflow.nodes];
  const edges = [...workflow.edges];
  const injections: InjectionReport['injections'] = [];

  let approvalCounter = 0;

  // Find risky nodes without preceding approval
  const riskyNodes = nodes.filter(
    (node) =>
      isRiskyNode(node) && !hasPrecedingApproval(node.id, edges, nodes)
  );

  for (const riskyNode of riskyNodes) {
    approvalCounter++;
    const approvalId = `approval-auto-${approvalCounter}`;
    const reason = getRiskReason(riskyNode);

    // ── Calculate position (insert between parent and risky node) ──
    const incomingEdges = edges.filter((e) => e.target === riskyNode.id);
    let approvalX = riskyNode.position?.x || 250;
    let approvalY = (riskyNode.position?.y || 200) - 120;

    if (incomingEdges.length > 0) {
      const parentNode = nodes.find(
        (n) => n.id === incomingEdges[0].source
      );
      if (parentNode?.position) {
        approvalY =
          parentNode.position.y +
          (riskyNode.position!.y - parentNode.position.y) / 2;
      }
    }

    // ── Create approval node ──
    const approvalNode: Node = {
      id: approvalId,
      type: 'pipeline-node',
      position: { x: approvalX, y: approvalY },
      data: {
        label: `Freigabe: ${riskyNode.data?.label || 'Aktion'}`,
        nodeType: 'human-approval',
        approvalMessage: reason,
        color: '#F97316',
        autoInjected: true,
      },
    };

    // ── Rewire edges ──
    // For each incoming edge to risky node: redirect to approval node
    for (const edge of incomingEdges) {
      const edgeIndex = edges.findIndex((e) => e.id === edge.id);
      if (edgeIndex !== -1) {
        edges[edgeIndex] = {
          ...edges[edgeIndex],
          target: approvalId,
        };
      }
    }

    // Add new edge: approval -> risky node
    edges.push({
      id: `edge-approval-${approvalCounter}`,
      source: approvalId,
      target: riskyNode.id,
      type: 'smoothstep',
      animated: false,
    });

    // ── Shift risky node down to make room ──
    const nodeIndex = nodes.findIndex((n) => n.id === riskyNode.id);
    if (nodeIndex !== -1 && nodes[nodeIndex].position) {
      nodes[nodeIndex] = {
        ...nodes[nodeIndex],
        position: {
          x: nodes[nodeIndex].position!.x,
          y: nodes[nodeIndex].position!.y + 120,
        },
      };
    }

    // Shift all downstream nodes down too
    shiftDownstreamNodes(riskyNode.id, nodes, edges, 120);

    // Add the approval node
    nodes.push(approvalNode);

    injections.push({
      beforeNodeId: riskyNode.id,
      beforeNodeLabel: riskyNode.data?.label || riskyNode.id,
      approvalNodeId: approvalId,
      reason,
    });
  }

  return {
    ...workflow,
    nodes,
    edges,
    injectionReport: {
      injectedCount: injections.length,
      injections,
    },
  };
}

/**
 * Recursively shift all nodes downstream of a given node by `offsetY` pixels.
 */
function shiftDownstreamNodes(
  startNodeId: string,
  nodes: Node[],
  edges: Edge[],
  offsetY: number,
  visited = new Set<string>()
): void {
  if (visited.has(startNodeId)) return;
  visited.add(startNodeId);

  const outgoingEdges = edges.filter((e) => e.source === startNodeId);

  for (const edge of outgoingEdges) {
    const targetId = edge.target;
    // Skip approval nodes we just created
    if (targetId.startsWith('approval-auto-')) continue;
    if (visited.has(targetId)) continue;

    const nodeIndex = nodes.findIndex((n) => n.id === targetId);
    if (nodeIndex !== -1 && nodes[nodeIndex].position) {
      nodes[nodeIndex] = {
        ...nodes[nodeIndex],
        position: {
          x: nodes[nodeIndex].position!.x,
          y: nodes[nodeIndex].position!.y + offsetY,
        },
      };
    }

    // Continue downstream
    shiftDownstreamNodes(targetId, nodes, edges, offsetY, visited);
  }
}
