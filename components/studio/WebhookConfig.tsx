'use client';

/**
 * WEBHOOK CONFIGURATION
 *
 * Configuration panel for webhook/HTTP request nodes
 * Includes URL, method, headers, payload, auth, retry logic, and testing
 */

import { useState } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle,
  Loader2,
  Lock,
  RotateCw,
  Clock,
  Eye,
  EyeOff,
  Code,
  Globe,
  Link2
} from 'lucide-react';
import { ParameterMapper, WorkflowVariable, ParameterMapping } from './ParameterMapper';

export interface WebhookHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface WebhookData {
  webhookId?: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: WebhookHeader[];
  payloadTemplate?: string;
  payloadType?: 'json' | 'form' | 'raw';
  payloadMappings?: ParameterMapping[];
  authType?: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2';
  authConfig?: {
    token?: string;
    username?: string;
    password?: string;
    apiKeyHeader?: string;
    apiKeyValue?: string;
  };
  retryEnabled?: boolean;
  retryConfig?: {
    maxRetries?: number;
    backoff?: 'linear' | 'exponential';
    initialDelay?: number;
  };
  timeout?: number;
  expectedStatus?: number[];
}

interface WebhookConfigProps {
  data: WebhookData;
  onChange: (field: string, value: any) => void;
  onTest?: () => Promise<any>;
  availableVariables?: WorkflowVariable[];
}

