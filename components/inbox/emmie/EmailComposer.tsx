'use client';

/**
 * Emmie Email Composer - Rich Split-View Email Editor
 *
 * Features:
 * - Split-view: Form (left) + HTML Preview (right)
 * - Markdown body with toolbar (bold, italic, link, list)
 * - AI Improve button (sends body to Emmie for optimization)
 * - Template insert button
 * - Draft save / Send with HITL confirmation
 * - Responsive (stacks on mobile)
 */

import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  X,
  Send,
  Save,
  Sparkles,
  Bold,
  Italic,
  Link,
  List,
  Heading2,
  LayoutTemplate,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmailComposerData {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  isHtml: boolean;
  replyToMessageId?: string;
  scheduledAt?: string;
}

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: EmailComposerData) => void;
  onDraft: (data: EmailComposerData) => void;
  onAIImprove?: (body: string) => Promise<string>;
  onOpenTemplates?: () => void;
  initialData?: Partial<EmailComposerData>;
  agentColor?: string;
  isSending?: boolean;
}

// Markdown formatting helpers
function insertMarkdown(
  textarea: HTMLTextAreaElement | null,
  body: string,
  setBody: (v: string) => void,
  prefix: string,
  suffix: string = ''
) {
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = body.substring(start, end);
  const replacement = `${prefix}${selected || 'text'}${suffix}`;
  const newBody = body.substring(0, start) + replacement + body.substring(end);
  setBody(newBody);
  // Restore cursor after state update
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(
      start + prefix.length,
      start + prefix.length + (selected.length || 4)
    );
  });
}

