'use client';

/**
 * Brain AI Search Bar
 * Hybrid search with semantic and full-text capabilities
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  similarity?: number;
  metadata?: Record<string, any>;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchType, setSearchType] = useState<'hybrid' | 'semantic' | 'fulltext'>('hybrid');
  const [showFilters, setShowFilters] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length > 0) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [debouncedQuery, searchType]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);

    try {
      const response = await fetch('/api/brain/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          searchType,
          limit: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const handleResultClick = (result: SearchResult) => {
    // Handle result selection (could open a modal, navigate, etc.)
    console.log('Selected result:', result);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="brain-search-container">
      {/* Search Input */}
      <div className="brain-search-input-wrapper">
        <Search className="brain-search-icon" size={20} />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search knowledge base (semantic or text-based)..."
          className="brain-search-input"
          aria-label="Search knowledge base"
        />

        {query && (
          <button
            onClick={handleClear}
            className="brain-search-clear"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}

        {loading && (
          <Loader2 className="brain-search-loader" size={16} />
        )}

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`brain-search-filter-btn ${showFilters ? 'active' : ''}`}
          aria-label="Toggle filters"
        >
          <Filter size={16} />
        </button>
      </div>

      {/* Search Type Filters */}
      {showFilters && (
        <div className="brain-search-filters">
          <div className="brain-filter-group">
            <label className="brain-filter-label">Search Type:</label>
            <div className="brain-filter-options">
              <button
                onClick={() => setSearchType('hybrid')}
                className={`brain-filter-option ${searchType === 'hybrid' ? 'active' : ''}`}
              >
                Hybrid
              </button>
              <button
                onClick={() => setSearchType('semantic')}
                className={`brain-filter-option ${searchType === 'semantic' ? 'active' : ''}`}
              >
                Semantic
              </button>
              <button
                onClick={() => setSearchType('fulltext')}
                className={`brain-filter-option ${searchType === 'fulltext' ? 'active' : ''}`}
              >
                Full-Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="brain-search-results">
          <div className="brain-search-results-header">
            <span className="brain-search-results-count">
              {results.length} results found
            </span>
            <span className="brain-search-type-badge">{searchType}</span>
          </div>

          <div className="brain-search-results-list">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="brain-search-result-item"
              >
                <div className="brain-result-header">
                  <span className="brain-result-title">{result.title}</span>
                  {result.similarity && (
                    <span className="brain-result-score">
                      {(result.similarity * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                <p className="brain-result-content">
                  {result.content.substring(0, 150)}
                  {result.content.length > 150 ? '...' : ''}
                </p>

                {result.metadata?.tags && (
                  <div className="brain-result-tags">
                    {result.metadata.tags.slice(0, 3).map((tag: string, i: number) => (
                      <span key={i} className="brain-result-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {showResults && results.length === 0 && !loading && (
        <div className="brain-search-no-results">
          <p>No results found for "{query}"</p>
          <p className="brain-search-tip">
            Try different keywords or switch search type
          </p>
        </div>
      )}
    </div>
  );
}
