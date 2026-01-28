'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Clock, Check, AlertCircle, Code } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface TestConsoleProps {
  tool: {
    id: string;
    displayName: string;
    type: string;
    parameters: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
      default?: any;
    }>;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  durationMs: number;
  logs?: string[];
}

// ============================================================
// TEST CONSOLE
// ============================================================

export function TestConsole({ tool, isOpen, onClose }: TestConsoleProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  if (!isOpen || !tool) return null;

  // Update parameter value
  const updateParameter = (name: string, value: any) => {
    setParameters({
      ...parameters,
      [name]: value,
    });
  };

  // Parse input value based on type
  const parseValue = (value: string, type: string): any => {
    if (!value) return undefined;

    try {
      switch (type) {
        case 'number':
          return parseFloat(value);
        case 'boolean':
          return value === 'true';
        case 'object':
        case 'array':
          return JSON.parse(value);
        default:
          return value;
      }
    } catch (error) {
      return value;
    }
  };

  // Execute tool
  const handleExecute = async () => {
    setIsExecuting(true);
    setResult(null);

    try {
      const response = await fetch(`/api/custom-tools/${tool.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ parameters }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          error: data.error || 'Execution failed',
          durationMs: data.durationMs || 0,
          logs: data.logs || [],
        });
      } else {
        setResult({
          success: true,
          result: data.result,
          durationMs: data.durationMs,
          logs: data.logs || [],
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
        durationMs: 0,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-800 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Test Tool</h2>
            <p className="text-muted-foreground text-sm mt-1">{tool.displayName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Parameters Input */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Parameters</h3>

            {tool.parameters.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                <p className="text-muted-foreground">No parameters required</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tool.parameters.map((param) => (
                  <div key={param.name}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {param.name}
                      {param.required && <span className="text-red-400 ml-1">*</span>}
                      <span className="text-muted-foreground ml-2 font-normal">({param.type})</span>
                    </label>

                    {param.description && (
                      <p className="text-xs text-muted-foreground mb-2">{param.description}</p>
                    )}

                    {param.type === 'boolean' ? (
                      <select
                        value={parameters[param.name] || ''}
                        onChange={(e) => updateParameter(param.name, e.target.value === 'true')}
                        className="w-full px-4 py-2 bg-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : param.type === 'object' || param.type === 'array' ? (
                      <textarea
                        value={typeof parameters[param.name] === 'object'
                          ? JSON.stringify(parameters[param.name], null, 2)
                          : parameters[param.name] || ''
                        }
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            updateParameter(param.name, parsed);
                          } catch {
                            updateParameter(param.name, e.target.value);
                          }
                        }}
                        placeholder={param.type === 'array' ? '["value1", "value2"]' : '{"key": "value"}'}
                        rows={3}
                        className="w-full px-4 py-2 bg-card border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
                      />
                    ) : (
                      <input
                        type={param.type === 'number' ? 'number' : 'text'}
                        value={parameters[param.name] || ''}
                        onChange={(e) => updateParameter(
                          param.name,
                          param.type === 'number' ? parseFloat(e.target.value) : e.target.value
                        )}
                        placeholder={param.default !== undefined ? `Default: ${param.default}` : ''}
                        className="w-full px-4 py-2 bg-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Execute Button */}
          <div>
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Execute Tool
                </>
              )}
            </button>
          </div>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Result</h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {result.durationMs}ms
                  </div>
                  <div className={`flex items-center gap-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                    {result.success ? (
                      <>
                        <Check className="w-4 h-4" />
                        Success
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        Failed
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Result Content */}
              {result.success ? (
                <div className="p-4 bg-card border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">Output</span>
                  </div>
                  <pre className="text-sm text-white font-mono overflow-x-auto">
                    {JSON.stringify(result.result, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="p-4 bg-card border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">Error</span>
                  </div>
                  <pre className="text-sm text-red-300 font-mono overflow-x-auto">
                    {result.error}
                  </pre>
                </div>
              )}

              {/* Logs */}
              {result.logs && result.logs.length > 0 && (
                <div className="p-4 bg-card border border-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Logs</span>
                  </div>
                  <div className="space-y-1">
                    {result.logs.map((log, index) => (
                      <div key={index} className="text-xs text-muted-foreground font-mono">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 text-muted-foreground hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
