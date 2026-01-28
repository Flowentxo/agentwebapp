'use client';

/**
 * ArtifactRenderer - Generative UI Component for Voice Mode
 * Renders code, tables, markdown, and charts within the voice interface
 *
 * Features:
 * - Syntax-highlighted code with copy button
 * - Responsive table rendering
 * - Markdown with GitHub-flavored extensions
 * - Animated entry transitions
 * - Dark mode optimized for voice overlay
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Code2, Table2, FileText, BarChart3, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArtifactType } from '@/lib/services/VoiceSocketService';

// ============================================================================
// TYPES
// ============================================================================

export interface ArtifactData {
  id: string;
  title: string;
  type: ArtifactType;
  content: string;
  language?: string;
  metadata?: {
    rows?: number;
    columns?: string[];
    chartType?: string;
  };
  timestamp: string;
}

interface ArtifactRendererProps {
  artifact: ArtifactData;
  onClose: () => void;
  className?: string;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const contentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delay: 0.1,
      duration: 0.3,
    },
  },
};

// ============================================================================
// ICON MAP
// ============================================================================

const typeIcons: Record<ArtifactType, typeof Code2> = {
  code: Code2,
  table: Table2,
  markdown: FileText,
  chart: BarChart3,
  diagram: GitBranch,
};

const typeLabels: Record<ArtifactType, string> = {
  code: 'Code',
  table: 'Table',
  markdown: 'Document',
  chart: 'Chart',
  diagram: 'Diagram',
};

// ============================================================================
// CODE RENDERER
// ============================================================================

function CodeRenderer({ content, language }: { content: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [content]);

  return (
    <div className="relative group">
      {/* Language badge */}
      {language && (
        <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">
          {language}
        </div>
      )}

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={cn(
          'absolute top-3 right-3 p-2 rounded-lg transition-all duration-200',
          'bg-slate-700/50 hover:bg-slate-600 backdrop-blur-sm',
          'opacity-0 group-hover:opacity-100',
          copied && 'opacity-100 bg-green-600/50'
        )}
        title={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-slate-300" />
        )}
      </button>

      {/* Code content */}
      <pre className="overflow-x-auto p-4 pt-10 bg-slate-900/80 rounded-xl text-sm font-mono leading-relaxed">
        <code className="text-slate-100">{content}</code>
      </pre>
    </div>
  );
}

// ============================================================================
// TABLE RENDERER
// ============================================================================

function TableRenderer({ content }: { content: string }) {
  const tableData = useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          columns: Object.keys(parsed[0]),
          rows: parsed,
        };
      }
    } catch {
      // Not valid JSON, try to render as-is
    }
    return null;
  }, [content]);

  if (!tableData) {
    return (
      <div className="p-4 bg-slate-900/80 rounded-xl">
        <pre className="text-sm font-mono text-slate-300">{content}</pre>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-slate-900/80 rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            {tableData.columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left font-semibold text-slate-200 bg-slate-800/50"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                'border-b border-slate-800 transition-colors',
                'hover:bg-slate-800/30'
              )}
            >
              {tableData.columns.map((col) => (
                <td key={col} className="px-4 py-3 text-slate-300">
                  {String(row[col] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-800">
        {tableData.rows.length} rows × {tableData.columns.length} columns
      </div>
    </div>
  );
}

// ============================================================================
// MARKDOWN RENDERER
// ============================================================================

function MarkdownRenderer({ content }: { content: string }) {
  // Simple markdown parsing for common elements
  const rendered = useMemo(() => {
    let html = content
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-100 mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-slate-100 mt-5 mb-3">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-slate-100 mt-6 mb-4">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-100">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-800 rounded text-cyan-400 text-sm font-mono">$1</code>')
      // Lists
      .replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-300">• $1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-slate-300 list-decimal">$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="text-slate-300 leading-relaxed mb-3">');

    return `<p class="text-slate-300 leading-relaxed mb-3">${html}</p>`;
  }, [content]);

  return (
    <div
      className="prose prose-invert prose-sm max-w-none p-4 bg-slate-900/80 rounded-xl"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

// ============================================================================
// CHART PLACEHOLDER (Can be extended with Recharts/D3)
// ============================================================================

function ChartRenderer({ content }: { content: string }) {
  // Placeholder - in production, parse content and render with Recharts
  return (
    <div className="p-8 bg-slate-900/80 rounded-xl flex flex-col items-center justify-center min-h-[200px]">
      <BarChart3 className="w-12 h-12 text-slate-500 mb-4" />
      <p className="text-slate-400 text-sm text-center">
        Chart visualization coming soon
      </p>
      <pre className="mt-4 text-xs text-slate-500 max-w-full overflow-x-auto">
        {content.substring(0, 100)}...
      </pre>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ArtifactRenderer({ artifact, onClose, className }: ArtifactRendererProps) {
  const Icon = typeIcons[artifact.type] || FileText;

  const renderContent = useCallback(() => {
    switch (artifact.type) {
      case 'code':
        return <CodeRenderer content={artifact.content} language={artifact.language} />;
      case 'table':
        return <TableRenderer content={artifact.content} />;
      case 'markdown':
        return <MarkdownRenderer content={artifact.content} />;
      case 'chart':
        return <ChartRenderer content={artifact.content} />;
      case 'diagram':
        return <MarkdownRenderer content={artifact.content} />;
      default:
        return <MarkdownRenderer content={artifact.content} />;
    }
  }, [artifact]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'relative w-full max-w-2xl mx-auto',
        'bg-slate-900/60 backdrop-blur-xl',
        'border border-slate-700/50 rounded-2xl',
        'shadow-2xl shadow-black/30',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-800/80">
            <Icon className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-medium text-slate-100 text-sm">{artifact.title}</h3>
            <p className="text-xs text-slate-500">{typeLabels[artifact.type]}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className={cn(
            'p-2 rounded-lg transition-all duration-200',
            'text-slate-400 hover:text-slate-200',
            'hover:bg-slate-700/50'
          )}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar"
      >
        {renderContent()}
      </motion.div>
    </motion.div>
  );
}

export default ArtifactRenderer;