export function WebhookConfig({ data, onChange, onTest, availableVariables }: WebhookConfigProps) {
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showTestResult, setShowTestResult] = useState(false);
  const [showAuthDetails, setShowAuthDetails] = useState(false);
  const [showPayloadMapper, setShowPayloadMapper] = useState(false);

  const headers = data.headers || [];
  const payloadMappings = data.payloadMappings || [];
  const authConfig = data.authConfig || {};
  const retryConfig = data.retryConfig || { maxRetries: 3, backoff: 'exponential', initialDelay: 1000 };
  const expectedStatus = data.expectedStatus || [200, 201, 204];

  const handleAddHeader = () => {
    const newHeader: WebhookHeader = {
      key: '',
      value: '',
      enabled: true
    };
    onChange('headers', [...headers, newHeader]);
  };

  const handleUpdateHeader = (index: number, field: keyof WebhookHeader, value: any) => {
    const updated = [...headers];
    updated[index] = { ...updated[index], [field]: value };
    onChange('headers', updated);
  };

  const handleRemoveHeader = (index: number) => {
    const updated = headers.filter((_, i) => i !== index);
    onChange('headers', updated);
  };

  const handleAuthConfigChange = (field: string, value: any) => {
    onChange('authConfig', { ...authConfig, [field]: value });
  };

  const handleRetryConfigChange = (field: string, value: any) => {
    onChange('retryConfig', { ...retryConfig, [field]: value });
  };

  const handleTestWebhook = async () => {
    if (!data.url || !data.method) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/execute-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: data.url,
          method: data.method,
          headers: data.headers,
          payload: (data as any).payload, // Cast to any to allow data.payload
          auth: (data as any).auth // Cast to any to allow data.auth
        })
      });

      const result = await response.json();
      setTestResult(result);

      if (onTest) {
        onTest(result);
      }
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        statusCode: 0,
        durationMs: 0,
        retryCount: 0,
        data: { error: 'Failed to execute webhook' }
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text">Webhook URL</label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="url"
            value={data.url || ''}
            onChange={(e) => onChange('url', e.target.value)}
            placeholder="https://api.example.com/webhook"
            className="w-full rounded-lg border border-white/10 bg-surface-0 pl-10 pr-3 py-2 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))]"
          />
        </div>
        {!data.url && (
          <p className="text-xs text-orange-400">⚠️ Enter a webhook URL</p>
        )}
      </div>

      {/* HTTP Method */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text">HTTP Method</label>
        <div className="grid grid-cols-4 gap-2">
          {(['GET', 'POST', 'PUT', 'DELETE'] as const).map((method) => (
            <button
              key={method}
              onClick={() => onChange('method', method)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${data.method === method
                  ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]'
                  : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                }`}
            >
              {method}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['PATCH', 'HEAD', 'OPTIONS'] as const).map((method) => (
            <button
              key={method}
              onClick={() => onChange('method', method)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${data.method === method
                  ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]'
                  : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Headers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text">HTTP Headers</label>
          <button
            onClick={handleAddHeader}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-surface-0 px-2 py-1 text-xs text-text transition hover:bg-card/5"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        {headers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-surface-0 p-4 text-center">
            <p className="text-xs text-text-muted">No custom headers</p>
            <p className="mt-1 text-xs text-text-muted">Content-Type will be set automatically</p>
          </div>
        ) : (
          <div className="space-y-2">
            {headers.map((header, index) => (
              <div
                key={index}
                className="rounded-lg border border-white/10 bg-surface-0 p-3 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => handleUpdateHeader(index, 'key', e.target.value)}
                      placeholder="Header-Name"
                      className="rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text outline-none focus:border-[rgb(var(--accent))]"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => handleUpdateHeader(index, 'value', e.target.value)}
                      placeholder="Header value or {{variable}}"
                      className="rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text outline-none focus:border-[rgb(var(--accent))]"
                    />
                  </div>
                  <label className="flex items-center gap-1 text-xs text-text-muted">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={(e) => handleUpdateHeader(index, 'enabled', e.target.checked)}
                      className="rounded border-white/10"
                    />
                  </label>
                  <button
                    onClick={() => handleRemoveHeader(index)}
                    className="rounded p-1 text-text-muted transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payload Configuration */}
      {(data.method === 'POST' || data.method === 'PUT' || data.method === 'PATCH') && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-text">Payload Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['json', 'form', 'raw'] as const).map((type) => (
              <button
                key={type}
                onClick={() => onChange('payloadType', type)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium uppercase transition ${data.payloadType === type
                    ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]'
                    : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text">Payload Template</label>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Code className="h-3 w-3" />
                <span>Use {`{{variable_name}}`} for dynamic data</span>
              </div>
            </div>
            <textarea
              value={data.payloadTemplate || ''}
              onChange={(e) => onChange('payloadTemplate', e.target.value)}
              rows={6}
              placeholder={
                data.payloadType === 'json'
                  ? '{\n  "userId": "{{user_id}}",\n  "action": "{{action}}"\n}'
                  : data.payloadType === 'form'
                    ? 'userId={{user_id}}&action={{action}}'
                    : 'Raw payload content'
              }
              className="w-full resize-none rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text font-mono outline-none transition focus:border-[rgb(var(--accent))]"
              spellCheck={false}
            />
          </div>

          {/* Payload Parameter Mapping */}
          {data.payloadTemplate && availableVariables && availableVariables.length > 0 && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium text-text">
                  <Link2 className="h-4 w-4" />
                  Payload Variable Mapping
                </label>
                <button
                  onClick={() => setShowPayloadMapper(!showPayloadMapper)}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-surface-0 px-2 py-1 text-xs text-text transition hover:bg-card/5"
                >
                  {showPayloadMapper ? 'Hide' : 'Show'} Mapper
                </button>
              </div>

              {showPayloadMapper && (
                <ParameterMapper
                  parameters={[
                    { name: 'payload', type: 'object', required: true }
                  ]}
                  availableVariables={availableVariables}
                  mappings={payloadMappings}
                  onChange={(newMappings) => onChange('payloadMappings', newMappings)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Authentication */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text">Authentication</label>
          <button
            onClick={() => setShowAuthDetails(!showAuthDetails)}
            className="text-xs text-text-muted hover:text-text transition"
          >
            {showAuthDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['none', 'bearer', 'basic', 'apikey'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onChange('authType', type)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${data.authType === type
                  ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]'
                  : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                }`}
            >
              {type === 'none' ? 'None' : type === 'bearer' ? 'Bearer Token' : type === 'basic' ? 'Basic Auth' : 'API Key'}
            </button>
          ))}
        </div>

        {showAuthDetails && data.authType !== 'none' && (
          <div className="space-y-2 rounded-lg border border-purple-400/20 bg-purple-400/5 p-3">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Lock className="h-3 w-3" />
              <span className="text-xs font-medium">Credentials</span>
            </div>

            {data.authType === 'bearer' && (
              <input
                type="password"
                value={authConfig.token || ''}
                onChange={(e) => handleAuthConfigChange('token', e.target.value)}
                placeholder="Bearer token..."
                className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none focus:border-[rgb(var(--accent))]"
              />
            )}

            {data.authType === 'basic' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={authConfig.username || ''}
                  onChange={(e) => handleAuthConfigChange('username', e.target.value)}
                  placeholder="Username"
                  className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none focus:border-[rgb(var(--accent))]"
                />
                <input
                  type="password"
                  value={authConfig.password || ''}
                  onChange={(e) => handleAuthConfigChange('password', e.target.value)}
                  placeholder="Password"
                  className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none focus:border-[rgb(var(--accent))]"
                />
              </div>
            )}

            {data.authType === 'apikey' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={authConfig.apiKeyHeader || ''}
                  onChange={(e) => handleAuthConfigChange('apiKeyHeader', e.target.value)}
                  placeholder="Header name (e.g., X-API-Key)"
                  className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none focus:border-[rgb(var(--accent))]"
                />
                <input
                  type="password"
                  value={authConfig.apiKeyValue || ''}
                  onChange={(e) => handleAuthConfigChange('apiKeyValue', e.target.value)}
                  placeholder="API Key value"
                  className="w-full rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none focus:border-[rgb(var(--accent))]"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Retry Configuration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text">Retry Logic</label>
          <button
            onClick={() => onChange('retryEnabled', !data.retryEnabled)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${data.retryEnabled
                ? 'border-green-400/50 bg-green-400/10 text-green-400'
                : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
              }`}
          >
            <RotateCw className="h-3 w-3" />
            {data.retryEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {data.retryEnabled && (
          <div className="space-y-3 rounded-lg border border-green-400/20 bg-green-400/5 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Max Retries</label>
                <input
                  type="number"
                  value={retryConfig.maxRetries}
                  onChange={(e) => handleRetryConfigChange('maxRetries', parseInt(e.target.value))}
                  min="1"
                  max="10"
                  className="w-full rounded border border-white/10 bg-surface-0 px-2 py-1 text-sm text-text outline-none focus:border-[rgb(var(--accent))]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Initial Delay (ms)</label>
                <input
                  type="number"
                  value={retryConfig.initialDelay}
                  onChange={(e) => handleRetryConfigChange('initialDelay', parseInt(e.target.value))}
                  min="100"
                  max="10000"
                  step="100"
                  className="w-full rounded border border-white/10 bg-surface-0 px-2 py-1 text-sm text-text outline-none focus:border-[rgb(var(--accent))]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['linear', 'exponential'] as const).map((backoff) => (
                <button
                  key={backoff}
                  onClick={() => handleRetryConfigChange('backoff', backoff)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${retryConfig.backoff === backoff
                      ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/20 text-[rgb(var(--accent))]'
                      : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                    }`}
                >
                  {backoff}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeout */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-medium text-text">
          <Clock className="h-3 w-3" />
          Request Timeout (ms)
        </label>
        <input
          type="number"
          value={data.timeout || 10000}
          onChange={(e) => onChange('timeout', parseInt(e.target.value))}
          min="1000"
          max="300000"
          step="1000"
          className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))]"
        />
      </div>

      {/* Test Webhook Button */}
      {onTest && data.url && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestWebhook}
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
                  Test Webhook
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

          {/* Test Error */}
          {testError && (
            <div className="rounded-lg border border-red-400/50 bg-red-400/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-400">Webhook Error</p>
                  <p className="mt-1 text-xs text-red-400/80">{testError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult && showTestResult && (
            <div className="rounded-lg border border-green-400/50 bg-green-400/10 p-3">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-green-400">Webhook Successful</p>
                  <p className="text-xs text-green-400/80">
                    Status {testResult.statusCode || 200} • {testResult.durationMs || 0}ms
                    {testResult.retryCount > 0 && ` • ${testResult.retryCount} retries`}
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
