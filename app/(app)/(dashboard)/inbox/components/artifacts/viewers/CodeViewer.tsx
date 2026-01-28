'use client';

/**
 * CodeViewer - Syntax-highlighted code display and editing
 * Supports multiple languages with copy functionality
 */

import React, { useState, useCallback } from 'react';
import { Copy, Check, WrapText, Hash } from 'lucide-react';

interface CodeViewerProps {
  content: string;
  language?: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

// Basic keyword highlighting for common languages
const languageKeywords: Record<string, { keywords: string[]; types: string[]; builtins: string[] }> = {
  typescript: {
    keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'extends', 'implements', 'default', 'switch', 'case', 'break', 'continue'],
    types: ['string', 'number', 'boolean', 'void', 'null', 'undefined', 'any', 'never', 'unknown', 'object', 'Array', 'Promise', 'Record', 'Partial', 'Required'],
    builtins: ['console', 'Math', 'Date', 'JSON', 'Object', 'String', 'Number', 'Boolean', 'Array', 'Map', 'Set', 'Error'],
  },
  javascript: {
    keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'extends', 'default', 'switch', 'case', 'break', 'continue'],
    types: [],
    builtins: ['console', 'Math', 'Date', 'JSON', 'Object', 'String', 'Number', 'Boolean', 'Array', 'Map', 'Set', 'Error', 'Promise', 'fetch', 'window', 'document'],
  },
  python: {
    keywords: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'import', 'from', 'as', 'with', 'pass', 'break', 'continue', 'raise', 'yield', 'lambda', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'async', 'await'],
    types: ['str', 'int', 'float', 'bool', 'list', 'dict', 'tuple', 'set', 'bytes'],
    builtins: ['print', 'len', 'range', 'open', 'input', 'type', 'isinstance', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed', 'sum', 'min', 'max', 'abs'],
  },
  sql: {
    keywords: ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'HAVING', 'UNION', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'NULL', 'IS', 'LIKE', 'IN', 'BETWEEN', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'],
    types: ['INT', 'INTEGER', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DATE', 'TIMESTAMP', 'FLOAT', 'DOUBLE', 'DECIMAL', 'UUID', 'JSON', 'JSONB'],
    builtins: [],
  },
};

// Simple syntax highlighter (no external dependency)
function highlightCode(code: string, language?: string): string {
  if (!language || !languageKeywords[language.toLowerCase()]) {
    return escapeHtml(code);
  }

  const { keywords, types, builtins } = languageKeywords[language.toLowerCase()];
  let result = escapeHtml(code);

  // Highlight strings (single and double quotes)
  result = result.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="text-emerald-400">$&</span>');

  // Highlight comments (// and #)
  result = result.replace(/(\/\/.*$|#.*$)/gm, '<span class="text-white/40 italic">$&</span>');

  // Highlight multi-line comments
  result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-white/40 italic">$&</span>');

  // Highlight keywords
  keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    result = result.replace(regex, '<span class="text-purple-400 font-medium">$1</span>');
  });

  // Highlight types
  types.forEach((type) => {
    const regex = new RegExp(`\\b(${type})\\b`, 'g');
    result = result.replace(regex, '<span class="text-cyan-400">$1</span>');
  });

  // Highlight builtins
  builtins.forEach((builtin) => {
    const regex = new RegExp(`\\b(${builtin})\\b`, 'g');
    result = result.replace(regex, '<span class="text-yellow-400">$1</span>');
  });

  // Highlight numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>');

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function CodeViewer({
  content,
  language,
  onChange,
  readOnly = false,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);

  const lines = content.split('\n');

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

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-2">
          {language && (
            <span className="text-xs font-medium text-white/60 px-2 py-0.5 rounded bg-card/10">
              {language}
            </span>
          )}
          <span className="text-xs text-white/40">
            {lines.length} lines
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`p-1.5 rounded transition-colors ${
              showLineNumbers
                ? 'bg-card/10 text-white'
                : 'text-white/40 hover:text-white hover:bg-card/5'
            }`}
            title="Toggle line numbers"
          >
            <Hash size={14} />
          </button>
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1.5 rounded transition-colors ${
              wordWrap
                ? 'bg-card/10 text-white'
                : 'text-white/40 hover:text-white hover:bg-card/5'
            }`}
            title="Toggle word wrap"
          >
            <WrapText size={14} />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-white/40 hover:text-white hover:bg-card/5 transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto">
        {readOnly ? (
          <div className="flex">
            {/* Line numbers */}
            {showLineNumbers && (
              <div className="flex-shrink-0 py-4 px-3 bg-black/20 border-r border-white/5 select-none">
                {lines.map((_, i) => (
                  <div
                    key={i}
                    className="text-right text-xs text-white/30 font-mono leading-6"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            )}

            {/* Code */}
            <pre
              className={`flex-1 p-4 text-sm font-mono text-white/90 leading-6 ${
                wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
              }`}
              dangerouslySetInnerHTML={{ __html: highlightCode(content, language) }}
            />
          </div>
        ) : (
          <div className="relative flex h-full">
            {/* Line numbers for editable mode */}
            {showLineNumbers && (
              <div className="flex-shrink-0 py-4 px-3 bg-black/20 border-r border-white/5 select-none">
                {lines.map((_, i) => (
                  <div
                    key={i}
                    className="text-right text-xs text-white/30 font-mono leading-6"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            )}

            {/* Editable textarea */}
            <textarea
              value={content}
              onChange={handleChange}
              className={`flex-1 p-4 bg-transparent text-sm font-mono text-white/90 leading-6 resize-none focus:outline-none ${
                wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
              }`}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        )}
      </div>
    </div>
  );
}
