'use client';

/**
 * SAVE AS TEMPLATE DIALOG
 *
 * Dialog for saving current workflow as a reusable template
 */

import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { Node, Edge } from 'reactflow';
import { exportWorkflowAsTemplate } from '@/lib/studio/template-utils';
import { TemplateCategory, TemplateDifficulty } from '@/lib/studio/types';

interface SaveAsTemplateDialogProps {
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
}

export function SaveAsTemplateDialog({ nodes, edges, onClose }: SaveAsTemplateDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'automation' as TemplateCategory,
    difficulty: 'beginner' as TemplateDifficulty,
    author: 'Your Name',
    tags: '',
    useCase: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.useCase.trim()) {
      newErrors.useCase = 'Use case is required';
    }

    if (!formData.author.trim()) {
      newErrors.author = 'Author name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const tags = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    exportWorkflowAsTemplate(nodes, edges, {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      difficulty: formData.difficulty,
      author: formData.author,
      tags,
      useCase: formData.useCase
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl max-h-[90vh] bg-surface-1 rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-text mb-1">Save as Template</h2>
              <p className="text-sm text-text-muted">
                Export your workflow as a reusable template
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-card/5 transition text-text-muted hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Template Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., My Custom Workflow"
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.name ? 'border-red-500/50' : 'border-white/10'
              } bg-surface-0 text-sm text-text placeholder-text-muted outline-none focus:border-[rgb(var(--accent))] transition`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this workflow does..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.description ? 'border-red-500/50' : 'border-white/10'
              } bg-surface-0 text-sm text-text placeholder-text-muted outline-none focus:border-[rgb(var(--accent))] transition resize-none`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-400">{errors.description}</p>
            )}
          </div>

          {/* Use Case */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Use Case <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.useCase}
              onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
              placeholder="Explain the business problem this solves..."
              rows={2}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.useCase ? 'border-red-500/50' : 'border-white/10'
              } bg-surface-0 text-sm text-text placeholder-text-muted outline-none focus:border-[rgb(var(--accent))] transition resize-none`}
            />
            {errors.useCase && (
              <p className="mt-1 text-xs text-red-400">{errors.useCase}</p>
            )}
          </div>

          {/* Category & Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as TemplateCategory })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-surface-0 text-sm text-text outline-none focus:border-[rgb(var(--accent))] transition"
              >
                <option value="customer-support">Customer Support</option>
                <option value="data-analysis">Data Analysis</option>
                <option value="content-creation">Content Creation</option>
                <option value="automation">Automation</option>
                <option value="research">Research</option>
                <option value="integration">Integration</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as TemplateDifficulty })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-surface-0 text-sm text-text outline-none focus:border-[rgb(var(--accent))] transition"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Author <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="Your name or organization"
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.author ? 'border-red-500/50' : 'border-white/10'
              } bg-surface-0 text-sm text-text placeholder-text-muted outline-none focus:border-[rgb(var(--accent))] transition`}
            />
            {errors.author && (
              <p className="mt-1 text-xs text-red-400">{errors.author}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., email, automation, AI (comma-separated)"
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-surface-0 text-sm text-text placeholder-text-muted outline-none focus:border-[rgb(var(--accent))] transition"
            />
            <p className="mt-1 text-xs text-text-muted">
              Separate tags with commas
            </p>
          </div>

          {/* Workflow Stats */}
          <div className="rounded-lg border border-white/10 bg-surface-0 p-4">
            <h3 className="text-xs font-semibold text-text mb-3">Workflow Overview</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-text-muted">Total Nodes:</span>
                <span className="ml-2 font-medium text-text">{nodes.length}</span>
              </div>
              <div>
                <span className="text-text-muted">Connections:</span>
                <span className="ml-2 font-medium text-text">{edges.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-card/5 text-sm font-medium text-text transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={nodes.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[rgb(var(--accent))] hover:opacity-90 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Save as Template
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
