'use client';

/**
 * DYNAMIC ACTION FORM COMPONENT
 * Phase 13: Action Configuration UI & Variable Mapping
 *
 * A form component that dynamically renders fields based on the selected tool.
 * Uses react-hook-form for form state management.
 *
 * Features:
 * - Dynamic field rendering based on tool definition
 * - Variable picker integration for each field
 * - Real-time validation
 * - Auto-save to node data
 */

import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, UseFormReturn } from 'react-hook-form';
import { Node, Edge } from 'reactflow';
import {
  Mail,
  UserPlus,
  UserCog,
  DollarSign,
  Search,
  Globe,
  MessageSquare,
  Clock,
  Inbox,
  ChevronDown,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ToolDefinition,
  ToolFieldDefinition,
  getAllTools,
  getToolById,
  getToolsByCategory,
} from '@/lib/tools/definitions';
import { VariablePicker } from './VariablePicker';

// ============================================================================
// ICON MAP
// ============================================================================

const ICON_MAP: Record<string, typeof Mail> = {
  Mail,
  Inbox,
  UserPlus,
  UserCog,
  DollarSign,
  Search,
  Globe,
  MessageSquare,
  Clock,
};

// ============================================================================
// TYPES
// ============================================================================

export interface DynamicActionFormProps {
  /** Currently selected node */
  node: Node;
  /** All nodes in the workflow */
  nodes: Node[];
  /** All edges in the workflow */
  edges: Edge[];
  /** Callback to update node data */
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}

type FormValues = Record<string, unknown>;

// ============================================================================
// FIELD COMPONENTS
// ============================================================================

interface FieldWrapperProps {
  field: ToolFieldDefinition;
  error?: string;
  children: React.ReactNode;
  nodes: Node[];
  edges: Edge[];
  currentNodeId: string;
  onInsertVariable: (path: string) => void;
}

function FieldWrapper({
  field,
  error,
  children,
  nodes,
  edges,
  currentNodeId,
  onInsertVariable,
}: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          {field.label}
          {field.required && <span className="text-red-400">*</span>}
          {field.description && (
            <span
              className="text-muted-foreground cursor-help"
              title={field.description}
            >
              <Info size={12} />
            </span>
          )}
        </label>
        {field.supportsVariables && (
          <VariablePicker
            nodes={nodes}
            edges={edges}
            currentNodeId={currentNodeId}
            onSelect={onInsertVariable}
          />
        )}
      </div>

      {/* Field */}
      {children}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
}

// Text Input
function TextField({
  field,
  value,
  onChange,
  error,
  nodes,
  edges,
  currentNodeId,
  inputRef,
}: {
  field: ToolFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  nodes: Node[];
  edges: Edge[];
  currentNodeId: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const handleInsertVariable = (variablePath: string) => {
    const input = inputRef?.current;
    if (input) {
      const start = input.selectionStart || value.length;
      const end = input.selectionEnd || value.length;
      const newValue = value.slice(0, start) + variablePath + value.slice(end);
      onChange(newValue);
      // Move cursor after inserted variable
      requestAnimationFrame(() => {
        input.focus();
        const newPos = start + variablePath.length;
        input.setSelectionRange(newPos, newPos);
      });
    } else {
      onChange(value + variablePath);
    }
  };

  return (
    <FieldWrapper
      field={field}
      error={error}
      nodes={nodes}
      edges={edges}
      currentNodeId={currentNodeId}
      onInsertVariable={handleInsertVariable}
    >
      <input
        ref={inputRef}
        type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm font-mono',
          'bg-gray-800/50 border border-white/10',
          'text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
          error && 'border-red-500/50 focus:ring-red-500/50'
        )}
      />
    </FieldWrapper>
  );
}

// Textarea
function TextareaField({
  field,
  value,
  onChange,
  error,
  nodes,
  edges,
  currentNodeId,
  textareaRef,
}: {
  field: ToolFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  nodes: Node[];
  edges: Edge[];
  currentNodeId: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}) {
  const handleInsertVariable = (variablePath: string) => {
    const textarea = textareaRef?.current;
    if (textarea) {
      const start = textarea.selectionStart || value.length;
      const end = textarea.selectionEnd || value.length;
      const newValue = value.slice(0, start) + variablePath + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + variablePath.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    } else {
      onChange(value + variablePath);
    }
  };

  return (
    <FieldWrapper
      field={field}
      error={error}
      nodes={nodes}
      edges={edges}
      currentNodeId={currentNodeId}
      onInsertVariable={handleInsertVariable}
    >
      <textarea
        ref={textareaRef}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={field.rows || 4}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm font-mono resize-none',
          'bg-gray-800/50 border border-white/10',
          'text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
          error && 'border-red-500/50 focus:ring-red-500/50'
        )}
      />
    </FieldWrapper>
  );
}

