'use client';

/**
 * Pipelines Landing Page - AI-First Minimal Design
 *
 * Centered VicyOmnibar for prompt-to-pipeline creation.
 * When no pipelines exist, shows subtle starter kit cards below.
 */

import { useState, useCallback } from 'react';
import { GitBranch, ArrowRight, RefreshCw } from 'lucide-react';
import { VicyOmnibar } from '@/components/vicy/VicyOmnibar';
import { PipelineWizard } from '@/components/pipelines/wizard/PipelineWizard';
import { usePipelines, useHasHydrated } from '@/store/useDashboardStore';
import { getStarterTemplates } from '@/lib/studio/template-library';
import type { WorkflowTemplate } from '@/lib/studio/types';

// Icon mapping for template categories
const categoryIcons: Record<string, string> = {
  email: '\u{1F4E7}',
  sales: '\u{1F3AF}',
  content: '\u{270D}\u{FE0F}',
  finance: '\u{1F4B0}',
  productivity: '\u{1F4CB}',
};

function MinimalStarterCard({
  template,
  onClick,
}: {
  template: WorkflowTemplate;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl
        bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]
        transition-all text-left group"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: template.color + '15' }}
      >
        <span className="text-base">
          {categoryIcons[template.category] || '\u{26A1}'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/70 font-medium truncate">
          {template.name}
        </p>
        <p className="text-xs text-white/30 truncate">{template.description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-violet-400 flex-shrink-0 transition-colors" />
    </button>
  );
}

export default function PipelinesPage() {
  const hasHydrated = useHasHydrated();
  const pipelines = usePipelines();
  const [showWizard, setShowWizard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const starterTemplates = getStarterTemplates(3);

  const handleSubmit = useCallback(
    async (content: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      // Open wizard for AI-powered pipeline creation
      setShowWizard(true);
      setIsSubmitting(false);
    },
    [isSubmitting]
  );

  // Loading state while Zustand hydrates
  if (!hasHydrated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-[640px]">
        {/* Violet Pipeline Icon */}
        <div className="flex justify-center mb-8">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05))',
              boxShadow: '0 0 40px rgba(139, 92, 246, 0.08)',
            }}
          >
            <GitBranch className="w-5 h-5 text-violet-400" />
          </div>
        </div>

        {/* Title */}
        <h1
          className="text-center text-xl font-medium mb-8"
          style={{ color: 'var(--vicy-text-primary)' }}
        >
          Create an automation
        </h1>

        {/* Omnibar */}
        <VicyOmnibar
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          placeholder="Describe your automation pipeline..."
        />

        {/* Starter Kits - only when no pipelines exist */}
        {pipelines.length === 0 && (
          <div className="mt-12 space-y-4">
            <p className="text-xs text-white/25 uppercase tracking-wider text-center">
              Or start from a template
            </p>
            <div className="grid grid-cols-1 gap-3">
              {starterTemplates.map((template) => (
                <MinimalStarterCard
                  key={template.id}
                  template={template}
                  onClick={() => setShowWizard(true)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Wizard Modal */}
      <PipelineWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
      />
    </div>
  );
}
