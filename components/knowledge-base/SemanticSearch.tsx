'use client';

/**
 * SEMANTIC SEARCH
 *
 * Search knowledge base with natural language queries
 */

import { useState } from 'react';
import { Search, Loader2, FileText, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchKnowledgeBase, SearchResult } from '@/lib/api/knowledge-base-client';

export function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    try {
      setIsSearching(true);
      setHasSearched(true);

      console.log('[SemanticSearch] Searching:', query);

      const response = await searchKnowledgeBase({
        query: query.trim(),
        limit: 10,
        minSimilarity: 0.7
      });

      console.log('[SemanticSearch] Results:', response.results.length);
      setResults(response.results);

    } catch (error: any) {
      console.error('[SemanticSearch] Search failed:', error);
      alert(`Search failed: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const highlightText = (text: string, maxLength: number = 300): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="w-full rounded-lg border border-white/10 bg-surface-1 py-3 pl-12 pr-24 text-sm text-text placeholder-text-muted outline-none transition focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/20"
            disabled={isSearching}
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-[rgb(var(--accent))] px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Search
              </>
            )}
          </button>
        </div>

        <p className="mt-2 text-xs text-text-muted">
          Natural language search powered by AI embeddings
        </p>
      </form>

      {/* Search Results */}
      <AnimatePresence>
        {hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">
                {results.length > 0 ? `Found ${results.length} result${results.length !== 1 ? 's' : ''}` : 'No results found'}
              </h3>
              {results.length > 0 && (
                <button
                  onClick={() => {
                    setResults([]);
                    setHasSearched(false);
                    setQuery('');
                  }}
                  className="text-xs text-text-muted hover:text-text transition"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Results List */}
            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group rounded-lg border border-white/10 bg-surface-1 p-4 hover:border-[rgb(var(--accent))]/50 hover:bg-card/5 transition"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <FileText className="h-4 w-4" />
                        <span className="font-mono">
                          {result.fileId.slice(0, 8)}...
                        </span>
                        {result.metadata?.pageNumber && (
                          <span>• Page {result.metadata.pageNumber}</span>
                        )}
                      </div>

                      {/* Similarity Score */}
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-24 rounded-full bg-card/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 transition-all"
                            style={{ width: `${result.similarity * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-[rgb(var(--accent))]">
                          {(result.similarity * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <p className="text-sm text-text leading-relaxed">
                      {highlightText(result.content, 300)}
                    </p>

                    {/* Metadata */}
                    {result.metadata && (
                      <div className="mt-3 flex gap-3 text-xs text-text-muted">
                        {result.metadata.wordCount && (
                          <span>{result.metadata.wordCount} words</span>
                        )}
                        {result.metadata.startIndex !== undefined && (
                          <span>
                            Position: {result.metadata.startIndex}-{result.metadata.endIndex}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : hasSearched && !isSearching ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-12 w-12 text-text-muted opacity-50 mb-4" />
                <p className="text-sm text-text-muted">
                  No results found for "{query}"
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Try a different search term or upload more documents
                </p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
