'use client';

import { motion } from 'framer-motion';
import { Variable } from '@/lib/studio/variable-types';
import { Edit2, Trash2, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface VariableCardProps {
  variable: Variable;
  onEdit: (variable: Variable) => void;
  onDelete: (variableId: string) => void;
}

export function VariableCard({ variable, onEdit, onDelete }: VariableCardProps) {
  const [copied, setCopied] = useState(false);

  // Get icon and color based on variable type
  const getTypeInfo = () => {
    switch (variable.type) {
      case 'string':
        return { icon: 'Aa', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      case 'number':
        return { icon: '123', color: 'text-green-400', bg: 'bg-green-500/10' };
      case 'boolean':
        return { icon: 'T/F', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
      case 'object':
        return { icon: '{}', color: 'text-purple-400', bg: 'bg-purple-500/10' };
      case 'array':
        return { icon: '[]', color: 'text-pink-400', bg: 'bg-pink-500/10' };
      default:
        return { icon: '?', color: 'text-muted-foreground', bg: 'bg-muted/500/10' };
    }
  };

  // Get source label
  const getSourceLabel = () => {
    switch (variable.source.type) {
      case 'input':
        return `Input: ${variable.source.path}`;
      case 'step':
        return `Step: ${variable.source.stepId}`;
      case 'env':
        return `Env: ${variable.source.key}`;
      case 'constant':
        return `Constant: ${JSON.stringify(variable.source.value)}`;
      case 'system':
        return `System: ${variable.source.key}`;
      default:
        return 'Unknown';
    }
  };

  // Copy variable reference
  const handleCopy = async () => {
    await navigator.clipboard.writeText(`{{${variable.name}}}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeInfo = getTypeInfo();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-bg-secondary hover:bg-bg-tertiary border border-border hover:border-purple-500/30 rounded-lg p-3 transition-all cursor-pointer"
    >
      {/* Type Badge */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${typeInfo.bg} flex items-center justify-center`}>
          <span className={`text-xs font-mono font-bold ${typeInfo.color}`}>
            {typeInfo.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Variable Name */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm text-text-primary truncate">
              {variable.displayName}
            </h4>
            {variable.required && (
              <span className="text-xs text-red-400">*</span>
            )}
          </div>

          {/* Variable Reference */}
          <div className="flex items-center gap-2 mb-2">
            <code className="text-xs font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
              {'{{' + variable.name + '}}'}
            </code>
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy reference"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" />
              )}
            </button>
          </div>

          {/* Source Info */}
          <div className="text-xs text-text-muted mb-2 truncate">
            {getSourceLabel()}
          </div>

          {/* Transforms */}
          {variable.transform && variable.transform.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {variable.transform.map((transform, idx) => (
                <span
                  key={idx}
                  className="text-xs px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded border border-orange-500/20"
                >
                  {transform.type}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {variable.description && (
            <p className="text-xs text-text-muted/70 line-clamp-2">
              {variable.description}
            </p>
          )}

          {/* Default Value */}
          {variable.defaultValue !== undefined && (
            <div className="mt-2 text-xs">
              <span className="text-text-muted">Default: </span>
              <code className="text-text-primary font-mono bg-bg-tertiary px-1 py-0.5 rounded">
                {JSON.stringify(variable.defaultValue)}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(variable)}
          className="p-1.5 hover:bg-bg-tertiary rounded transition-colors"
          title="Edit variable"
        >
          <Edit2 className="w-3.5 h-3.5 text-text-muted hover:text-blue-400" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete variable "${variable.displayName}"?`)) {
              onDelete(variable.id);
            }
          }}
          className="p-1.5 hover:bg-bg-tertiary rounded transition-colors"
          title="Delete variable"
        >
          <Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-red-400" />
        </button>
      </div>
    </motion.div>
  );
}
