'use client';

import { useState, useCallback } from 'react';
import {
  X,
  Plus,
  GripVertical,
  Trash2,
  Play,
  Save,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { useDashboardStore, useAgents } from '@/store/useDashboardStore';
import type { PipelineStep, CreatePipelineData, PipelineTriggerType } from '@/store/slices/createPipelineSlice';

// ============================================================================
// TYPES
// ============================================================================

interface PipelineBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  editingPipelineId?: string | null;
}

interface StepFormData {
  id: string;
  agentId: string;
  instruction: string;
}

// ============================================================================
// PIPELINE BUILDER COMPONENT
// ============================================================================

export function PipelineBuilder({ isOpen, onClose, editingPipelineId }: PipelineBuilderProps) {
  const agents = useAgents();
  const createPipeline = useDashboardStore((s) => s.createPipeline);
  const updatePipeline = useDashboardStore((s) => s.updatePipeline);
  const getPipelineById = useDashboardStore((s) => s.getPipelineById);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<PipelineTriggerType>('manual');
  const [steps, setSteps] = useState<StepFormData[]>([]);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing pipeline data if editing
  useState(() => {
    if (editingPipelineId) {
      const pipeline = getPipelineById(editingPipelineId);
      if (pipeline) {
        setName(pipeline.name);
        setDescription(pipeline.description || '');
        setTriggerType(pipeline.triggerType);
        setSteps(
          pipeline.steps.map((s) => ({
            id: s.id,
            agentId: s.agentId,
            instruction: s.instruction,
          }))
        );
      }
    }
  });

  // Reset form
  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setTriggerType('manual');
    setSteps([]);
    setExpandedStep(null);
    setErrors({});
  }, []);

  // Add a new step
  const addStep = useCallback(() => {
    const newStep: StepFormData = {
      id: `new-step-${Date.now()}`,
      agentId: agents[0]?.id || '',
      instruction: '',
    };
    setSteps((prev) => [...prev, newStep]);
    setExpandedStep(newStep.id);
  }, [agents]);

  // Remove a step
  const removeStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    if (expandedStep === stepId) {
      setExpandedStep(null);
    }
  }, [expandedStep]);

  // Update a step
  const updateStep = useCallback((stepId: string, field: keyof StepFormData, value: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, [field]: value } : s))
    );
  }, []);

  // Move step up
  const moveStepUp = useCallback((index: number) => {
    if (index === 0) return;
    setSteps((prev) => {
      const newSteps = [...prev];
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      return newSteps;
    });
  }, []);

  // Move step down
  const moveStepDown = useCallback((index: number) => {
    setSteps((prev) => {
      if (index === prev.length - 1) return prev;
      const newSteps = [...prev];
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
      return newSteps;
    });
  }, []);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Pipeline name is required';
    }

    if (steps.length === 0) {
      newErrors.steps = 'At least one step is required';
    }

    steps.forEach((step, index) => {
      if (!step.agentId) {
        newErrors[`step-${index}-agent`] = 'Agent is required';
      }
      if (!step.instruction.trim()) {
        newErrors[`step-${index}-instruction`] = 'Instruction is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, steps]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!validateForm()) return;

    const pipelineSteps: Omit<PipelineStep, 'id' | 'order' | 'status'>[] = steps.map((s) => {
      const agent = agents.find((a) => a.id === s.agentId);
      return {
        agentId: s.agentId,
        agentName: agent?.name || 'Unknown',
        agentColor: agent?.color || '#6B7280',
        instruction: s.instruction,
      };
    });

    if (editingPipelineId) {
      updatePipeline(editingPipelineId, {
        name,
        description: description || undefined,
        triggerType,
        steps: pipelineSteps.map((s, i) => ({
          ...s,
          id: `step-${Date.now()}-${i}`,
          order: i,
          status: 'pending' as const,
        })),
      });
    } else {
      const data: CreatePipelineData = {
        name,
        description: description || undefined,
        triggerType,
        steps: pipelineSteps,
      };
      createPipeline(data);
    }

    resetForm();
    onClose();
  }, [name, description, triggerType, steps, agents, editingPipelineId, validateForm, createPipeline, updatePipeline, resetForm, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-[#1a1a2e] border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {editingPipelineId ? 'Edit Pipeline' : 'Create Pipeline'}
              </h2>
              <p className="text-sm text-white/50">Chain agent tasks into reusable workflows</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-card/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Pipeline Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Pipeline Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily Report Generator"
              className={`w-full px-4 py-3 rounded-xl bg-card/5 border text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                errors.name ? 'border-red-500/50' : 'border-white/10'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this pipeline does..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-card/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
            />
          </div>

          {/* Trigger Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Trigger Type
            </label>
            <div className="flex gap-2">
              {(['manual', 'schedule', 'webhook'] as PipelineTriggerType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTriggerType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    triggerType === type
                      ? 'bg-purple-500 text-white'
                      : 'bg-card/5 text-white/60 hover:bg-card/10'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Steps Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-white/70">
                Pipeline Steps
              </label>
              <button
                onClick={addStep}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Step
              </button>
            </div>

            {errors.steps && (
              <p className="mb-3 text-sm text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.steps}
              </p>
            )}

            {/* Steps List */}
            <div className="space-y-3">
              {steps.length === 0 ? (
                <div className="text-center py-8 text-white/40 border border-dashed border-white/20 rounded-xl">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No steps yet. Click "Add Step" to start building your pipeline.</p>
                </div>
              ) : (
                steps.map((step, index) => {
                  const agent = agents.find((a) => a.id === step.agentId);
                  const isExpanded = expandedStep === step.id;

                  return (
                    <div
                      key={step.id}
                      className="border border-white/10 rounded-xl overflow-hidden bg-card/5"
                    >
                      {/* Step Header */}
                      <div
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-card/5 transition-colors"
                        onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                      >
                        <div className="flex items-center gap-2 text-white/40">
                          <GripVertical className="w-4 h-4" />
                          <span className="text-sm font-medium">#{index + 1}</span>
                        </div>

                        <div
                          className="w-6 h-6 rounded-full flex-shrink-0"
                          style={{ backgroundColor: agent?.color || '#6B7280' }}
                        />

                        <span className="flex-1 text-white font-medium truncate">
                          {agent?.name || 'Select Agent'}
                          {step.instruction && (
                            <span className="text-white/40 font-normal ml-2">
                              - {step.instruction.slice(0, 40)}
                              {step.instruction.length > 40 ? '...' : ''}
                            </span>
                          )}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStepUp(index);
                            }}
                            disabled={index === 0}
                            className="p-1.5 rounded hover:bg-card/10 disabled:opacity-30 transition-colors"
                          >
                            <ChevronUp className="w-4 h-4 text-white/60" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStepDown(index);
                            }}
                            disabled={index === steps.length - 1}
                            className="p-1.5 rounded hover:bg-card/10 disabled:opacity-30 transition-colors"
                          >
                            <ChevronDown className="w-4 h-4 text-white/60" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeStep(step.id);
                            }}
                            className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Step Details (Expanded) */}
                      {isExpanded && (
                        <div className="p-4 pt-0 space-y-3 border-t border-white/10">
                          {/* Agent Selection */}
                          <div>
                            <label className="block text-xs font-medium text-white/50 mb-1.5">
                              Select Agent
                            </label>
                            <select
                              value={step.agentId}
                              onChange={(e) => updateStep(step.id, 'agentId', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg bg-card/5 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                                errors[`step-${index}-agent`]
                                  ? 'border-red-500/50'
                                  : 'border-white/10'
                              }`}
                            >
                              <option value="" className="bg-[#1a1a2e]">
                                -- Select an agent --
                              </option>
                              {agents.map((agent) => (
                                <option key={agent.id} value={agent.id} className="bg-[#1a1a2e]">
                                  {agent.name} ({agent.role})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Instruction */}
                          <div>
                            <label className="block text-xs font-medium text-white/50 mb-1.5">
                              Instruction
                            </label>
                            <textarea
                              value={step.instruction}
                              onChange={(e) => updateStep(step.id, 'instruction', e.target.value)}
                              placeholder="What should this agent do? Be specific..."
                              rows={3}
                              className={`w-full px-3 py-2 rounded-lg bg-card/5 border text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none ${
                                errors[`step-${index}-instruction`]
                                  ? 'border-red-500/50'
                                  : 'border-white/10'
                              }`}
                            />
                            {index > 0 && (
                              <p className="mt-1 text-xs text-white/40">
                                This step will receive the output from Step #{index} as context.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Context Chain Explanation */}
          {steps.length >= 2 && (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-4">
              <h4 className="text-sm font-medium text-purple-400 mb-1">Context Chaining</h4>
              <p className="text-xs text-white/60">
                Each step&apos;s output becomes the context for the next step. This allows you to build
                sophisticated workflows where agents build upon each other&apos;s work.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-card/10 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Save className="w-4 h-4" />
              {editingPipelineId ? 'Save Changes' : 'Create Pipeline'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PipelineBuilder;
