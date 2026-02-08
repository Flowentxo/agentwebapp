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
import { Loader2, Terminal, Plus } from 'lucide-react';

import { usePipelineStore, PipelineNode, PipelineNodeData, useControlModeUI } from '../store/usePipelineStore';
import { PipelineSidebar, DraggableNodeItem } from './Sidebar';
import { PipelineToolbar } from './Toolbar';
import { PipelineCanvas } from './Canvas';
import { NodeInspector } from './NodeInspector';
import { ExecutionInspector } from '../studio/inspector';
// Template Gallery - rendered at ROOT level via Portal
import { TemplateGallery } from './TemplateGallery';
// Control Mode Components
import { LiveExecutionSidebar } from '../studio/LiveExecutionSidebar';
import { ApprovalBar } from '../studio/ApprovalBar';
import { TriggerConfigPanel } from '../studio/TriggerConfigPanel';

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
  const nodeStatus = usePipelineStore((state) => state.nodeStatus);
  const nodeOutputs = usePipelineStore((state) => state.nodeOutputs);

  // Template Dialog - controlled via store, rendered via Portal
  const templateDialogOpen = usePipelineStore((state) => state.templateDialogOpen);
  const setTemplateDialogOpen = usePipelineStore((state) => state.setTemplateDialogOpen);

  // Control Mode UI State
  const {
    showExecutionPanel,
    showApprovalBar,
    awaitingApprovalNodeId,
    setShowExecutionPanel,
    setShowApprovalBar,
  } = useControlModeUI();

  // Trigger configuration state
  const [triggerType, setTriggerType] = useState<'manual' | 'schedule' | 'webhook'>('manual');

  const [isLoading, setIsLoading] = useState(!initialData);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            'x-user-id': 'demo-user',
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

  // Convert node outputs to log entries for LiveExecutionSidebar
  const executionLogs = Object.entries(nodeOutputs).map(([nodeId, output]) => {
    const node = usePipelineStore.getState().nodes.find(n => n.id === nodeId);
    return {
      id: `log-${nodeId}`,
      nodeId,
      nodeName: node?.data?.label || nodeId,
      nodeType: node?.data?.type || 'unknown',
      status: nodeStatus[nodeId] as any || 'pending',
      startedAt: output?.timestamp,
      durationMs: output?.duration,
      output: output?.data,
      error: output?.error,
      tokensUsed: output?.tokensUsed?.total,
      costUsd: output?.cost?.toString(),
    };
  });

  // Approval handlers
  const handleApprove = async (comment?: string) => {
    if (!awaitingApprovalNodeId || !executionId) return;

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executionId,
          nodeId: awaitingApprovalNodeId,
          action: 'approve',
          comment,
        }),
      });

      if (response.ok) {
        setShowApprovalBar(false, null);
        toast.success('Approved', { description: 'Pipeline will continue execution.' });
      }
    } catch (error) {
      console.error('[APPROVAL] Failed:', error);
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (reason?: string) => {
    if (!awaitingApprovalNodeId || !executionId) return;

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executionId,
          nodeId: awaitingApprovalNodeId,
          action: 'reject',
          reason,
        }),
      });

      if (response.ok) {
        setShowApprovalBar(false, null);
        toast.info('Rejected', { description: 'Pipeline execution stopped.' });
      }
    } catch (error) {
      console.error('[APPROVAL] Failed:', error);
      toast.error('Failed to reject');
    }
  };

  // Trigger change handler
  const handleTriggerChange = (type: 'manual' | 'schedule' | 'webhook', config?: any) => {
    setTriggerType(type);
    // TODO: Persist trigger config to API
    console.log('[TRIGGER] Changed to:', type, config);
  };

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

        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

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
      <div className="flex flex-col items-center justify-center h-full" style={{ backgroundColor: '#050505' }}>
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
        <p className="text-white/60 text-sm">Loading pipeline...</p>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ backgroundColor: '#050505' }}>
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Pipeline</h2>
          <p className="text-white/60 mb-6">{loadError}</p>
          <button
            onClick={() => window.location.href = '/studio'}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            Create New Pipeline
          </button>
        </div>
      </div>
    );
  }

  // Determine which right panel to show
  const showLiveExecution = isRunning || showExecutionPanel;
  const showNodeInspector = selectedNodeId && !showLiveExecution;
  const showTriggerConfig = !selectedNodeId && !showLiveExecution;

  return (
    <div ref={reactFlowWrapper} className="flex h-full overflow-hidden" style={{ backgroundColor: '#050505' }}>
      {/* Column 1: Left Sidebar - Node Library (hidden by default) */}
      {sidebarOpen && (
        <PipelineSidebar onClose={() => setSidebarOpen(false)} />
      )}

      {/* Column 2: Canvas + Floating Toolbar */}
      <div className="relative flex-1">
        <PipelineCanvas onDrop={onDrop} onDragOver={onDragOver} />

        {/* Floating Toolbar */}
        <PipelineToolbar />

        {/* Floating "+" to open sidebar */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:scale-105"
            style={{
              backgroundColor: 'rgba(17, 17, 17, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            title="Add Component (Cmd+K)"
          >
            <Plus className="w-5 h-5 text-white/60" />
          </button>
        )}

        {/* Approval Bar (Fixed Bottom) */}
        {showApprovalBar && awaitingApprovalNodeId && (
          <ApprovalBar
            isVisible={showApprovalBar}
            nodeId={awaitingApprovalNodeId}
            nodeName={
              usePipelineStore.getState().nodes.find(n => n.id === awaitingApprovalNodeId)?.data?.label ||
              'Unknown Node'
            }
            nodeDescription={
              usePipelineStore.getState().nodes.find(n => n.id === awaitingApprovalNodeId)?.data?.description
            }
            context={{
              previousOutput: nodeOutputs[awaitingApprovalNodeId]?.data
                ? JSON.stringify(nodeOutputs[awaitingApprovalNodeId].data)
                : undefined,
            }}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </div>

      {/* Column 3: Right Panel - Context-Sensitive */}
      <div className="w-80 flex-shrink-0">
        {/* Live Execution Sidebar (when running or manually opened) */}
        {showLiveExecution && (
          <LiveExecutionSidebar
            executionId={executionId}
            logs={executionLogs}
            isRunning={isRunning}
            onClose={() => setShowExecutionPanel(false)}
            onStop={() => {
              usePipelineStore.getState().resetExecution();
              setShowExecutionPanel(false);
            }}
            onNodeClick={(nodeId) => {
              usePipelineStore.getState().setSelectedNode(nodeId);
            }}
          />
        )}

        {/* Node Inspector (when node selected and not running) */}
        {showNodeInspector && <NodeInspector />}

        {/* Trigger Config Panel (when nothing selected and not running) */}
        {showTriggerConfig && pipelineId && (
          <TriggerConfigPanel
            pipelineId={pipelineId}
            currentTrigger={triggerType}
            onTriggerChange={handleTriggerChange}
          />
        )}
      </div>

      {/* Legacy Execution Inspector Panel - keeping for backward compatibility */}
      <ExecutionInspector
        isOpen={isInspectorOpen && !showLiveExecution}
        onClose={() => setIsInspectorOpen(false)}
        width={inspectorWidth}
        onWidthChange={setInspectorWidth}
      />

      {/* Template Gallery - Rendered at ROOT level via Portal */}
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
