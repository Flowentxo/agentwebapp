'use client';

import { useState } from 'react';
import { ConditionRule, ComparisonOperator, ValueSource } from '@/lib/studio/condition-types';
import { OPERATOR_INFO } from '@/lib/studio/condition-evaluator';
import { VariableStore } from '@/lib/studio/variable-store';
import { Trash2, ChevronDown } from 'lucide-react';

interface ConditionRuleEditorProps {
  rule: ConditionRule;
  onChange: (rule: ConditionRule) => void;
  onDelete: () => void;
  variableStore: VariableStore;
}

export function ConditionRuleEditor({
  rule,
  onChange,
  onDelete,
  variableStore
}: ConditionRuleEditorProps) {
  const variables = variableStore.getAll();
  const operatorInfo = OPERATOR_INFO[rule.operator];

  // Update left value
  const handleLeftChange = (source: ValueSource) => {
    onChange({ ...rule, left: source });
  };

  // Update operator
  const handleOperatorChange = (operator: ComparisonOperator) => {
    const newOperatorInfo = OPERATOR_INFO[operator];

    // Clear right value if new operator doesn't need it
    const right = newOperatorInfo.requiresRightValue ? rule.right : undefined;

    onChange({ ...rule, operator, right });
  };

  // Update right value
  const handleRightChange = (source: ValueSource) => {
    onChange({ ...rule, right: source });
  };

  // Toggle enabled
  const handleToggleEnabled = () => {
    onChange({ ...rule, enabled: !rule.enabled });
  };

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${
      rule.enabled
        ? 'border-border bg-bg-secondary'
        : 'border-border/50 bg-bg-secondary/50 opacity-60'
    }`}>
      {/* Enable Toggle */}
      <button
        onClick={handleToggleEnabled}
        className={`mt-2 flex-shrink-0 w-5 h-5 rounded border-2 transition-colors ${
          rule.enabled
            ? 'bg-purple-500 border-purple-500'
            : 'bg-transparent border-border'
        }`}
      >
        {rule.enabled && (
          <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Rule Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          {/* Left Value */}
          <ValueSourceSelector
            value={rule.left}
            onChange={handleLeftChange}
            variables={variables}
            placeholder="Select value..."
            className="flex-1"
          />

          {/* Operator */}
          <select
            value={rule.operator}
            onChange={(e) => handleOperatorChange(e.target.value as ComparisonOperator)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={!rule.enabled}
          >
            {Object.entries(OPERATOR_INFO).map(([op, info]) => (
              <option key={op} value={op}>
                {info.symbol} {info.label}
              </option>
            ))}
          </select>

          {/* Right Value (if needed) */}
          {operatorInfo.requiresRightValue && (
            <ValueSourceSelector
              value={rule.right || { type: 'constant', value: '' }}
              onChange={handleRightChange}
              variables={variables}
              placeholder="Compare to..."
              className="flex-1"
            />
          )}

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Delete rule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Operator Description */}
        <p className="text-xs text-text-muted">
          {operatorInfo.description}
        </p>
      </div>
    </div>
  );
}

/**
 * Value Source Selector Component
 */
interface ValueSourceSelectorProps {
  value: ValueSource;
  onChange: (value: ValueSource) => void;
  variables: any[];
  placeholder?: string;
  className?: string;
}

function ValueSourceSelector({
  value,
  onChange,
  variables,
  placeholder = 'Select...',
  className = ''
}: ValueSourceSelectorProps) {
  const [sourceType, setSourceType] = useState<ValueSource['type']>(value.type);

  const handleTypeChange = (type: ValueSource['type']) => {
    setSourceType(type);

    // Set default value based on type
    switch (type) {
      case 'variable':
        onChange({ type: 'variable', variableName: variables[0]?.name || '' });
        break;
      case 'constant':
        onChange({ type: 'constant', value: '' });
        break;
      case 'input':
        onChange({ type: 'input', path: '' });
        break;
      case 'step':
        onChange({ type: 'step', stepId: '', path: '' });
        break;
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Source Type Selector */}
      <select
        value={sourceType}
        onChange={(e) => handleTypeChange(e.target.value as ValueSource['type'])}
        className="px-2 py-2 bg-bg-tertiary border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
      >
        <option value="variable">Variable</option>
        <option value="constant">Value</option>
        <option value="input">Input</option>
        <option value="step">Step</option>
      </select>

      {/* Value Input based on type */}
      <div className="flex-1">
        {value.type === 'variable' && (
          <select
            value={'variableName' in value ? value.variableName : ''}
            onChange={(e) => onChange({ type: 'variable', variableName: e.target.value })}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="">Select variable...</option>
            {variables.map((v) => (
              <option key={v.id} value={v.name}>
                {v.displayName} ({v.name})
              </option>
            ))}
          </select>
        )}

        {value.type === 'constant' && (
          <input
            type="text"
            value={'value' in value ? String(value.value) : ''}
            onChange={(e) => {
              // Try to parse as number or boolean
              let parsedValue: any = e.target.value;
              if (!isNaN(Number(e.target.value)) && e.target.value !== '') {
                parsedValue = Number(e.target.value);
              } else if (e.target.value === 'true') {
                parsedValue = true;
              } else if (e.target.value === 'false') {
                parsedValue = false;
              }
              onChange({ type: 'constant', value: parsedValue });
            }}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        )}

        {value.type === 'input' && (
          <input
            type="text"
            value={'path' in value ? value.path : ''}
            onChange={(e) => onChange({ type: 'input', path: e.target.value })}
            placeholder="e.g., customer.email"
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        )}

        {value.type === 'step' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={'stepId' in value ? value.stepId : ''}
              onChange={(e) => onChange({
                type: 'step',
                stepId: e.target.value,
                path: 'path' in value ? value.path : ''
              })}
              placeholder="Step ID"
              className="flex-1 px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <input
              type="text"
              value={'path' in value ? value.path : ''}
              onChange={(e) => onChange({
                type: 'step',
                stepId: 'stepId' in value ? value.stepId : '',
                path: e.target.value
              })}
              placeholder="path"
              className="flex-1 px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        )}
      </div>
    </div>
  );
}