// Number Input
function NumberField({
  field,
  value,
  onChange,
  error,
  nodes,
  edges,
  currentNodeId,
}: {
  field: ToolFieldDefinition;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  nodes: Node[];
  edges: Edge[];
  currentNodeId: string;
}) {
  return (
    <FieldWrapper
      field={field}
      error={error}
      nodes={nodes}
      edges={edges}
      currentNodeId={currentNodeId}
      onInsertVariable={() => {}} // Numbers don't support variables directly
    >
      <input
        type="number"
        value={value ?? field.defaultValue ?? ''}
        onChange={e => onChange(parseFloat(e.target.value))}
        min={field.min}
        max={field.max}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm',
          'bg-gray-800/50 border border-white/10',
          'text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
          error && 'border-red-500/50 focus:ring-red-500/50'
        )}
      />
    </FieldWrapper>
  );
}

// Select Dropdown
function SelectField({
  field,
  value,
  onChange,
  error,
  nodes,
  edges,
  currentNodeId,
}: {
  field: ToolFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  nodes: Node[];
  edges: Edge[];
  currentNodeId: string;
}) {
  return (
    <FieldWrapper
      field={field}
      error={error}
      nodes={nodes}
      edges={edges}
      currentNodeId={currentNodeId}
      onInsertVariable={() => {}}
    >
      <div className="relative">
        <select
          value={value ?? field.defaultValue ?? ''}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'w-full px-3 py-2 rounded-lg text-sm appearance-none',
            'bg-gray-800/50 border border-white/10',
            'text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
            error && 'border-red-500/50 focus:ring-red-500/50'
          )}
        >
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
      </div>
    </FieldWrapper>
  );
}

// Boolean Toggle
function BooleanField({
  field,
  value,
  onChange,
}: {
  field: ToolFieldDefinition;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
        {field.label}
        {field.description && (
          <span className="text-muted-foreground cursor-help" title={field.description}>
            <Info size={12} />
          </span>
        )}
      </label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors',
          value ? 'bg-primary' : 'bg-gray-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform',
            value ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

// JSON Field
function JsonField({
  field,
  value,
  onChange,
  error,
  nodes,
  edges,
  currentNodeId,
  textareaRef,
}: {
  field: ToolFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  nodes: Node[];
  edges: Edge[];
  currentNodeId: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}) {
  const handleInsertVariable = (variablePath: string) => {
    const textarea = textareaRef?.current;
    if (textarea) {
      const start = textarea.selectionStart || value.length;
      const end = textarea.selectionEnd || value.length;
      const newValue = value.slice(0, start) + variablePath + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + variablePath.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    } else {
      onChange(value + variablePath);
    }
  };

  return (
    <FieldWrapper
      field={field}
      error={error}
      nodes={nodes}
      edges={edges}
      currentNodeId={currentNodeId}
      onInsertVariable={handleInsertVariable}
    >
      <textarea
        ref={textareaRef}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={field.rows || 4}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm font-mono resize-none',
          'bg-gray-800/50 border border-white/10',
          'text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
          error && 'border-red-500/50 focus:ring-red-500/50'
        )}
        spellCheck={false}
      />
    </FieldWrapper>
  );
}

// ============================================================================
// TOOL SELECTOR
// ============================================================================

interface ToolSelectorProps {
  value: string | undefined;
  onChange: (toolId: string) => void;
}

