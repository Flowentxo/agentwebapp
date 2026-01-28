/**
 * Brain AI v3.0 - Standup Generator Wizard
 *
 * Multi-step wizard for generating AI-powered standup reports:
 * - Team/project selection
 * - Context source selection
 * - Template customization
 * - AI-generated report preview
 * - Slack/Email distribution
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Calendar,
  Database,
  FileText,
  Wand2,
  Send,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Clock,
  AlertCircle,
  Copy,
  Download,
  Share2,
  Target,
  CheckCircle2,
  XCircle,
  Sparkles,
  MessageSquare,
  Mail,
  GitBranch,
  ListTodo,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type WizardStep = 'context' | 'sources' | 'template' | 'generate' | 'distribute';

interface StandupContext {
  teamId?: string;
  projectId?: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  focusAreas: string[];
}

interface SourceSelection {
  connectedSources: string[];
  includeGitActivity: boolean;
  includeCalendar: boolean;
  includeKnowledgeBase: boolean;
  customContext: string;
}

interface StandupTemplate {
  id: string;
  name: string;
  sections: {
    accomplished: boolean;
    inProgress: boolean;
    blockers: boolean;
    priorities: boolean;
    metrics: boolean;
    highlights: boolean;
  };
  tone: 'professional' | 'casual' | 'brief';
  format: 'bullet' | 'paragraph' | 'mixed';
}

interface GeneratedReport {
  id: string;
  content: string;
  sections: {
    title: string;
    items: string[];
  }[];
  generatedAt: Date;
  tokenCount: number;
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_TEMPLATE: StandupTemplate = {
  id: 'default',
  name: 'Standard Standup',
  sections: {
    accomplished: true,
    inProgress: true,
    blockers: true,
    priorities: true,
    metrics: false,
    highlights: false,
  },
  tone: 'professional',
  format: 'bullet',
};

const PRESET_TEMPLATES: StandupTemplate[] = [
  DEFAULT_TEMPLATE,
  {
    id: 'detailed',
    name: 'Detailed Report',
    sections: {
      accomplished: true,
      inProgress: true,
      blockers: true,
      priorities: true,
      metrics: true,
      highlights: true,
    },
    tone: 'professional',
    format: 'mixed',
  },
  {
    id: 'quick',
    name: 'Quick Update',
    sections: {
      accomplished: true,
      inProgress: true,
      blockers: true,
      priorities: false,
      metrics: false,
      highlights: false,
    },
    tone: 'brief',
    format: 'bullet',
  },
  {
    id: 'leadership',
    name: 'Leadership Summary',
    sections: {
      accomplished: true,
      inProgress: false,
      blockers: true,
      priorities: true,
      metrics: true,
      highlights: true,
    },
    tone: 'professional',
    format: 'paragraph',
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function StandupWizard({ onClose }: { onClose?: () => void }) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('context');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard state
  const [context, setContext] = useState<StandupContext>({
    dateRange: {
      from: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      to: new Date(),
    },
    focusAreas: [],
  });

  const [sources, setSources] = useState<SourceSelection>({
    connectedSources: [],
    includeGitActivity: true,
    includeCalendar: true,
    includeKnowledgeBase: true,
    customContext: '',
  });

  const [template, setTemplate] = useState<StandupTemplate>(DEFAULT_TEMPLATE);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);

  const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
    { id: 'context', label: 'Context', icon: <Target className="w-4 h-4" /> },
    { id: 'sources', label: 'Sources', icon: <Database className="w-4 h-4" /> },
    { id: 'template', label: 'Template', icon: <FileText className="w-4 h-4" /> },
    { id: 'generate', label: 'Generate', icon: <Wand2 className="w-4 h-4" /> },
    { id: 'distribute', label: 'Share', icon: <Send className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // Navigation
  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  // Generate report
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/brain/standup/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          sources,
          template,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setGeneratedReport(data.report);
      goToNextStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!generatedReport) return;
    await navigator.clipboard.writeText(generatedReport.content);
  };

  // Download as markdown
  const handleDownload = () => {
    if (!generatedReport) return;

    const blob = new Blob([generatedReport.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `standup-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="standup-wizard">
      {/* Header */}
      <div className="wizard-header">
        <div className="wizard-header-content">
          <Sparkles className="w-6 h-6" />
          <div>
            <h1>AI Standup Generator</h1>
            <p>Create your daily standup report in seconds</p>
          </div>
        </div>
        {onClose && (
          <button className="wizard-close" onClick={onClose}>
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="wizard-progress">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`wizard-step ${currentStep === step.id ? 'active' : ''} ${
              index < currentStepIndex ? 'completed' : ''
            }`}
            onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
          >
            <div className="wizard-step-icon">
              {index < currentStepIndex ? (
                <Check className="w-4 h-4" />
              ) : (
                step.icon
              )}
            </div>
            <span className="wizard-step-label">{step.label}</span>
            {index < steps.length - 1 && (
              <div className="wizard-step-connector" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="wizard-content">
        {currentStep === 'context' && (
          <ContextStep context={context} setContext={setContext} />
        )}
        {currentStep === 'sources' && (
          <SourcesStep sources={sources} setSources={setSources} />
        )}
        {currentStep === 'template' && (
          <TemplateStep template={template} setTemplate={setTemplate} />
        )}
        {currentStep === 'generate' && (
          <GenerateStep
            isGenerating={isGenerating}
            error={error}
            onGenerate={handleGenerate}
            context={context}
            sources={sources}
            template={template}
          />
        )}
        {currentStep === 'distribute' && generatedReport && (
          <DistributeStep
            report={generatedReport}
            onCopy={handleCopy}
            onDownload={handleDownload}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="wizard-navigation">
        {currentStepIndex > 0 && currentStep !== 'distribute' && (
          <button className="wizard-nav-button secondary" onClick={goToPreviousStep}>
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <div className="wizard-nav-spacer" />
        {currentStep !== 'generate' && currentStep !== 'distribute' && (
          <button className="wizard-nav-button primary" onClick={goToNextStep}>
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {currentStep === 'generate' && !isGenerating && (
          <button className="wizard-nav-button primary" onClick={handleGenerate}>
            <Wand2 className="w-4 h-4" />
            Generate Report
          </button>
        )}
        {currentStep === 'distribute' && (
          <button className="wizard-nav-button primary" onClick={onClose}>
            <Check className="w-4 h-4" />
            Done
          </button>
        )}
      </div>

      <style jsx global>{`
        .standup-wizard {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 16px;
          border: 1px solid var(--border-color, #2a2a4a);
          overflow: hidden;
        }

        .wizard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(59, 130, 246, 0.1));
          border-bottom: 1px solid var(--border-color, #2a2a4a);
        }

        .wizard-header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .wizard-header-content svg {
          color: var(--color-primary, #7c3aed);
        }

        .wizard-header-content h1 {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 2px;
        }

        .wizard-header-content p {
          font-size: 13px;
          color: var(--text-tertiary, #666);
        }

        .wizard-close {
          background: none;
          border: none;
          color: var(--text-tertiary, #666);
          cursor: pointer;
          padding: 4px;
        }

        .wizard-close:hover {
          color: var(--text-primary, #fff);
        }

        .wizard-progress {
          display: flex;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
          background: var(--bg-tertiary, #15152a);
        }

        .wizard-step {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          flex: 1;
          position: relative;
        }

        .wizard-step-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--bg-secondary, #1a1a2e);
          border: 2px solid var(--border-color, #3a3a5a);
          color: var(--text-tertiary, #666);
          transition: all 0.2s;
        }

        .wizard-step.active .wizard-step-icon {
          border-color: var(--color-primary, #7c3aed);
          color: var(--color-primary, #7c3aed);
          background: rgba(124, 58, 237, 0.1);
        }

        .wizard-step.completed .wizard-step-icon {
          border-color: #10b981;
          background: #10b981;
          color: white;
        }

        .wizard-step-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-tertiary, #666);
        }

        .wizard-step.active .wizard-step-label {
          color: var(--text-primary, #fff);
        }

        .wizard-step.completed .wizard-step-label {
          color: #10b981;
        }

        .wizard-step-connector {
          position: absolute;
          right: -20px;
          width: 40px;
          height: 2px;
          background: var(--border-color, #3a3a5a);
        }

        .wizard-step.completed .wizard-step-connector {
          background: #10b981;
        }

        .wizard-content {
          flex: 1;
          padding: 24px;
          min-height: 400px;
          overflow-y: auto;
        }

        .wizard-navigation {
          display: flex;
          align-items: center;
          padding: 16px 24px;
          border-top: 1px solid var(--border-color, #2a2a4a);
          background: var(--bg-tertiary, #15152a);
        }

        .wizard-nav-spacer {
          flex: 1;
        }

        .wizard-nav-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .wizard-nav-button.primary {
          background: var(--color-primary, #7c3aed);
          border: none;
          color: white;
        }

        .wizard-nav-button.primary:hover {
          background: var(--color-primary-dark, #6d28d9);
        }

        .wizard-nav-button.secondary {
          background: transparent;
          border: 1px solid var(--border-color, #3a3a5a);
          color: var(--text-primary, #fff);
        }

        .wizard-nav-button.secondary:hover {
          border-color: var(--color-primary, #7c3aed);
        }

        /* Step-specific styles */
        .step-section {
          margin-bottom: 24px;
        }

        .step-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .step-section-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .step-section-header svg {
          color: var(--color-primary, #7c3aed);
        }

        .step-description {
          font-size: 14px;
          color: var(--text-secondary, #999);
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .date-range-picker {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .date-input-group {
          flex: 1;
        }

        .date-input-group label {
          display: block;
          font-size: 13px;
          color: var(--text-secondary, #999);
          margin-bottom: 8px;
        }

        .date-input-group input {
          width: 100%;
          padding: 10px 12px;
          background: var(--bg-tertiary, #2a2a4a);
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 8px;
          color: var(--text-primary, #fff);
          font-size: 14px;
        }

        .focus-area-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .focus-chip {
          padding: 8px 16px;
          background: var(--bg-tertiary, #2a2a4a);
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 20px;
          font-size: 13px;
          color: var(--text-secondary, #999);
          cursor: pointer;
          transition: all 0.2s;
        }

        .focus-chip:hover {
          border-color: var(--color-primary, #7c3aed);
        }

        .focus-chip.selected {
          background: rgba(124, 58, 237, 0.2);
          border-color: var(--color-primary, #7c3aed);
          color: var(--color-primary, #7c3aed);
        }

        .source-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 10px;
          margin-bottom: 12px;
        }

        .source-toggle-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .source-toggle-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: var(--bg-secondary, #1a1a2e);
        }

        .source-toggle-text h4 {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #fff);
          margin-bottom: 2px;
        }

        .source-toggle-text p {
          font-size: 12px;
          color: var(--text-tertiary, #666);
        }

        .toggle-switch {
          position: relative;
          width: 48px;
          height: 26px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg-secondary, #1a1a2e);
          border: 1px solid var(--border-color, #3a3a5a);
          transition: 0.3s;
          border-radius: 26px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 2px;
          background: var(--text-tertiary, #666);
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
          background: var(--color-primary, #7c3aed);
          border-color: var(--color-primary, #7c3aed);
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(20px);
          background: white;
        }

        .custom-context-input {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          background: var(--bg-tertiary, #2a2a4a);
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 10px;
          color: var(--text-primary, #fff);
          font-size: 14px;
          resize: vertical;
        }

        .custom-context-input::placeholder {
          color: var(--text-tertiary, #666);
        }

        .template-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .template-card {
          padding: 16px;
          background: var(--bg-tertiary, #2a2a4a);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .template-card:hover {
          border-color: var(--border-color, #3a3a5a);
        }

        .template-card.selected {
          border-color: var(--color-primary, #7c3aed);
          background: rgba(124, 58, 237, 0.1);
        }

        .template-card h4 {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 8px;
        }

        .template-card-sections {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .template-card-section {
          padding: 2px 8px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 4px;
          font-size: 10px;
          color: var(--text-tertiary, #666);
        }

        .section-toggles {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .section-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: var(--bg-tertiary, #2a2a4a);
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .section-toggle:hover {
          border-color: var(--color-primary, #7c3aed);
        }

        .section-toggle.active {
          border-color: var(--color-primary, #7c3aed);
          background: rgba(124, 58, 237, 0.1);
        }

        .section-toggle span {
          font-size: 13px;
          color: var(--text-primary, #fff);
        }

        .generate-preview {
          padding: 20px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 12px;
        }

        .generate-preview h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 16px;
        }

        .preview-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border-color, #3a3a5a);
        }

        .preview-item:last-child {
          border-bottom: none;
        }

        .preview-item svg {
          color: var(--color-primary, #7c3aed);
        }

        .preview-item span {
          font-size: 13px;
          color: var(--text-secondary, #999);
        }

        .preview-item strong {
          color: var(--text-primary, #fff);
        }

        .generating-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .generating-state svg {
          color: var(--color-primary, #7c3aed);
          margin-bottom: 16px;
        }

        .generating-state h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 8px;
        }

        .generating-state p {
          font-size: 14px;
          color: var(--text-secondary, #999);
        }

        .report-output {
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 12px;
          overflow: hidden;
        }

        .report-output-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border-color, #3a3a5a);
        }

        .report-output-header h4 {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .report-output-actions {
          display: flex;
          gap: 8px;
        }

        .report-action-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--bg-secondary, #1a1a2e);
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 6px;
          font-size: 13px;
          color: var(--text-primary, #fff);
          cursor: pointer;
          transition: all 0.2s;
        }

        .report-action-button:hover {
          border-color: var(--color-primary, #7c3aed);
        }

        .report-output-content {
          padding: 20px;
          font-size: 14px;
          color: var(--text-primary, #fff);
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .share-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 24px;
        }

        .share-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-tertiary, #2a2a4a);
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .share-option:hover {
          border-color: var(--color-primary, #7c3aed);
        }

        .share-option-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: var(--bg-secondary, #1a1a2e);
        }

        .share-option span {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #fff);
        }

        @media (max-width: 640px) {
          .wizard-progress {
            flex-wrap: wrap;
            gap: 12px;
          }

          .wizard-step-connector {
            display: none;
          }

          .template-grid,
          .share-options {
            grid-template-columns: 1fr;
          }

          .section-toggles {
            grid-template-columns: repeat(2, 1fr);
          }

          .date-range-picker {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// STEP COMPONENTS
// ============================================

interface ContextStepProps {
  context: StandupContext;
  setContext: (context: StandupContext) => void;
}

function ContextStep({ context, setContext }: ContextStepProps) {
  const focusOptions = [
    'Development', 'Design', 'Testing', 'Documentation',
    'Meetings', 'Planning', 'Research', 'Support'
  ];

  const toggleFocusArea = (area: string) => {
    const newAreas = context.focusAreas.includes(area)
      ? context.focusAreas.filter(a => a !== area)
      : [...context.focusAreas, area];
    setContext({ ...context, focusAreas: newAreas });
  };

  return (
    <div>
      <div className="step-section">
        <div className="step-section-header">
          <Calendar className="w-5 h-5" />
          <h3>Time Period</h3>
        </div>
        <p className="step-description">
          Select the date range for your standup report. We&apos;ll gather activity from this period.
        </p>
        <div className="date-range-picker">
          <div className="date-input-group">
            <label>From</label>
            <input
              type="date"
              value={context.dateRange.from.toISOString().split('T')[0]}
              onChange={e => setContext({
                ...context,
                dateRange: { ...context.dateRange, from: new Date(e.target.value) }
              })}
            />
          </div>
          <div className="date-input-group">
            <label>To</label>
            <input
              type="date"
              value={context.dateRange.to.toISOString().split('T')[0]}
              onChange={e => setContext({
                ...context,
                dateRange: { ...context.dateRange, to: new Date(e.target.value) }
              })}
            />
          </div>
        </div>
      </div>

      <div className="step-section">
        <div className="step-section-header">
          <Target className="w-5 h-5" />
          <h3>Focus Areas</h3>
        </div>
        <p className="step-description">
          Select the areas you want to highlight in your report.
        </p>
        <div className="focus-area-chips">
          {focusOptions.map(area => (
            <button
              key={area}
              className={`focus-chip ${context.focusAreas.includes(area) ? 'selected' : ''}`}
              onClick={() => toggleFocusArea(area)}
            >
              {area}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SourcesStepProps {
  sources: SourceSelection;
  setSources: (sources: SourceSelection) => void;
}

function SourcesStep({ sources, setSources }: SourcesStepProps) {
  const sourceOptions = [
    {
      key: 'includeGitActivity' as const,
      icon: <GitBranch className="w-5 h-5" />,
      title: 'Git Activity',
      description: 'Commits, PRs, and code reviews',
    },
    {
      key: 'includeCalendar' as const,
      icon: <Calendar className="w-5 h-5" />,
      title: 'Calendar',
      description: 'Meetings and scheduled events',
    },
    {
      key: 'includeKnowledgeBase' as const,
      icon: <Database className="w-5 h-5" />,
      title: 'Knowledge Base',
      description: 'Documents and notes',
    },
  ];

  return (
    <div>
      <div className="step-section">
        <div className="step-section-header">
          <Database className="w-5 h-5" />
          <h3>Data Sources</h3>
        </div>
        <p className="step-description">
          Select which sources to include when generating your standup report.
        </p>

        {sourceOptions.map(option => (
          <div key={option.key} className="source-toggle">
            <div className="source-toggle-info">
              <div className="source-toggle-icon" style={{ color: '#7c3aed' }}>
                {option.icon}
              </div>
              <div className="source-toggle-text">
                <h4>{option.title}</h4>
                <p>{option.description}</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={sources[option.key]}
                onChange={e => setSources({ ...sources, [option.key]: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      <div className="step-section">
        <div className="step-section-header">
          <Lightbulb className="w-5 h-5" />
          <h3>Additional Context</h3>
        </div>
        <p className="step-description">
          Add any additional context or notes that should be included in your report.
        </p>
        <textarea
          className="custom-context-input"
          placeholder="E.g., &quot;Worked on the new authentication feature&quot;, &quot;Had sync with design team about redesign&quot;..."
          value={sources.customContext}
          onChange={e => setSources({ ...sources, customContext: e.target.value })}
        />
      </div>
    </div>
  );
}

interface TemplateStepProps {
  template: StandupTemplate;
  setTemplate: (template: StandupTemplate) => void;
}

function TemplateStep({ template, setTemplate }: TemplateStepProps) {
  const sectionLabels: Record<keyof StandupTemplate['sections'], string> = {
    accomplished: 'Accomplished',
    inProgress: 'In Progress',
    blockers: 'Blockers',
    priorities: 'Priorities',
    metrics: 'Metrics',
    highlights: 'Highlights',
  };

  const toggleSection = (key: keyof StandupTemplate['sections']) => {
    setTemplate({
      ...template,
      sections: {
        ...template.sections,
        [key]: !template.sections[key],
      },
    });
  };

  return (
    <div>
      <div className="step-section">
        <div className="step-section-header">
          <FileText className="w-5 h-5" />
          <h3>Choose a Template</h3>
        </div>
        <p className="step-description">
          Select a preset template or customize your own report structure.
        </p>

        <div className="template-grid">
          {PRESET_TEMPLATES.map(preset => (
            <div
              key={preset.id}
              className={`template-card ${template.id === preset.id ? 'selected' : ''}`}
              onClick={() => setTemplate(preset)}
            >
              <h4>{preset.name}</h4>
              <div className="template-card-sections">
                {Object.entries(preset.sections)
                  .filter(([, enabled]) => enabled)
                  .map(([key]) => (
                    <span key={key} className="template-card-section">
                      {sectionLabels[key as keyof StandupTemplate['sections']]}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="step-section">
        <div className="step-section-header">
          <ListTodo className="w-5 h-5" />
          <h3>Customize Sections</h3>
        </div>
        <div className="section-toggles">
          {Object.entries(sectionLabels).map(([key, label]) => (
            <div
              key={key}
              className={`section-toggle ${template.sections[key as keyof StandupTemplate['sections']] ? 'active' : ''}`}
              onClick={() => toggleSection(key as keyof StandupTemplate['sections'])}
            >
              {template.sections[key as keyof StandupTemplate['sections']] ? (
                <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />
              ) : (
                <XCircle className="w-4 h-4" style={{ color: '#666' }} />
              )}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface GenerateStepProps {
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  context: StandupContext;
  sources: SourceSelection;
  template: StandupTemplate;
}

function GenerateStep({ isGenerating, error, context, sources, template }: GenerateStepProps) {
  if (isGenerating) {
    return (
      <div className="generating-state">
        <Loader2 className="w-12 h-12 animate-spin" />
        <h3>Generating Your Report</h3>
        <p>Analyzing your activity and creating a personalized standup...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="generating-state">
        <AlertCircle className="w-12 h-12" style={{ color: '#ef4444' }} />
        <h3>Generation Failed</h3>
        <p>{error}</p>
      </div>
    );
  }

  const enabledSections = Object.entries(template.sections)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  return (
    <div>
      <div className="step-section">
        <div className="step-section-header">
          <Wand2 className="w-5 h-5" />
          <h3>Ready to Generate</h3>
        </div>
        <p className="step-description">
          Review your settings and click Generate to create your AI-powered standup report.
        </p>

        <div className="generate-preview">
          <h4>Report Configuration</h4>
          <div className="preview-item">
            <Calendar className="w-4 h-4" />
            <span>
              Period: <strong>{context.dateRange.from.toLocaleDateString()} - {context.dateRange.to.toLocaleDateString()}</strong>
            </span>
          </div>
          <div className="preview-item">
            <Target className="w-4 h-4" />
            <span>
              Focus: <strong>{context.focusAreas.length > 0 ? context.focusAreas.join(', ') : 'All areas'}</strong>
            </span>
          </div>
          <div className="preview-item">
            <Database className="w-4 h-4" />
            <span>
              Sources: <strong>
                {[
                  sources.includeGitActivity && 'Git',
                  sources.includeCalendar && 'Calendar',
                  sources.includeKnowledgeBase && 'Knowledge Base',
                ].filter(Boolean).join(', ') || 'None selected'}
              </strong>
            </span>
          </div>
          <div className="preview-item">
            <FileText className="w-4 h-4" />
            <span>
              Sections: <strong>{enabledSections.length} selected</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DistributeStepProps {
  report: GeneratedReport;
  onCopy: () => void;
  onDownload: () => void;
}

function DistributeStep({ report, onCopy, onDownload }: DistributeStepProps) {
  return (
    <div>
      <div className="step-section">
        <div className="step-section-header">
          <CheckCircle2 className="w-5 h-5" style={{ color: '#10b981' }} />
          <h3>Report Generated!</h3>
        </div>

        <div className="report-output">
          <div className="report-output-header">
            <h4>Your Standup Report</h4>
            <div className="report-output-actions">
              <button className="report-action-button" onClick={onCopy}>
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button className="report-action-button" onClick={onDownload}>
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
          <div className="report-output-content">
            {report.content}
          </div>
        </div>

        <div className="share-options">
          <div className="share-option">
            <div className="share-option-icon" style={{ color: '#4a154b' }}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <span>Post to Slack</span>
          </div>
          <div className="share-option">
            <div className="share-option-icon" style={{ color: '#ea4335' }}>
              <Mail className="w-5 h-5" />
            </div>
            <span>Send via Email</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StandupWizard;
