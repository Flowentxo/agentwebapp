'use client';

import { useState } from 'react';
import { ConditionGroup, ConditionRule, LogicalOperator } from '@/lib/studio/condition-types';
import { VariableStore } from '@/lib/studio/variable-store';
import { ConditionRuleEditor } from './ConditionRuleEditor';
import { Plus, GitBranch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConditionGroupBuilderProps {
  group: ConditionGroup;
  onChange: (group: ConditionGroup) => void;
  variableStore: VariableStore;
  level?: number;
}

export function ConditionGroupBuilder({
  group,
  onChange,
  variableStore,
  level = 0
}: ConditionGroupBuilderProps) {
  // Toggle logical operator
  const handleToggleOperator = () => {
    onChange({
      ...group,
      operator: group.operator === 'AND' ? 'OR' : 'AND'
    });
  };

  // Add new rule
  const handleAddRule = () => {
    const newRule: ConditionRule = {
      id: `rule_${Date.now()}`,
      left: { type: 'variable', variableName: '' },
      operator: 'equals',
      right: { type: 'constant', value: '' },
      enabled: true
    };

    onChange({
      ...group,
      rules: [...group.rules, newRule]
    });
  };

  // Update rule
  const handleUpdateRule = (index: number, rule: ConditionRule) => {
    const newRules = [...group.rules];
    newRules[index] = rule;
    onChange({ ...group, rules: newRules });
  };

  // Delete rule
  const handleDeleteRule = (index: number) => {
    onChange({
      ...group,
      rules: group.rules.filter((_, i) => i !== index)
    });
  };

  // Add nested group
  const handleAddGroup = () => {
    const newGroup: ConditionGroup = {
      id: `group_${Date.now()}`,
      operator: 'AND',
      rules: [],
      groups: []
    };

    onChange({
      ...group,
      groups: [...(group.groups || []), newGroup]
    });
  };

  // Update nested group
  const handleUpdateGroup = (index: number, nestedGroup: ConditionGroup) => {
    const newGroups = [...(group.groups || [])];
    newGroups[index] = nestedGroup;
    onChange({ ...group, groups: newGroups });
  };

  // Delete nested group
  const handleDeleteGroup = (index: number) => {
    onChange({
      ...group,
      groups: (group.groups || []).filter((_, i) => i !== index)
    });
  };

  const hasMultipleItems = group.rules.length + (group.groups?.length || 0) > 1;

  return (
    <div className={`space-y-3 ${level > 0 ? 'pl-6 border-l-2 border-purple-500/30' : ''}`}>
      {/* Logical Operator Toggle (only show if multiple items) */}
      {hasMultipleItems && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Match</span>
          <button
            onClick={handleToggleOperator}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              group.operator === 'AND'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            }`}
          >
            {group.operator}
          </button>
          <span className="text-xs text-text-muted">
            of the following conditions
          </span>
        </div>
      )}

      {/* Rules */}
      <AnimatePresence mode="popLayout">
        {group.rules.map((rule, index) => (
          <motion.div
            key={rule.id}
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <ConditionRuleEditor
              rule={rule}
              onChange={(updated) => handleUpdateRule(index, updated)}
              onDelete={() => handleDeleteRule(index)}
              variableStore={variableStore}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Nested Groups */}
      <AnimatePresence mode="popLayout">
        {(group.groups || []).map((nestedGroup, index) => (
          <motion.div
            key={nestedGroup.id}
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative"
          >
            <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-purple-500/30" />
            <div className="bg-bg-elevated rounded-lg border border-purple-500/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-text-primary">
                    Nested Group
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteGroup(index)}
                  className="text-xs text-text-muted hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
              <ConditionGroupBuilder
                group={nestedGroup}
                onChange={(updated) => handleUpdateGroup(index, updated)}
                variableStore={variableStore}
                level={level + 1}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleAddRule}
          className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>

        {level < 2 && ( // Limit nesting to 2 levels
          <button
            onClick={handleAddGroup}
            className="flex items-center gap-2 px-3 py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text-primary rounded-lg text-sm font-medium transition-colors"
          >
            <GitBranch className="w-4 h-4" />
            Add Group
          </button>
        )}
      </div>

      {/* Empty State */}
      {group.rules.length === 0 && (group.groups?.length || 0) === 0 && (
        <div className="text-center py-8 text-text-muted">
          <p className="text-sm mb-2">No conditions yet</p>
          <p className="text-xs">Add a rule to get started</p>
        </div>
      )}
    </div>
  );
}
