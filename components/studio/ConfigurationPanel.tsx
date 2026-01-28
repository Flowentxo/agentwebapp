'use client';

/**
 * CONFIGURATION PANEL
 *
 * Property editor for selected modules
 */

import { useState, useEffect, useMemo } from 'react';
import { Node, Edge } from 'reactflow';
import {
  Settings,
  X,
  Type,
  Hash,
  Sliders,
  ChevronDown,
  ChevronRight,
  GitBranch
} from 'lucide-react';
import { ModuleConfig } from '@/lib/studio/types';
import { VariableInput as VariableInputLegacy } from './VariableInput';
import { VariableInput as VariableInputV2 } from './inputs/VariableInput';
import { VariableStore } from '@/lib/studio/variable-store';
import { ConditionConfig, ConditionGroup } from '@/lib/studio/condition-types';
import { ConditionGroupBuilder } from './ConditionGroupBuilder';
import { DatabaseQueryConfig } from './DatabaseQueryConfig';
import { WebhookConfig } from './WebhookConfig';
import type { WorkflowVariable } from './ParameterMapper';
import { ModelSelector } from './ModelSelector';
import { SystemPromptBuilder } from './SystemPromptBuilder';
import { ParameterMapper, ParameterMapping } from './ParameterMapper';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ConfigurationPanelProps {
  selectedNode: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
  variableStore?: VariableStore;
  /** All nodes in the workflow (for V2 variable autocomplete) */
  nodes?: Node[];
  /** All edges in the workflow (for V2 variable autocomplete) */
  edges?: Edge[];
}

