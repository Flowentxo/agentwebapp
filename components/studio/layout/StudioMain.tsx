'use client';

/**
 * StudioMain Component
 *
 * Contains the main canvas area and module palette including:
 * - Visual Canvas for workflow editing
 * - Module Library (left sidebar)
 * - Guided mode wizard overlay
 * - Empty state overlays
 *
 * @version 1.0.0
 */

import { memo, useCallback, ReactNode } from 'react';
import { Node, Edge, NodeChange, EdgeChange } from 'reactflow';
import { ChevronDown, ChevronRight, Check, ArrowRight } from 'lucide-react';
import { VisualCanvas } from '../VisualCanvas';
import { RunHeader } from '../RunHeader';
import { CanvasErrorBoundary } from '../ErrorBoundary/CanvasErrorBoundary';
import { Workflow } from '@/lib/api/workflows-client';
import { StudioMode } from './StudioHeader';

// =====================================================
// TYPES
// =====================================================

export interface LibraryItem {
  title: string;
  desc: string;
  badges: string[];
  tags: string[];
}

export interface LibraryGroup {
  id: string;
  title: string;
  defaultOpen: boolean;
  items: LibraryItem[];
}

export interface TemplateOption {
  id: string;
  title: string;
  desc: string;
  bullets: string[];
}

