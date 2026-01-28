'use client';

/**
 * PIPELINE EDITOR
 *
 * Main visual workflow editor component.
 *
 * IMPORTANT: The TemplateGallery is rendered at the ROOT level of this component
 * (not inside the Toolbar) to ensure it uses a proper React Portal and escapes
 * all parent CSS contexts. It's controlled via usePipelineStore.templateDialogOpen.
 */

import { useCallback, useRef, useEffect, useState, DragEvent } from 'react';
import { ReactFlowProvider, useReactFlow, Viewport } from '@xyflow/react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Terminal } from 'lucide-react';

import { usePipelineStore, PipelineNode, PipelineNodeData } from '../store/usePipelineStore';
import { PipelineSidebar, DraggableNodeItem } from './Sidebar';
import { PipelineToolbar } from './Toolbar';
import { PipelineCanvas } from './Canvas';
import { NodeInspector } from './NodeInspector';
import { ExecutionInspector } from '../studio/inspector';
// Template Gallery - rendered at ROOT level via Portal
import { TemplateGallery } from './TemplateGallery';

/**
 * Initial data passed from server-side fetch
 */
export interface PipelineInitialData {
  id: string;
  name: string;
  description?: string | null;
  nodes: any[];
  edges: any[];
  viewport: { x: number; y: number; zoom: number };
  status: string;
  version: string;
}

// ============================================
// INNER EDITOR (needs ReactFlow context)
// ============================================

interface PipelineEditorInnerProps {
  initialData?: PipelineInitialData | null;
}

