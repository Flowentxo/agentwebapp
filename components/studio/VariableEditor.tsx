'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Variable,
  VariableType,
  VariableSource,
  Transform,
  TransformType
} from '@/lib/studio/variable-types';
import { X, Plus, Trash2, Info } from 'lucide-react';

interface VariableEditorProps {
  variable: Variable | null;
  onSave: (variable: Variable) => void;
  onClose: () => void;
}

export function VariableEditor({ variable, onSave, onClose }: VariableEditorProps) {
  const isEditing = !!variable;

  // Form state
  const [id, setId] = useState(variable?.id || `var_${Date.now()}`);
  const [name, setName] = useState(variable?.name || '');
  const [displayName, setDisplayName] = useState(variable?.displayName || '');
  const [type, setType] = useState<VariableType>(variable?.type || 'string');
  const [sourceType, setSourceType] = useState<VariableSource['type']>(variable?.source.type || 'input');
  const [description, setDescription] = useState(variable?.description || '');
  const [required, setRequired] = useState(variable?.required || false);
  const [defaultValue, setDefaultValue] = useState(
    variable?.defaultValue !== undefined ? JSON.stringify(variable.defaultValue) : ''
  );

  // Source-specific fields
  const [inputPath, setInputPath] = useState(
    variable?.source.type === 'input' ? variable.source.path : ''
  );
  const [stepId, setStepId] = useState(
    variable?.source.type === 'step' ? variable.source.stepId : ''
  );
  const [stepPath, setStepPath] = useState(
    variable?.source.type === 'step' ? variable.source.path : ''
  );
  const [envKey, setEnvKey] = useState(
    variable?.source.type === 'env' ? variable.source.key : ''
  );
  const [constantValue, setConstantValue] = useState(
    variable?.source.type === 'constant' ? JSON.stringify(variable.source.value) : ''
  );
  const [systemKey, setSystemKey] = useState(
    variable?.source.type === 'system' ? variable.source.key : ''
  );

  // Transforms
  const [transforms, setTransforms] = useState<Transform[]>(variable?.transform || []);

  // Auto-generate name from display name
  useEffect(() => {
    if (!isEditing && displayName) {
      const generatedName = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setName(generatedName);
    }
  }, [displayName, isEditing]);

  // Build source object
  const buildSource = (): VariableSource => {
    switch (sourceType) {
      case 'input':
        return { type: 'input', path: inputPath };
      case 'step':
        return { type: 'step', stepId, path: stepPath };
      case 'env':
        return { type: 'env', key: envKey };
      case 'constant':
        try {
          return { type: 'constant', value: JSON.parse(constantValue || 'null') };
        } catch {
          return { type: 'constant', value: constantValue };
        }
      case 'system':
        return { type: 'system', key: systemKey };
      default:
        return { type: 'input', path: '' };
    }
  };

  // Handle save
  const handleSave = () => {
    if (!name.trim() || !displayName.trim()) {
      alert('Name and Display Name are required');
      return;
    }

    const newVariable: Variable = {
      id,
      name: name.trim(),
      displayName: displayName.trim(),
      type,
      source: buildSource(),
      transform: transforms.length > 0 ? transforms : undefined,
      description: description.trim() || undefined,
      required,
      defaultValue: defaultValue ? JSON.parse(defaultValue) : undefined
    };

    onSave(newVariable);
  };

  // Add transform
  const handleAddTransform = () => {
    setTransforms([...transforms, { type: 'uppercase', params: [] }]);
  };

  // Remove transform
  const handleRemoveTransform = (index: number) => {
    setTransforms(transforms.filter((_, i) => i !== index));
  };

  // Update transform
  const handleUpdateTransform = (index: number, transformType: TransformType) => {
    const updated = [...transforms];
    updated[index] = { type: transformType, params: [] };
    setTransforms(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-elevated border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            {isEditing ? 'Edit Variable' : 'Create Variable'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Customer Email"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Variable Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Variable Name <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <code className="text-purple-400">{'{{ '}</code>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="customer_email"
                pattern="[a-z0-9_]+"
                className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <code className="text-purple-400">{' }}'}</code>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Lowercase letters, numbers, and underscores only
            </p>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as VariableType)}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="object">Object</option>
              <option value="array">Array</option>
              <option value="any">Any</option>
            </select>
          </div>

          {/* Source Type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Source
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as VariableSource['type'])}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="input">User Input</option>
              <option value="step">Step Output</option>
              <option value="env">Environment Variable</option>
              <option value="constant">Constant Value</option>
              <option value="system">System Variable</option>
            </select>
          </div>

          {/* Source-specific fields */}
          {sourceType === 'input' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Input Path
              </label>
              <input
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="customer.email"
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <p className="mt-1 text-xs text-text-muted flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Use dot notation for nested properties (e.g., "customer.address.city")
              </p>
            </div>
          )}

          {sourceType === 'step' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Step ID
                </label>
                <input
                  type="text"
                  value={stepId}
                  onChange={(e) => setStepId(e.target.value)}
                  placeholder="node_123"
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Output Path
                </label>
                <input
                  type="text"
                  value={stepPath}
                  onChange={(e) => setStepPath(e.target.value)}
                  placeholder="result.data"
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </>
          )}

          {sourceType === 'env' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Environment Variable Key
              </label>
              <input
                type="text"
                value={envKey}
                onChange={(e) => setEnvKey(e.target.value)}
                placeholder="API_KEY"
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          )}

          {sourceType === 'constant' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Constant Value
              </label>
              <textarea
                value={constantValue}
                onChange={(e) => setConstantValue(e.target.value)}
                placeholder='"Hello World" or 42 or ["a", "b", "c"]'
                rows={3}
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <p className="mt-1 text-xs text-text-muted">
                Enter valid JSON value
              </p>
            </div>
          )}

          {sourceType === 'system' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                System Key
              </label>
              <select
                value={systemKey}
                onChange={(e) => setSystemKey(e.target.value)}
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="">Select system variable...</option>
                <option value="timestamp">timestamp</option>
                <option value="userId">userId</option>
                <option value="workflowId">workflowId</option>
                <option value="executionId">executionId</option>
              </select>
            </div>
          )}

          {/* Transforms */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-primary">
                Transformations
              </label>
              <button
                onClick={handleAddTransform}
                className="flex items-center gap-1 px-2 py-1 text-xs text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {transforms.length === 0 ? (
              <p className="text-xs text-text-muted italic">No transformations</p>
            ) : (
              <div className="space-y-2">
                {transforms.map((transform, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={transform.type}
                      onChange={(e) => handleUpdateTransform(idx, e.target.value as TransformType)}
                      className="flex-1 px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="uppercase">Uppercase</option>
                      <option value="lowercase">Lowercase</option>
                      <option value="capitalize">Capitalize</option>
                      <option value="trim">Trim</option>
                      <option value="truncate">Truncate</option>
                      <option value="replace">Replace</option>
                      <option value="split">Split</option>
                      <option value="join">Join</option>
                      <option value="parseJSON">Parse JSON</option>
                      <option value="stringify">Stringify</option>
                    </select>
                    <button
                      onClick={() => handleRemoveTransform(idx)}
                      className="p-1.5 hover:bg-bg-secondary rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Default Value */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Default Value (Optional)
            </label>
            <input
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder='"fallback value"'
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this variable used for?"
              rows={2}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Required */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-bg-secondary text-purple-500 focus:ring-2 focus:ring-purple-500/50"
            />
            <label htmlFor="required" className="text-sm text-text-primary cursor-pointer">
              Required (must have a value)
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
          >
            {isEditing ? 'Save Changes' : 'Create Variable'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
