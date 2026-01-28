'use client';

/**
 * AGENT FACTORY UI
 *
 * Main interface for creating personalized agents.
 * Users describe what they need, and AI agents build it for them.
 */

import { useState, useRef } from 'react';
import { Sparkles, Mic, MicOff, Loader2, CheckCircle, AlertCircle, Send, Zap, Users } from 'lucide-react';

interface AgentCreationProgress {
  stage: 'analyzing' | 'designing' | 'implementing' | 'testing' | 'deploying' | 'completed';
  progress: number;
  message: string;
  details?: any;
}

export function AgentFactory() {
  const [request, setRequest] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState<AgentCreationProgress | null>(null);
  const [createdAgent, setCreatedAgent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const exampleRequests = [
    "I need an agent that monitors SAP inventory and alerts me when stock is low",
    "Create an agent that analyzes sales data and generates weekly reports",
    "Build an agent that handles customer support tickets automatically",
    "I want an agent that creates invoices from email orders"
  ];

  const handleCreate = async () => {
    if (!request.trim()) return;

    setIsCreating(true);
    setError(null);
    setProgress(null);
    setCreatedAgent(null);

    try {
      const response = await fetch('/api/agent-factory/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user'
        },
        body: JSON.stringify({ request })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Agent creation failed');
      }

      const result = await response.json();

      if (result.agent) {
        setCreatedAgent(result.agent);
        setProgress({
          stage: 'completed',
          progress: 100,
          message: `✅ ${result.agent.name || 'Agent'} is ready!`
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setRequest(example);
    inputRef.current?.focus();
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'analyzing':
        return <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />;
      case 'designing':
        return <Zap className="h-5 w-5 text-purple-400 animate-pulse" />;
      case 'implementing':
        return <Loader2 className="h-5 w-5 text-green-400 animate-spin" />;
      case 'deploying':
        return <Loader2 className="h-5 w-5 text-orange-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
          Agent Factory
        </h1>
        <p className="text-text-muted">
          Describe what you need. AI agents will build a personalized agent for you.
        </p>
      </div>

      {/* Main Input */}
      <div className="relative mb-6">
        <div
          className="relative overflow-hidden rounded-3xl border transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.03) 100%)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div className="p-6">
            <textarea
              ref={inputRef}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleCreate();
                }
              }}
              placeholder="Describe your agent... (e.g., 'I need an agent that monitors inventory and creates purchase orders automatically')"
              className="w-full bg-transparent text-text placeholder-text-muted outline-none resize-none"
              rows={4}
              disabled={isCreating}
            />
          </div>

          <div className="border-t border-white/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Sparkles className="h-3 w-3" />
              <span>CREATOR, CODER & SAP agents will collaborate</span>
            </div>

            <button
              onClick={handleCreate}
              disabled={!request.trim() || isCreating}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
              }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Create Agent
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Display */}
      {progress && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-card/5 p-6">
          <div className="flex items-center gap-4 mb-4">
            {getStageIcon(progress.stage)}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-text">{progress.message}</span>
                <span className="text-xs text-text-muted">{progress.progress}%</span>
              </div>
              <div className="h-2 bg-card/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          </div>

          {progress.details && (
            <div className="mt-4 p-4 rounded-lg bg-card/5 border border-white/10">
              <pre className="text-xs text-text-muted overflow-auto">
                {JSON.stringify(progress.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Created Agent Display */}
      {createdAgent && (
        <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-400 mb-2">
                ✅ Agent Created Successfully!
              </h3>
              <p className="text-text-muted mb-4">
                Your personalized agent is ready to work.
              </p>
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-card/5">
                <div>
                  <div className="text-xs text-text-muted mb-1">Agent ID</div>
                  <div className="text-sm font-mono text-text">{createdAgent.id}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-1">Status</div>
                  <div className="text-sm font-bold text-green-400">{createdAgent.status}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-400 mb-2">Creation Failed</h3>
              <p className="text-text-muted">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Examples */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-text-muted">Example Requests</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exampleRequests.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              className="text-left p-4 rounded-xl border border-white/10 bg-card/5 hover:bg-card/10 transition-colors text-sm text-text-muted hover:text-text"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-white/10 bg-card/5 p-6">
        <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-400" />
          How It Works
        </h3>
        <div className="space-y-3 text-sm text-text-muted">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-blue-400">1</span>
            </div>
            <div>
              <strong className="text-text">CREATOR Agent</strong> analyzes your requirements and designs the perfect agent blueprint
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-purple-400">2</span>
            </div>
            <div>
              <strong className="text-text">CODER Agent</strong> implements the agent logic and integrations
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-green-400">3</span>
            </div>
            <div>
              <strong className="text-text">SAP Agent</strong> sets up enterprise connections if needed
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-orange-400">4</span>
            </div>
            <div>
              Your personalized agent is deployed and ready to work!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
