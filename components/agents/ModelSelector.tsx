'use client';

import { useState } from 'react';
import { Check, Zap, Sparkles, TrendingUp, ChevronDown } from 'lucide-react';
import { AI_MODELS, ModelConfig, getModelsByProvider } from '@/lib/ai/model-config';

interface ModelSelectorProps {
  selectedModel: string;
  allowedModels: string[];
  onModelChange: (modelId: string) => void;
  className?: string;
}

export function ModelSelector({
  selectedModel,
  allowedModels,
  onModelChange,
  className = '',
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentModel = AI_MODELS[selectedModel];
  const availableModels = Object.values(AI_MODELS).filter((model) =>
    allowedModels.includes(model.id)
  );

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'fast':
        return <Zap className="h-3 w-3 text-green-500" />;
      case 'medium':
        return <TrendingUp className="h-3 w-3 text-yellow-500" />;
      default:
        return <Sparkles className="h-3 w-3 text-blue-500" />;
    }
  };

  const getQualityBadge = (quality: string) => {
    const colors = {
      standard: 'bg-muted text-foreground dark:bg-gray-800 dark:text-gray-300',
      high: 'bg-blue-500/20 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      premium: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    };
    return colors[quality as keyof typeof colors] || colors.standard;
  };

  const getCostIndicator = (model: ModelConfig) => {
    const avgCost =
      (model.pricing.inputPerMillionTokens + model.pricing.outputPerMillionTokens) / 2;

    if (avgCost < 1) return '$';
    if (avgCost < 5) return '$$';
    if (avgCost < 15) return '$$$';
    if (avgCost < 25) return '$$$$';
    return '$$$$$';
  };

  const handleSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-surface-2 border border-white/10 rounded-lg hover:bg-surface-3 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2">
          {getSpeedIcon(currentModel?.capabilities.maxTokens >= 100000 ? 'slow' : 'fast')}
          <span className="font-medium text-text">{currentModel?.name || 'Select Model'}</span>
          <span
            className={`px-2 py-0.5 rounded text-xs ${getQualityBadge(
              currentModel?.recommended ? 'premium' : 'high'
            )}`}
          >
            {currentModel?.recommended ? 'Recommended' : getCostIndicator(currentModel)}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-text-muted transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-surface-2 border border-white/10 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* OpenAI Models */}
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              OpenAI Models
            </div>
            {getModelsByProvider('openai')
              .filter((m) => allowedModels.includes(m.id))
              .map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-card/5 transition-colors group"
                  role="option"
                  aria-selected={model.id === selectedModel}
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      {getSpeedIcon(model.capabilities.maxTokens >= 100000 ? 'slow' : 'fast')}
                      <span className="font-medium text-text">{model.name}</span>
                      {model.recommended && (
                        <span className="px-2 py-0.5 bg-blue-500/20 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                          Recommended
                        </span>
                      )}
                      {model.deprecated && (
                        <span className="px-2 py-0.5 bg-red-500/20 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs">
                          Legacy
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{model.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-muted">
                        {getCostIndicator(model)} · {model.capabilities.maxTokens.toLocaleString()}{' '}
                        tokens
                      </span>
                      {model.capabilities.supportsVision && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          Vision
                        </span>
                      )}
                    </div>
                  </div>
                  {model.id === selectedModel && (
                    <Check className="h-4 w-4 text-accent flex-shrink-0" />
                  )}
                </button>
              ))}
          </div>

          {/* Anthropic Models */}
          {getModelsByProvider('anthropic').some((m) => allowedModels.includes(m.id)) && (
            <div className="p-2 border-t border-white/10">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Anthropic Models
              </div>
              {getModelsByProvider('anthropic')
                .filter((m) => allowedModels.includes(m.id))
                .map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-card/5 transition-colors group"
                    role="option"
                    aria-selected={model.id === selectedModel}
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        {getSpeedIcon(
                          model.capabilities.maxTokens >= 100000 ? 'slow' : 'fast'
                        )}
                        <span className="font-medium text-text">{model.name}</span>
                        {model.recommended && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{model.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-text-muted">
                          {getCostIndicator(model)} ·{' '}
                          {model.capabilities.maxTokens.toLocaleString()} tokens
                        </span>
                        {model.capabilities.supportsVision && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            Vision
                          </span>
                        )}
                      </div>
                    </div>
                    {model.id === selectedModel && (
                      <Check className="h-4 w-4 text-accent flex-shrink-0" />
                    )}
                  </button>
                ))}
            </div>
          )}

          {/* Footer with pricing info */}
          <div className="p-3 border-t border-white/10 bg-card/5">
            <p className="text-xs text-text-muted">
              💡 Costs vary by model. Premium models offer better quality but cost more per
              token.
            </p>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
