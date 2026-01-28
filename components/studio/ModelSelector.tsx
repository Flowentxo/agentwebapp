'use client';

/**
 * MODEL SELECTOR COMPONENT
 *
 * Beautiful dropdown for selecting AI models with pricing and capabilities
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Check,
  Zap,
  Eye,
  Workflow,
  DollarSign,
  Star,
  AlertTriangle
} from 'lucide-react';
import {
  AI_MODELS,
  ModelConfig,
  getModelConfig,
  formatCost,
  calculateCost
} from '@/lib/ai/model-config';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  showPricing?: boolean;
  showCapabilities?: boolean;
  filterProvider?: 'openai' | 'anthropic';
  disabled?: boolean;
}

const PROVIDER_COLORS = {
  openai: '#10B981',
  anthropic: '#8B5CF6'
};

const PROVIDER_NAMES = {
  openai: 'OpenAI',
  anthropic: 'Anthropic'
};

export function ModelSelector({
  value,
  onChange,
  showPricing = true,
  showCapabilities = false,
  filterProvider,
  disabled = false
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedModel = getModelConfig(value);

  // Filter models
  const availableModels = Object.values(AI_MODELS).filter(model => {
    if (filterProvider && model.provider !== filterProvider) return false;
    return true;
  });

  // Group by provider
  const groupedModels = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelConfig[]>);

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Selected Model Display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-surface-0 px-4 py-3 text-left transition ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:border-white/20 hover:bg-card/5'
        }`}
      >
        {selectedModel ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: PROVIDER_COLORS[selectedModel.provider] }}
              />
              <span className="text-sm font-semibold text-text truncate">
                {selectedModel.name}
              </span>
              {selectedModel.recommended && (
                <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
              )}
              {selectedModel.deprecated && (
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
              )}
            </div>

            {showPricing && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <DollarSign className="h-3 w-3" />
                <span>
                  {formatCost(selectedModel.pricing.inputPerMillionTokens / 1000000 * 1000)} / 1K input
                </span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-text-muted">Select a model...</span>
        )}

        <ChevronDown
          className={`h-4 w-4 text-text-muted transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 z-20 mt-2 max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-surface-1 shadow-2xl"
            >
              {Object.entries(groupedModels).map(([provider, models]) => (
                <div key={provider} className="border-b border-white/5 last:border-0">
                  {/* Provider Header */}
                  <div
                    className="sticky top-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-surface-0 border-b border-white/5"
                    style={{ color: PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS] }}
                  >
                    {PROVIDER_NAMES[provider as keyof typeof PROVIDER_NAMES]}
                  </div>

                  {/* Models */}
                  {models.map((model) => {
                    const isSelected = model.id === value;

                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => handleSelect(model.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition ${
                          isSelected
                            ? 'bg-[rgb(var(--accent))]/10'
                            : 'hover:bg-card/5'
                        }`}
                      >
                        {/* Status Indicator */}
                        <div className="flex h-5 w-5 items-center justify-center flex-shrink-0 mt-0.5">
                          {isSelected ? (
                            <Check className="h-4 w-4 text-[rgb(var(--accent))]" />
                          ) : (
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: PROVIDER_COLORS[model.provider] }}
                            />
                          )}
                        </div>

                        {/* Model Info */}
                        <div className="flex-1 min-w-0">
                          {/* Name & Badges */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-text truncate">
                              {model.name}
                            </span>
                            {model.recommended && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-400/10 flex-shrink-0">
                                <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
                                <span className="text-xs font-medium text-yellow-400">
                                  Recommended
                                </span>
                              </div>
                            )}
                            {model.deprecated && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/10 flex-shrink-0">
                                <AlertTriangle className="h-2.5 w-2.5 text-yellow-500" />
                                <span className="text-xs font-medium text-yellow-500">
                                  Legacy
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-xs text-text-muted mb-2 line-clamp-2">
                            {model.description}
                          </p>

                          {/* Pricing */}
                          {showPricing && (
                            <div className="flex items-center gap-3 text-xs text-text-muted mb-1.5">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span>
                                  {formatCost(model.pricing.inputPerMillionTokens / 1000000 * 1000)} / 1K in
                                </span>
                              </div>
                              <span>•</span>
                              <span>
                                {formatCost(model.pricing.outputPerMillionTokens / 1000000 * 1000)} / 1K out
                              </span>
                            </div>
                          )}

                          {/* Capabilities */}
                          {showCapabilities && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {model.capabilities.supportsVision && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-400/10">
                                  <Eye className="h-2.5 w-2.5 text-blue-400" />
                                  <span className="text-xs text-blue-400">Vision</span>
                                </div>
                              )}
                              {model.capabilities.supportsStreaming && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-400/10">
                                  <Zap className="h-2.5 w-2.5 text-green-400" />
                                  <span className="text-xs text-green-400">Streaming</span>
                                </div>
                              )}
                              {model.capabilities.supportsFunctionCalling && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-400/10">
                                  <Workflow className="h-2.5 w-2.5 text-purple-400" />
                                  <span className="text-xs text-purple-400">Functions</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
