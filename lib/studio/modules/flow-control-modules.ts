/**
 * Flow Control Modules
 *
 * Module definitions for Phase 1: Advanced Flow Control
 * - Merge Node: Synchronize multiple branches
 * - Wait Node: Pause execution (timer, datetime, webhook)
 * - Webhook Wait Node: Wait for external callback
 */

import {
  GitMerge,
  Clock,
  Calendar,
  Webhook,
  Timer,
  Hand,
  RefreshCw,
} from 'lucide-react';
import { ModuleDefinition, ModuleCategory } from '../types';

// ============================================================================
// MERGE NODE
// ============================================================================

export const mergeNodeModule: ModuleDefinition = {
  id: 'merge',
  type: 'merge',
  name: 'Merge',
  description: 'Synchronize multiple workflow branches before continuing',
  category: 'logic' as ModuleCategory,
  icon: 'GitMerge',
  color: '#8B5CF6', // Purple

  // Input/Output configuration
  inputs: [
    {
      id: 'input-0',
      name: 'Branch 1',
      type: 'any',
      required: true,
    },
    {
      id: 'input-1',
      name: 'Branch 2',
      type: 'any',
      required: false,
    },
  ],
  outputs: [
    {
      id: 'output',
      name: 'Merged Output',
      type: 'any',
    },
  ],

  // Configuration schema
  configSchema: {
    type: 'object',
    properties: {
      strategy: {
        type: 'string',
        title: 'Merge Strategy',
        description: 'How to handle multiple incoming branches',
        enum: ['wait_all', 'wait_any', 'wait_n'],
        enumLabels: {
          wait_all: 'Wait for All Branches',
          wait_any: 'Continue on First Branch',
          wait_n: 'Wait for N Branches',
        },
        default: 'wait_all',
      },
      waitCount: {
        type: 'number',
        title: 'Wait Count',
        description: 'Number of branches to wait for (for wait_n strategy)',
        minimum: 1,
        default: 2,
        dependsOn: {
          field: 'strategy',
          value: 'wait_n',
        },
      },
      dataMode: {
        type: 'string',
        title: 'Data Merge Mode',
        description: 'How to combine data from multiple branches',
        enum: ['append', 'join', 'pass_through', 'deep_merge', 'keyed_merge'],
        enumLabels: {
          append: 'Append Items - [...branch1, ...branch2]',
          join: 'Join by Index - Zip items together',
          pass_through: 'Pass Through - Only use first completed branch',
          deep_merge: 'Deep Merge - Recursively merge objects',
          keyed_merge: 'Keyed Merge - Match by key field',
        },
        default: 'append',
      },
      keyField: {
        type: 'string',
        title: 'Key Field',
        description: 'Field to match items when using keyed merge',
        default: 'id',
        dependsOn: {
          field: 'dataMode',
          value: 'keyed_merge',
        },
      },
      conflictResolution: {
        type: 'string',
        title: 'Conflict Resolution',
        description: 'How to handle conflicting values when merging',
        enum: ['first', 'last', 'merge'],
        enumLabels: {
          first: 'Keep First Value',
          last: 'Keep Last Value',
          merge: 'Merge into Array',
        },
        default: 'last',
        dependsOn: {
          field: 'dataMode',
          value: 'deep_merge',
        },
      },
      timeout: {
        type: 'number',
        title: 'Timeout (seconds)',
        description: 'Maximum time to wait for branches (0 = no timeout)',
        minimum: 0,
        default: 0,
      },
    },
  },

  // Default configuration
  defaultConfig: {
    strategy: 'wait_all',
    dataMode: 'append',
    timeout: 0,
  },

  // UI hints
  uiHints: {
    dynamicInputs: true, // Can add more input handles
    minInputs: 2,
    maxInputs: 10,
  },
};

// ============================================================================
// WAIT/SLEEP NODE
// ============================================================================

