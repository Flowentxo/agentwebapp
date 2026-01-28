'use client';

/**
 * HORIZON COMPOSER
 *
 * Floating glassmorphism input bar for the Flowent Horizon interface.
 * Features:
 * - Agent selector integration
 * - Voice mode trigger
 * - Auto-expanding textarea
 * - Attachment support
 * - Keyboard shortcuts
 * - Mobile responsive
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Mic,
  Paperclip,
  Sparkles,
  Image as ImageIcon,
  X,
  Loader2,
  Command,
  CornerDownLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentSelector, useAgentSelector } from './AgentSelector';
import { AgentPersona } from '@/lib/agents/personas';

interface HorizonComposerProps {
  onSend: (message: string, agentId: string) => void | Promise<void>;
  onVoiceStart?: (agentId: string) => void;
  onAttachment?: (files: File[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  defaultAgentId?: string;
  showVoiceButton?: boolean;
  showAttachButton?: boolean;
  variant?: 'floating' | 'inline' | 'fullWidth';
}

export const HorizonComposer: React.FC<HorizonComposerProps> = ({
  onSend,
  onVoiceStart,
  onAttachment,
  disabled = false,
  isLoading = false,
  placeholder,
  className,
  defaultAgentId = 'omni',
  showVoiceButton = true,
  showAttachButton = true,
  variant = 'floating',
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Agent selector state
  const agentSelector = useAgentSelector(defaultAgentId);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Handle message submission
  const handleSubmit = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || isLoading) return;

    try {
      await onSend(trimmedMessage, agentSelector.selectedAgent.id);
      setMessage('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [message, disabled, isLoading, onSend, agentSelector.selectedAgent.id]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Submit on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
      return;
    }
  }, [handleSubmit]);

  // Handle voice button click
  const handleVoiceClick = useCallback(() => {
    if (onVoiceStart) {
      onVoiceStart(agentSelector.selectedAgent.id);
    }
  }, [onVoiceStart, agentSelector.selectedAgent.id]);

  // Handle file attachment
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
      onAttachment?.(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onAttachment]);

  // Remove attachment
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Dynamic placeholder
  const dynamicPlaceholder = placeholder ||
    `Message ${agentSelector.selectedAgent.name}...`;

  // Variant-specific container styles
  const containerStyles = cn(
    // Base styles
    "relative z-40",
    // Variant styles
    variant === 'floating' && [
      "fixed bottom-6 left-1/2 -translate-x-1/2",
      "w-[calc(100%-2rem)] max-w-2xl",
    ],
    variant === 'inline' && "w-full",
    variant === 'fullWidth' && "w-full px-4",
    className
  );

  return (
    <div className={containerStyles}>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          // Glassmorphism container
          "relative flex flex-col gap-2 rounded-2xl",
          "border border-white/10",
          "bg-black/60 backdrop-blur-xl",
          "shadow-2xl shadow-black/40",
          "p-2",
          // Focus ring
          isFocused && "ring-1 ring-white/20"
        )}
      >
        {/* --- Top Row: Agent Selector & Attachments --- */}
        <div className="flex items-center justify-between px-1">
          {/* Agent Selector */}
          <AgentSelector
            selectedAgent={agentSelector.selectedAgent}
            onSelect={agentSelector.onSelect}
            isOpen={agentSelector.isOpen}
            onToggle={agentSelector.onToggle}
            disabled={disabled || isLoading}
            variant="default"
          />

          {/* Optional: Model indicator or other controls */}
          <div className="flex items-center gap-1 text-xs text-white/40">
            <Sparkles className="h-3 w-3" />
            <span>GPT-4</span>
          </div>
        </div>

        {/* --- Attachments Preview --- */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex gap-2 px-1 overflow-x-auto"
            >
              {attachments.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative flex-shrink-0 group"
                >
                  <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-white/50" />
                    ) : (
                      <Paperclip className="h-4 w-4 text-white/50" />
                    )}
                    <span className="text-xs text-white/70 truncate max-w-[100px]">
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="p-0.5 rounded hover:bg-white/10"
                    >
                      <X className="h-3 w-3 text-white/50" />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Input Row --- */}
        <div className="flex items-end gap-2">
          {/* Attachment Button */}
          {showAttachButton && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isLoading}
                className={cn(
                  "flex-shrink-0 p-2 rounded-lg transition-all",
                  "text-white/50 hover:text-white/80 hover:bg-white/5",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={dynamicPlaceholder}
              disabled={disabled || isLoading}
              rows={1}
              className={cn(
                "w-full resize-none",
                "bg-transparent text-white placeholder-white/40",
                "focus:outline-none",
                "text-sm leading-relaxed",
                "py-2 px-1",
                "min-h-[40px] max-h-[200px]",
                "disabled:opacity-50"
              )}
              style={{ height: 'auto' }}
            />
          </div>

          {/* Voice Button */}
          {showVoiceButton && onVoiceStart && (
            <button
              type="button"
              onClick={handleVoiceClick}
              disabled={disabled || isLoading}
              className={cn(
                "flex-shrink-0 p-2 rounded-lg transition-all",
                "text-white/50 hover:text-cyan-400 hover:bg-cyan-500/10",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "group"
              )}
              title="Start voice conversation"
            >
              <Mic className="h-5 w-5 group-hover:animate-pulse" />
            </button>
          )}

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim() || disabled || isLoading}
            className={cn(
              "flex-shrink-0 p-2 rounded-lg transition-all",
              "bg-gradient-to-r from-cyan-500 to-blue-500",
              "text-white",
              "hover:opacity-90",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "shadow-lg shadow-cyan-500/20"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* --- Keyboard Hint --- */}
        <div className="flex items-center justify-end gap-3 px-1 -mt-1">
          <div className="flex items-center gap-1 text-[10px] text-white/30">
            <CornerDownLeft className="h-2.5 w-2.5" />
            <span>Send</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/30">
            <span>Shift</span>
            <span>+</span>
            <CornerDownLeft className="h-2.5 w-2.5" />
            <span>New line</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Re-export hook for external use
export { useAgentSelector };

export default HorizonComposer;