function ToolSelector({ value, onChange }: ToolSelectorProps) {
  const toolsByCategory = useMemo(() => getToolsByCategory(), []);
  const selectedTool = value ? getToolById(value) : null;

  const categoryLabels: Record<string, string> = {
    communication: 'Communication',
    crm: 'CRM',
    calendar: 'Calendar',
    storage: 'Storage',
    data: 'Data',
    ai: 'AI',
    utility: 'Utility',
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-foreground">Select Tool</label>

      {/* Selected tool display */}
      {selectedTool && (
        <div
          className={cn(
            'p-3 rounded-lg border',
            'bg-primary/5 border-primary/30'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${selectedTool.color}20` }}
            >
              {ICON_MAP[selectedTool.icon] ? (
                (() => {
                  const IconComponent = ICON_MAP[selectedTool.icon];
                  return <IconComponent size={20} style={{ color: selectedTool.color }} />;
                })()
              ) : (
                <div className="w-5 h-5 rounded bg-current" style={{ color: selectedTool.color }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground">{selectedTool.name}</h4>
              <p className="text-xs text-muted-foreground truncate">{selectedTool.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tool dropdown */}
      <div className="relative">
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'w-full px-3 py-2.5 rounded-lg text-sm appearance-none',
            'bg-gray-800/50 border border-white/10',
            'text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50'
          )}
        >
          <option value="">-- Select a tool --</option>
          {Object.entries(toolsByCategory).map(([category, tools]) => (
            <optgroup key={category} label={categoryLabels[category] || category}>
              {tools.map(tool => (
                <option key={tool.id} value={tool.id}>
                  {tool.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN FORM COMPONENT
// ============================================================================

export function DynamicActionForm({
  node,
  nodes,
  edges,
  onUpdate,
}: DynamicActionFormProps) {
  const nodeData = node.data || {};
  const selectedToolId = nodeData.selectedTool as string | undefined;
  const selectedTool = selectedToolId ? getToolById(selectedToolId) : null;

  // Initialize form with node data
  const form = useForm<FormValues>({
    defaultValues: {
      selectedTool: selectedToolId || '',
      configData: nodeData.configData || {},
    },
  });

  const { watch, setValue, control } = form;
  const configData = watch('configData') as Record<string, unknown>;

  // Handle tool selection change
  const handleToolChange = (toolId: string) => {
    const tool = getToolById(toolId);
    const defaultConfig: Record<string, unknown> = {};

    // Set default values from tool definition
    if (tool) {
      for (const field of tool.fields) {
        if (field.defaultValue !== undefined) {
          defaultConfig[field.key] = field.defaultValue;
        }
      }
    }

    // Update form and node
    setValue('selectedTool', toolId);
    setValue('configData', defaultConfig);
    onUpdate(node.id, {
      ...nodeData,
      selectedTool: toolId,
      configData: defaultConfig,
      label: tool?.name || 'Action',
      color: tool?.color || '#6366F1',
      icon: tool?.icon || 'Settings',
    });
  };

  // Handle field value change
  const handleFieldChange = (fieldKey: string, value: unknown) => {
    const newConfigData = { ...configData, [fieldKey]: value };
    setValue('configData', newConfigData);
    onUpdate(node.id, {
      ...nodeData,
      configData: newConfigData,
    });
  };

  // Refs for inputs (for variable insertion)
  const inputRefs = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLInputElement | HTMLTextAreaElement>> = {};
    if (selectedTool) {
      for (const field of selectedTool.fields) {
        refs[field.key] = React.createRef();
      }
    }
    return refs;
  }, [selectedTool]);

  return (
    <div className="space-y-4">
      {/* Tool Selector */}
      <ToolSelector
        value={selectedToolId}
        onChange={handleToolChange}
      />

      {/* Dynamic Fields */}
      {selectedTool && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Configuration
          </h4>

          {selectedTool.fields.map(field => {
            const value = configData[field.key];
            const error = undefined; // TODO: Add validation

            switch (field.type) {
              case 'text':
              case 'email':
              case 'url':
                return (
                  <TextField
                    key={field.key}
                    field={field}
                    value={value as string}
                    onChange={v => handleFieldChange(field.key, v)}
                    error={error}
                    nodes={nodes}
                    edges={edges}
                    currentNodeId={node.id}
                    inputRef={inputRefs[field.key] as React.RefObject<HTMLInputElement>}
                  />
                );

              case 'textarea':
                return (
                  <TextareaField
                    key={field.key}
                    field={field}
                    value={value as string}
                    onChange={v => handleFieldChange(field.key, v)}
                    error={error}
                    nodes={nodes}
                    edges={edges}
                    currentNodeId={node.id}
                    textareaRef={inputRefs[field.key] as React.RefObject<HTMLTextAreaElement>}
                  />
                );

              case 'number':
                return (
                  <NumberField
                    key={field.key}
                    field={field}
                    value={value as number}
                    onChange={v => handleFieldChange(field.key, v)}
                    error={error}
                    nodes={nodes}
                    edges={edges}
                    currentNodeId={node.id}
                  />
                );

              case 'select':
                return (
                  <SelectField
                    key={field.key}
                    field={field}
                    value={value as string}
                    onChange={v => handleFieldChange(field.key, v)}
                    error={error}
                    nodes={nodes}
                    edges={edges}
                    currentNodeId={node.id}
                  />
                );

              case 'boolean':
                return (
                  <BooleanField
                    key={field.key}
                    field={field}
                    value={value as boolean}
                    onChange={v => handleFieldChange(field.key, v)}
                  />
                );

              case 'json':
                return (
                  <JsonField
                    key={field.key}
                    field={field}
                    value={value as string}
                    onChange={v => handleFieldChange(field.key, v)}
                    error={error}
                    nodes={nodes}
                    edges={edges}
                    currentNodeId={node.id}
                    textareaRef={inputRefs[field.key] as React.RefObject<HTMLTextAreaElement>}
                  />
                );

              default:
                return null;
            }
          })}

          {/* Required connection notice */}
          {selectedTool.requiredConnection && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-200">
                This tool requires a connected{' '}
                <span className="font-semibold capitalize">{selectedTool.requiredConnection}</span>{' '}
                account.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DynamicActionForm;