function PipelineEditorInner({ initialData }: PipelineEditorInnerProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const { screenToFlowPosition } = useReactFlow();

  const addNode = usePipelineStore((state) => state.addNode);
  const selectedNodeId = usePipelineStore((state) => state.selectedNodeId);
  const loadPipeline = usePipelineStore((state) => state.loadPipeline);
  const pipelineId = usePipelineStore((state) => state.pipelineId);
  const isRunning = usePipelineStore((state) => state.isRunning);
  const executionId = usePipelineStore((state) => state.executionId);

  // Template Dialog - controlled via store, rendered via Portal
  const templateDialogOpen = usePipelineStore((state) => state.templateDialogOpen);
  const setTemplateDialogOpen = usePipelineStore((state) => state.setTemplateDialogOpen);

  const [isLoading, setIsLoading] = useState(!initialData);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Execution Inspector state
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [inspectorWidth, setInspectorWidth] = useState(400);

  // Auto-open inspector when execution starts
  useEffect(() => {
    if (isRunning) {
      setIsInspectorOpen(true);
    }
  }, [isRunning]);

  // Hydrate store with server-provided initial data
  useEffect(() => {
    if (initialData && !hasHydrated) {
      console.log('[PIPELINE] Hydrating store with server data:', initialData.id);
      loadPipeline(
        initialData.id,
        initialData.nodes || [],
        initialData.edges || [],
        initialData.name || 'Untitled Pipeline',
        initialData.viewport || { x: 0, y: 0, zoom: 1 }
      );
      setHasHydrated(true);
      setIsLoading(false);
    }
  }, [initialData, hasHydrated, loadPipeline]);

  // Fallback: Load pipeline via API if no initial data but ID in URL
  useEffect(() => {
    const id = searchParams.get('id');

    async function fetchPipeline() {
      // Skip if we have initial data
      if (initialData) {
        return;
      }

      if (!id) {
        // No ID - start with fresh pipeline
        setIsLoading(false);
        return;
      }

      // Skip if already loaded
      if (pipelineId === id) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('[PIPELINE] Loading pipeline via API:', id);
        const response = await fetch(`/api/pipelines/${id}`, {
          headers: {
            'x-user-id': 'demo-user', // In production, get from auth context
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Pipeline not found');
          }
          throw new Error('Failed to load pipeline');
        }

        const data = await response.json();
        const pipeline = data.pipeline;

        // Load into store with viewport
        loadPipeline(
          pipeline.id,
          pipeline.nodes || [],
          pipeline.edges || [],
          pipeline.name || 'Untitled Pipeline',
          pipeline.viewport || { x: 0, y: 0, zoom: 1 }
        );

        console.log('[PIPELINE] Loaded successfully:', pipeline.id);
        toast.success('Pipeline loaded', {
          description: pipeline.name,
        });
      } catch (error) {
        console.error('[PIPELINE] Load failed:', error);
        const message = error instanceof Error ? error.message : 'Failed to load pipeline';
        setLoadError(message);
        toast.error('Failed to load pipeline', {
          description: message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPipeline();
  }, [searchParams, loadPipeline, pipelineId, initialData]);

  // Generate unique ID for nodes
  const generateNodeId = useCallback((type: string) => {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Handle drag over - allow drop
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop - create new node
  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const dataString = event.dataTransfer.getData('application/reactflow');
      if (!dataString) {
        console.warn('[PIPELINE] No data in drop event');
        return;
      }

      try {
        const item: DraggableNodeItem = JSON.parse(dataString);

        // Get the position where the node was dropped
        // Account for the wrapper element's position
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // Create the new node
        const newNode: PipelineNode = {
          id: generateNodeId(item.id),
          type: 'custom',
          position,
          data: {
            label: item.label,
            type: item.type,
            icon: item.icon.name || item.icon.displayName || 'Box',
            color: item.color,
            description: item.description,
            config: {},
          } as PipelineNodeData,
        };

        addNode(newNode);
        console.log('[PIPELINE] Node added:', newNode.id, 'at', position);
      } catch (error) {
        console.error('[PIPELINE] Failed to parse dropped data:', error);
      }
    },
    [screenToFlowPosition, addNode, generateNodeId]
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-950">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-white/60 text-sm">Loading pipeline...</p>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-950">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Pipeline</h2>
          <p className="text-white/60 mb-6">{loadError}</p>
          <button
            onClick={() => window.location.href = '/studio'}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Create New Pipeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={reactFlowWrapper} className="flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Toolbar */}
      <PipelineToolbar />

      {/* Main Content: Sidebar + Canvas + Inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Component Library */}
        <PipelineSidebar />

        {/* Canvas */}
        <div className="relative flex-1">
          <PipelineCanvas onDrop={onDrop} onDragOver={onDragOver} />

          {/* Execution Inspector Toggle Button */}
          {(executionId || Object.keys(usePipelineStore.getState().nodeOutputs).length > 0) && (
            <button
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={`absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isInspectorOpen
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              } ${isRunning ? 'animate-pulse' : ''}`}
              title={isInspectorOpen ? 'Close Execution Inspector' : 'Open Execution Inspector'}
            >
              <Terminal size={16} />
              <span>{isInspectorOpen ? 'Hide Inspector' : 'Show Inspector'}</span>
              {isRunning && (
                <span className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
              )}
            </button>
          )}
        </div>

        {/* Right Sidebar - Node Inspector (conditional) */}
        {selectedNodeId && !isInspectorOpen && <NodeInspector />}

        {/* Execution Inspector Panel */}
        <ExecutionInspector
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          width={inspectorWidth}
          onWidthChange={setInspectorWidth}
        />
      </div>

      {/* ============================================ */}
      {/* TEMPLATE GALLERY - Rendered at ROOT level   */}
      {/* Uses React Portal with z-[9999] to escape   */}
      {/* all parent CSS contexts                     */}
      {/* ============================================ */}
      <TemplateGallery
        isOpen={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
      />
    </div>
  );
}

// ============================================
// MAIN EDITOR WITH PROVIDER
// ============================================

interface PipelineEditorProps {
  initialData?: PipelineInitialData | null;
}

export function PipelineEditor({ initialData }: PipelineEditorProps) {
  return (
    <ReactFlowProvider>
      <PipelineEditorInner initialData={initialData} />
    </ReactFlowProvider>
  );
}