export interface StudioMainProps {
  /** Current studio mode */
  mode: StudioMode;
  /** Current step in guided mode */
  currentStep: 1 | 2 | 3;
  /** Selected template ID in guided mode */
  selectedTemplateId: string | null;
  /** Agent name for saving */
  agentName: string;
  /** Agent visibility setting */
  agentVisibility: 'private' | 'team' | 'public';
  /** Whether to show the module library */
  showLibrary: boolean;
  /** Whether to show the welcome overlay */
  showWelcome: boolean;
  /** Whether debug mode is active */
  isDebugMode: boolean;
  /** Current workflow being edited */
  currentWorkflow: Workflow | null;
  /** All nodes in the workflow */
  nodes: Node[];
  /** All edges in the workflow */
  edges: Edge[];
  /** Library groups data */
  libraryGroups: LibraryGroup[];
  /** Template options for guided mode */
  templateOptions: TemplateOption[];
  /** Toggle library visibility */
  onToggleLibrary: () => void;
  /** Set show welcome state */
  onSetShowWelcome: (show: boolean) => void;
  /** Node change handler */
  onNodesChange: (changes: NodeChange[]) => void;
  /** Edge change handler */
  onEdgesChange: (changes: EdgeChange[]) => void;
  /** Node selection handler */
  onNodeSelect: (node: Node | null) => void;
  /** Save handler */
  onSave: () => void;
  /** Open preview handler */
  onOpenPreview: () => void;
  /** Open variables handler */
  onOpenVariables: () => void;
  /** Open templates handler */
  onOpenTemplates: () => void;
  /** Open marketplace handler */
  onOpenMarketplace: () => void;
  /** Save as template handler */
  onSaveAsTemplate: () => void;
  /** Open tool registry handler */
  onOpenToolRegistry: () => void;
  /** Open connections handler */
  onOpenConnections: () => void;
  /** Open version history handler */
  onOpenVersionHistory: () => void;
  /** Publish workflow handler */
  onPublish: (changeDescription?: string) => Promise<void>;
  /** Archive workflow handler */
  onArchive: () => Promise<void>;
  /** Unarchive workflow handler */
  onUnarchive: () => Promise<void>;
  /** Go to next step in guided mode */
  onNextStep: () => void;
  /** Go to previous step in guided mode */
  onPrevStep: () => void;
  /** Set selected template ID */
  onSelectTemplate: (id: string) => void;
  /** Load template by ID */
  onLoadTemplate: (id: string) => void;
  /** Update agent name */
  onAgentNameChange: (name: string) => void;
  /** Update agent visibility */
  onAgentVisibilityChange: (visibility: 'private' | 'team' | 'public') => void;
  /** Save workflow with metadata */
  onSaveWorkflow: (metadata: {
    name: string;
    description: string;
    tags: string[];
    status: 'draft' | 'active';
    visibility: 'private' | 'team' | 'public';
  }) => void;
  /** Reload canvas (for error recovery) */
  onReloadCanvas?: () => void;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface ModuleLibraryProps {
  showLibrary: boolean;
  libraryGroups: LibraryGroup[];
  mode: StudioMode;
  currentStep: 1 | 2 | 3;
  onToggleLibrary: () => void;
}

const ModuleLibrary = memo(function ModuleLibrary({
  showLibrary,
  libraryGroups,
  mode,
  currentStep,
  onToggleLibrary,
}: ModuleLibraryProps) {
  return (
    <div
      className={`flex-shrink-0 ${
        showLibrary ? 'w-80' : 'w-12'
      } border-r-2 border-border bg-card transition-all`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-border">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {showLibrary ? 'Module Library' : ''}
        </div>
        <button
          onClick={onToggleLibrary}
          className="text-muted-foreground hover:text-foreground"
        >
          {showLibrary ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {showLibrary && (
        <div className="px-3 pb-4 space-y-3 overflow-y-auto h-[calc(100vh-80px)]">
          {/* Search */}
          <div className="flex items-center gap-2">
            <input
              className="w-full rounded-xl bg-card px-3 py-2.5 text-sm border-2 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none"
              placeholder="Search modules"
            />
          </div>

          {/* Advanced Toggle */}
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Show Advanced</span>
            <input type="checkbox" className="rounded border-border" />
          </div>

          {/* Library Groups */}
          {libraryGroups.map((group) => {
            const autoOpen = mode === 'guided' && currentStep === 2 && group.id === 'sales';
            return (
              <details
                key={group.id}
                open={autoOpen || group.defaultOpen}
                className="rounded-xl border-2 border-border bg-muted/50/50"
              >
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-foreground">
                  {group.title}
                </summary>
                <div className="space-y-2 px-3 pb-3">
                  {group.items.map((item) => (
                    <div
                      key={item.title}
                      className="group rounded-xl border-2 border-border bg-card p-3 hover:bg-muted/50 hover:shadow-sm hover:border-border cursor-grab transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
                          {item.title.slice(0, 1)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {item.title}
                            </span>
                            {item.badges.map((b) => (
                              <span
                                key={b}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs font-medium text-muted-foreground">{item.desc}</p>
                          <div className="flex gap-1 mt-1">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-muted-foreground opacity-0 group-hover:opacity-100 text-xs">
                          ...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
});

interface GuidedStepperProps {
  currentStep: 1 | 2 | 3;
}

const GuidedStepper = memo(function GuidedStepper({ currentStep }: GuidedStepperProps) {
  return (
    <div className="border-b-2 border-border bg-card/95 px-4 py-3 flex items-center gap-4">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 ${
            currentStep === step
              ? 'border-primary text-primary bg-primary/5'
              : 'border-border text-muted-foreground'
          }`}
        >
          <div
            className={`h-5 w-5 rounded-full text-[11px] font-medium flex items-center justify-center ${
              currentStep >= step
                ? 'bg-primary text-primary-foreground'
                : 'bg-slate-200 text-muted-foreground'
            }`}
          >
            {currentStep > step ? <Check className="h-3 w-3" /> : step}
          </div>
          <span className="text-sm">
            {step === 1 && 'Was soll passieren?'}
            {step === 2 && 'Workflow bauen'}
            {step === 3 && 'Testen & speichern'}
          </span>
        </div>
      ))}
    </div>
  );
});

interface GuidedOverlayProps {
  currentStep: 1 | 2 | 3;
  templateOptions: TemplateOption[];
  selectedTemplateId: string | null;
  agentName: string;
  agentVisibility: 'private' | 'team' | 'public';
  onSelectTemplate: (id: string) => void;
  onLoadTemplate: (id: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onAgentNameChange: (name: string) => void;
  onAgentVisibilityChange: (visibility: 'private' | 'team' | 'public') => void;
  onSaveWorkflow: (metadata: {
    name: string;
    description: string;
    tags: string[];
    status: 'draft' | 'active';
    visibility: 'private' | 'team' | 'public';
  }) => void;
}

const GuidedOverlay = memo(function GuidedOverlay({
  currentStep,
  templateOptions,
  selectedTemplateId,
  agentName,
  agentVisibility,
  onSelectTemplate,
  onLoadTemplate,
  onNextStep,
  onPrevStep,
  onAgentNameChange,
  onAgentVisibilityChange,
  onSaveWorkflow,
}: GuidedOverlayProps) {
  return (
    <div className="absolute left-4 top-4 z-20 max-w-md space-y-4 bg-card border-2 border-border rounded-2xl p-5 backdrop-blur-xl shadow-lg">
      {/* Step 1: Choose Use Case */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-foreground">Was soll passieren?</h3>
          <p className="text-sm font-medium text-muted-foreground">
            Waehle einen Use Case. Wir laden sofort einen Starter-Workflow auf den Canvas.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {templateOptions.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => {
                  onSelectTemplate(tpl.id);
                  onLoadTemplate(tpl.id);
                  onNextStep();
                }}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 transition ${
                  selectedTemplateId === tpl.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-foreground hover:border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">{tpl.title}</div>
                    <div className="text-sm font-medium text-muted-foreground">{tpl.desc}</div>
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {tpl.bullets.map((b) => (
                        <li key={b}>- {b}</li>
                      ))}
                    </ul>
                  </div>
                  {selectedTemplateId === tpl.id && <Check className="h-4 w-4 text-primary" />}
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={onNextStep}
              disabled={!selectedTemplateId}
              className="px-5 py-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              Weiter <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Build Workflow */}
      {currentStep === 2 && (
        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-foreground">Workflow bauen</h3>
          <p className="text-sm font-medium text-muted-foreground">
            Passe den vorgegebenen Workflow an. Ziehe weitere Module aus der Library auf den Canvas.
          </p>
          <div className="rounded-xl border-2 border-border bg-muted/50 p-3 text-xs font-medium text-muted-foreground">
            Tipp: Library links ist eingeklappt. Oeffne sie, um Aktionen hinzuzufuegen und verbinde
            die Nodes per Drag & Drop.
          </div>
          <div className="flex justify-between">
            <button
              onClick={onPrevStep}
              className="px-4 py-2 text-sm border-2 border-border rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Zurueck
            </button>
            <button
              onClick={onNextStep}
              className="px-5 py-3 bg-primary text-primary-foreground rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              Weiter <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Test & Save */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-foreground">Testen & speichern</h3>
          <div className="rounded-xl border-2 border-border bg-muted/50 p-3 space-y-2 text-sm text-foreground">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status</span>
              <span className="text-primary font-semibold">Draft</span>
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              Validation: Keine Blocker gefunden.
            </div>
          </div>
          <div className="space-y-2">
            <input
              className="w-full rounded-xl bg-card px-3 py-2.5 text-sm border-2 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none"
              placeholder="Agent Name"
              value={agentName}
              onChange={(e) => onAgentNameChange(e.target.value)}
            />
            <select
              className="w-full rounded-xl bg-card px-3 py-2.5 text-sm border-2 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none"
              value={agentVisibility}
              onChange={(e) =>
                onAgentVisibilityChange(e.target.value as 'private' | 'team' | 'public')
              }
            >
              <option value="private">Private</option>
              <option value="team">Team</option>
              <option value="public">Public</option>
            </select>
          </div>
          <div className="flex justify-between">
            <button
              onClick={onPrevStep}
              className="px-4 py-2 text-sm border-2 border-border rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Zurueck
            </button>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm border-2 border-border rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors">
                Save Draft
              </button>
              <button className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
                Test Run
              </button>
              <button
                className="px-4 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
                onClick={() =>
                  onSaveWorkflow({
                    name: agentName || 'Mein Agent',
                    description: '',
                    tags: [],
                    status: 'draft',
                    visibility: agentVisibility,
                  })
                }
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const StudioMain = memo(function StudioMain({
  mode,
  currentStep,
  selectedTemplateId,
  agentName,
  agentVisibility,
  showLibrary,
  showWelcome,
  isDebugMode,
  currentWorkflow,
  nodes,
  edges,
  libraryGroups,
  templateOptions,
  onToggleLibrary,
  onSetShowWelcome,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onSave,
  onOpenPreview,
  onOpenVariables,
  onOpenTemplates,
  onOpenMarketplace,
  onSaveAsTemplate,
  onOpenToolRegistry,
  onOpenConnections,
  onOpenVersionHistory,
  onPublish,
  onArchive,
  onUnarchive,
  onNextStep,
  onPrevStep,
  onSelectTemplate,
  onLoadTemplate,
  onAgentNameChange,
  onAgentVisibilityChange,
  onSaveWorkflow,
  onReloadCanvas,
}: StudioMainProps) {
  const handleReloadCanvas = useCallback(() => {
    onReloadCanvas?.();
  }, [onReloadCanvas]);

  return (
    <>
      {/* Module Library (Left Sidebar) */}
      <ModuleLibrary
        showLibrary={showLibrary}
        libraryGroups={libraryGroups}
        mode={mode}
        currentStep={currentStep}
        onToggleLibrary={onToggleLibrary}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Guided Mode Stepper */}
        {mode === 'guided' && <GuidedStepper currentStep={currentStep} />}

        {/* Canvas Area */}
        <div className="flex-1 relative flex">
          {/* Guided Mode Overlay */}
          {mode === 'guided' && (
            <GuidedOverlay
              currentStep={currentStep}
              templateOptions={templateOptions}
              selectedTemplateId={selectedTemplateId}
              agentName={agentName}
              agentVisibility={agentVisibility}
              onSelectTemplate={onSelectTemplate}
              onLoadTemplate={onLoadTemplate}
              onNextStep={onNextStep}
              onPrevStep={onPrevStep}
              onAgentNameChange={onAgentNameChange}
              onAgentVisibilityChange={onAgentVisibilityChange}
              onSaveWorkflow={onSaveWorkflow}
            />
          )}

          {/* Canvas */}
          <div className="flex-1 relative">
            {/* Debug Mode Header */}
            {isDebugMode && <RunHeader />}

            {/* Canvas with Error Boundary */}
            <CanvasErrorBoundary
              onReload={handleReloadCanvas}
              workflowData={{
                nodes,
                edges,
                name: currentWorkflow?.name,
                id: currentWorkflow?.id,
              }}
            >
              <VisualCanvas
                onNodeSelect={onNodeSelect}
                onSave={onSave}
                onOpenPreview={onOpenPreview}
                onOpenVariables={onOpenVariables}
                onOpenTemplates={onOpenTemplates}
                onOpenMarketplace={onOpenMarketplace}
                onSaveAsTemplate={onSaveAsTemplate}
                onOpenToolRegistry={onOpenToolRegistry}
                onOpenConnections={onOpenConnections}
                onOpenVersionHistory={onOpenVersionHistory}
                currentWorkflow={currentWorkflow}
                onPublish={onPublish}
                onArchive={onArchive}
                onUnarchive={onUnarchive}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
              />
            </CanvasErrorBoundary>

            {/* Empty State (Advanced Mode) */}
            {mode === 'advanced' && showWelcome && nodes.length === 0 && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <div className="pointer-events-auto max-w-2xl rounded-2xl border-2 border-border bg-card p-8 shadow-2xl">
                  <h1 className="text-3xl font-bold text-foreground mb-4">Define Goal</h1>
                  <p className="text-sm font-medium text-muted-foreground mb-6">
                    Waehle ein Ziel oder starte mit einem Template.
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { title: 'CRM Follow-up', desc: 'Automatische Follow-ups im CRM' },
                      { title: 'Support Auto-Reply', desc: 'Antworten auf Support-Anfragen' },
                    ].map((tpl) => (
                      <div
                        key={tpl.title}
                        className="rounded-xl border-2 border-border bg-card p-4 hover:border-border hover:shadow-sm cursor-pointer transition-all"
                        onClick={() => onSetShowWelcome(false)}
                      >
                        <div className="text-xl mb-2 text-primary">*</div>
                        <div className="text-sm font-semibold text-foreground">{tpl.title}</div>
                        <div className="text-xs font-medium text-muted-foreground">{tpl.desc}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={onOpenTemplates}
                      className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      Use Template
                    </button>
                    <button
                      onClick={() => onSetShowWelcome(false)}
                      className="flex-1 rounded-xl border-2 border-border px-6 py-3 text-sm font-medium text-foreground transition hover:bg-muted/50"
                    >
                      Start from Scratch
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

export default StudioMain;
