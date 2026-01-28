'use client';

/**
 * AGENT BUILDER
 *
 * OpenAI GPT Builder style interface with split view:
 * - Left: Configuration Panel
 * - Right: Live Preview/Test Panel
 */

import { useState } from 'react';
import { Bot, Sparkles, Save, Eye, Settings, Upload, Zap } from 'lucide-react';
import { AgentConfigPanel } from './AgentConfigPanel';
import { AgentPreviewPanel } from './AgentPreviewPanel';
import { KnowledgeBasePanel } from './KnowledgeBasePanel';
import { ActionsPanel } from './ActionsPanel';

export interface AgentConfig {
  // Basic Info
  name: string;
  description: string;
  icon: string;
  color: string;

  // Instructions
  systemInstructions: string;

  // Model Settings
  model: string;
  temperature: number;
  maxTokens: number;

  // Features
  conversationStarters: string[];
  capabilities: {
    webBrowsing: boolean;
    codeInterpreter: boolean;
    imageGeneration: boolean;
    knowledgeBase: boolean;
    customActions: boolean;
  };

  // Advanced
  fallbackChain: string;
  responseFormat: string;
}

const DEFAULT_CONFIG: AgentConfig = {
  name: '',
  description: '',
  icon: '🤖',
  color: '#3B82F6',
  systemInstructions: '',
  model: 'gpt-5.1',
  temperature: 0.7,
  maxTokens: 4000,
  conversationStarters: [],
  capabilities: {
    webBrowsing: false,
    codeInterpreter: false,
    imageGeneration: false,
    knowledgeBase: false,
    customActions: false,
  },
  fallbackChain: 'standard',
  responseFormat: 'text',
};

interface AgentBuilderProps {
  initialConfig?: AgentConfig;
  agentId?: string;
  mode?: 'create' | 'edit';
}

export function AgentBuilder({ initialConfig, agentId, mode = 'create' }: AgentBuilderProps = {}) {
  const [config, setConfig] = useState<AgentConfig>(initialConfig || DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAgentId, setSavedAgentId] = useState<string | null>(agentId || null);
  const [activeTab, setActiveTab] = useState<'configure' | 'knowledge' | 'actions'>('configure');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Validate required fields
      if (!config.name.trim()) {
        throw new Error('Agent name is required');
      }

      if (!config.systemInstructions.trim()) {
        throw new Error('System instructions are required');
      }

      const url = mode === 'edit' && savedAgentId
        ? `/api/agents/custom?id=${savedAgentId}`
        : '/api/agents/custom';

      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save agent');
      }

      const result = await response.json();
      console.log('Agent saved:', result);

      // Store agent ID for knowledge base uploads
      if (result.data?.id) {
        setSavedAgentId(result.data.id);
      }

      // Show success message
      setSaveMessage({
        type: 'success',
        text: mode === 'edit'
          ? `✅ ${config.name} has been updated successfully!`
          : `✅ ${config.name} has been created successfully!`,
      });

      // Auto-hide after 5 seconds
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error: any) {
      console.error('Save failed:', error);
      setSaveMessage({
        type: 'error',
        text: `❌ ${error.message || 'Failed to save agent'}`,
      });

      // Auto-hide after 5 seconds
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (updates: Partial<AgentConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="flex h-full bg-background">
      {/* Success/Error Toast */}
      {saveMessage && (
        <div className="fixed top-20 right-6 z-50 animate-slide-down">
          <div
            className={`rounded-lg border px-4 py-3 shadow-lg ${
              saveMessage.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            <p className="text-sm font-medium">{saveMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text">
                {config.name || 'New Agent'}
              </h1>
              <p className="text-xs text-text-muted">Custom Agent Builder</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving || !config.name.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {mode === 'edit' ? 'Update Agent' : 'Save & Publish'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex flex-1 pt-16">
        {/* Left Panel - Configuration */}
        <div className="w-1/2 border-r border-border overflow-y-auto">
          <div className="p-6">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b border-border">
              <button
                onClick={() => setActiveTab('configure')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'configure'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                <Settings className="h-4 w-4" />
                Configure
              </button>
              <button
                onClick={() => setActiveTab('knowledge')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'knowledge'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                <Upload className="h-4 w-4" />
                Knowledge
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'actions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                <Zap className="h-4 w-4" />
                Actions
              </button>
            </div>

            {/* Configuration Content */}
            {activeTab === 'configure' && (
              <AgentConfigPanel config={config} onUpdate={updateConfig} />
            )}

            {activeTab === 'knowledge' && (
              <KnowledgeBasePanel agentId={savedAgentId || undefined} />
            )}

            {activeTab === 'actions' && (
              <ActionsPanel agentId={savedAgentId || undefined} />
            )}
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="w-1/2 bg-surface">
          <div className="h-full flex flex-col">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-text">Live Preview</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Test your agent in real-time
              </p>
            </div>

            <AgentPreviewPanel config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}
