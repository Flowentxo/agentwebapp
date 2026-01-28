'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Variable, VariableType, VariableSourceType } from '@/lib/studio/variable-types';
import { VariableStore } from '@/lib/studio/variable-store';
import { VariableCard } from './VariableCard';
import { VariableEditor } from './VariableEditor';
import { Plus, Search, Filter, Code2, X } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface VariablePanelProps {
  variableStore: VariableStore;
  onVariablesChange?: (variables: Variable[]) => void;
  onClose?: () => void;
}

export function VariablePanel({ variableStore, onVariablesChange, onClose }: VariablePanelProps) {
  // Theme support
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [variables, setVariables] = useState<Variable[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<VariableType | 'all'>('all');
  const [filterSource, setFilterSource] = useState<VariableSourceType | 'all'>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);

  // Load variables from store
  useEffect(() => {
    const loadedVariables = variableStore.getAll();
    setVariables(loadedVariables);
  }, [variableStore]);

  // Filter variables
  const filteredVariables = variables.filter(variable => {
    // Search filter
    if (searchQuery && !variable.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !variable.displayName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filterType !== 'all' && variable.type !== filterType) {
      return false;
    }

    // Source filter
    if (filterSource !== 'all' && variable.source.type !== filterSource) {
      return false;
    }

    return true;
  });

  // Handle variable save
  const handleSaveVariable = (variable: Variable) => {
    variableStore.register(variable);
    const updatedVariables = variableStore.getAll();
    setVariables(updatedVariables);
    onVariablesChange?.(updatedVariables);
    setIsEditorOpen(false);
    setEditingVariable(null);
  };

  // Handle variable delete
  const handleDeleteVariable = (variableId: string) => {
    const updatedVariables = variables.filter(v => v.id !== variableId);
    setVariables(updatedVariables);

    // Update store
    variableStore.clear();
    variableStore.registerMany(updatedVariables);
    onVariablesChange?.(updatedVariables);
  };

  // Handle variable edit
  const handleEditVariable = (variable: Variable) => {
    setEditingVariable(variable);
    setIsEditorOpen(true);
  };

  // Handle create new
  const handleCreateNew = () => {
    setEditingVariable(null);
    setIsEditorOpen(true);
  };

  return (
    <>
      <div className={cn(
        "h-full flex flex-col border-l transition-colors duration-200",
        isDark ? "border-white/10 bg-zinc-900" : "border-border bg-card"
      )}>
        {/* Header */}
        <div className={cn(
          "p-4 border-b",
          isDark ? "border-white/10" : "border-border"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-purple-500" />
              <h3 className={cn(
                "font-semibold",
                isDark ? "text-white" : "text-zinc-900"
              )}>Variables</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateNew}
                className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isDark ? "hover:bg-card/10" : "hover:bg-muted"
                  )}
                  title="Close Variables Panel"
                >
                  <X className={cn("w-5 h-5", isDark ? "text-zinc-400" : "text-muted-foreground")} />
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
              isDark ? "text-zinc-400" : "text-muted-foreground"
            )} />
            <input
              type="text"
              placeholder="Search variables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                isDark
                  ? "bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500"
                  : "bg-muted/50 border-border text-zinc-900 placeholder:text-muted-foreground"
              )}
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-muted-foreground")} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as VariableType | 'all')}
              className={cn(
                "flex-1 px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                isDark
                  ? "bg-zinc-800 border-white/10 text-white"
                  : "bg-muted/50 border-border text-zinc-900"
              )}
            >
              <option value="all">All Types</option>
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="object">Object</option>
              <option value="array">Array</option>
            </select>

            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as VariableSourceType | 'all')}
              className={cn(
                "flex-1 px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                isDark
                  ? "bg-zinc-800 border-white/10 text-white"
                  : "bg-muted/50 border-border text-zinc-900"
              )}
            >
              <option value="all">All Sources</option>
              <option value="input">Input</option>
              <option value="step">Step Output</option>
              <option value="env">Environment</option>
              <option value="constant">Constant</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        {/* Variables List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredVariables.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Code2 className={cn("w-12 h-12 mb-3", isDark ? "text-zinc-600" : "text-slate-300")} />
              <p className={cn("text-sm mb-1", isDark ? "text-zinc-400" : "text-muted-foreground")}>
                {variables.length === 0 ? 'No variables yet' : 'No variables match your filters'}
              </p>
              <p className={cn("text-xs mb-4", isDark ? "text-zinc-500" : "text-muted-foreground")}>
                {variables.length === 0 ? 'Create your first variable to get started' : 'Try adjusting your search or filters'}
              </p>
              {variables.length === 0 && (
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Create Variable
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredVariables.map((variable) => (
                <VariableCard
                  key={variable.id}
                  variable={variable}
                  onEdit={handleEditVariable}
                  onDelete={handleDeleteVariable}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer Stats */}
        {variables.length > 0 && (
          <div className={cn(
            "p-3 border-t",
            isDark ? "border-white/10 bg-zinc-800/50" : "border-border bg-muted/50"
          )}>
            <div className={cn(
              "flex items-center justify-between text-xs",
              isDark ? "text-zinc-400" : "text-muted-foreground"
            )}>
              <span>
                {filteredVariables.length} of {variables.length} variables
              </span>
              <span className="text-purple-500">
                {'{{variable}}'} syntax
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Variable Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <VariableEditor
            variable={editingVariable}
            onSave={handleSaveVariable}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingVariable(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
