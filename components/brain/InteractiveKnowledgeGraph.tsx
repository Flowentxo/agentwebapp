'use client';

/**
 * Interactive Knowledge Graph Visualization
 * Uses react-force-graph-2d for document relationship visualization
 *
 * Features:
 * - Force-directed graph layout
 * - Color-coded by source type (PDF=Red, Notion=Black, Web=Blue)
 * - Click interaction with detail sheet
 * - Multi-select with Shift+Click for focused chat
 * - Zoom and pan controls
 *
 * @version 3.0.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Network,
  Maximize2,
  Minimize2,
  X,
  FileText,
  MessageSquare,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  HardDrive,
  Loader2,
  Brain,
  Lightbulb,
  Check,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getBrainGraphData,
  getKnowledgeStorageStats,
  type GraphNode,
  type StorageStats,
} from '@/actions/brain-actions';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
    </div>
  ),
});

// ============================================================================
// TYPES
// ============================================================================

interface ForceGraphData {
  nodes: Array<{
    id: string;
    label: string;
    color: string;
    size: number;
    type: string;
    sourceType?: string;
    connections: number;
    metadata?: GraphNode['metadata'];
  }>;
  links: Array<{
    source: string;
    target: string;
    strength: number;
    type: string;
  }>;
}

interface InteractiveKnowledgeGraphProps {
  workspaceId?: string;
  onNodeClick?: (node: GraphNode) => void;
  onStartFocusedChat?: (selectedNodes: GraphNode[]) => void;
  compact?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InteractiveKnowledgeGraph({
  workspaceId = 'default-workspace',
  onNodeClick,
  onStartFocusedChat,
  compact = false,
}: InteractiveKnowledgeGraphProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [graphData, setGraphData] = useState<ForceGraphData | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Multi-select state
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track Shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Load graph data from server action
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [graphResult, storageResult] = await Promise.all([
        getBrainGraphData(workspaceId),
        getKnowledgeStorageStats(workspaceId),
      ]);

      if (graphResult.success && graphResult.data) {
        // Convert to ForceGraph format
        const forceData: ForceGraphData = {
          nodes: graphResult.data.nodes.map((node) => ({
            id: node.id,
            label: node.label,
            color: node.color,
            size: node.size,
            type: node.type,
            sourceType: node.sourceType,
            connections: node.connections,
            metadata: node.metadata,
          })),
          links: graphResult.data.edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            strength: edge.strength,
            type: edge.type,
          })),
        };
        setGraphData(forceData);
      } else {
        // Use mock data as fallback
        setGraphData(generateMockData());
      }

      if (storageResult.success && storageResult.stats) {
        setStorageStats(storageResult.stats);
      }
    } catch (e) {
      console.error('[Graph] Load error:', e);
      setGraphData(generateMockData());
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle node click with multi-select support
  const handleNodeClick = useCallback(
    (node: any, event?: MouseEvent) => {
      const graphNode: GraphNode = {
        id: node.id,
        label: node.label,
        type: node.type,
        sourceType: node.sourceType,
        color: node.color,
        size: node.size,
        connections: node.connections,
        metadata: node.metadata,
      };

      // Check if Shift is pressed for multi-select
      if (isShiftPressed || event?.shiftKey) {
        setSelectedNodeIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(node.id)) {
            newSet.delete(node.id);
          } else {
            newSet.add(node.id);
          }
          return newSet;
        });
      } else {
        // Normal click - show details
        setSelectedNode(graphNode);
        onNodeClick?.(graphNode);
      }
    },
    [onNodeClick, isShiftPressed]
  );

  // Get selected nodes as array for focused chat
  const selectedNodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes
      .filter((node) => selectedNodeIds.has(node.id))
      .map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type as GraphNode['type'],
        sourceType: node.sourceType,
        color: node.color,
        size: node.size,
        connections: node.connections,
        metadata: node.metadata,
      }));
  }, [graphData, selectedNodeIds]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedNodeIds(new Set());
  }, []);

  // Start focused chat with selected documents
  const handleStartFocusedChat = useCallback(() => {
    if (selectedNodes.length > 0) {
      onStartFocusedChat?.(selectedNodes);
    }
  }, [selectedNodes, onStartFocusedChat]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.5, 300);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.5, 300);
    }
  }, []);

  const handleCenterGraph = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.centerAt(0, 0, 300);
      graphRef.current.zoom(1, 300);
    }
  }, []);

  // Custom node rendering with multi-select highlighting
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.label;
      const fontSize = Math.max(10 / globalScale, 3);
      const nodeSize = node.size / globalScale;
      const isMultiSelected = selectedNodeIds.has(node.id);
      const isDetailSelected = selectedNode?.id === node.id;

      // Draw selection ring for multi-selected nodes
      if (isMultiSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize + 6 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = '#10B981'; // Emerald green selection ring
        ctx.lineWidth = 3 / globalScale;
        ctx.setLineDash([4 / globalScale, 2 / globalScale]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Checkmark indicator
        ctx.beginPath();
        ctx.arc(node.x + nodeSize, node.y - nodeSize, 5 / globalScale, 0, 2 * Math.PI);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${8 / globalScale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', node.x + nodeSize, node.y - nodeSize);
      }

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
      ctx.fillStyle = isMultiSelected ? node.color + '80' : node.color + '40';
      ctx.fill();
      ctx.strokeStyle = isMultiSelected ? '#10B981' : node.color;
      ctx.lineWidth = (isMultiSelected ? 3 : 2) / globalScale;
      ctx.stroke();

      // Draw border for detail-selected node
      if (isDetailSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 / globalScale;
        ctx.stroke();
      }

      // Draw label
      ctx.font = `${isMultiSelected ? 'bold ' : ''}${fontSize}px "SF Pro Display", -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isMultiSelected ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(label, node.x, node.y + nodeSize + fontSize);
    },
    [selectedNode, selectedNodeIds]
  );

  // Graph dimensions
  const dimensions = useMemo(() => {
    if (isFullscreen) return { width: window.innerWidth - 100, height: window.innerHeight - 200 };
    if (compact) return { width: 400, height: 280 };
    return { width: 600, height: 400 };
  }, [isFullscreen, compact]);

  // Legend items
  const legendItems = [
    { color: '#EF4444', label: 'PDF' },
    { color: '#000000', label: 'Notion' },
    { color: '#3B82F6', label: 'Web' },
    { color: '#10B981', label: 'Upload' },
    { color: '#8B5CF6', label: 'Memory' },
  ];

  // Render graph content
  const renderGraph = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading Knowledge Graph...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <div className="text-center">
            <Network className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!graphData || graphData.nodes.length === 0) {
      return (
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <div className="text-center">
            <Network className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No knowledge indexed yet</p>
            <p className="text-xs text-muted-foreground mt-1">Upload documents to see the graph</p>
          </div>
        </div>
      );
    }

    return (
      <div ref={containerRef} className="relative">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={nodeCanvasObject}
          nodeRelSize={6}
          linkWidth={(link: any) => Math.max(link.strength * 2, 0.5)}
          linkColor={() => 'rgba(99, 102, 241, 0.3)'}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          backgroundColor="transparent"
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4 text-gray-300" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4 text-gray-300" />
          </button>
          <button
            onClick={handleCenterGraph}
            className="p-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
            title="Center"
          >
            <Maximize2 className="h-4 w-4 text-gray-300" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Node Detail Sheet */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => setSelectedNode(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${selectedNode.color}30` }}
                  >
                    {getNodeIcon(selectedNode.type, selectedNode.color)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedNode.label}</h3>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      {selectedNode.sourceType || selectedNode.type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Metadata */}
              <div className="space-y-3 mb-6">
                {selectedNode.metadata?.category && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Category</span>
                    <span className="text-white capitalize">{selectedNode.metadata.category}</span>
                  </div>
                )}
                {selectedNode.metadata?.chunkCount !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Chunks</span>
                    <span className="text-white">{selectedNode.metadata.chunkCount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Connections</span>
                  <span className="text-white">{selectedNode.connections}</span>
                </div>
                {selectedNode.metadata?.fileSize && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Size</span>
                    <span className="text-white">
                      {(selectedNode.metadata.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
                {selectedNode.metadata?.createdAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Indexed</span>
                    <span className="text-white">
                      {new Date(selectedNode.metadata.createdAt).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm text-gray-300 transition-colors">
                  View Details
                </button>
                <button className="flex-1 px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl text-sm text-indigo-300 transition-colors flex items-center justify-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-zinc-900 rounded-2xl border border-zinc-700 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
              <div className="flex items-center gap-3">
                <Network className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-semibold text-white">Knowledge Graph</h3>
                {graphData && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {graphData.nodes.length} nodes • {graphData.links.length} connections
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <Minimize2 className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Graph Content */}
            <div className="flex-1 relative">{renderGraph()}</div>

            {/* Legend */}
            <div className="p-4 border-t border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-6">
                {legendItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
              {storageStats && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <HardDrive className="h-4 w-4" />
                  <span>
                    {storageStats.storageUsedMB} MB / {storageStats.storageLimitMB} MB
                  </span>
                  <div className="w-24 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${storageStats.percentUsed}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Regular View */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-indigo-400" />
            <h3 className="text-white font-semibold">Knowledge Graph</h3>
            {isLoading && (
              <Loader2 className="h-4 w-4 text-indigo-400 animate-spin ml-2" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 rounded-lg hover:bg-card/10 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 rounded-lg hover:bg-card/10 transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
          {renderGraph()}
        </div>

        {/* Storage Stats Bar */}
        {storageStats && (
          <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              <span>Knowledge Storage</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white">
                {storageStats.storageUsedMB} MB / {storageStats.storageLimitMB} MB
              </span>
              <div className="w-32 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    storageStats.percentUsed > 80
                      ? 'bg-red-500'
                      : storageStats.percentUsed > 50
                      ? 'bg-amber-500'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${storageStats.percentUsed}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs">
          {legendItems.slice(0, 4).map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Multi-select hint */}
        {selectedNodeIds.size === 0 && graphData && graphData.nodes.length > 0 && (
          <div className="text-center text-xs text-muted-foreground">
            Tipp: Halte <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-muted-foreground font-mono">Shift</kbd> gedrückt und klicke auf Nodes, um mehrere auszuwählen
          </div>
        )}
      </div>

      {/* Floating Action Bar for Multi-Select */}
      <AnimatePresence>
        {selectedNodeIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-4 px-6 py-3 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50">
              {/* Selection indicator */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {selectedNodes.slice(0, 3).map((node, i) => (
                    <div
                      key={node.id}
                      className="w-6 h-6 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: node.color, zIndex: 3 - i }}
                    >
                      {node.label.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {selectedNodes.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white">
                      +{selectedNodes.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-white">
                  {selectedNodeIds.size} {selectedNodeIds.size === 1 ? 'Dokument' : 'Dokumente'} ausgewählt
                </span>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-zinc-700" />

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Auswahl löschen
                </button>
                <button
                  onClick={handleStartFocusedChat}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Sparkles className="h-4 w-4" />
                  Focused Chat starten
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getNodeIcon(type: string, color: string) {
  const iconClass = 'h-5 w-5';
  const style = { color };

  switch (type) {
    case 'document':
      return <FileText className={iconClass} style={style} />;
    case 'memory':
      return <Brain className={iconClass} style={style} />;
    case 'idea':
      return <Lightbulb className={iconClass} style={style} />;
    case 'meeting':
      return <MessageSquare className={iconClass} style={style} />;
    default:
      return <FileText className={iconClass} style={style} />;
  }
}

function generateMockData(): ForceGraphData {
  const nodes = [
    { id: '1', label: 'Sales Strategy', color: '#3B82F6', size: 15, type: 'memory', sourceType: 'text', connections: 3, metadata: { category: 'sales' } },
    { id: '2', label: 'Q4 Report.pdf', color: '#EF4444', size: 20, type: 'document', sourceType: 'pdf', connections: 4, metadata: { category: 'reports', fileSize: 2048000 } },
    { id: '3', label: 'Marketing Plan', color: '#10B981', size: 18, type: 'document', sourceType: 'upload', connections: 2, metadata: { category: 'marketing' } },
    { id: '4', label: 'Customer Insights', color: '#8B5CF6', size: 16, type: 'memory', sourceType: 'text', connections: 5, metadata: { category: 'customers' } },
    { id: '5', label: 'Competitor Analysis', color: '#EF4444', size: 14, type: 'document', sourceType: 'pdf', connections: 3, metadata: { category: 'research' } },
    { id: '6', label: 'Product Roadmap', color: '#F59E0B', size: 22, type: 'idea', sourceType: 'text', connections: 6, metadata: { category: 'product' } },
    { id: '7', label: 'Meeting Notes', color: '#3B82F6', size: 12, type: 'meeting', sourceType: 'web', connections: 2, metadata: { category: 'meetings' } },
  ];

  const links = [
    { source: '1', target: '2', strength: 0.9, type: 'similarity' },
    { source: '2', target: '3', strength: 0.7, type: 'reference' },
    { source: '1', target: '4', strength: 0.85, type: 'similarity' },
    { source: '4', target: '5', strength: 0.6, type: 'related' },
    { source: '3', target: '6', strength: 0.8, type: 'reference' },
    { source: '6', target: '7', strength: 0.5, type: 'related' },
    { source: '2', target: '5', strength: 0.75, type: 'similarity' },
  ];

  return { nodes, links };
}