export function ConfigurationPanel({
  selectedNode,
  onClose,
  onUpdate,
  variableStore,
  nodes,
  edges
}: ConfigurationPanelProps) {
  // Theme support
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Determine if we should use the new V2 VariableInput (graph-based)
  const useV2Input = Boolean(nodes && edges && selectedNode);
  const [localData, setLocalData] = useState<any>(selectedNode?.data || {});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'advanced', 'conditions', 'database-query', 'webhook'])
  );
  const [mappings, setMappings] = useState<ParameterMapping[]>(localData.parameterMappings || []);

  // Mock available variables from previous nodes (TODO: Get from actual workflow)
  const mockAvailableVariables: WorkflowVariable[] = [
    {
      nodeId: 'trigger_1',
      nodeName: 'Manual Trigger',
      nodeType: 'trigger',
      variableName: 'userId',
      variablePath: 'trigger_1.output.userId',
      dataType: 'string',
      sampleValue: 'user_123',
      icon: 'Sparkles'
    },
    {
      nodeId: 'trigger_1',
      nodeName: 'Manual Trigger',
      nodeType: 'trigger',
      variableName: 'action',
      variablePath: 'trigger_1.output.action',
      dataType: 'string',
      sampleValue: 'create',
      icon: 'Sparkles'
    },
    {
      nodeId: 'query_1',
      nodeName: 'Get User Data',
      nodeType: 'database-query',
      variableName: 'users',
      variablePath: 'query_1.output.data',
      dataType: 'array',
      sampleValue: [{ id: 1, name: 'John Doe' }],
      icon: 'Database'
    },
    {
      nodeId: 'query_1',
      nodeName: 'Get User Data',
      nodeType: 'database-query',
      variableName: 'rowCount',
      variablePath: 'query_1.output.rowCount',
      dataType: 'number',
      sampleValue: 1,
      icon: 'Database'
    }
  ];

  useEffect(() => {
    if (selectedNode) {
      setLocalData(selectedNode.data);
      setMappings(selectedNode.data.parameterMappings || []);
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div className={cn(
        "flex h-full items-center justify-center border-l p-8 transition-colors duration-200",
        isDark ? "border-white/10 bg-zinc-900" : "border-border bg-card"
      )}>
        <div className="text-center">
          <Settings className={cn(
            "mx-auto h-12 w-12 opacity-30",
            isDark ? "text-zinc-400" : "text-muted-foreground"
          )} />
          <p className={cn(
            "mt-4 text-sm",
            isDark ? "text-zinc-400" : "text-muted-foreground"
          )}>
            Select a module to configure
          </p>
        </div>
      </div>
    );
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleFieldChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onUpdate(selectedNode.id, newData);
  };

  const handleMappingChange = (newMappings: ParameterMapping[]) => {
    setMappings(newMappings);
    handleFieldChange('parameterMappings', newMappings);
  };

  return (
    <div className={cn(
      "flex h-full w-80 flex-col border-l transition-colors duration-200",
      isDark ? "border-white/10 bg-zinc-900" : "border-border bg-card"
    )}>
      {/* Header */}
      <div className={cn(
        "border-b p-4",
        isDark ? "border-white/10" : "border-border"
      )}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={cn(
            "text-lg font-semibold",
            isDark ? "text-white" : "text-zinc-900"
          )}>Configuration</h2>
          <button
            onClick={onClose}
            className={cn(
              "rounded-xl p-1.5 transition",
              isDark
                ? "text-zinc-400 hover:bg-card/10 hover:text-white"
                : "text-muted-foreground hover:bg-muted hover:text-zinc-900"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Module Info */}
        <div className={cn(
          "flex items-center gap-3 rounded-xl border p-3",
          isDark ? "border-white/10 bg-card/5" : "border-border bg-muted/50"
        )}>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${localData.color}20` }}
          >
            <div
              className="h-5 w-5 rounded"
              style={{ backgroundColor: localData.color }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "text-sm font-semibold truncate",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {localData.label}
            </h3>
            <p className={cn(
              "text-xs truncate",
              isDark ? "text-zinc-400" : "text-muted-foreground"
            )}>
              {localData.category}
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Basic Settings */}
        <ConfigSection
          id="basic"
          title="Basic Settings"
          isExpanded={expandedSections.has('basic')}
          onToggle={() => toggleSection('basic')}
        >
          {/* Enabled Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Status</label>
            <button
              onClick={() => handleFieldChange('enabled', !localData.enabled)}
              className={`flex w-full items-center justify-between rounded-xl border p-3 transition ${localData.enabled
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-border bg-muted/50'
                }`}
            >
              <span className="text-sm text-foreground">
                {localData.enabled ? 'Active' : 'Inactive'}
              </span>
              <div
                className={`h-5 w-9 rounded-full transition ${localData.enabled ? 'bg-green-500' : 'bg-slate-300'
                  }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-card shadow-sm transition-transform ${localData.enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
              </div>
            </button>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Label</label>
            <input
              type="text"
              value={localData.label || ''}
              onChange={(e) => handleFieldChange('label', e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Description</label>
            {useV2Input ? (
              <VariableInputV2
                value={localData.description || ''}
                onChange={(value) => handleFieldChange('description', value)}
                placeholder="Describe what this module does..."
                multiline
                rows={3}
                nodes={nodes}
                edges={edges}
                currentNodeId={selectedNode?.id}
              />
            ) : variableStore ? (
              <VariableInputLegacy
                value={localData.description || ''}
                onChange={(value) => handleFieldChange('description', value)}
                variableStore={variableStore}
                placeholder="Describe what this module does..."
                rows={3}
              />
            ) : (
              <textarea
                value={localData.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                rows={3}
                placeholder="Describe what this module does..."
                className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              />
            )}
          </div>
        </ConfigSection>

        {/* Advanced Settings */}
        {localData.category === 'skill' && (
          <ConfigSection
            id="advanced"
            title="Advanced Settings"
            isExpanded={expandedSections.has('advanced')}
            onToggle={() => toggleSection('advanced')}
          >
            {/* Model Selection */}
            <div className="space-y-2">
              <ModelSelector
                value={localData.model || 'gpt-4o-mini'}
                onChange={(model) => handleFieldChange('model', model)}
                showPricing={true}
                showCapabilities={false}
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Temperature</label>
                <span className="text-xs text-muted-foreground">
                  {localData.temperature || 0.7}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={localData.temperature || 0.7}
                onChange={(e) =>
                  handleFieldChange('temperature', parseFloat(e.target.value))
                }
                className="w-full"
              />
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Max Tokens</label>
              <input
                type="number"
                value={localData.maxTokens || 2000}
                onChange={(e) =>
                  handleFieldChange('maxTokens', parseInt(e.target.value))
                }
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              />
            </div>

            {/* System Prompt */}
            <SystemPromptBuilder
              value={localData.systemPrompt || ''}
              onChange={(prompt) => handleFieldChange('systemPrompt', prompt)}
              placeholder="Enter custom system prompt... Use {{variable_name}} for dynamic content."
            />
          </ConfigSection>
        )}

        {/* Web Search Configuration */}
        {localData.skillType === 'web-search' && (
          <ConfigSection
            id="websearch"
            title="Web Search Settings"
            isExpanded={expandedSections.has('websearch')}
            onToggle={() => toggleSection('websearch')}
          >
            {/* Search Query */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Search Query</label>
              {useV2Input ? (
                <VariableInputV2
                  value={localData.query || ''}
                  onChange={(value) => handleFieldChange('query', value)}
                  placeholder="Enter search query... Use {{variable_name}}"
                  multiline
                  rows={3}
                  nodes={nodes}
                  edges={edges}
                  currentNodeId={selectedNode?.id}
                />
              ) : variableStore ? (
                <VariableInputLegacy
                  value={localData.query || ''}
                  onChange={(value) => handleFieldChange('query', value)}
                  variableStore={variableStore}
                  placeholder="Enter search query... Use {{variable_name}}"
                  rows={3}
                />
              ) : (
                <textarea
                  value={localData.query || ''}
                  onChange={(e) => handleFieldChange('query', e.target.value)}
                  rows={3}
                  placeholder="Enter search query..."
                  className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                />
              )}
            </div>

            {/* Search Provider */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Search Provider</label>
              <select
                value={localData.provider || 'duckduckgo'}
                onChange={(e) => handleFieldChange('provider', e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              >
                <option value="duckduckgo">DuckDuckGo (Free)</option>
                <option value="brave">Brave Search (API Key required)</option>
                <option value="google">Google Search (API Key required)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {localData.provider === 'brave' && '🔑 Requires BRAVE_SEARCH_API_KEY in .env.local'}
                {localData.provider === 'google' && '🔑 Requires GOOGLE_SEARCH_API_KEY in .env.local'}
                {(!localData.provider || localData.provider === 'duckduckgo') && '✅ Free, no API key required'}
              </p>
            </div>

            {/* Number of Results */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Number of Results</label>
                <span className="text-xs text-muted-foreground">
                  {localData.numResults || 10}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={localData.numResults || 10}
                onChange={(e) =>
                  handleFieldChange('numResults', parseInt(e.target.value))
                }
                className="w-full"
              />
            </div>

            {/* Output Variable */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Output Variable Name</label>
              <input
                type="text"
                value={localData.outputVariable || 'search_results'}
                onChange={(e) => handleFieldChange('outputVariable', e.target.value)}
                placeholder="search_results"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              />
              <p className="text-xs text-muted-foreground">
                Access results via {`{{${localData.outputVariable || 'search_results'}}}`}
              </p>
            </div>
          </ConfigSection>
        )}

        {/* Condition Logic (for logic-condition nodes) */}
        {localData.category === 'logic' && localData.logicType === 'condition' && (
          <ConfigSection
            id="conditions"
            title="Condition Logic"
            isExpanded={expandedSections.has('conditions')}
            onToggle={() => toggleSection('conditions')}
          >
            {variableStore && localData.conditionConfig ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <GitBranch className="w-4 h-4" />
                  <span className="text-xs font-medium">Configure Rules & Branches</span>
                </div>

                <ConditionGroupBuilder
                  group={localData.conditionConfig.condition}
                  onChange={(updatedGroup: ConditionGroup) => {
                    const updatedConfig = {
                      ...localData.conditionConfig,
                      condition: updatedGroup,
                      updatedAt: Date.now()
                    };
                    handleFieldChange('conditionConfig', updatedConfig);
                  }}
                  variableStore={variableStore}
                />

                {/* Branch Configuration */}
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <h4 className="text-xs font-semibold text-foreground">Branch Paths</h4>

                  {/* True Branch */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-green-600">✓ True Branch</label>
                    <input
                      type="text"
                      value={localData.conditionConfig.trueBranch?.label || ''}
                      onChange={(e) => {
                        const updatedConfig = {
                          ...localData.conditionConfig,
                          trueBranch: {
                            ...localData.conditionConfig.trueBranch,
                            label: e.target.value
                          },
                          updatedAt: Date.now()
                        };
                        handleFieldChange('conditionConfig', updatedConfig);
                      }}
                      placeholder="Success path..."
                      className="w-full rounded-xl border border-green-500/30 bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50"
                    />
                  </div>

                  {/* False Branch */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-red-600">✗ False Branch</label>
                    <input
                      type="text"
                      value={localData.conditionConfig.falseBranch?.label || ''}
                      onChange={(e) => {
                        const updatedConfig = {
                          ...localData.conditionConfig,
                          falseBranch: {
                            ...localData.conditionConfig.falseBranch,
                            label: e.target.value
                          },
                          updatedAt: Date.now()
                        };
                        handleFieldChange('conditionConfig', updatedConfig);
                      }}
                      placeholder="Alternative path..."
                      className="w-full rounded-xl border border-red-500/30 bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                {!variableStore ? 'Variable store not available' : 'No condition configuration'}
              </div>
            )}
          </ConfigSection>
        )}

        {/* Database Query Configuration (for database-query nodes) */}
        {selectedNode.type === 'database-query' && (
          <ConfigSection
            id="database-query"
            title="Database Query Configuration"
            isExpanded={expandedSections.has('database-query')}
            onToggle={() => toggleSection('database-query')}
          >
            <DatabaseQueryConfig
              data={localData}
              onChange={handleFieldChange}
              availableVariables={mockAvailableVariables}
              onTest={async () => {
                // TODO: Implement test query functionality
                // This will call the API endpoint to test the query
                return {
                  success: true,
                  data: [{ id: 1, name: 'Test Result' }],
                  rowCount: 1,
                  durationMs: 125,
                  fromCache: false
                };
              }}
            />
          </ConfigSection>
        )}

        {/* Webhook Configuration (for webhook nodes) */}
        {selectedNode.type === 'webhook' && (
          <ConfigSection
            id="webhook"
            title="Webhook Configuration"
            isExpanded={expandedSections.has('webhook')}
            onToggle={() => toggleSection('webhook')}
          >
            <WebhookConfig
              data={localData}
              onChange={handleFieldChange}
              availableVariables={mockAvailableVariables}
              onTest={async () => {
                // TODO: Implement test webhook functionality
                // This will call the API endpoint to test the webhook
                return {
                  success: true,
                  statusCode: 200,
                  data: { message: 'Webhook test successful' },
                  durationMs: 245,
                  retryCount: 0
                };
              }}
            />
          </ConfigSection>
        )}

        {/* Parameter Mapping Section */}
        {(selectedNode.type === 'database-query' || selectedNode.type === 'webhook') && (
          <ConfigSection
            id="mapping"
            title="Parameter Mapping"
            isExpanded={expandedSections.has('mapping')}
            onToggle={() => toggleSection('mapping')}
          >
            <div className="p-1">
              {/* Note: In a real app, we would derive parameters from the query/webhook config */}
              {/* For now, we mock some parameters based on the node type */}
              {selectedNode.type === 'database-query' ? (
                <div className="text-xs text-muted-foreground mb-2">
                  Map workflow variables to SQL parameters (e.g., <code className="bg-muted px-1 py-0.5 rounded">$1</code>, <code className="bg-muted px-1 py-0.5 rounded">$2</code>)
                </div>
              ) : (
                <div className="text-xs text-muted-foreground mb-2">
                  Map workflow variables to request body fields
                </div>
              )}

              {/* Placeholder for Parameter Mapper integration */}
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground bg-muted/30">
                Parameter Mapper Integration Pending...
              </div>
            </div>
          </ConfigSection>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        "border-t p-4",
        isDark ? "border-white/10" : "border-border"
      )}>
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 shadow-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// Helper Component: Collapsible Section
interface ConfigSectionProps {
  id: string;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function ConfigSection({ title, isExpanded, onToggle, children }: ConfigSectionProps) {
  // Use resolvedTheme from next-themes via data-theme attribute or html class
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className={cn(
      "rounded-xl border shadow-sm transition-colors duration-200",
      isDark ? "border-white/10 bg-zinc-800" : "border-border bg-card"
    )}>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between p-3 transition rounded-t-xl",
          isDark ? "hover:bg-card/5" : "hover:bg-muted/50"
        )}
      >
        <h3 className={cn(
          "text-sm font-semibold",
          isDark ? "text-white" : "text-zinc-900"
        )}>{title}</h3>
        {isExpanded ? (
          <ChevronDown className={cn("h-4 w-4", isDark ? "text-zinc-400" : "text-muted-foreground")} />
        ) : (
          <ChevronRight className={cn("h-4 w-4", isDark ? "text-zinc-400" : "text-muted-foreground")} />
        )}
      </button>

      {isExpanded && <div className="space-y-4 p-3 pt-0">{children}</div>}
    </div>
  );
}
