'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConditionConfig, ConditionGroup, BranchPath } from '@/lib/studio/condition-types';
import { VariableStore } from '@/lib/studio/variable-store';
import { ConditionGroupBuilder } from './ConditionGroupBuilder';
import { CONDITION_TEMPLATES } from '@/lib/studio/condition-evaluator';
import { X, GitBranch, Sparkles, ChevronDown, ChevronRight, Save } from 'lucide-react';

interface ConditionPanelProps {
  config: ConditionConfig | null;
  onChange: (config: ConditionConfig) => void;
  onClose: () => void;
  variableStore: VariableStore;
}

export function ConditionPanel({
  config,
  onChange,
  onClose,
  variableStore
}: ConditionPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['conditions', 'branches'])
  );
  const [showTemplates, setShowTemplates] = useState(false);

  if (!config) {
    return (
      <div className="h-full w-96 border-l border-border bg-bg-elevated flex items-center justify-center p-8">
        <div className="text-center">
          <GitBranch className="mx-auto h-12 w-12 text-text-muted opacity-30" />
          <p className="mt-4 text-sm text-text-muted">
            Select a condition node to configure
          </p>
        </div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = CONDITION_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      onChange({
        ...config,
        condition: {
          ...config.condition,
          ...template.condition,
          id: config.condition.id
        } as ConditionGroup
      });
      setShowTemplates(false);
    }
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="h-full border-l border-border bg-bg-elevated flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-text-primary">
              Condition Logic
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Name Input */}
        <input
          type="text"
          value={config.name}
          onChange={(e) => onChange({ ...config, name: e.target.value })}
          placeholder="Condition name..."
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Templates Section */}
        <div className="rounded-lg border border-border bg-bg-secondary">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="w-full flex items-center justify-between p-3 hover:bg-bg-tertiary transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-text-primary">
                Templates
              </span>
            </div>
            {showTemplates ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          <AnimatePresence>
            {showTemplates && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 pt-0 space-y-2">
                  {CONDITION_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleLoadTemplate(template.id)}
                      className="w-full text-left p-3 rounded-lg bg-bg-tertiary hover:bg-bg-elevated border border-border hover:border-purple-500/30 transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-text-primary">
                            {template.name}
                          </h4>
                          <p className="text-xs text-text-muted mt-0.5">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Conditions Section */}
        <div className="rounded-lg border border-border bg-bg-secondary">
          <button
            onClick={() => toggleSection('conditions')}
            className="w-full flex items-center justify-between p-3 hover:bg-bg-tertiary transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">
              Conditions
            </span>
            {expandedSections.has('conditions') ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.has('conditions') && (
            <div className="p-3 pt-0">
              <ConditionGroupBuilder
                group={config.condition}
                onChange={(updatedGroup) => onChange({ ...config, condition: updatedGroup })}
                variableStore={variableStore}
              />
            </div>
          )}
        </div>

        {/* Branch Paths Section */}
        <div className="rounded-lg border border-border bg-bg-secondary">
          <button
            onClick={() => toggleSection('branches')}
            className="w-full flex items-center justify-between p-3 hover:bg-bg-tertiary transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">
              Branch Paths
            </span>
            {expandedSections.has('branches') ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.has('branches') && (
            <div className="p-3 pt-0 space-y-3">
              {/* True Branch */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-green-400 flex items-center gap-1">
                  ✓ True Branch
                </label>
                <input
                  type="text"
                  value={config.trueBranch.label}
                  onChange={(e) => onChange({
                    ...config,
                    trueBranch: { ...config.trueBranch, label: e.target.value }
                  })}
                  placeholder="Success path..."
                  className="w-full px-3 py-2 bg-bg-tertiary border border-green-500/30 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
                <textarea
                  value={config.trueBranch.description || ''}
                  onChange={(e) => onChange({
                    ...config,
                    trueBranch: { ...config.trueBranch, description: e.target.value }
                  })}
                  placeholder="What happens when condition is true..."
                  rows={2}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-green-500/30 rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
                />
              </div>

              {/* False Branch */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-red-400 flex items-center gap-1">
                  ✗ False Branch
                </label>
                <input
                  type="text"
                  value={config.falseBranch.label}
                  onChange={(e) => onChange({
                    ...config,
                    falseBranch: { ...config.falseBranch, label: e.target.value }
                  })}
                  placeholder="Alternative path..."
                  className="w-full px-3 py-2 bg-bg-tertiary border border-red-500/30 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
                <textarea
                  value={config.falseBranch.description || ''}
                  onChange={(e) => onChange({
                    ...config,
                    falseBranch: { ...config.falseBranch, description: e.target.value }
                  })}
                  placeholder="What happens when condition is false..."
                  rows={2}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-red-500/30 rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div className="rounded-lg border border-border bg-bg-secondary">
          <button
            onClick={() => toggleSection('settings')}
            className="w-full flex items-center justify-between p-3 hover:bg-bg-tertiary transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">
              Settings
            </span>
            {expandedSections.has('settings') ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expandedSections.has('settings') && (
            <div className="p-3 pt-0 space-y-3">
              {/* Continue on Error */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-text-primary">
                    Continue on Error
                  </label>
                  <p className="text-xs text-text-muted">
                    Don't stop workflow if evaluation fails
                  </p>
                </div>
                <button
                  onClick={() => onChange({
                    ...config,
                    continueOnError: !config.continueOnError
                  })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    config.continueOnError ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-card rounded-full shadow transition-transform ${
                      config.continueOnError ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Default Path */}
              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">
                  Default Path (on error)
                </label>
                <select
                  value={config.defaultPath}
                  onChange={(e) => onChange({
                    ...config,
                    defaultPath: e.target.value as 'true' | 'false'
                  })}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="true">True Branch</option>
                  <option value="false">False Branch</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save & Close
        </button>
      </div>
    </motion.div>
  );
}