export const waitNodeModule: ModuleDefinition = {
  id: 'wait',
  type: 'wait',
  name: 'Wait',
  description: 'Pause workflow execution for a specified duration',
  category: 'logic' as ModuleCategory,
  icon: 'Clock',
  color: '#F59E0B', // Amber

  inputs: [
    {
      id: 'input',
      name: 'Input',
      type: 'any',
      required: true,
    },
  ],
  outputs: [
    {
      id: 'output',
      name: 'Output',
      type: 'any',
    },
  ],

  configSchema: {
    type: 'object',
    properties: {
      waitType: {
        type: 'string',
        title: 'Wait Type',
        description: 'How the wait duration is determined',
        enum: ['timer', 'datetime'],
        enumLabels: {
          timer: 'Fixed Duration',
          datetime: 'Until Date/Time',
        },
        default: 'timer',
      },
      duration: {
        type: 'number',
        title: 'Duration',
        description: 'How long to wait',
        minimum: 0,
        default: 5,
        dependsOn: {
          field: 'waitType',
          value: 'timer',
        },
      },
      durationUnit: {
        type: 'string',
        title: 'Duration Unit',
        enum: ['seconds', 'minutes', 'hours', 'days'],
        default: 'seconds',
        dependsOn: {
          field: 'waitType',
          value: 'timer',
        },
      },
      targetDatetime: {
        type: 'string',
        title: 'Target Date/Time',
        description: 'Resume at this specific date and time',
        format: 'datetime-local',
        dependsOn: {
          field: 'waitType',
          value: 'datetime',
        },
      },
      timezone: {
        type: 'string',
        title: 'Timezone',
        description: 'Timezone for the target datetime',
        default: 'UTC',
        dependsOn: {
          field: 'waitType',
          value: 'datetime',
        },
      },
      timeout: {
        type: 'number',
        title: 'Maximum Wait (hours)',
        description: 'Fail if wait exceeds this duration (0 = no limit)',
        minimum: 0,
        default: 24,
      },
      onTimeout: {
        type: 'string',
        title: 'On Timeout',
        description: 'What to do if maximum wait is exceeded',
        enum: ['error', 'continue', 'skip'],
        enumLabels: {
          error: 'Fail with Error',
          continue: 'Continue Anyway',
          skip: 'Skip This Node',
        },
        default: 'error',
      },
    },
  },

  defaultConfig: {
    waitType: 'timer',
    duration: 5,
    durationUnit: 'seconds',
    timeout: 24,
    onTimeout: 'error',
  },
};

// ============================================================================
// WEBHOOK WAIT NODE
// ============================================================================

export const webhookWaitModule: ModuleDefinition = {
  id: 'webhook-wait',
  type: 'webhook-wait',
  name: 'Webhook Wait',
  description: 'Pause execution until an external webhook callback is received',
  category: 'triggers' as ModuleCategory,
  icon: 'Webhook',
  color: '#10B981', // Emerald

  inputs: [
    {
      id: 'input',
      name: 'Input',
      type: 'any',
      required: true,
    },
  ],
  outputs: [
    {
      id: 'output',
      name: 'Output',
      type: 'any',
    },
  ],

  configSchema: {
    type: 'object',
    properties: {
      generatePath: {
        type: 'boolean',
        title: 'Auto-generate URL',
        description: 'Automatically generate a unique webhook URL',
        default: true,
      },
      customPath: {
        type: 'string',
        title: 'Custom Path',
        description: 'Custom URL path for the webhook',
        dependsOn: {
          field: 'generatePath',
          value: false,
        },
      },
      method: {
        type: 'string',
        title: 'HTTP Method',
        description: 'Expected HTTP method for the callback',
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'ANY'],
        default: 'POST',
      },
      requireAuth: {
        type: 'boolean',
        title: 'Require Authentication',
        description: 'Require a secret token in the callback',
        default: false,
      },
      secretToken: {
        type: 'string',
        title: 'Secret Token',
        description: 'Token required in the callback (sent as X-Webhook-Secret header)',
        format: 'password',
        dependsOn: {
          field: 'requireAuth',
          value: true,
        },
      },
      allowedIps: {
        type: 'string',
        title: 'Allowed IPs',
        description: 'Comma-separated list of allowed IP addresses (empty = all)',
        placeholder: '192.168.1.1, 10.0.0.0/8',
      },
      responseBody: {
        type: 'object',
        title: 'Response Body',
        description: 'Custom JSON response to return on successful callback',
        default: { success: true },
      },
      responseStatusCode: {
        type: 'number',
        title: 'Response Status Code',
        minimum: 100,
        maximum: 599,
        default: 200,
      },
      timeout: {
        type: 'number',
        title: 'Timeout (hours)',
        description: 'Maximum time to wait for callback (0 = 24 hours)',
        minimum: 0,
        maximum: 720, // 30 days
        default: 24,
      },
      onTimeout: {
        type: 'string',
        title: 'On Timeout',
        enum: ['error', 'continue', 'skip'],
        enumLabels: {
          error: 'Fail with Error',
          continue: 'Continue with Empty Data',
          skip: 'Skip This Node',
        },
        default: 'error',
      },
    },
  },

  defaultConfig: {
    generatePath: true,
    method: 'POST',
    requireAuth: false,
    responseStatusCode: 200,
    responseBody: { success: true },
    timeout: 24,
    onTimeout: 'error',
  },

  // Output schema - what data is available after webhook
  outputSchema: {
    type: 'object',
    properties: {
      webhook: {
        type: 'object',
        properties: {
          method: { type: 'string' },
          path: { type: 'string' },
          headers: { type: 'object' },
          query: { type: 'object' },
          body: { type: 'any' },
          receivedAt: { type: 'string', format: 'datetime' },
        },
      },
      data: {
        type: 'any',
        description: 'The webhook request body',
      },
    },
  },
};

