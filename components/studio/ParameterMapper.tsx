'use client';

/**
 * PARAMETER MAPPER
 *
 * Visual interface for mapping workflow variables to node parameters
 * Allows users to connect outputs from previous nodes to current node inputs
 * Supports Drag-and-Drop for intuitive mapping
 */

import { useState, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Link2,
  Unlink,
  Sparkles,
  Variable,
  Database,
  Zap,
  Eye,
  Code,
  Workflow,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface WorkflowVariable {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  variableName: string;
  variablePath: string; // e.g., "output.data.users"
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  sampleValue?: any;
  icon?: string;
}

export interface ParameterMapping {
  parameterName: string;
  mappedTo?: string; // Full path like "node_1.output.data"
  transformExpression?: string; // Optional JS expression for transformation
}

interface ParameterMapperProps {
  parameters: Array<{
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: any;
    description?: string;
  }>;
  availableVariables: WorkflowVariable[];
  mappings: ParameterMapping[];
  onChange: (mappings: ParameterMapping[]) => void;
}

export function ParameterMapper({
  parameters,
  availableVariables,
  mappings,
  onChange
}: ParameterMapperProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [draggedVariable, setDraggedVariable] = useState<WorkflowVariable | null>(null);
  const [dragOverParam, setDragOverParam] = useState<string | null>(null);

  // Group variables by source node
  const variablesByNode = availableVariables.reduce((acc, variable) => {
    if (!acc[variable.nodeId]) {
      acc[variable.nodeId] = {
        nodeName: variable.nodeName,
        nodeType: variable.nodeType,
        icon: variable.icon,
        variables: []
      };
    }
    acc[variable.nodeId].variables.push(variable);
    return acc;
  }, {} as Record<string, { nodeName: string; nodeType: string; icon?: string; variables: WorkflowVariable[] }>);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getMappingForParameter = (paramName: string): ParameterMapping | undefined => {
    return mappings.find(m => m.parameterName === paramName);
  };

  const handleMapVariable = (paramName: string, variablePath: string) => {
    const updated = mappings.filter(m => m.parameterName !== paramName);
    updated.push({
      parameterName: paramName,
      mappedTo: variablePath
    });
    onChange(updated);
  };

  const handleUnmap = (paramName: string) => {
    const updated = mappings.filter(m => m.parameterName !== paramName);
    onChange(updated);
  };

  const handleTransformChange = (paramName: string, expression: string) => {
    const mapping = getMappingForParameter(paramName);
    if (mapping) {
      const updated = mappings.map(m =>
        m.parameterName === paramName
          ? { ...m, transformExpression: expression }
          : m
      );
      onChange(updated);
    }
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'database-query':
        return Database;
      case 'webhook':
        return Zap;
      case 'trigger':
        return Sparkles;
      default:
        return Workflow;
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, variable: WorkflowVariable) => {
    e.dataTransfer.setData('application/json', JSON.stringify(variable));
    e.dataTransfer.effectAllowed = 'copy';
    setDraggedVariable(variable);
  };

  const handleDragEnd = () => {
    setDraggedVariable(null);
    setDragOverParam(null);
  };

  const handleDragOver = (e: React.DragEvent, paramName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverParam !== paramName) {
      setDragOverParam(paramName);
    }
  };

  const handleDragLeave = () => {
    setDragOverParam(null);
  };

  const handleDrop = (e: React.DragEvent, paramName: string) => {
    e.preventDefault();
    setDragOverParam(null);
    setDraggedVariable(null);

    try {
      const variable = JSON.parse(e.dataTransfer.getData('application/json')) as WorkflowVariable;
      handleMapVariable(paramName, variable.variablePath);
    } catch (err) {
      console.error('Failed to parse dropped variable', err);
    }
  };

  if (parameters.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-surface-0 p-6 text-center">
        <Variable className="mx-auto h-8 w-8 text-text-muted opacity-30" />
        <p className="mt-3 text-sm text-text-muted">No parameters to map</p>
        <p className="mt-1 text-xs text-text-muted">
          Add parameters to enable data mapping
        </p>
      </div>
    );
  }

  if (availableVariables.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-surface-0 p-6 text-center">
        <Link2 className="mx-auto h-8 w-8 text-text-muted opacity-30" />
        <p className="mt-3 text-sm text-text-muted">No upstream data available</p>
        <p className="mt-1 text-xs text-text-muted">
          Connect this node to other nodes in the workflow to map their outputs
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] gap-4">
      {/* Left Column: Available Variables (Source) */}
      <div className="flex w-1/2 flex-col rounded-lg border border-white/10 bg-surface-0">
        <div className="border-b border-white/10 p-3 bg-surface-1 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-400" />
            <h4 className="text-sm font-semibold text-text">Available Data</h4>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Drag variables from here to parameters on the right
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {Object.entries(variablesByNode).map(([nodeId, nodeData]) => {
            const isExpanded = expandedNodes.has(nodeId);
            const NodeIcon = getNodeIcon(nodeData.nodeType);

            return (
              <div key={nodeId} className="rounded border border-white/10 bg-surface-1 overflow-hidden">
                {/* Node Header */}
                <button
                  onClick={() => toggleNode(nodeId)}
                  className="flex w-full items-center justify-between p-2 transition hover:bg-card/5"
                >
                  <div className="flex items-center gap-2">
                    <NodeIcon className="h-3 w-3 text-text-muted" />
                    <span className="text-xs font-medium text-text">
                      {nodeData.nodeName}
                    </span>
                    <span className="text-xs text-text-muted">
                      ({nodeData.variables.length})
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-text-muted" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-text-muted" />
                  )}
                </button>

                {/* Variables List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 bg-surface-0"
                    >
                      <div className="p-1 space-y-0.5">
                        {nodeData.variables.map((variable, vIndex) => (
                          <div
                            key={vIndex}
                            draggable
                            onDragStart={(e) => handleDragStart(e, variable)}
                            onDragEnd={handleDragEnd}
                            className="group flex cursor-grab items-center gap-2 rounded p-2 transition hover:bg-purple-400/10 active:cursor-grabbing"
                          >
                            <GripVertical className="h-3 w-3 text-text-muted opacity-0 transition group-hover:opacity-100" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Variable className="h-3 w-3 text-purple-400" />
                                <span className="text-xs font-mono text-text truncate">
                                  {variable.variableName}
                                </span>
                              </div>
                              <div className="text-[10px] text-text-muted truncate pl-5">
                                {variable.variablePath}
                              </div>
                            </div>
                            <span className="rounded bg-card/10 px-1.5 py-0.5 text-[10px] text-text-muted">
                              {variable.dataType}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Parameters (Target) */}
      <div className="flex w-1/2 flex-col rounded-lg border border-white/10 bg-surface-0">
        <div className="border-b border-white/10 p-3 bg-surface-1 rounded-t-lg flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-400" />
              <h4 className="text-sm font-semibold text-text">Parameters</h4>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Drop variables here to map them
            </p>
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-surface-0 px-2 py-1 text-xs text-text-muted transition hover:bg-card/5"
          >
            <Eye className="h-3 w-3" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {parameters.map((param, index) => {
            const mapping = getMappingForParameter(param.name);
            const isMapped = !!mapping?.mappedTo;
            const isDragOver = dragOverParam === param.name;

            return (
              <div
                key={index}
                onDragOver={(e) => handleDragOver(e, param.name)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, param.name)}
                className={`relative rounded-lg border transition-all duration-200 ${
                  isDragOver
                    ? 'border-purple-400 bg-purple-400/20 scale-[1.02] shadow-lg shadow-purple-500/10'
                    : isMapped
                    ? 'border-purple-400/50 bg-purple-400/5'
                    : 'border-white/10 bg-surface-1'
                }`}
              >
                {/* Parameter Header */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-text-muted" />
                      <span className="text-sm font-medium text-text">{param.name}</span>
                      <span className="text-xs text-text-muted">({param.type})</span>
                      {param.required && (
                        <span className="rounded bg-red-400/20 px-1.5 py-0.5 text-[10px] text-red-400">
                          Required
                        </span>
                      )}
                    </div>
                    {isMapped && (
                      <button
                        onClick={() => handleUnmap(param.name)}
                        className="rounded p-1 text-text-muted transition hover:bg-red-500/10 hover:text-red-400"
                        title="Remove mapping"
                      >
                        <Unlink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  
                  {param.description && (
                    <p className="text-xs text-text-muted mb-2 pl-6">
                      {param.description}
                    </p>
                  )}

                  {/* Drop Zone / Mapping Display */}
                  <div className={`mt-2 rounded border border-dashed transition-all ${
                    isDragOver 
                      ? 'border-purple-400 bg-purple-400/20 h-10 flex items-center justify-center' 
                      : isMapped
                      ? 'border-purple-400/30 bg-purple-400/10 p-2'
                      : 'border-white/10 bg-surface-0 p-2 min-h-[40px] flex items-center justify-center text-text-muted'
                  }`}>
                    {isDragOver ? (
                      <span className="text-xs font-medium text-purple-300 flex items-center gap-2">
                        <Link2 className="h-3 w-3" />
                        Drop to map
                      </span>
                    ) : isMapped ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-3 w-3 text-purple-400" />
                          <span className="text-xs font-mono text-purple-300 break-all">
                            {mapping.mappedTo}
                          </span>
                        </div>
                        
                        {/* Transform Input */}
                        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                          <span className="text-[10px] text-text-muted whitespace-nowrap">fn(x)</span>
                          <input
                            type="text"
                            value={mapping.transformExpression || ''}
                            onChange={(e) => handleTransformChange(param.name, e.target.value)}
                            placeholder="Transform..."
                            className="w-full bg-transparent text-xs font-mono text-text outline-none placeholder:text-text-muted/50"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted/50">
                        Drop variable here
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Overlay */}
      <AnimatePresence>
        {showPreview && mappings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4 w-80 rounded-lg border border-blue-400/30 bg-surface-1 p-4 shadow-xl backdrop-blur-sm z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-400" />
                <h4 className="text-sm font-semibold text-blue-400">Mapping Preview</h4>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                className="text-text-muted hover:text-text"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {mappings.map((mapping, index) => (
                <div key={index} className="rounded border border-white/10 bg-surface-0 p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-text">{mapping.parameterName}</span>
                    <span className="text-text-muted">←</span>
                  </div>
                  <div className="font-mono text-purple-400 break-all bg-purple-400/5 p-1 rounded">
                    {mapping.mappedTo}
                  </div>
                  {mapping.transformExpression && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-text-muted">fn:</span>
                      <code className="text-orange-400">
                        {mapping.transformExpression}
                      </code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Settings(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 18 18" />
    </svg>
  );
}
