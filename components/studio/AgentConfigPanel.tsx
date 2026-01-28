'use client';

import { useState } from 'react';
import {
  Bot,
  Brain,
  Code,
  Globe,
  Image as ImageIcon,
  Database,
  Zap,
  MessageSquare,
  Settings,
  Palette,
} from 'lucide-react';
import { AgentConfig } from './AgentStudio';

interface AgentConfigPanelProps {
  config: AgentConfig;
  onChange: (updates: Partial<AgentConfig>) => void;
}

export function AgentConfigPanel({ config, onChange }: AgentConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'instructions' | 'capabilities' | 'advanced'>('basic');

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Bot },
    { id: 'instructions', label: 'Instructions', icon: MessageSquare },
    { id: 'capabilities', label: 'Capabilities', icon: Zap },
    { id: 'advanced', label: 'Advanced', icon: Settings },
  ] as const;

  const models = [
    { value: 'gpt-5.1', label: 'GPT-5.1 (Latest)', description: 'Most capable, higher cost' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast and efficient' },
    { value: 'gpt-4', label: 'GPT-4', description: 'Previous generation' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4.5', description: 'Anthropic model' },
  ];

  const fallbackChains = [
    { value: 'standard', label: 'Standard', description: 'Balanced reliability' },
    { value: 'fast', label: 'Fast', description: 'Quick responses' },
    { value: 'premium', label: 'Premium', description: 'Best quality' },
    { value: 'economical', label: 'Economical', description: 'Cost-optimized' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="border-b bg-card">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Basic Information</h2>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Agent Name *</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                placeholder="My Custom Agent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={config.description}
                onChange={(e) => onChange({ description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background resize-none"
                rows={3}
                placeholder="Describe what this agent does..."
              />
            </div>

            {/* Icon & Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Icon</label>
                <input
                  type="text"
                  value={config.icon}
                  onChange={(e) => onChange({ icon: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-2xl text-center"
                  placeholder="🤖"
                  maxLength={2}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Emoji or Unicode character
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.color}
                    onChange={(e) => onChange({ color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.color}
                    onChange={(e) => onChange({ color: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg bg-background font-mono text-sm"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>

            {/* Conversation Starters */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Conversation Starters (Optional)
              </label>
              <div className="space-y-2">
                {config.conversationStarters.map((starter, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={starter}
                      onChange={(e) => {
                        const newStarters = [...config.conversationStarters];
                        newStarters[index] = e.target.value;
                        onChange({ conversationStarters: newStarters });
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg bg-background"
                      placeholder="Example: Analyze my data"
                    />
                    <button
                      onClick={() => {
                        const newStarters = config.conversationStarters.filter(
                          (_, i) => i !== index
                        );
                        onChange({ conversationStarters: newStarters });
                      }}
                      className="px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {config.conversationStarters.length < 5 && (
                  <button
                    onClick={() => {
                      onChange({
                        conversationStarters: [...config.conversationStarters, ''],
                      });
                    }}
                    className="w-full px-3 py-2 border border-dashed rounded-lg text-sm text-muted-foreground hover:bg-muted"
                  >
                    + Add Conversation Starter
                  </button>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <input
                type="text"
                value={config.tags.join(', ')}
                onChange={(e) =>
                  onChange({
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter((t) => t),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg bg-background"
                placeholder="analytics, data, customer-support"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated tags
              </p>
            </div>
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">System Instructions</h2>

            <div>
              <label className="block text-sm font-medium mb-2">
                Instructions *
              </label>
              <textarea
                value={config.systemInstructions}
                onChange={(e) => onChange({ systemInstructions: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background resize-none font-mono text-sm"
                rows={20}
                placeholder="You are a helpful AI assistant. Your role is to..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Define how the agent should behave and respond
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">AI Model</label>
              <div className="space-y-2">
                {models.map((model) => (
                  <label
                    key={model.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      config.model === model.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="model"
                      value={model.value}
                      checked={config.model === model.value}
                      onChange={(e) => onChange({ model: e.target.value })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{model.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {model.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'capabilities' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Agent Capabilities</h2>

            <p className="text-sm text-muted-foreground">
              Enable special capabilities for your agent
            </p>

            <div className="space-y-3">
              {/* Web Browsing */}
              <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <input
                  type="checkbox"
                  checked={config.capabilities.webBrowsing}
                  onChange={(e) =>
                    onChange({
                      capabilities: {
                        ...config.capabilities,
                        webBrowsing: e.target.checked,
                      },
                    })
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Globe className="h-4 w-4" />
                    Web Browsing
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Search the web for real-time information
                  </div>
                </div>
              </label>

              {/* Code Interpreter */}
              <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <input
                  type="checkbox"
                  checked={config.capabilities.codeInterpreter}
                  onChange={(e) =>
                    onChange({
                      capabilities: {
                        ...config.capabilities,
                        codeInterpreter: e.target.checked,
                      },
                    })
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Code className="h-4 w-4" />
                    Code Interpreter
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Run Python code and analyze data
                  </div>
                </div>
              </label>

              {/* Image Generation */}
              <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <input
                  type="checkbox"
                  checked={config.capabilities.imageGeneration}
                  onChange={(e) =>
                    onChange({
                      capabilities: {
                        ...config.capabilities,
                        imageGeneration: e.target.checked,
                      },
                    })
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <ImageIcon className="h-4 w-4" />
                    Image Generation
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Create images with DALL-E
                  </div>
                </div>
              </label>

              {/* Knowledge Base */}
              <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <input
                  type="checkbox"
                  checked={config.capabilities.knowledgeBase}
                  onChange={(e) =>
                    onChange({
                      capabilities: {
                        ...config.capabilities,
                        knowledgeBase: e.target.checked,
                      },
                    })
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Database className="h-4 w-4" />
                    Knowledge Base
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Upload files and documents to search
                  </div>
                </div>
              </label>

              {/* Custom Actions */}
              <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <input
                  type="checkbox"
                  checked={config.capabilities.customActions}
                  onChange={(e) =>
                    onChange({
                      capabilities: {
                        ...config.capabilities,
                        customActions: e.target.checked,
                      },
                    })
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Zap className="h-4 w-4" />
                    Custom Actions
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Connect to external APIs and services
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Advanced Settings</h2>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Temperature: {config.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) =>
                  onChange({ temperature: parseFloat(e.target.value) })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Precise (0)</span>
                <span>Balanced (1)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Tokens: {config.maxTokens}
              </label>
              <input
                type="range"
                min="256"
                max="8000"
                step="256"
                value={config.maxTokens}
                onChange={(e) =>
                  onChange({ maxTokens: parseInt(e.target.value) })
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum response length
              </p>
            </div>

            {/* Fallback Chain */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Fallback Strategy
              </label>
              <div className="space-y-2">
                {fallbackChains.map((chain) => (
                  <label
                    key={chain.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      config.fallbackChain === chain.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fallbackChain"
                      value={chain.value}
                      checked={config.fallbackChain === chain.value}
                      onChange={(e) =>
                        onChange({ fallbackChain: e.target.value })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{chain.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {chain.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium mb-2">Visibility</label>
              <select
                value={config.visibility}
                onChange={(e) =>
                  onChange({ visibility: e.target.value as any })
                }
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                <option value="private">Private - Only you</option>
                <option value="team">Team - Your workspace</option>
                <option value="public">Public - Anyone with link</option>
                <option value="listed">Listed - In marketplace</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
