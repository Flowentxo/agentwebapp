'use client';

/**
 * AGENT CONFIGURATION PANEL
 *
 * Form for configuring agent properties:
 * - Basic Info (Name, Description, Icon)
 * - Instructions (System Prompt)
 * - Model Settings
 * - Conversation Starters
 * - Capabilities
 */

import { useState } from 'react';
import { Bot, Sparkles, ChevronDown, Info, Plus, X } from 'lucide-react';
import type { AgentConfig } from './AgentBuilder';

interface AgentConfigPanelProps {
  config: AgentConfig;
  onUpdate: (updates: Partial<AgentConfig>) => void;
}

const AVAILABLE_MODELS = [
  { id: 'gpt-5.1', name: 'GPT-5.1 (Latest)', description: 'Most capable model' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Fast and efficient' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Cost-effective' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Anthropic' },
];

const EMOJI_SUGGESTIONS = ['🤖', '💼', '📊', '🎯', '💡', '🚀', '⚡', '🔧', '📈', '🎨', '🔬', '📝'];

export function AgentConfigPanel({ config, onUpdate }: AgentConfigPanelProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const addConversationStarter = () => {
    onUpdate({
      conversationStarters: [...config.conversationStarters, ''],
    });
  };

  const updateConversationStarter = (index: number, value: string) => {
    const updated = [...config.conversationStarters];
    updated[index] = value;
    onUpdate({ conversationStarters: updated });
  };

  const removeConversationStarter = (index: number) => {
    const updated = config.conversationStarters.filter((_, i) => i !== index);
    onUpdate({ conversationStarters: updated });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <section>
        <h2 className="text-lg font-semibold text-text mb-4">Basic Information</h2>

        {/* Icon Picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-2">
            Icon
          </label>
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-16 h-16 rounded-xl border-2 border-border bg-surface hover:bg-surface/80 transition-colors flex items-center justify-center text-3xl"
            >
              {config.icon}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full mt-2 left-0 z-10 p-3 rounded-lg border border-border bg-surface shadow-lg grid grid-cols-6 gap-2">
                {EMOJI_SUGGESTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onUpdate({ icon: emoji });
                      setShowEmojiPicker(false);
                    }}
                    className="w-10 h-10 rounded-lg hover:bg-background transition-colors text-2xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-2">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="e.g., Customer Support Pro"
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-text placeholder-text-muted outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-2">
            Description
          </label>
          <textarea
            value={config.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Brief description of what this agent does..."
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-text placeholder-text-muted outline-none focus:border-primary transition-colors resize-none"
          />
        </div>
      </section>

      {/* Instructions */}
      <section>
        <h2 className="text-lg font-semibold text-text mb-2">Instructions</h2>
        <p className="text-sm text-text-muted mb-4">
          Define how your agent behaves and responds
        </p>
        <textarea
          value={config.systemInstructions}
          onChange={(e) => onUpdate({ systemInstructions: e.target.value })}
          placeholder="You are a helpful assistant that..."
          rows={8}
          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text placeholder-text-muted outline-none focus:border-primary transition-colors resize-none font-mono text-sm"
        />
      </section>

      {/* Conversation Starters */}
      <section>
        <h2 className="text-lg font-semibold text-text mb-2">Conversation Starters</h2>
        <p className="text-sm text-text-muted mb-4">
          Add example prompts to help users get started
        </p>

        <div className="space-y-2 mb-3">
          {config.conversationStarters.map((starter, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={starter}
                onChange={(e) => updateConversationStarter(index, e.target.value)}
                placeholder="e.g., How can I track my order?"
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-text placeholder-text-muted outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={() => removeConversationStarter(index)}
                className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {config.conversationStarters.length < 5 && (
          <button
            onClick={addConversationStarter}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border hover:bg-surface transition-colors text-sm text-text-muted"
          >
            <Plus className="h-4 w-4" />
            Add Starter
          </button>
        )}
      </section>

      {/* Model Settings */}
      <section>
        <h2 className="text-lg font-semibold text-text mb-4">Model Settings</h2>

        {/* Model Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-2">
            AI Model
          </label>
          <select
            value={config.model}
            onChange={(e) => onUpdate({ model: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-text outline-none focus:border-primary transition-colors cursor-pointer"
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} - {model.description}
              </option>
            ))}
          </select>
        </div>

        {/* Temperature */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-text">
              Temperature
            </label>
            <span className="text-sm text-text-muted">{config.temperature}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={config.temperature}
            onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-text">
              Max Tokens
            </label>
            <span className="text-sm text-text-muted">{config.maxTokens}</span>
          </div>
          <input
            type="range"
            min="500"
            max="8000"
            step="500"
            value={config.maxTokens}
            onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>
      </section>

      {/* Capabilities */}
      <section>
        <h2 className="text-lg font-semibold text-text mb-4">Capabilities</h2>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🌐</div>
              <div>
                <div className="text-sm font-medium text-text">Web Browsing</div>
                <div className="text-xs text-text-muted">Search the web for real-time information</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.capabilities.webBrowsing}
              onChange={(e) =>
                onUpdate({
                  capabilities: { ...config.capabilities, webBrowsing: e.target.checked },
                })
              }
              className="w-5 h-5 rounded border-border bg-background checked:bg-primary cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="text-2xl">💻</div>
              <div>
                <div className="text-sm font-medium text-text">Code Interpreter</div>
                <div className="text-xs text-text-muted">Run Python code and analyze data</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.capabilities.codeInterpreter}
              onChange={(e) =>
                onUpdate({
                  capabilities: { ...config.capabilities, codeInterpreter: e.target.checked },
                })
              }
              className="w-5 h-5 rounded border-border bg-background checked:bg-primary cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎨</div>
              <div>
                <div className="text-sm font-medium text-text">Image Generation</div>
                <div className="text-xs text-text-muted">Create images with DALL-E</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.capabilities.imageGeneration}
              onChange={(e) =>
                onUpdate({
                  capabilities: { ...config.capabilities, imageGeneration: e.target.checked },
                })
              }
              className="w-5 h-5 rounded border-border bg-background checked:bg-primary cursor-pointer"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