export function EmailComposer({
  isOpen,
  onClose,
  onSend,
  onDraft,
  onAIImprove,
  onOpenTemplates,
  initialData,
  agentColor = '#8B5CF6',
  isSending = false,
}: EmailComposerProps) {
  const [to, setTo] = useState(initialData?.to || '');
  const [cc, setCc] = useState(initialData?.cc || '');
  const [bcc, setBcc] = useState(initialData?.bcc || '');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isImproving, setIsImproving] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const canSend = to.trim() && subject.trim() && body.trim() && !isSending;

  // Build composer data
  const getComposerData = useCallback((): EmailComposerData => ({
    to: to.trim(),
    cc: cc.trim(),
    bcc: bcc.trim(),
    subject: subject.trim(),
    body: body.trim(),
    isHtml: true,
    replyToMessageId: initialData?.replyToMessageId,
    scheduledAt: scheduledAt || undefined,
  }), [to, cc, bcc, subject, body, initialData?.replyToMessageId, scheduledAt]);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(getComposerData());
  }, [canSend, onSend, getComposerData]);

  const handleDraft = useCallback(() => {
    onDraft(getComposerData());
  }, [onDraft, getComposerData]);

  const handleAIImprove = useCallback(async () => {
    if (!onAIImprove || !body.trim() || isImproving) return;
    setIsImproving(true);
    try {
      const improved = await onAIImprove(body);
      if (improved) setBody(improved);
    } finally {
      setIsImproving(false);
    }
  }, [onAIImprove, body, isImproving]);

  // Fill from template
  const fillFromTemplate = useCallback((templateSubject: string, templateBody: string) => {
    if (templateSubject) setSubject(templateSubject);
    if (templateBody) setBody(templateBody);
  }, []);

  // Expose fillFromTemplate on the component instance via window event
  // (Template picker dispatches 'emmie-template-fill' event)
  useMemo(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.subject || detail?.body) {
        fillFromTemplate(detail.subject || '', detail.body || '');
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('emmie-template-fill', handler);
      return () => window.removeEventListener('emmie-template-fill', handler);
    }
  }, [fillFromTemplate]);

  // Quick schedule options
  const scheduleOptions = [
    { label: 'In 1 Stunde', getValue: () => {
      const d = new Date(); d.setHours(d.getHours() + 1); return d.toISOString().slice(0, 16);
    }},
    { label: 'Morgen 9:00', getValue: () => {
      const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.toISOString().slice(0, 16);
    }},
    { label: 'Montag 8:00', getValue: () => {
      const d = new Date(); const diff = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + diff); d.setHours(8, 0, 0, 0); return d.toISOString().slice(0, 16);
    }},
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-5xl max-h-[85vh] bg-[#0d0d0d] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${agentColor}20` }}
              >
                <Send className="w-4 h-4" style={{ color: agentColor }} />
              </div>
              <h2 className="text-sm font-medium text-white">
                {initialData?.replyToMessageId ? 'Antwort verfassen' : 'Neue E-Mail'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body - Split View */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Left: Form */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
              {/* To */}
              <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/[0.04]">
                <label className="text-xs text-white/40 w-8 flex-shrink-0">An:</label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="empfaenger@beispiel.de"
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                />
                <button
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="text-[10px] text-white/40 hover:text-white/60 transition-colors px-1.5 py-0.5 rounded"
                >
                  {showCcBcc ? <ChevronUp className="w-3 h-3" /> : 'CC/BCC'}
                </button>
              </div>

              {/* CC / BCC */}
              {showCcBcc && (
                <>
                  <div className="flex items-center gap-2 px-5 py-2 border-b border-white/[0.04]">
                    <label className="text-xs text-white/40 w-8 flex-shrink-0">CC:</label>
                    <input
                      type="text"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="cc@beispiel.de"
                      className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2 border-b border-white/[0.04]">
                    <label className="text-xs text-white/40 w-8 flex-shrink-0">BCC:</label>
                    <input
                      type="text"
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      placeholder="bcc@beispiel.de"
                      className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Subject */}
              <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/[0.06]">
                <label className="text-xs text-white/40 w-8 flex-shrink-0">Betr.:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Betreff eingeben..."
                  className="flex-1 bg-transparent text-sm text-white font-medium placeholder-white/30 focus:outline-none"
                />
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-1 px-5 py-2 border-b border-white/[0.04] bg-white/[0.02]">
                <button
                  onClick={() => insertMarkdown(textareaRef, body, setBody, '**', '**')}
                  className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-md transition-colors"
                  title="Fett"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown(textareaRef, body, setBody, '*', '*')}
                  className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-md transition-colors"
                  title="Kursiv"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown(textareaRef, body, setBody, '[', '](url)')}
                  className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-md transition-colors"
                  title="Link"
                >
                  <Link className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown(textareaRef, body, setBody, '\n- ', '')}
                  className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-md transition-colors"
                  title="Liste"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertMarkdown(textareaRef, body, setBody, '\n## ', '')}
                  className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-md transition-colors"
                  title="Heading"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-white/[0.08] mx-1" />

                {/* Template Insert */}
                {onOpenTemplates && (
                  <button
                    onClick={onOpenTemplates}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-white/40 hover:text-violet-400 hover:bg-violet-500/10 rounded-md transition-colors"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Vorlage</span>
                  </button>
                )}

                {/* AI Improve */}
                {onAIImprove && (
                  <button
                    onClick={handleAIImprove}
                    disabled={isImproving || !body.trim()}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md transition-colors',
                      isImproving
                        ? 'text-violet-400 bg-violet-500/10'
                        : 'text-white/40 hover:text-violet-400 hover:bg-violet-500/10'
                    )}
                  >
                    {isImproving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{isImproving ? 'Verbessert...' : 'AI Verbessern'}</span>
                  </button>
                )}

                <div className="flex-1" />

                {/* Preview Toggle */}
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-white/40 hover:text-white/60 rounded-md transition-colors lg:hidden"
                >
                  {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>Preview</span>
                </button>
              </div>

              {/* Body Textarea */}
              <div className="flex-1 min-h-[200px]">
                <textarea
                  ref={setTextareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="E-Mail Inhalt schreiben... (Markdown wird unterstuetzt)"
                  className="w-full h-full min-h-[200px] px-5 py-4 bg-transparent text-sm text-white/90 placeholder-white/30 focus:outline-none resize-none leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                />
              </div>
            </div>

            {/* Right: Preview */}
            <div
              className={cn(
                'border-l border-white/[0.06] bg-white/[0.02] overflow-y-auto',
                showPreview ? 'w-full lg:w-[45%] min-h-[200px] lg:min-h-0' : 'hidden lg:block lg:w-[45%]'
              )}
            >
              <div className="px-4 py-2.5 border-b border-white/[0.04]">
                <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Vorschau</span>
              </div>
              <div className="px-5 py-4">
                {/* Preview Header */}
                {(to || subject) && (
                  <div className="mb-4 pb-3 border-b border-white/[0.06]">
                    {to && (
                      <div className="text-xs text-white/40 mb-1">
                        <span className="text-white/30">An:</span> {to}
                      </div>
                    )}
                    {cc && (
                      <div className="text-xs text-white/40 mb-1">
                        <span className="text-white/30">CC:</span> {cc}
                      </div>
                    )}
                    {subject && (
                      <div className="text-sm font-medium text-white mt-2">{subject}</div>
                    )}
                  </div>
                )}

                {/* Preview Body */}
                {body ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {body}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-white/20 italic">Vorschau erscheint hier...</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              {/* Draft */}
              <button
                onClick={handleDraft}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Als Entwurf</span>
              </button>

              {/* Schedule */}
              <div className="relative">
                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
                    scheduledAt
                      ? 'text-violet-400 bg-violet-500/10 border-violet-500/20'
                      : 'text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08]'
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{scheduledAt ? 'Geplant' : 'Spaeter'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showSchedule && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#111] border border-white/[0.08] rounded-xl shadow-lg z-10 py-1">
                    {scheduleOptions.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => { setScheduledAt(opt.getValue()); setShowSchedule(false); }}
                        className="w-full px-3 py-2 text-xs text-left text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                    <div className="border-t border-white/[0.06] mt-1 pt-1 px-3 py-2">
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full text-xs bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white focus:outline-none"
                      />
                    </div>
                    {scheduledAt && (
                      <button
                        onClick={() => { setScheduledAt(''); setShowSchedule(false); }}
                        className="w-full px-3 py-2 text-xs text-left text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Planung aufheben
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                'flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl transition-all',
                canSend
                  ? 'bg-violet-500 hover:bg-violet-400 text-white shadow-sm shadow-violet-500/25'
                  : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
              )}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{scheduledAt ? 'Planen' : 'Senden'}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