// ============================================================================
// MANUAL APPROVAL NODE
// ============================================================================

export const manualApprovalModule: ModuleDefinition = {
  id: 'manual-approval',
  type: 'manual-approval',
  name: 'Manual Approval',
  description: 'Pause workflow until manually approved or rejected',
  category: 'logic' as ModuleCategory,
  icon: 'Hand',
  color: '#6366F1', // Indigo

  inputs: [
    {
      id: 'input',
      name: 'Input',
      type: 'any',
      required: true,
    },
  ],
  outputs: [
    {
      id: 'approved',
      name: 'Approved',
      type: 'any',
    },
    {
      id: 'rejected',
      name: 'Rejected',
      type: 'any',
    },
  ],

  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Approval Title',
        description: 'Title shown to the approver',
        default: 'Approval Required',
      },
      description: {
        type: 'string',
        title: 'Description',
        description: 'Details about what needs approval',
        format: 'textarea',
      },
      approvers: {
        type: 'array',
        title: 'Approvers',
        description: 'Users or roles who can approve (empty = any)',
        items: { type: 'string' },
      },
      timeout: {
        type: 'number',
        title: 'Timeout (hours)',
        minimum: 0,
        default: 72, // 3 days
      },
      onTimeout: {
        type: 'string',
        title: 'On Timeout',
        enum: ['error', 'auto_approve', 'auto_reject'],
        enumLabels: {
          error: 'Fail with Error',
          auto_approve: 'Auto-Approve',
          auto_reject: 'Auto-Reject',
        },
        default: 'error',
      },
      notifyOnPending: {
        type: 'boolean',
        title: 'Notify on Pending',
        description: 'Send notification when approval is needed',
        default: true,
      },
    },
  },

  defaultConfig: {
    title: 'Approval Required',
    timeout: 72,
    onTimeout: 'error',
    notifyOnPending: true,
  },
};

// ============================================================================
// CONDITION WAIT NODE
// ============================================================================

export const conditionWaitModule: ModuleDefinition = {
  id: 'condition-wait',
  type: 'condition-wait',
  name: 'Wait for Condition',
  description: 'Pause workflow until a condition is met (polling)',
  category: 'logic' as ModuleCategory,
  icon: 'RefreshCw',
  color: '#EC4899', // Pink

  inputs: [
    {
      id: 'input',
      name: 'Input',
      type: 'any',
      required: true,
    },
  ],
  outputs: [
    {
      id: 'output',
      name: 'Output',
      type: 'any',
    },
  ],

  configSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        title: 'Condition Expression',
        description: 'JavaScript expression that returns true when condition is met',
        format: 'expression',
        placeholder: '{{ $json.status === "completed" }}',
      },
      pollInterval: {
        type: 'number',
        title: 'Poll Interval (seconds)',
        description: 'How often to check the condition',
        minimum: 5,
        maximum: 3600,
        default: 30,
      },
      maxAttempts: {
        type: 'number',
        title: 'Max Attempts',
        description: 'Maximum number of checks (0 = unlimited)',
        minimum: 0,
        default: 0,
      },
      checkNode: {
        type: 'string',
        title: 'Check Node',
        description: 'Node to re-execute for condition check',
        format: 'node-selector',
      },
      timeout: {
        type: 'number',
        title: 'Timeout (hours)',
        minimum: 0,
        default: 24,
      },
      onTimeout: {
        type: 'string',
        title: 'On Timeout',
        enum: ['error', 'continue', 'skip'],
        default: 'error',
      },
    },
  },

  defaultConfig: {
    pollInterval: 30,
    maxAttempts: 0,
    timeout: 24,
    onTimeout: 'error',
  },
};

// ============================================================================
// MODULE REGISTRY
// ============================================================================

export const flowControlModules: ModuleDefinition[] = [
  mergeNodeModule,
  waitNodeModule,
  webhookWaitModule,
  manualApprovalModule,
  conditionWaitModule,
];

// Export individual modules for direct access
export {
  mergeNodeModule as MergeNode,
  waitNodeModule as WaitNode,
  webhookWaitModule as WebhookWaitNode,
  manualApprovalModule as ManualApprovalNode,
  conditionWaitModule as ConditionWaitNode,
};

export default flowControlModules;
