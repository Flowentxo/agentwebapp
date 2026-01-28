'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Loader2, Sparkles, Globe, Lock } from 'lucide-react';
import { useWorkspace } from '@/lib/contexts/workspace-context';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'team'>('private');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setVisibility('private');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Bitte gib einen Namen für den Workspace ein');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createWorkspace(name.trim(), description.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Workspaces');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-lg bg-[#1a1a1c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onKeyDown={handleKeyDown}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Neuer Workspace</h2>
                    <p className="text-sm text-white/40">Erstelle einen neuen Arbeitsbereich</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-card/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Name Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">
                    Workspace Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                    placeholder="z.B. Marketing Team, Projekt Alpha..."
                    className="w-full px-4 py-3 bg-card/[0.03] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Description Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">
                    Beschreibung <span className="text-white/30">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Wofür wird dieser Workspace verwendet?"
                    rows={3}
                    className="w-full px-4 py-3 bg-card/[0.03] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Visibility Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">
                    Sichtbarkeit
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVisibility('private')}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                        visibility === 'private'
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-white'
                          : 'bg-card/[0.02] border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <Lock className={`w-5 h-5 ${visibility === 'private' ? 'text-indigo-400' : ''}`} />
                      <div className="text-left">
                        <p className="text-sm font-medium">Privat</p>
                        <p className="text-xs text-white/40">Nur für dich</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility('team')}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                        visibility === 'team'
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-white'
                          : 'bg-card/[0.02] border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <Globe className={`w-5 h-5 ${visibility === 'team' ? 'text-indigo-400' : ''}`} />
                      <div className="text-left">
                        <p className="text-sm font-medium">Team</p>
                        <p className="text-xs text-white/40">Für dein Team</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <span className="text-sm text-red-400">{error}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-card/5 transition-colors disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Erstelle...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Workspace erstellen
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
