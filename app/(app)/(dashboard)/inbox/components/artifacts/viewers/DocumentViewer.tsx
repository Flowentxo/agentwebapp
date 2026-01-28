'use client';

/**
 * DocumentViewer - Markdown/Text document viewer and editor
 * Supports email drafts and markdown documents
 */

import React, { useState, useCallback } from 'react';
import { Copy, Check, Eye, Edit3, AlignLeft, AlignCenter, Bold, Italic, List, Link as LinkIcon } from 'lucide-react';
import type { ArtifactType } from '@/types/inbox';

interface DocumentViewerProps {
  content: string;
  type: ArtifactType;
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-white mt-6 mb-3">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold"><em class="italic">$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-white/90">$1</em>');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-black/30 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm font-mono text-emerald-400">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-card/10 px-1.5 py-0.5 rounded text-sm font-mono text-amber-400">$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener">$1</a>');

  // Unordered lists
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="ml-4 text-white/80">$1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-2 space-y-1">$&</ul>');

  // Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li class="ml-4 text-white/80">$1</li>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-white/10 my-6" />');

  // Blockquotes
  html = html.replace(/^>\s+(.*)$/gm, '<blockquote class="border-l-4 border-blue-500/50 pl-4 my-4 text-white/70 italic">$1</blockquote>');

  // Paragraphs (lines with content)
  html = html.replace(/^(?!<[a-z])(.*[^\s].*)$/gm, '<p class="text-white/80 my-2 leading-relaxed">$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p class="[^"]*"><\/p>/g, '');

  return html;
}

export function DocumentViewer({
  content,
  type,
  onChange,
  readOnly = false,
}: DocumentViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  const isEmail = type === 'email_draft';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  // Insert formatting helper
  const insertFormatting = (before: string, after: string = before) => {
    if (!onChange) return;
    // This is a simplified version - in production you'd handle selection
    onChange(content + before + after);
  };

  // Word/character count
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/60 px-2 py-0.5 rounded bg-card/10">
            {isEmail ? 'Email Draft' : 'Markdown'}
          </span>
          <span className="text-xs text-white/40">
            {wordCount} words / {charCount} chars
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Formatting buttons (only in edit mode) */}
          {!isPreviewMode && !readOnly && (
            <>
              <button
                onClick={() => insertFormatting('**')}
                className="p-1.5 rounded text-white/40 hover:text-white hover:bg-card/5 transition-colors"
                title="Bold"
              >
                <Bold size={14} />
              </button>
              <button
                onClick={() => insertFormatting('*')}
                className="p-1.5 rounded text-white/40 hover:text-white hover:bg-card/5 transition-colors"
                title="Italic"
              >
                <Italic size={14} />
              </button>
              <button
                onClick={() => insertFormatting('\n- ')}
                className="p-1.5 rounded text-white/40 hover:text-white hover:bg-card/5 transition-colors"
                title="List"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => insertFormatting('[', '](url)')}
                className="p-1.5 rounded text-white/40 hover:text-white hover:bg-card/5 transition-colors"
                title="Link"
              >
                <LinkIcon size={14} />
              </button>
              <div className="w-px h-4 bg-card/10 mx-1" />
            </>
          )}

          {/* Toggle preview/edit */}
          {!readOnly && (
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`p-1.5 rounded transition-colors ${
                isPreviewMode
                  ? 'bg-card/10 text-white'
                  : 'text-white/40 hover:text-white hover:bg-card/5'
              }`}
              title={isPreviewMode ? 'Edit mode' : 'Preview mode'}
            >
              {isPreviewMode ? <Edit3 size={14} /> : <Eye size={14} />}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-white/40 hover:text-white hover:bg-card/5 transition-colors"
            title="Copy content"
          >
            {copied ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {isPreviewMode || readOnly ? (
          /* Preview mode */
          <div className="p-6">
            {isEmail ? (
              /* Email-specific styling */
              <div className="max-w-2xl mx-auto">
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
                />
              </div>
            ) : (
              /* Markdown preview */
              <div
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
              />
            )}
          </div>
        ) : (
          /* Edit mode */
          <div className="h-full">
            <textarea
              value={content}
              onChange={handleChange}
              className="w-full h-full p-6 bg-transparent text-white/90 text-sm leading-relaxed resize-none focus:outline-none placeholder-white/30"
              placeholder={isEmail ? 'Compose your email...' : 'Write your document in Markdown...'}
              spellCheck={true}
            />
          </div>
        )}
      </div>

      {/* Footer with tips */}
      {!isPreviewMode && !readOnly && (
        <div className="px-4 py-2 bg-black/20 border-t border-white/5 text-xs text-white/40">
          <span className="mr-4">**bold**</span>
          <span className="mr-4">*italic*</span>
          <span className="mr-4">`code`</span>
          <span className="mr-4">[link](url)</span>
          <span>- list item</span>
        </div>
      )}
    </div>
  );
}
