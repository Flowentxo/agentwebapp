'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Wand2,
  Sparkles,
  Loader2,
  AlertTriangle,
  Check,
  ArrowRight,
  Lightbulb,
  Zap,
  MessageSquare,
  UserCheck,
  Receipt,
  FileText,
} from 'lucide-react';
import { usePipelineStore } from '../store/usePipelineStore';

// ============================================
// TYPES
// ============================================

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GeneratedPipeline {
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
}

interface QuickExample {
  title: string;
  prompt: string;
  icon: string;
  category: 'support' | 'sales' | 'finance' | 'general';
}

// Icon mapping for quick examples
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  UserCheck,
  Receipt,
  FileText,
  Zap,
};

// ============================================
// EXAMPLE PROMPTS (fallback if API fails)
// ============================================

const FALLBACK_EXAMPLES = [
  'When I receive a webhook, analyze the data with AI and send a summary email',
  'Create a daily report that queries our database and posts to Slack',
  'Build a support classifier that routes urgent tickets to the team',
  'Process invoices: extract data, validate, and update the database',
];

const FALLBACK_QUICK_EXAMPLES: QuickExample[] = [
  {
    title: 'Summarize Support Tickets',
    prompt: 'Every morning at 9am, fetch all open support tickets from the last 24 hours, have Cassie summarize them by category and priority, and send me an email digest.',
    icon: 'MessageSquare',
    category: 'support',
  },
  {
    title: 'Qualify Leads',
    prompt: 'When a new lead comes in via webhook, have Dexter analyze their company and requirements, score them from 1-100, and if score > 70 notify the sales team on Slack.',
    icon: 'UserCheck',
    category: 'sales',
  },
  {
    title: 'Invoice Extraction',
    prompt: 'When I receive an email with an invoice attachment, have Dexter extract the vendor name, invoice number, date, line items, and total amount.',
    icon: 'Receipt',
    category: 'finance',
  },
  {
    title: 'Contract Review',
    prompt: 'When a contract document is uploaded via webhook, have Lex review it for key terms, risks, and obligations, then generate a summary report.',
    icon: 'FileText',
    category: 'general',
  },
];

// ============================================
// SUCCESS TOAST
// ============================================

interface SuccessToastProps {
  isVisible: boolean;
  pipelineName: string;
}

function SuccessToast({ isVisible, pipelineName }: SuccessToastProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 shadow-lg backdrop-blur-sm">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-green-400">Pipeline Generated!</p>
          <p className="text-xs text-green-300/70">{pipelineName} is ready to use</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AIGeneratorModal({ isOpen, onClose }: AIGeneratorModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examples, setExamples] = useState<string[]>(FALLBACK_EXAMPLES);
  const [quickExamples, setQuickExamples] = useState<QuickExample[]>(FALLBACK_QUICK_EXAMPLES);
  const [showToast, setShowToast] = useState(false);
  const [generatedName, setGeneratedName] = useState('');

  // Store actions
  const setNodes = usePipelineStore((s) => s.setNodes);
  const setEdges = usePipelineStore((s) => s.setEdges);
  const setDirty = usePipelineStore((s) => s.setDirty);
  const resetExecution = usePipelineStore((s) => s.resetExecution);

  // Fetch example prompts on mount
  useEffect(() => {
    if (isOpen) {
      fetch('/api/pipelines/generate')
        .then((res) => res.json())
        .then((data) => {
          if (data.examples?.length) {
            setExamples(data.examples);
          }
          if (data.quickExamples?.length) {
            setQuickExamples(data.quickExamples);
          }
        })
        .catch(() => {
          // Use fallback examples
        });
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setError(null);
    }
  }, [isOpen]);

  // Generate pipeline
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your pipeline');
      return;
    }

    if (prompt.trim().length < 10) {
      setError('Please provide a more detailed description (at least 10 characters)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pipelines/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate pipeline');
      }

      const pipeline: GeneratedPipeline = data.pipeline;

      // Load into store
      setNodes(pipeline.nodes);
      setEdges(pipeline.edges);
      setDirty(true);
      resetExecution();

      // Show success toast
      setGeneratedName(pipeline.name);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      // Close modal
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pipeline');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, setNodes, setEdges, setDirty, resetExecution, onClose]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate, isLoading]
  );

  // Use example prompt
  const handleUseExample = useCallback((example: string) => {
    setPrompt(example);
    setError(null);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="w-full max-w-2xl bg-[#0F0F12] rounded-2xl border border-white/10
            shadow-2xl overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/30
                flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">AI Pipeline Generator</h2>
                <p className="text-xs text-white/50">Describe your workflow in plain English</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-card/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Input Area */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Sparkles className="w-4 h-4 text-violet-400" />
                What should this pipeline do?
              </label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., When I receive a webhook with customer data, analyze it with AI, check if it's a high-value lead, and send appropriate emails..."
                  rows={4}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-card/5 border border-white/10
                    text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50
                    focus:ring-1 focus:ring-violet-500/50 transition-all resize-none"
                  disabled={isLoading}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                    <div className="flex items-center gap-3 text-violet-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">Generating pipeline...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Generation Failed</p>
                  <p className="text-xs text-red-300/70 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Quick Examples */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-white/50">
                <Lightbulb className="w-3.5 h-3.5" />
                Quick Examples
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickExamples.slice(0, 4).map((example, i) => {
                  const IconComponent = ICON_MAP[example.icon] || Zap;
                  const categoryColors = {
                    support: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
                    sales: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
                    finance: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
                    general: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
                  };
                  return (
                    <button
                      key={i}
                      onClick={() => handleUseExample(example.prompt)}
                      className={`flex items-start gap-3 p-3 text-left rounded-lg
                        bg-gradient-to-br ${categoryColors[example.category]}
                        border hover:border-white/20 transition-all
                        hover:scale-[1.02] active:scale-[0.98]`}
                      disabled={isLoading}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-card/10 flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-white/80" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {example.title}
                        </p>
                        <p className="text-[10px] text-white/50 line-clamp-2 mt-0.5">
                          {example.prompt.substring(0, 60)}...
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tip */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Zap className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-violet-300/80">
                <strong className="text-violet-300">Tip:</strong> Be specific about triggers
                (webhook, schedule), agents (Dexter, Cassie, Emmie), and actions (email, Slack, database).
                The AI will create nodes and connections automatically.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-card/[0.02]">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium rounded-lg
                bg-card/5 text-white/70 hover:bg-card/10 hover:text-white
                transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg
                bg-gradient-to-r from-violet-500 to-purple-500 text-white
                hover:from-violet-600 hover:to-purple-600
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-lg shadow-violet-500/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Pipeline
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      <SuccessToast isVisible={showToast} pipelineName={generatedName} />

      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}
