/**
 * Pipeline Node Components Index
 *
 * Export all custom React Flow node components
 */

import { TriggerNode } from './TriggerNode';
import { AgentNode } from './AgentNode';
import { ActionNode } from './ActionNode';
import { ConditionNode } from './ConditionNode';
import { TransformNode } from './TransformNode';
import { DelayNode } from './DelayNode';
import { HumanApprovalNode } from './HumanApprovalNode';

// Re-export all components
export {
  TriggerNode,
  AgentNode,
  ActionNode,
  ConditionNode,
  TransformNode,
  DelayNode,
  HumanApprovalNode,
};

// Node type mapping for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  action: ActionNode,
  condition: ConditionNode,
  transform: TransformNode,
  delay: DelayNode,
  'human-approval': HumanApprovalNode,
} as const;

export type NodeType = keyof typeof nodeTypes;
