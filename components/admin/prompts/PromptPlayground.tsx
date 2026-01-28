/**
 * PROMPT PLAYGROUND COMPONENT
 *
 * Phase 4.1 - Interactive playground for testing prompts.
 *
 * Features:
 * - Provider/Model selection
 * - Temperature adjustment
 * - Real-time testing
 * - Token usage and cost display
 */

'use client';

import { useState, useRef } from 'react';
import {
  Play,
  RefreshCw,
  Zap,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Settings,
  Send,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface PromptPlaygroundProps {
  promptVersionId?: string;
  systemPrompt: string;
}

interface TestResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  responseTimeMs: number;
  estimatedCost: string;
  model: string;
  provider: string;
  temperature: number;
}

// ============================================================================
// PROVIDER MODELS CONFIG
// ============================================================================

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    color: 'emerald',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Neuestes Flaggschiff' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Schnell & günstig' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '128K Kontext' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Klassiker' },
    ],
  },
  anthropic: {
    name: 'Anthropic',
    color: 'orange',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Beste Balance' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Neueste Version' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Maximum Power' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Blitzschnell' },
    ],
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function PromptPlayground({
  promptVersionId,
  systemPrompt,
}: PromptPlaygroundProps) {
  // State
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(70);
  const [userMessage, setUserMessage] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // ────────────────────────────────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────────────────────────────────

  const handleProviderChange = (newProvider: 'openai' | 'anthropic') => {
    setProvider(newProvider);
    // Set default model for provider
    setModel(PROVIDERS[newProvider].models[0].id);
  };

  const handleRunTest = async () => {
    if (!userMessage.trim() || !systemPrompt.trim()) {
      setError('Bitte gib eine User-Nachricht ein');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      abortControllerRef.current = new AbortController();

      const res = await fetch('/api/admin/prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptVersionId,
          systemPrompt,
          userMessage,
          model,
          provider,
          temperature,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Test fehlgeschlagen');
      }

      setResult(data.data);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Ein Fehler ist aufgetreten');
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
  };

  const providerConfig = PROVIDERS[provider];

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Playground</h3>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded-lg transition-colors ${
            showSettings
              ? 'bg-card/10 text-white'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="space-y-3 mb-4 p-3 bg-card/5 rounded-lg border border-white/10">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">
              Provider
            </label>
            <div className="flex gap-2">
              {Object.entries(PROVIDERS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleProviderChange(key as 'openai' | 'anthropic')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    provider === key
                      ? `bg-${config.color}-500/20 border-${config.color}-500/30 text-${config.color}-400`
                      : 'bg-card/5 border-white/10 text-white/50 hover:border-white/20'
                  }`}
                >
                  {config.name}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">
              Modell
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-1.5 bg-card/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
            >
              {providerConfig.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} - {m.description}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-white/50">
                Temperatur
              </label>
              <span className="text-xs text-white/70">{temperature / 100}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full h-1.5 bg-card/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>Präzise</span>
              <span>Kreativ</span>
            </div>
          </div>
        </div>
      )}

      {/* User Message Input */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-white/50 mb-1.5">
          Test-Nachricht
        </label>
        <div className="relative">
          <textarea
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder="Gib eine Test-Nachricht ein..."
            className="w-full h-20 px-3 py-2 pr-10 bg-card/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={isRunning ? handleStop : handleRunTest}
            disabled={!userMessage.trim() && !isRunning}
            className={`absolute right-2 bottom-2 p-1.5 rounded-lg transition-colors ${
              isRunning
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 mb-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2 bg-card/5 rounded-lg text-center">
              <Zap className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-white">{result.totalTokens}</p>
              <p className="text-xs text-white/40">Tokens</p>
            </div>
            <div className="p-2 bg-card/5 rounded-lg text-center">
              <Clock className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-white">{result.responseTimeMs}ms</p>
              <p className="text-xs text-white/40">Latenz</p>
            </div>
            <div className="p-2 bg-card/5 rounded-lg text-center">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-white">${result.estimatedCost}</p>
              <p className="text-xs text-white/40">Kosten</p>
            </div>
          </div>

          {/* Response Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-white">Antwort</span>
            </div>
            <div className="p-3 bg-black/30 border border-white/10 rounded-lg">
              <p className="text-sm text-white/80 whitespace-pre-wrap">
                {result.content}
              </p>
            </div>
          </div>

          {/* Token Breakdown */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 text-xs text-white/40">
            <span>Prompt: {result.promptTokens} tokens</span>
            <span>Completion: {result.completionTokens} tokens</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !error && !isRunning && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white/30">
            <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Gib eine Nachricht ein</p>
            <p className="text-xs">und starte den Test</p>
          </div>
        </div>
      )}
    </div>
  );
}
