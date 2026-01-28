/**
 * CUSTOM TOOL MODULE CONVERTER
 *
 * Convert CustomTool to ModuleTemplate for workflow integration
 */

import { CustomTool } from './types';
import { ModuleTemplate } from './types';
import { getToolRegistry } from './tool-registry';

/**
 * Convert a CustomTool to a ModuleTemplate for use in workflows
 */
export function customToolToModule(tool: CustomTool): ModuleTemplate {
  return {
    id: `custom-tool-${tool.id}`,
    category: 'action', // Custom tools are treated as action modules
    type: 'custom-tool',
    name: tool.name,
    description: tool.description,
    icon: 'Code2',
    color: '#A855F7', // Purple for custom tools
    defaultConfig: {
      id: tool.id,
      category: 'action',
      label: tool.name,
      description: tool.description,
      icon: 'Code2',
      color: '#A855F7',
      enabled: true,
      toolId: tool.id,
      toolName: tool.name,
      toolCode: tool.code,
      toolParameters: tool.parameters,
      toolRuntime: tool.runtime,
      toolTimeout: tool.timeout
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      ...tool.parameters.map(param => ({
        id: param.name,
        name: param.name,
        type: 'data' as const,
        required: param.required
      }))
    ],
    outputs: [
      { id: 'result', name: 'Tool Result', type: 'data', required: true }
    ]
  };
}

/**
 * Get all custom tools as ModuleTemplates
 */
export function getCustomToolModules(): ModuleTemplate[] {
  const registry = getToolRegistry();
  const tools = registry.getAllTools();
  return tools.map(customToolToModule);
}

/**
 * Get a specific custom tool module by tool ID
 */
export function getCustomToolModule(toolId: string): ModuleTemplate | undefined {
  const registry = getToolRegistry();
  const tool = registry.getTool(toolId);
  if (!tool) return undefined;
  return customToolToModule(tool);
}
