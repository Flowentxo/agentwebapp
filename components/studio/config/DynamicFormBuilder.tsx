'use client';

/**
 * FLOWENT AI STUDIO - DYNAMIC FORM BUILDER
 *
 * Renders configuration forms dynamically based on node field definitions.
 * Supports all field types defined in NodeFieldDefinition.
 *
 * @version 2.0.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Info,
  AlertCircle,
  Code,
  Variable,
  Calendar,
  Clock,
  Link,
  Mail,
  File,
  Eye,
  EyeOff,
  Copy,
  Check,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { NodeFieldDefinition, NodeDefinition } from '@/lib/studio/node-definitions';

// ============================================================================
// TYPES
// ============================================================================

export interface DynamicFormBuilderProps {
  node: NodeDefinition;
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  onBulkChange?: (values: Record<string, any>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

interface FieldProps {
  field: NodeFieldDefinition;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  allValues?: Record<string, any>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DynamicFormBuilder({
  node,
  values,
  onChange,
  onBulkChange,
  errors = {},
  disabled = false,
  showAdvanced = false,
  onToggleAdvanced,
}: DynamicFormBuilderProps) {
  // Group fields by group property
  const groupedFields = useMemo(() => {
    const groups: Record<string, NodeFieldDefinition[]> = {
      default: [],
      advanced: [],
    };

    node.fields.forEach(field => {
      // Check if field should be shown based on showWhen condition
      if (field.showWhen) {
        const dependentValue = values[field.showWhen.field];
        if (dependentValue !== field.showWhen.equals) {
          return; // Skip this field
        }
      }

      if (field.advanced) {
        groups.advanced.push(field);
      } else if (field.group) {
        if (!groups[field.group]) {
          groups[field.group] = [];
        }
        groups[field.group].push(field);
      } else {
        groups.default.push(field);
      }
    });

    return groups;
  }, [node.fields, values]);

  const hasAdvancedFields = groupedFields.advanced.length > 0;

  return (
    <div className="space-y-4">
      {/* Default fields */}
      {groupedFields.default.map(field => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={values[field.id] ?? field.default}
          onChange={val => onChange(field.id, val)}
          error={errors[field.id]}
          disabled={disabled}
          allValues={values}
        />
      ))}

      {/* Custom groups */}
      {Object.entries(groupedFields)
        .filter(([key]) => key !== 'default' && key !== 'advanced')
        .map(([groupName, fields]) => (
          <FieldGroup key={groupName} title={groupName}>
            {fields.map(field => (
              <FieldRenderer
                key={field.id}
                field={field}
                value={values[field.id] ?? field.default}
                onChange={val => onChange(field.id, val)}
                error={errors[field.id]}
                disabled={disabled}
                allValues={values}
              />
            ))}
          </FieldGroup>
        ))}

      {/* Advanced fields toggle */}
      {hasAdvancedFields && (
        <div className="pt-2">
          <button
            onClick={onToggleAdvanced}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Advanced Options</span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-white/5 space-y-4">
                  {groupedFields.advanced.map(field => (
                    <FieldRenderer
                      key={field.id}
                      field={field}
                      value={values[field.id] ?? field.default}
                      onChange={val => onChange(field.id, val)}
                      error={errors[field.id]}
                      disabled={disabled}
                      allValues={values}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FIELD GROUP
// ============================================================================

interface FieldGroupProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

function FieldGroup({
  title,
  children,
  collapsible = true,
  defaultExpanded = true,
}: FieldGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => collapsible && setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-white/5 text-sm font-medium text-white/80 ${
          collapsible ? 'cursor-pointer hover:bg-white/10' : 'cursor-default'
        } transition-colors`}
        disabled={!collapsible}
      >
        <span className="capitalize">{title}</span>
        {collapsible && (
          expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// FIELD RENDERER
// ============================================================================

function FieldRenderer({ field, value, onChange, error, disabled, allValues }: FieldProps) {
  const renderField = () => {
    switch (field.type) {
      case 'text':
        return <TextField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'textarea':
        return <TextAreaField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'number':
        return <NumberField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'select':
        return <SelectField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'multiselect':
        return <MultiSelectField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'boolean':
        return <BooleanField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'json':
        return <JsonField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'code':
        return <CodeField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'cron':
        return <CronField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'expression':
        return <ExpressionField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'variable':
        return <VariableField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'credential':
        return <CredentialField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'keyvalue':
        return <KeyValueField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'condition':
        return <ConditionField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'color':
        return <ColorField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'date':
        return <DateField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'datetime':
        return <DateTimeField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'url':
        return <UrlField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'email':
        return <EmailField field={field} value={value} onChange={onChange} disabled={disabled} />;
      case 'file':
        return <FileField field={field} value={value} onChange={onChange} disabled={disabled} />;
      default:
        return <TextField field={field} value={value} onChange={onChange} disabled={disabled} />;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm font-medium text-white/80">
          {field.label}
          {field.required && <span className="text-red-400">*</span>}
          {field.description && (
            <button className="group relative">
              <HelpCircle className="w-3.5 h-3.5 text-white/30 hover:text-white/60" />
              <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-gray-900 rounded-lg text-xs text-white/70 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg border border-white/10">
                {field.description}
              </div>
            </button>
          )}
        </label>
      </div>
      {renderField()}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FIELD COMPONENTS
// ============================================================================

function TextField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all"
    />
  );
}

function TextAreaField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      rows={4}
      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 resize-none transition-all"
    />
  );
}

function NumberField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
      min={field.min}
      max={field.max}
      placeholder={field.placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all"
    />
  );
}

function SelectField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all cursor-pointer"
      >
        <option value="" className="bg-gray-900">
          Select {field.label.toLowerCase()}...
        </option>
        {field.options?.map(option => (
          <option key={option.value} value={option.value} className="bg-gray-900">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
    </div>
  );
}

function MultiSelectField({ field, value, onChange, disabled }: FieldProps) {
  const selectedValues = Array.isArray(value) ? value : [];

  const toggleValue = (optionValue: string) => {
    if (selectedValues.includes(optionValue)) {
      onChange(selectedValues.filter(v => v !== optionValue));
    } else {
      onChange([...selectedValues, optionValue]);
    }
  };

  return (
    <div className="space-y-2">
      {field.options?.map(option => (
        <label
          key={option.value}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={selectedValues.includes(option.value)}
            onChange={() => toggleValue(option.value)}
            disabled={disabled}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0"
          />
          <span className="text-sm text-white/70 group-hover:text-white transition-colors">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function BooleanField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          value ? 'bg-purple-500' : 'bg-white/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm text-white/70">{value ? 'Enabled' : 'Disabled'}</span>
    </label>
  );
}

function JsonField({ field, value, onChange, disabled }: FieldProps) {
  const [error, setError] = useState<string | null>(null);
  const [rawValue, setRawValue] = useState(
    typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  );

  const handleChange = (newValue: string) => {
    setRawValue(newValue);
    try {
      const parsed = JSON.parse(newValue);
      onChange(parsed);
      setError(null);
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        <Code className="absolute left-3 top-3 w-4 h-4 text-white/30" />
        <textarea
          value={rawValue}
          onChange={e => handleChange(e.target.value)}
          placeholder={field.placeholder || '{}'}
          disabled={disabled}
          rows={5}
          className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 resize-none transition-all"
        />
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function CodeField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div className="relative">
      <Code className="absolute left-3 top-3 w-4 h-4 text-white/30" />
      <textarea
        value={value || field.default || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        rows={8}
        className="w-full pl-10 pr-3 py-2 bg-[#1e1e2e] border border-white/10 rounded-lg text-green-400 font-mono text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 resize-none transition-all"
      />
    </div>
  );
}

function CronField({ field, value, onChange, disabled }: FieldProps) {
  const presets = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at 9 AM', value: '0 9 * * *' },
    { label: 'Every Monday', value: '0 9 * * 1' },
    { label: 'Every month', value: '0 0 1 * *' },
  ];

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder || '* * * * *'}
        disabled={disabled}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all"
      />
      <div className="flex flex-wrap gap-1">
        {presets.map(preset => (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value)}
            disabled={disabled}
            className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExpressionField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div className="relative">
      <Variable className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder || '{{$json.field}}'}
        disabled={disabled}
        className="w-full pl-10 pr-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300 font-mono text-sm placeholder-purple-300/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all"
      />
    </div>
  );
}

function VariableField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <ExpressionField field={field} value={value} onChange={onChange} disabled={disabled} />
  );
}

function CredentialField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all cursor-pointer"
      >
        <option value="" className="bg-gray-900">
          Select credential...
        </option>
        <option value="new" className="bg-gray-900 text-purple-400">
          + Create new credential
        </option>
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
    </div>
  );
}

function KeyValueField({ field, value, onChange, disabled }: FieldProps) {
  const pairs: Array<{ key: string; value: string }> = Array.isArray(value)
    ? value
    : Object.entries(value || {}).map(([k, v]) => ({ key: k, value: String(v) }));

  const addPair = () => {
    onChange([...pairs, { key: '', value: '' }]);
  };

  const updatePair = (index: number, key: string, val: string) => {
    const updated = [...pairs];
    updated[index] = { key, value: val };
    onChange(updated);
  };

  const removePair = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {pairs.map((pair, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={pair.key}
            onChange={e => updatePair(index, e.target.value, pair.value)}
            placeholder="Key"
            disabled={disabled}
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
          />
          <input
            type="text"
            value={pair.value}
            onChange={e => updatePair(index, pair.key, e.target.value)}
            placeholder="Value"
            disabled={disabled}
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
          />
          <button
            onClick={() => removePair(index)}
            disabled={disabled}
            className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addPair}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        <span>Add pair</span>
      </button>
    </div>
  );
}

function ConditionField({ field, value, onChange, disabled }: FieldProps) {
  const conditions = Array.isArray(value) ? value : [];

  const addCondition = () => {
    onChange([...conditions, { field: '', operator: 'equals', value: '' }]);
  };

  const updateCondition = (index: number, updates: Partial<typeof conditions[0]>) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_: any, i: number) => i !== index));
  };

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' },
  ];

  return (
    <div className="space-y-2">
      {conditions.map((condition: any, index: number) => (
        <div key={index} className="p-3 bg-white/5 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={condition.field || ''}
              onChange={e => updateCondition(index, { field: e.target.value })}
              placeholder="Field (e.g., $json.status)"
              disabled={disabled}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
            />
            <button
              onClick={() => removeCondition(index)}
              disabled={disabled}
              className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={condition.operator || 'equals'}
              onChange={e => updateCondition(index, { operator: e.target.value })}
              disabled={disabled}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              {operators.map(op => (
                <option key={op.value} value={op.value} className="bg-gray-900">
                  {op.label}
                </option>
              ))}
            </select>
            {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
              <input
                type="text"
                value={condition.value || ''}
                onChange={e => updateCondition(index, { value: e.target.value })}
                placeholder="Value"
                disabled={disabled}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
              />
            )}
          </div>
        </div>
      ))}
      <button
        onClick={addCondition}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        <span>Add condition</span>
      </button>
    </div>
  );
}

function ColorField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value || '#8B5CF6'}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer disabled:opacity-50"
      />
      <input
        type="text"
        value={value || '#8B5CF6'}
        onChange={e => onChange(e.target.value)}
        placeholder="#000000"
        disabled={disabled}
        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 transition-all"
      />
    </div>
  );
}

function DateField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all"
      />
    </div>
  );
}

function DateTimeField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div className="relative">
      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <input
        type="datetime-local"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all"
      />
    </div>
  );
}

function UrlField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div className="relative">
      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <input
        type="url"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder || 'https://'}
        disabled={disabled}
        className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all"
      />
    </div>
  );
}

function EmailField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <input
        type="email"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder || 'email@example.com'}
        disabled={disabled}
        className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50 transition-all"
      />
    </div>
  );
}

function FileField({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div className="relative">
      <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/10 hover:border-white/30 transition-all disabled:opacity-50">
        <File className="w-5 h-5 text-white/50" />
        <span className="text-sm text-white/60">
          {value ? (typeof value === 'string' ? value : 'File selected') : 'Choose file...'}
        </span>
        <input
          type="file"
          onChange={e => onChange(e.target.files?.[0])}
          disabled={disabled}
          className="hidden"
        />
      </label>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DynamicFormBuilder;
