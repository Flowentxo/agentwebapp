'use client';

/**
 * SmartDataViewer Component
 *
 * A JSON viewer that handles hybrid storage pointers transparently.
 * When data is offloaded to blob storage, it shows a placeholder with
 * a "Load Full Data" button that fetches the actual content lazily.
 *
 * Part of Phase 6: Execution Inspector & Data Debugging Console
 */

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Loader2,
  Database,
  FileJson,
} from 'lucide-react';
import { isStoragePointer, StoragePointer } from '@/lib/storage/types';

// ============================================================================
// TYPES
// ============================================================================

interface SmartDataViewerProps {
  data: unknown;
  name?: string;
  defaultExpanded?: boolean;
  maxInitialDepth?: number;
  onLoadOffloaded?: (key: string) => Promise<unknown>;
}

interface JsonNodeProps {
  value: unknown;
  name?: string | number;
  depth: number;
  maxInitialDepth: number;
  isLast: boolean;
  onLoadOffloaded?: (key: string) => Promise<unknown>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function getValuePreview(value: unknown, maxLength = 50): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    return value.length > maxLength ? value.slice(0, maxLength) + '...' : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`;
  }
  return String(value);
}

// ============================================================================
// STORAGE POINTER COMPONENT
// ============================================================================

interface StoragePointerViewProps {
  pointer: StoragePointer;
  onLoad?: (key: string) => Promise<unknown>;
}

function StoragePointerView({ pointer, onLoad }: StoragePointerViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadedData, setLoadedData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = useCallback(async () => {
    if (!onLoad) {
      setError('No load handler provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await onLoad(pointer.key);
      setLoadedData(data);
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [pointer.key, onLoad]);

  // If data is loaded, render it as a normal JSON node
  if (isLoaded && loadedData !== null) {
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-2 text-xs text-green-400">
          <Check size={12} />
          <span>Loaded from {pointer._storage} storage</span>
        </div>
        <SmartDataViewer data={loadedData} onLoadOffloaded={onLoad} />
      </div>
    );
  }

  return (
    <div className="my-2 p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Database size={16} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-amber-300 font-medium text-sm">
            <AlertTriangle size={14} />
            <span>Large Payload Offloaded</span>
          </div>

          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Size:</span>
              <span className="text-gray-300">{formatBytes(pointer.size)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Storage:</span>
              <span className="text-gray-300 uppercase">{pointer._storage}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Key:</span>
              <span className="text-gray-300 font-mono text-[10px] truncate max-w-[200px]">
                {pointer.key}
              </span>
            </div>
            {pointer.offloadedAt && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Offloaded:</span>
                <span className="text-gray-300">
                  {new Date(pointer.offloadedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle size={12} />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleLoad}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Download size={12} />
                  <span>Load Full Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// JSON NODE COMPONENT
// ============================================================================

function JsonNode({
  value,
  name,
  depth,
  maxInitialDepth,
  isLast,
  onLoadOffloaded,
}: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < maxInitialDepth);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [value]);

  const valueType = getValueType(value);
  const isExpandable = valueType === 'object' || valueType === 'array';
  const isPointer = isStoragePointer(value);

  // Handle storage pointers specially
  if (isPointer) {
    return (
      <div className="py-0.5">
        {name !== undefined && (
          <span className="text-cyan-400">
            {typeof name === 'string' ? `"${name}"` : name}
          </span>
        )}
        {name !== undefined && <span className="text-muted-foreground">: </span>}
        <StoragePointerView pointer={value} onLoad={onLoadOffloaded} />
        {!isLast && <span className="text-muted-foreground">,</span>}
      </div>
    );
  }

  // Primitive values
  if (!isExpandable) {
    return (
      <div className="py-0.5 flex items-center gap-1 group">
        {name !== undefined && (
          <span className="text-cyan-400">
            {typeof name === 'string' ? `"${name}"` : name}
          </span>
        )}
        {name !== undefined && <span className="text-muted-foreground">: </span>}

        {valueType === 'string' && (
          <span className="text-green-400">&quot;{String(value)}&quot;</span>
        )}
        {valueType === 'number' && (
          <span className="text-blue-400">{String(value)}</span>
        )}
        {valueType === 'boolean' && (
          <span className="text-purple-400">{String(value)}</span>
        )}
        {(valueType === 'null' || valueType === 'undefined') && (
          <span className="text-muted-foreground italic">{valueType}</span>
        )}

        {!isLast && <span className="text-muted-foreground">,</span>}

        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-700 rounded text-muted-foreground hover:text-gray-300 transition-opacity"
          title="Copy value"
        >
          {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
        </button>
      </div>
    );
  }

  // Objects and arrays
  const entries = Array.isArray(value)
    ? value.map((v, i) => [i, v] as const)
    : Object.entries(value as Record<string, unknown>);
  const isEmpty = entries.length === 0;
  const isArray = Array.isArray(value);
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  return (
    <div className="py-0.5">
      <div className="flex items-center gap-1 group">
        {!isEmpty && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-gray-700 rounded flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown size={12} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={12} className="text-muted-foreground" />
            )}
          </button>
        )}

        {isEmpty && <span className="w-4" />}

        {name !== undefined && (
          <span className="text-cyan-400">
            {typeof name === 'string' ? `"${name}"` : name}
          </span>
        )}
        {name !== undefined && <span className="text-muted-foreground">: </span>}

        <span className="text-muted-foreground">{openBracket}</span>

        {!isExpanded && !isEmpty && (
          <span className="text-muted-foreground text-xs ml-1">
            {isArray ? `${entries.length} items` : `${entries.length} keys`}
          </span>
        )}

        {!isExpanded && <span className="text-muted-foreground">{closeBracket}</span>}

        {!isExpanded && !isLast && <span className="text-muted-foreground">,</span>}

        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-700 rounded text-muted-foreground hover:text-gray-300 transition-opacity"
          title="Copy JSON"
        >
          {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
        </button>
      </div>

      {isExpanded && !isEmpty && (
        <div className="ml-4 border-l border-gray-700/50 pl-2">
          {entries.map(([key, val], index) => (
            <JsonNode
              key={key}
              value={val}
              name={isArray ? undefined : key}
              depth={depth + 1}
              maxInitialDepth={maxInitialDepth}
              isLast={index === entries.length - 1}
              onLoadOffloaded={onLoadOffloaded}
            />
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="flex items-center">
          <span className="w-4" />
          <span className="text-muted-foreground">{closeBracket}</span>
          {!isLast && <span className="text-muted-foreground">,</span>}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SmartDataViewer({
  data,
  name,
  defaultExpanded = true,
  maxInitialDepth = 2,
  onLoadOffloaded,
}: SmartDataViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [data]);

  // Check if the root data is a storage pointer
  if (isStoragePointer(data)) {
    return (
      <div className="font-mono text-sm">
        <StoragePointerView pointer={data} onLoad={onLoadOffloaded} />
      </div>
    );
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return (
      <div className="font-mono text-sm text-muted-foreground italic">
        {data === null ? 'null' : 'undefined'}
      </div>
    );
  }

  // Handle primitives
  if (typeof data !== 'object') {
    return (
      <div className="font-mono text-sm">
        {typeof data === 'string' && (
          <span className="text-green-400">&quot;{data}&quot;</span>
        )}
        {typeof data === 'number' && (
          <span className="text-blue-400">{data}</span>
        )}
        {typeof data === 'boolean' && (
          <span className="text-purple-400">{String(data)}</span>
        )}
      </div>
    );
  }

  return (
    <div className="font-mono text-sm">
      {/* Header with copy button */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileJson size={14} />
          <span>
            {Array.isArray(data) ? `Array (${data.length} items)` : `Object (${Object.keys(data).length} keys)`}
          </span>
        </div>
        <button
          onClick={handleCopyAll}
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy All</span>
            </>
          )}
        </button>
      </div>

      {/* JSON Tree */}
      <JsonNode
        value={data}
        name={name}
        depth={0}
        maxInitialDepth={maxInitialDepth}
        isLast={true}
        onLoadOffloaded={onLoadOffloaded}
      />
    </div>
  );
}

export default SmartDataViewer;
