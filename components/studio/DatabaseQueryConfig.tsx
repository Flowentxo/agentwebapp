'use client';

/**
 * DATABASE QUERY CONFIGURATION
 *
 * Configuration panel for database query nodes
 * Includes SQL editor, parameter management, testing, and caching options
 */

import { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle,
  Loader2,
  Zap,
  Clock,
  Eye,
  EyeOff,
  Link2
} from 'lucide-react';
import { ParameterMapper, WorkflowVariable, ParameterMapping } from './ParameterMapper';
import type { DatabaseConnection } from './ConnectionsManager';

export interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface DatabaseQueryData {
  queryId?: string;
  connectionId?: string;
  query?: string;
  queryType?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CUSTOM';
  parameters?: QueryParameter[];
  parameterMappings?: ParameterMapping[];
  resultFormat?: 'json' | 'csv' | 'array';
  maxRows?: number;
  timeout?: number;
  cacheEnabled?: boolean;
  cacheTtl?: number;
}

interface DatabaseQueryConfigProps {
  data: DatabaseQueryData;
  onChange: (field: string, value: any) => void;
  onTest?: () => Promise<any>;
  availableVariables?: WorkflowVariable[];
}

export function DatabaseQueryConfig({ data, onChange, onTest, availableVariables }: DatabaseQueryConfigProps) {
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [showTestResult, setShowTestResult] = useState(false);
  const [parameterTestValues, setParameterTestValues] = useState<Record<string, any>>({});
  const [showParameterMapper, setShowParameterMapper] = useState(false);

  // Database connections
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  // Initialize parameters array if not exists
  const parameters = data.parameters || [];
  const parameterMappings = data.parameterMappings || [];

  // Fetch connections on mount
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setConnectionsLoading(true);

        const response = await fetch('/api/db-connections', {
          headers: {
            'x-user-id': 'default-user'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch connections');
        }

        const data = await response.json();
        setConnections(data.connections || []);
      } catch (error) {
        console.error('Failed to load connections:', error);
      } finally {
        setConnectionsLoading(false);
      }
    };

    fetchConnections();
  }, []);

  const handleAddParameter = () => {
    const newParam: QueryParameter = {
      name: `param_${parameters.length + 1}`,
      type: 'string',
      required: false,
      description: ''
    };
    onChange('parameters', [...parameters, newParam]);
  };

  const handleUpdateParameter = (index: number, field: keyof QueryParameter, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    onChange('parameters', updated);
  };

  const handleRemoveParameter = (index: number) => {
    const updated = parameters.filter((_, i) => i !== index);
    onChange('parameters', updated);
  };

  const handleTestQuery = async () => {
    if (!onTest) return;

    setTestLoading(true);
    setTestError(null);
    setTestResult(null);

    try {
      const result = await onTest();
      setTestResult(result);
      setShowTestResult(true);
    } catch (error: any) {
      setTestError(error.message || 'Query test failed');
    } finally {
      setTestLoading(false);
    }
  };

  return (
      <div className="space-y-4">
        {/* Connection Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text">Database Connection</label>
            {connectionsLoading && (
              <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
            )}
          </div>
          <select
            value={data.connectionId || ''}
            onChange={(e) => onChange('connectionId', e.target.value)}
            disabled={connectionsLoading}
            className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))] disabled:opacity-50"
          >
            <option value="">
              {connectionsLoading ? 'Loading connections...' : 'Select connection...'}
            </option>
            {connections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({conn.type})
              </option>
            ))}
          </select>
          {!connectionsLoading && connections.length === 0 && (
            <p className="text-xs text-orange-400">
              ⚠️ No connections found. Create one in the Connections dialog.
            </p>
          )}
          {!data.connectionId && connections.length > 0 && (
            <p className="text-xs text-orange-400">⚠️ Select a database connection first</p>
          )}
        </div>

        {/* Query Type */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text">Query Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CUSTOM'] as const).map((type) => (
              <button
                key={type}
                onClick={() => onChange('queryType', type)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${data.queryType === type
                  ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]'
                  : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* SQL Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text">SQL Query</label>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Database className="h-3 w-3" />
              <span>Use {'{'} param_name {'}'} for parameters</span>
            </div>
          </div>
          <textarea
            value={data.query || ''}
            onChange={(e) => onChange('query', e.target.value)}
            rows={8}
            placeholder="SELECT * FROM users WHERE id = {{user_id}} AND status = {{status}}"
            className="w-full resize-none rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text font-mono outline-none transition focus:border-[rgb(var(--accent))]"
            spellCheck={false}
          />
          {data.query && data.query.length > 0 && (
            <p className="text-xs text-text-muted">
              {data.query.split('\n').length} lines • {data.query.length} characters
            </p>
          )}
        </div>

        {/* Parameters */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text">Query Parameters</label>
            <button
              onClick={handleAddParameter}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-surface-0 px-2 py-1 text-xs text-text transition hover:bg-card/5"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>

          {parameters.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-surface-0 p-4 text-center">
              <p className="text-xs text-text-muted">No parameters defined</p>
              <p className="mt-1 text-xs text-text-muted">Add parameters to make your query dynamic</p>
            </div>
          ) : (
            <div className="space-y-2">
              {parameters.map((param, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-white/10 bg-surface-0 p-3 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => handleUpdateParameter(index, 'name', e.target.value)}
                        placeholder="parameter_name"
                        className="rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text outline-none focus:border-[rgb(var(--accent))]"
                      />
                      <select
                        value={param.type}
                        onChange={(e) => handleUpdateParameter(index, 'type', e.target.value)}
                        className="rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text outline-none focus:border-[rgb(var(--accent))]"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="date">Date</option>
                      </select>
                    </div>
                    <button
                      onClick={() => handleRemoveParameter(index)}
                      className="rounded p-1 text-text-muted transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={param.description || ''}
                    onChange={(e) => handleUpdateParameter(index, 'description', e.target.value)}
                    placeholder="Parameter description..."
                    className="w-full rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text-muted outline-none focus:border-[rgb(var(--accent))]"
                  />

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-text">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => handleUpdateParameter(index, 'required', e.target.checked)}
                        className="rounded border-white/10"
                      />
                      Required
                    </label>
                    <input
                      type="text"
                      value={param.defaultValue || ''}
                      onChange={(e) => handleUpdateParameter(index, 'defaultValue', e.target.value)}
                      placeholder="Default value..."
                      className="flex-1 rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text-muted outline-none focus:border-[rgb(var(--accent))]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Parameter Mapping */}
        {parameters.length > 0 && availableVariables && availableVariables.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium text-text">
                <Link2 className="h-4 w-4" />
                Parameter Mapping
              </label>
              <button
                onClick={() => setShowParameterMapper(!showParameterMapper)}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-surface-0 px-2 py-1 text-xs text-text transition hover:bg-card/5"
              >
                {showParameterMapper ? 'Hide' : 'Show'} Mapper
              </button>
            </div>

            {showParameterMapper && (
              <ParameterMapper
                parameters={parameters}
                availableVariables={availableVariables}
                mappings={parameterMappings}
                onChange={(newMappings) => onChange('parameterMappings', newMappings)}
              />
            )}
          </div>
        )}

        {/* Result Format */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text">Result Format</label>
          <div className="grid grid-cols-3 gap-2">
            {(['json', 'csv', 'array'] as const).map((format) => (
              <button
                key={format}
                onClick={() => onChange('resultFormat', format)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium uppercase transition ${data.resultFormat === format
                  ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]'
                  : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                  }`}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        <div className="grid grid-cols-2 gap-3">
          {/* Max Rows */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text">Max Rows</label>
            <input
              type="number"
              value={data.maxRows || 10000}
              onChange={(e) => onChange('maxRows', parseInt(e.target.value))}
              min="1"
              max="100000"
              className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))]"
            />
          </div>

          {/* Timeout */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text">Timeout (ms)</label>
            <input
              type="number"
              value={data.timeout || 30000}
              onChange={(e) => onChange('timeout', parseInt(e.target.value))}
              min="1000"
              max="300000"
              step="1000"
              className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))]"
            />
          </div>
        </div>

        {/* Cache Configuration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text">Query Caching</label>
            <button
              onClick={() => onChange('cacheEnabled', !data.cacheEnabled)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${data.cacheEnabled
                ? 'border-green-400/50 bg-green-400/10 text-green-400'
                : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                }`}
            >
              <Zap className="h-3 w-3" />
              {data.cacheEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {data.cacheEnabled && (
            <div className="space-y-2 rounded-lg border border-green-400/20 bg-green-400/5 p-3">
              <label className="flex items-center gap-2 text-xs font-medium text-text">
                <Clock className="h-3 w-3" />
                Cache TTL (seconds)
              </label>
              <input
                type="number"
                value={data.cacheTtl || 300}
                onChange={(e) => onChange('cacheTtl', parseInt(e.target.value))}
                min="10"
                max="3600"
                step="10"
                className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))]"
              />
              <p className="text-xs text-text-muted">
                Results will be cached for {data.cacheTtl || 300} seconds ({Math.round((data.cacheTtl || 300) / 60)} minutes)
              </p>
            </div>
          )}
        </div>

        {/* Test Query Button */}
        {onTest && data.query && data.connectionId && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestQuery}
                disabled={testLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-blue-400/50 bg-blue-400/10 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-400/20 disabled:opacity-50"
              >
                {testLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Test Query
                  </>
                )}
              </button>

              {testResult && (
                <button
                  onClick={() => setShowTestResult(!showTestResult)}
                  className="rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-text-muted transition hover:bg-card/5"
                >
                  {showTestResult ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* Test Parameter Inputs */}
            {parameters.length > 0 && (
              <div className="space-y-2 rounded-lg border border-white/10 bg-surface-0 p-3">
                <p className="text-xs font-medium text-text">Test Parameters</p>
                {parameters.map((param, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-24 truncate">{param.name}:</span>
                    <input
                      type={param.type === 'number' ? 'number' : 'text'}
                      value={parameterTestValues[param.name] || param.defaultValue || ''}
                      onChange={(e) =>
                        setParameterTestValues({
                          ...parameterTestValues,
                          [param.name]: e.target.value
                        })
                      }
                      placeholder={param.defaultValue || `Enter ${param.type}...`}
                      className="flex-1 rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text outline-none focus:border-[rgb(var(--accent))]"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Test Result */}
            {testError && (
              <div className="rounded-lg border border-red-400/50 bg-red-400/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-red-400">Query Error</p>
                    <p className="mt-1 text-xs text-red-400/80">{testError}</p>
                  </div>
                </div>
              </div>
            )}

            {testResult && showTestResult && (
              <div className="rounded-lg border border-green-400/50 bg-green-400/10 p-3">
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-green-400">Query Successful</p>
                    <p className="text-xs text-green-400/80">
                      {testResult.rowCount || 0} rows • {testResult.durationMs || 0}ms
                      {testResult.fromCache && ' • Cached'}
                    </p>
                  </div>
                </div>
                <pre className="mt-2 max-h-40 overflow-auto rounded border border-white/10 bg-surface-1 p-2 text-xs text-text font-mono">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
