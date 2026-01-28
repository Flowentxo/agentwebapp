'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AgentConfigPanel } from './AgentConfigPanel';
import { AgentPreviewPanel } from './AgentPreviewPanel';
import { Save, Eye, Settings, Sparkles } from 'lucide-react';

export interface AgentConfig {
  id?: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  systemInstructions: string;
  model: string;
  temperature: number;
  maxTokens: number;
  conversationStarters: string[];
  capabilities: {
    webBrowsing: boolean;
    codeInterpreter: boolean;
    imageGeneration: boolean;
    knowledgeBase: boolean;
    customActions: boolean;
  };
  fallbackChain: string;
  visibility: 'private' | 'team' | 'public' | 'listed';
  status: 'draft' | 'active' | 'archived';
  tags: string[];
}

interface AgentStudioProps {
  agentId?: string;
  initialData?: Partial<AgentConfig>;
}

const DEFAULT_CONFIG: AgentConfig = {
  name: 'My Custom Agent',
  description: '',
  icon: '🤖',
  color: '#3B82F6',
  systemInstructions: 'You are a helpful AI assistant.',
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
  visibility: 'private',
  status: 'draft',
  tags: [],
};

export function AgentStudio({ agentId, initialData }: AgentStudioProps) {
  const router = useRouter();
  const [config, setConfig] = useState<AgentConfig>({
    ...DEFAULT_CONFIG,
    ...initialData,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing agent if editing
  useEffect(() => {
    if (agentId && !initialData) {
      loadAgent(agentId);
    }
  }, [agentId]);

  const loadAgent = async (id: string) => {
    try {
      const response = await fetch(`/api/agents/custom?id=${id}`);
      const result = await response.json();

      if (result.success) {
        setConfig({
          ...result.data,
          temperature: parseFloat(result.data.temperature),
          maxTokens: parseInt(result.data.maxTokens),
        });
      }
    } catch (error) {
      console.error('Failed to load agent:', error);
    }
  };

  const handleConfigChange = (updates: Partial<AgentConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const url = agentId
        ? `/api/agents/custom?id=${agentId}`
        : '/api/agents/custom';

      const method = agentId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        setHasUnsavedChanges(false);

        // If creating new agent, redirect to edit page
        if (!agentId && result.data?.id) {
          router.push(`/agents/studio/${result.data.id}`);
        }

        console.log('Agent saved successfully');
      } else {
        console.error('Failed to save agent:', result.error);
      }
    } catch (error) {
      console.error('Failed to save agent:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    await handleConfigChange({ status: 'active' });
    await handleSave();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: config.color }}
            >
              {config.icon}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{config.name}</h1>
              <p className="text-sm text-muted-foreground">
                {agentId ? 'Edit Agent' : 'Create New Agent'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 rounded-lg border hover:bg-muted flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                hasUnsavedChanges
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            {config.status === 'draft' && (
              <button
                onClick={handlePublish}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Publish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Configuration Panel */}
        <div className={showPreview ? 'w-1/2 border-r' : 'w-full'}>
          <AgentConfigPanel config={config} onChange={handleConfigChange} />
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2">
            <AgentPreviewPanel config={config} />
          </div>
        )}
      </div>
    </div>
  );
}
