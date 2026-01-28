/**
 * TEMPLATE UTILITIES
 *
 * Helper functions for template export/import and the
 * Flowent Unified Template Engine.
 *
 * @version 2.0.0
 */

import { Node, Edge } from 'reactflow';
import {
  WorkflowTemplate,
  FlowentTemplate,
  TemplateRequirement,
} from './types';

/**
 * Export workflow as template JSON file
 */
export function exportTemplate(template: WorkflowTemplate): void {
  const json = JSON.stringify(template, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export current workflow as template
 */
export function exportWorkflowAsTemplate(
  nodes: Node[],
  edges: Edge[],
  metadata: {
    name: string;
    description: string;
    category: string;
    difficulty: string;
    author: string;
    tags: string[];
    useCase: string;
  }
): void {
  const template: WorkflowTemplate = {
    id: `template-${Date.now()}`,
    name: metadata.name,
    description: metadata.description,
    category: metadata.category as any,
    difficulty: metadata.difficulty as any,
    author: metadata.author,
    version: '1.0.0',
    tags: metadata.tags,
    useCase: metadata.useCase,
    estimatedTime: '5-10 minutes',
    icon: 'Workflow',
    color: '#6366F1',
    nodes,
    edges,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  exportTemplate(template);
}

/**
 * Import template from JSON file
 */
export async function importTemplate(file: File): Promise<WorkflowTemplate> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const template = JSON.parse(json) as WorkflowTemplate;

        // Validate template structure
        if (!template.id || !template.name || !template.nodes || !template.edges) {
          throw new Error('Invalid template format');
        }

        resolve(template);
      } catch (error) {
        reject(new Error('Failed to parse template file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read template file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Validate template before import
 */
export function validateTemplate(template: WorkflowTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.id) errors.push('Missing template ID');
  if (!template.name) errors.push('Missing template name');
  if (!template.description) errors.push('Missing template description');
  if (!template.category) errors.push('Missing template category');
  if (!template.nodes || !Array.isArray(template.nodes)) {
    errors.push('Missing or invalid nodes');
  }
  if (!template.edges || !Array.isArray(template.edges)) {
    errors.push('Missing or invalid edges');
  }

  // Validate nodes have required fields
  if (template.nodes) {
    template.nodes.forEach((node, index) => {
      if (!node.id) errors.push(`Node ${index} missing ID`);
      if (!node.type) errors.push(`Node ${index} missing type`);
      if (!node.position) errors.push(`Node ${index} missing position`);
      if (!node.data) errors.push(`Node ${index} missing data`);
    });
  }

  // Validate edges reference valid nodes
  if (template.edges && template.nodes) {
    const nodeIds = new Set(template.nodes.map(n => n.id));
    template.edges.forEach((edge, index) => {
      if (!edge.source || !nodeIds.has(edge.source)) {
        errors.push(`Edge ${index} has invalid source node`);
      }
      if (!edge.target || !nodeIds.has(edge.target)) {
        errors.push(`Edge ${index} has invalid target node`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Clone template with new IDs to avoid conflicts
 */
export function cloneTemplate(template: WorkflowTemplate): WorkflowTemplate {
  const idMap = new Map<string, string>();

  // Generate new IDs for all nodes
  const newNodes = template.nodes.map(node => {
    const newId = `${node.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    idMap.set(node.id, newId);
    return {
      ...node,
      id: newId
    };
  });

  // Update edge references to new node IDs
  const newEdges = template.edges.map(edge => ({
    ...edge,
    id: `${edge.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source: idMap.get(edge.source) || edge.source,
    target: idMap.get(edge.target) || edge.target
  }));

  return {
    ...template,
    id: `${template.id}_clone_${Date.now()}`,
    nodes: newNodes,
    edges: newEdges,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Get template file extension
 */
export function getTemplateFileExtension(): string {
  return '.json';
}

/**
 * Format template file name
 */
export function formatTemplateFileName(templateName: string): string {
  return `${templateName.toLowerCase().replace(/\s+/g, '-')}-template.json`;
}

// ============================================================================
// FLOWENT UNIFIED TEMPLATE ENGINE - INJECTION UTILITIES
// ============================================================================

/**
 * Configuration values map from wizard form
 */
export type ConfigurationValues = Record<string, string>;

/**
 * Get nested value from object using dot notation path
 * @example getNestedValue({ config: { apiKey: 'abc' } }, 'config.apiKey') => 'abc'
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Set nested value in object using dot notation path
 * @example setNestedValue({ config: {} }, 'config.apiKey', 'abc') => { config: { apiKey: 'abc' } }
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) return;

  let current: Record<string, unknown> = obj;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[lastKey] = value;
}

/**
 * Replace placeholder patterns in a string
 * Supports: {{placeholder}}, ${placeholder}, %placeholder%
 */
function replacePlaceholders(
  text: string,
  values: ConfigurationValues
): string {
  let result = text;

  // Replace {{key}} pattern
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || `{{${key}}}`);

  // Replace ${key} pattern
  result = result.replace(/\$\{(\w+)\}/g, (_, key) => values[key] || `\${${key}}`);

  // Replace %key% pattern
  result = result.replace(/%(\w+)%/g, (_, key) => values[key] || `%${key}%`);

  return result;
}

/**
 * Deep clone and process node data, replacing placeholders
 */
function processNodeData(
  data: Record<string, unknown>,
  values: ConfigurationValues
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = replacePlaceholders(value, values);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === 'string') {
          return replacePlaceholders(item, values);
        } else if (typeof item === 'object' && item !== null) {
          return processNodeData(item as Record<string, unknown>, values);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      result[key] = processNodeData(value as Record<string, unknown>, values);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Inject configuration values into template nodes
 *
 * This is the core function of the Unified Template Engine.
 * It takes a template and user-provided configuration values,
 * then injects those values into the appropriate node configurations.
 *
 * @param template - The FlowentTemplate to inject values into
 * @param configValues - User-provided configuration values from wizard
 * @returns New nodes array with injected values
 *
 * @example
 * ```typescript
 * const configuredNodes = injectTemplateData(template, {
 *   openai_api_key: 'sk-abc123',
 *   webhook_url: 'https://example.com/webhook',
 *   customer_email: 'support@company.com'
 * });
 * ```
 */
export function injectTemplateData(
  template: FlowentTemplate,
  configValues: ConfigurationValues
): Node[] {
  const { nodes, requirements } = template;

  // Create a deep clone of nodes to avoid mutation
  const clonedNodes: Node[] = JSON.parse(JSON.stringify(nodes));

  // Build a map of requirement ID to config path and target nodes
  const requirementMap = new Map<
    string,
    { configPath?: string; targetNodeIds?: string[] }
  >();

  for (const req of requirements) {
    requirementMap.set(req.id, {
      configPath: req.configPath,
      targetNodeIds: req.targetNodeIds,
    });
  }

  // Process each node
  for (const node of clonedNodes) {
    const nodeData = node.data as Record<string, unknown>;

    // First, replace any placeholders in the node data
    node.data = processNodeData(nodeData, configValues);

    // Then, inject specific requirement values using configPath
    for (const [reqId, value] of Object.entries(configValues)) {
      const reqConfig = requirementMap.get(reqId);
      if (!reqConfig) continue;

      const { configPath, targetNodeIds } = reqConfig;

      // Check if this node is a target for this requirement
      if (targetNodeIds && targetNodeIds.length > 0) {
        if (!targetNodeIds.includes(node.id)) {
          continue; // Skip nodes not in the target list
        }
      }

      // If we have a specific configPath, use it
      if (configPath) {
        setNestedValue(node.data as Record<string, unknown>, configPath, value);
      }
    }
  }

  return clonedNodes;
}

/**
 * Validate that all required configuration values are provided
 *
 * @param requirements - Template requirements array
 * @param configValues - User-provided configuration values
 * @returns Validation result with any missing fields
 */
export function validateTemplateConfig(
  requirements: TemplateRequirement[],
  configValues: ConfigurationValues
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const req of requirements) {
    if (req.required) {
      const value = configValues[req.id];
      if (!value || value.trim() === '') {
        missingFields.push(req.label);
      }
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get requirement icon based on type and provider
 */
export function getRequirementIcon(requirement: TemplateRequirement): string {
  // If explicitly set, use it
  if (requirement.icon) {
    return requirement.icon;
  }

  // Provider-specific icons
  if (requirement.provider) {
    const providerIcons: Record<string, string> = {
      openai: 'Sparkles',
      anthropic: 'Brain',
      slack: 'MessageSquare',
      resend: 'Mail',
      gmail: 'Mail',
      hubspot: 'Users',
      salesforce: 'Cloud',
      stripe: 'CreditCard',
      twilio: 'Phone',
      notion: 'FileText',
      airtable: 'Table',
      zapier: 'Zap',
    };
    return providerIcons[requirement.provider] || 'Key';
  }

  // Type-based icons
  const typeIcons: Record<string, string> = {
    api_key: 'Key',
    integration: 'Link',
    variable: 'Variable',
    webhook_url: 'Webhook',
    database: 'Database',
    config: 'Settings',
  };

  return typeIcons[requirement.type] || 'Settings';
}

/**
 * Group requirements by type for organized wizard display
 */
export function groupRequirementsByType(
  requirements: TemplateRequirement[]
): Map<string, TemplateRequirement[]> {
  const groups = new Map<string, TemplateRequirement[]>();

  for (const req of requirements) {
    const type = req.type;
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(req);
  }

  return groups;
}

/**
 * Get human-readable label for requirement type
 */
export function getRequirementTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    api_key: 'API Keys',
    integration: 'Integrations',
    variable: 'Variables',
    webhook_url: 'Webhooks',
    database: 'Database Connections',
    config: 'Configuration',
  };
  return labels[type] || type;
}

/**
 * Convert legacy WorkflowTemplate to FlowentTemplate
 * Used for backwards compatibility during migration
 */
export function convertToFlowentTemplate(
  legacy: WorkflowTemplate
): FlowentTemplate {
  // Build requirements from legacy fields
  const requirements: TemplateRequirement[] = [];

  // Convert requiredIntegrations
  if (legacy.requiredIntegrations) {
    for (const integration of legacy.requiredIntegrations) {
      requirements.push({
        id: `integration_${integration}`,
        type: 'integration',
        provider: integration as FlowentTemplate['requirements'][0]['provider'],
        label: `${integration.charAt(0).toUpperCase() + integration.slice(1)} Integration`,
        description: `Connect your ${integration} account`,
        required: true,
      });
    }
  }

  // Convert requiredVariables
  if (legacy.requiredVariables) {
    for (const variable of legacy.requiredVariables) {
      const isApiKey = variable.toLowerCase().includes('key') ||
                       variable.toLowerCase().includes('api');
      requirements.push({
        id: variable,
        type: isApiKey ? 'api_key' : 'variable',
        label: variable.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: `Enter your ${variable.replace(/_/g, ' ')}`,
        required: true,
      });
    }
  }

  return {
    id: legacy.id,
    name: legacy.name,
    description: legacy.description,
    category: legacy.category,
    difficulty: legacy.difficulty,
    nodes: legacy.nodes,
    edges: legacy.edges,
    requirements,
    icon: legacy.icon,
    color: legacy.color,
    thumbnail: legacy.thumbnail,
    author: legacy.author,
    version: legacy.version,
    tags: legacy.tags,
    useCase: legacy.useCase,
    estimatedSetupMinutes: legacy.estimatedTime
      ? parseInt(legacy.estimatedTime.split('-')[0]) || 5
      : undefined,
    downloadCount: legacy.downloads,
    rating: legacy.rating,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  };
}
