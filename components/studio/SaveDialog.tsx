'use client';

/**
 * SAVE DIALOG
 *
 * Dialog for saving workflows with metadata
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Tag } from 'lucide-react';

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    tags: string[];
    status: 'draft' | 'active';
    visibility: 'private' | 'team' | 'public';
  }) => void;
  initialData?: {
    name?: string;
    description?: string;
    tags?: string[];
    status?: 'draft' | 'active';
    visibility?: 'private' | 'team' | 'public';
  };
}

export function SaveDialog({ isOpen, onClose, onSave, initialData }: SaveDialogProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>(initialData?.status || 'draft');
  const [visibility, setVisibility] = useState<'private' | 'team' | 'public'>(
    initialData?.visibility || 'private'
  );
  const [saving, setSaving] = useState(false);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        tags,
        status,
        visibility,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-surface-1 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="border-b border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-text flex items-center gap-3">
                  <Save className="h-6 w-6 text-[rgb(var(--accent))]" />
                  Save Workflow
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  Save your workflow for later use
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-text-muted transition hover:bg-card/5 hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Workflow Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Workflow"
                className="w-full rounded-lg border border-white/10 bg-surface-0 px-4 py-2.5 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))]"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this workflow does..."
                rows={3}
                className="w-full resize-none rounded-lg border border-white/10 bg-surface-0 px-4 py-2.5 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))]"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add a tag..."
                  className="flex-1 rounded-lg border border-white/10 bg-surface-0 px-4 py-2 text-sm text-text outline-none transition focus:border-[rgb(var(--accent))]"
                />
                <button
                  onClick={handleAddTag}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-0 px-4 py-2 text-sm text-text transition hover:bg-card/5"
                >
                  <Tag className="h-4 w-4" />
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgb(var(--accent))]/10 text-sm text-[rgb(var(--accent))]"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-[rgb(var(--accent))] hover:opacity-70"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Status
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setStatus('draft')}
                  className={`flex-1 rounded-lg border p-3 text-sm transition ${
                    status === 'draft'
                      ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10 text-text'
                      : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                  }`}
                >
                  Draft
                </button>
                <button
                  onClick={() => setStatus('active')}
                  className={`flex-1 rounded-lg border p-3 text-sm transition ${
                    status === 'active'
                      ? 'border-green-400 bg-green-400/10 text-green-400'
                      : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                  }`}
                >
                  Active
                </button>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Visibility
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setVisibility('private')}
                  className={`flex-1 rounded-lg border p-3 text-sm transition ${
                    visibility === 'private'
                      ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10 text-text'
                      : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                  }`}
                >
                  Private
                </button>
                <button
                  onClick={() => setVisibility('team')}
                  className={`flex-1 rounded-lg border p-3 text-sm transition ${
                    visibility === 'team'
                      ? 'border-blue-400 bg-blue-400/10 text-blue-400'
                      : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                  }`}
                >
                  Team
                </button>
                <button
                  onClick={() => setVisibility('public')}
                  className={`flex-1 rounded-lg border p-3 text-sm transition ${
                    visibility === 'public'
                      ? 'border-purple-400 bg-purple-400/10 text-purple-400'
                      : 'border-white/10 bg-surface-0 text-text-muted hover:bg-card/5'
                  }`}
                >
                  Public
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-text transition hover:bg-card/5"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[rgb(var(--accent))] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Workflow
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
