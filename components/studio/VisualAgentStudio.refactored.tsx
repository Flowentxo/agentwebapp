'use client';

/**
 * VISUAL AGENT STUDIO (Refactored Orchestrator)
 *
 * Clean orchestrator component that coordinates:
 * - StudioHeader: Title, mode switching, action buttons
 * - StudioMain: Canvas, module library, guided overlays
 * - StudioSidebar: Right-hand config panels
 * - Dialogs: Modal overlays for various features
 *
 * This refactored version delegates UI rendering to sub-components
 * while maintaining centralized state management.
 *
 * @version 2.0.0
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Node, Edge, useNodesState, useEdgesState } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// Layout Components
import { StudioHeader, StudioMode } from './layout/StudioHeader';
import { StudioMain, LibraryGroup, TemplateOption } from './layout/StudioMain';
import { StudioSidebar } from './layout/StudioSidebar';

// Dialogs & Panels
import { SaveDialog } from './SaveDialog';
import { TemplateDialog } from './TemplateDialog';
import { TemplateMarketplace } from './TemplateMarketplace';
import { SaveAsTemplateDialog } from './SaveAsTemplateDialog';
import { ToolRegistry } from './ToolRegistry';
import { ConnectionsDialog } from './ConnectionsDialog';
import { WorkflowVersionHistory } from './WorkflowVersionHistory';
import { DataContextPanel } from './panels/DataContextPanel';
import { RunHistorySidebar } from './RunHistorySidebar';
import { StepDetailsPanel } from './StepDetailsPanel';
import { ApprovalRequestCard } from './ApprovalRequestCard';

// Stores & Hooks
import { usePipelineStore } from '@/components/pipelines/store/usePipelineStore';
import { useExecutionStreamV2 } from '@/hooks/useExecutionStreamV2';

// Types & Utils
import { ModuleTemplate, WorkflowTemplate, CustomTool } from '@/lib/studio/types';
import { VariableStore } from '@/lib/studio/variable-store';
import { Variable } from '@/lib/studio/variable-types';
import {
  createWorkflow,
  updateWorkflow,
  Workflow,
  publishWorkflow,
  archiveWorkflow,
  unarchiveWorkflow,
  rollbackWorkflow,
} from '@/lib/api/workflows-client';

// =====================================================
// STATIC DATA
// =====================================================

const LIBRARY_GROUPS: LibraryGroup[] = [
  {
    id: 'sales',
    title: 'Sales / CRM',
    defaultOpen: false,
    items: [
      { title: 'Update Lead', desc: 'Update lead fields in your CRM', badges: ['Recommended'], tags: ['CRM', 'Email'] },
      { title: 'Log Call', desc: 'Record call activities', badges: [], tags: ['CRM'] },
      { title: 'Update Deal', desc: 'Edit opportunities', badges: ['Popular'], tags: ['CRM'] },
      { title: 'Send Email', desc: 'Follow-up with prospects', badges: [], tags: ['Email'] },
      { title: 'CRM Pipeline Data', desc: 'Fetch pipeline records', badges: [], tags: ['CRM', 'DB'] },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    defaultOpen: false,
    items: [
      { title: 'Customer Support', desc: 'Handle support tickets', badges: ['Recommended'], tags: ['Support'] },
      { title: 'FAQ Response', desc: 'Answer common questions', badges: [], tags: ['Support'] },
      { title: 'Send Email', desc: 'Notify customers', badges: [], tags: ['Email'] },
    ],
  },
  {
    id: 'automation',
    title: 'Automation Basics',
    defaultOpen: false,
    items: [
      { title: 'Send Email', desc: 'Notify stakeholders', badges: ['Popular'], tags: ['Email'] },
      { title: 'Slack Message', desc: 'Post updates to Slack', badges: [], tags: ['Slack'] },
      { title: 'Create Task', desc: 'Create tasks in PM tools', badges: [], tags: ['Task'] },
      { title: 'Webhook Trigger', desc: 'Trigger external hooks', badges: [], tags: ['Webhook'] },
      { title: 'Database Query', desc: 'Query data sources', badges: [], tags: ['DB'] },
    ],
  },
  {
    id: 'devtools',
    title: 'Developer Tools',
    defaultOpen: false,
    items: [
      { title: 'Parse JSON', desc: 'Extract data from JSON', badges: [], tags: ['Dev'] },
      { title: 'Validate Email', desc: 'Check email syntax', badges: [], tags: ['Email'] },
      { title: 'Extract Domain', desc: 'Get domain from URL', badges: [], tags: ['Dev'] },
      { title: 'Calculate Expression', desc: 'Run simple math', badges: [], tags: ['Dev'] },
      { title: 'Transform Text', desc: 'Format text content', badges: [], tags: ['Dev'] },
    ],
  },
];

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'lead-qualification',
    title: 'Lead-Qualifizierung',
    desc: 'Neue Leads automatisch bewerten und an Sales weitergeben.',
    bullets: ['HubSpot/CRM Trigger', 'Budget + Fit Score', 'Follow-up E-Mail'],
  },
  {
    id: 'follow-up',
    title: 'Follow-up E-Mails',
    desc: 'Nach 7 Tagen automatisch antworten und Termine vorschlagen.',
    bullets: ['Zeitbasierter Trigger', 'Personalisierte E-Mail', 'Reminder falls keine Antwort'],
  },
  {
    id: 'cold-call',
    title: 'Cold-Call Automation',
    desc: 'Leads anrufen, Notizen speichern und Tasks erstellen.',
    bullets: ['Dialer Trigger', 'Call Logging', 'Task-Erstellung im CRM'],
  },
  {
    id: 'deal-scoring',
    title: 'Deal Scoring',
    desc: 'Deals nach Chancen priorisieren und signalisieren.',
    bullets: ['Pipeline-Signal', 'Score-Berechnung', 'Slack-Alert ans Team'],
  },
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export function VisualAgentStudio() {
  // =================== WORKFLOW STATE ===================
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // =================== UI STATE ===================
  const [mode, setMode] = useState<StudioMode>('guided');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('Mein Agent');
  const [agentVisibility, setAgentVisibility] = useState<'private' | 'team' | 'public'>('private');

  // Panel visibility
  const [showLibrary, setShowLibrary] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showActionConfig, setShowActionConfig] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showDataContext, setShowDataContext] = useState(false);
  const [showRunHistory, setShowRunHistory] = useState(false);

  // Dialog visibility
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [showToolRegistry, setShowToolRegistry] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // =================== STORES & HOOKS ===================
  const {
    isDebugMode,
    currentRun,
    selectedNodeId: debugSelectedNodeId,
    setSelectedNode: setDebugSelectedNode,
  } = usePipelineStore();

  const variableStore = useMemo(() => new VariableStore(), []);
  const executionStream = useExecutionStreamV2();

  // Create node name lookup for DataContextPanel
  const nodeNames = useMemo(() => {
    const map: Record<string, string> = {};
    nodes.forEach(node => {
      map[node.id] = node.data?.label || node.id;
    });
    return map;
  }, [nodes]);

  // =================== EFFECTS ===================

  // Cleanup execution stream on unmount
  useEffect(() => {
    return () => {
      executionStream.unsubscribe();
    };
  }, [executionStream]);

  // Update isExecuting based on stream status
  useEffect(() => {
    if (executionStream.status === 'completed' || executionStream.status === 'error') {
      setIsExecuting(false);
    }
  }, [executionStream.status]);

  // =================== HANDLERS ===================

  const handleNodeSelect = useCallback(
    (node: Node | null) => {
      if (isDebugMode && node) {
        setDebugSelectedNode(node.id);
        return;
      }

      setSelectedNode(node);
      setShowConfig(!!node && mode === 'advanced');

      const isActionNode = node?.data?.category === 'action' ||
        node?.data?.category === 'skill' ||
        node?.type === 'actionNode' ||
        node?.type === 'action' ||
        node?.type === 'custom';
      setShowActionConfig(!!node && isActionNode && mode === 'advanced');

      if (node && showPreview) {
        setShowPreview(false);
      }
    },
    [showPreview, mode, isDebugMode, setDebugSelectedNode],
  );

  const handleNodeUpdate = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node)),
    );
  }, [setNodes]);

  const handleSave = useCallback(() => setShowSaveDialog(true), []);

  const handleSaveWorkflow = useCallback(
    async (metadata: {
      name: string;
      description: string;
      tags: string[];
      status: 'draft' | 'active';
      visibility: 'private' | 'team' | 'public';
    }) => {
      try {
        setIsSaving(true);
        if (currentWorkflow) {
          const { workflow } = await updateWorkflow(currentWorkflow.id, { ...metadata, nodes, edges });
          setCurrentWorkflow(workflow);
        } else {
          const { workflow } = await createWorkflow({ ...metadata, nodes, edges });
          setCurrentWorkflow(workflow);
        }
      } catch (error) {
        console.error('Failed to save workflow:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [nodes, edges, currentWorkflow],
  );

  const handleTemplateSelect = useCallback((workflow: Workflow) => {
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    setCurrentWorkflow(workflow);
  }, [setNodes, setEdges]);

  const handleDeployTemplate = useCallback(
    (template: WorkflowTemplate) => {
      setNodes(template.nodes);
      setEdges(template.edges);
      setShowMarketplace(false);
      setShowWelcome(false);
    },
    [setNodes, setEdges],
  );

  const handleSelectTool = useCallback(
    (tool: CustomTool) => {
      const newNode: Node = {
        id: `custom-tool-${tool.id}-${Date.now()}`,
        type: 'custom',
        position: { x: 250, y: 250 },
        data: {
          id: tool.id,
          category: 'action',
          label: tool.name,
          description: tool.description,
          icon: 'Code2',
          color: '#A855F7',
          enabled: true,
          toolId: tool.id,
          toolName: tool.name,
          toolCode: tool.code,
          toolParameters: tool.parameters,
          toolRuntime: tool.runtime,
          toolTimeout: tool.timeout,
        },
      };
      setNodes((prevNodes) => [...prevNodes, newNode]);
      setShowToolRegistry(false);
    },
    [setNodes],
  );

  const handleOpenPreview = useCallback(() => {
    setShowPreview(true);
    if (showConfig) {
      setShowConfig(false);
      setSelectedNode(null);
    }
    if (showVariables) {
      setShowVariables(false);
    }
  }, [showConfig, showVariables]);

  const handleOpenVariables = useCallback(() => {
    setShowVariables(true);
    if (showConfig) {
      setShowConfig(false);
      setSelectedNode(null);
    }
    if (showPreview) {
      setShowPreview(false);
    }
  }, [showConfig, showPreview]);

  const handlePublish = useCallback(
    async (changeDescription?: string) => {
      if (!currentWorkflow) {
        alert('Please save the workflow first');
        return;
      }
      try {
        const { workflow, message } = await publishWorkflow(currentWorkflow.id, changeDescription);
        setCurrentWorkflow(workflow);
        alert(message);
      } catch (error) {
        console.error('Failed to publish workflow:', error);
        alert('Failed to publish workflow');
      }
    },
    [currentWorkflow],
  );

  const handleArchive = useCallback(async () => {
    if (!currentWorkflow) return;
    try {
      const { workflow, message } = await archiveWorkflow(currentWorkflow.id);
      setCurrentWorkflow(workflow);
      alert(message);
    } catch (error) {
      console.error('Failed to archive workflow:', error);
      alert('Failed to archive workflow');
    }
  }, [currentWorkflow]);

  const handleUnarchive = useCallback(async () => {
    if (!currentWorkflow) return;
    try {
      const { workflow, message } = await unarchiveWorkflow(currentWorkflow.id);
      setCurrentWorkflow(workflow);
      alert(message);
    } catch (error) {
      console.error('Failed to unarchive workflow:', error);
      alert('Failed to unarchive workflow');
    }
  }, [currentWorkflow]);

  const handleRollback = useCallback(
    async (versionId: string) => {
      if (!currentWorkflow) return;
      try {
        const { workflow, message } = await rollbackWorkflow(currentWorkflow.id, versionId);
        setNodes(workflow.nodes);
        setEdges(workflow.edges);
        setCurrentWorkflow(workflow);
        alert(message);
      } catch (error) {
        console.error('Failed to rollback workflow:', error);
        alert('Failed to rollback workflow');
      }
    },
    [currentWorkflow, setNodes, setEdges],
  );

  const handleOpenVersionHistory = useCallback(() => {
    if (!currentWorkflow) {
      alert('Please save the workflow first');
      return;
    }
    setShowVersionHistory(true);
  }, [currentWorkflow]);

  const handleExecutePipeline = useCallback(async () => {
    if (!currentWorkflow) {
      alert('Please save the workflow first');
      return;
    }

    executionStream.reset();
    setIsExecuting(true);

    try {
      const response = await fetch(`/api/pipelines/${currentWorkflow.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({
          inputs: {},
          triggerType: 'manual',
        }),
      });

      const data = await response.json();

      if (data.success) {
        executionStream.subscribe(currentWorkflow.id, data.executionId);
        setShowDataContext(true);
      } else {
        console.error('Execution failed:', data.error);
        alert(`Execution failed: ${data.error}`);
        setIsExecuting(false);
      }
    } catch (error) {
      console.error('Failed to execute pipeline:', error);
      alert('Failed to start pipeline execution');
      setIsExecuting(false);
    }
  }, [currentWorkflow, executionStream]);

  const handleToggleDataContext = useCallback(() => {
    setShowDataContext(prev => !prev);
  }, []);

  const handleToggleRunHistory = useCallback(() => {
    setShowRunHistory(prev => !prev);
  }, []);

  // Guided mode navigation
  const goNextStep = useCallback(() => {
    setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as typeof prev) : prev));
  }, []);

  const goPrevStep = useCallback(() => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as typeof prev) : prev));
  }, []);

  const loadTemplateById = useCallback((id: string) => {
    const baseNodes: Node[] = [
      { id: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Trigger' }, type: 'input' },
      { id: 'action', position: { x: 200, y: 0 }, data: { label: 'Action' }, type: 'default' },
      { id: 'output', position: { x: 400, y: 0 }, data: { label: 'Output' }, type: 'output' },
    ];
    const labeled = baseNodes.map((n) => ({
      ...n,
      data: { ...n.data, label: `${n.data.label}: ${id}` },
    }));
    setNodes(labeled);
    setEdges([
      { id: 'e1-2', source: 'trigger', target: 'action' },
      { id: 'e2-3', source: 'action', target: 'output' },
    ]);
    setShowWelcome(false);
  }, [setNodes, setEdges]);

  const handleCloseConfig = useCallback(() => {
    setShowConfig(false);
    setSelectedNode(null);
  }, []);

  const handleCloseActionConfig = useCallback(() => {
    setShowActionConfig(false);
    setShowConfig(false);
    setSelectedNode(null);
  }, []);

  const handleVariablesChange = useCallback((variables: Variable[]) => {
    console.log('Variables updated:', variables.length);
  }, []);

  const handleReloadCanvas = useCallback(() => {
    // Reset canvas state for error recovery
    console.log('[VisualAgentStudio] Reloading canvas...');
  }, []);

  // =================== RENDER ===================

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Main Layout */}
      <StudioMain
        mode={mode}
        currentStep={currentStep}
        selectedTemplateId={selectedTemplateId}
        agentName={agentName}
        agentVisibility={agentVisibility}
        showLibrary={showLibrary}
        showWelcome={showWelcome}
        isDebugMode={isDebugMode}
        currentWorkflow={currentWorkflow}
        nodes={nodes}
        edges={edges}
        libraryGroups={LIBRARY_GROUPS}
        templateOptions={TEMPLATE_OPTIONS}
        onToggleLibrary={() => setShowLibrary(!showLibrary)}
        onSetShowWelcome={setShowWelcome}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeSelect={handleNodeSelect}
        onSave={handleSave}
        onOpenPreview={handleOpenPreview}
        onOpenVariables={handleOpenVariables}
        onOpenTemplates={() => setShowTemplateGallery(true)}
        onOpenMarketplace={() => {
          setShowMarketplace(true);
          setShowWelcome(false);
        }}
        onSaveAsTemplate={() => {
          if (nodes.length === 0) {
            alert('Cannot save empty workflow as template');
            return;
          }
          setShowSaveAsTemplate(true);
        }}
        onOpenToolRegistry={() => setShowToolRegistry(true)}
        onOpenConnections={() => setShowConnections(true)}
        onOpenVersionHistory={handleOpenVersionHistory}
        onPublish={handlePublish}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onNextStep={goNextStep}
        onPrevStep={goPrevStep}
        onSelectTemplate={setSelectedTemplateId}
        onLoadTemplate={loadTemplateById}
        onAgentNameChange={setAgentName}
        onAgentVisibilityChange={setAgentVisibility}
        onSaveWorkflow={handleSaveWorkflow}
        onReloadCanvas={handleReloadCanvas}
      />

      {/* Header (positioned absolutely at top) */}
      <div className="absolute top-0 left-12 right-0 z-30">
        <StudioHeader
          mode={mode}
          onModeChange={setMode}
          currentWorkflow={currentWorkflow}
          isExecuting={isExecuting}
          isDebugMode={isDebugMode}
          currentRun={currentRun}
          showDataContext={showDataContext}
          showRunHistory={showRunHistory}
          executionProgress={executionStream.progress}
          executionStatus={executionStream.status}
          onSave={handleSave}
          onExecute={handleExecutePipeline}
          onToggleDataContext={handleToggleDataContext}
          onToggleRunHistory={handleToggleRunHistory}
          onOpenVariables={handleOpenVariables}
          onOpenConnections={() => setShowConnections(true)}
          onOpenToolRegistry={() => setShowToolRegistry(true)}
          onSaveAsTemplate={() => {
            if (nodes.length === 0) {
              alert('Cannot save empty workflow as template');
              return;
            }
            setShowSaveAsTemplate(true);
          }}
          onOpenVersionHistory={handleOpenVersionHistory}
        />
      </div>

      {/* Right Sidebar Panels */}
      <StudioSidebar
        mode={mode}
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        variableStore={variableStore}
        workflowId={currentWorkflow?.id}
        showConfig={showConfig}
        showActionConfig={showActionConfig}
        showPreview={showPreview}
        showVariables={showVariables}
        onCloseConfig={handleCloseConfig}
        onCloseActionConfig={handleCloseActionConfig}
        onClosePreview={() => setShowPreview(false)}
        onCloseVariables={() => setShowVariables(false)}
        onNodeUpdate={handleNodeUpdate}
        onVariablesChange={handleVariablesChange}
      />

      {/* Data Context Panel */}
      <DataContextPanel
        executionState={executionStream.executionState}
        activeNodeId={executionStream.activeNodeId}
        logs={executionStream.logs}
        status={executionStream.status}
        progress={executionStream.progress}
        error={executionStream.error}
        isOpen={showDataContext}
        onToggle={handleToggleDataContext}
        nodeNames={nodeNames}
      />

      {/* =================== DIALOGS =================== */}

      {/* Save Dialog */}
      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveWorkflow}
        initialData={
          currentWorkflow
            ? {
                name: currentWorkflow.name,
                description: currentWorkflow.description,
                tags: currentWorkflow.tags,
                status: currentWorkflow.status,
                visibility: currentWorkflow.visibility,
              }
            : undefined
        }
      />

      {/* Template Gallery */}
      <TemplateDialog
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onTemplateSelect={handleTemplateSelect}
      />

      {/* Template Marketplace */}
      <AnimatePresence>
        {showMarketplace && (
          <TemplateMarketplace
            onDeployTemplate={handleDeployTemplate}
            onClose={() => setShowMarketplace(false)}
          />
        )}
      </AnimatePresence>

      {/* Save as Template Dialog */}
      <AnimatePresence>
        {showSaveAsTemplate && (
          <SaveAsTemplateDialog
            nodes={nodes}
            edges={edges}
            onClose={() => setShowSaveAsTemplate(false)}
          />
        )}
      </AnimatePresence>

      {/* Tool Registry */}
      <AnimatePresence>
        {showToolRegistry && (
          <ToolRegistry
            onClose={() => setShowToolRegistry(false)}
            onSelectTool={handleSelectTool}
          />
        )}
      </AnimatePresence>

      {/* Connections Dialog */}
      <AnimatePresence>
        {showConnections && (
          <ConnectionsDialog
            isOpen={showConnections}
            onClose={() => setShowConnections(false)}
          />
        )}
      </AnimatePresence>

      {/* Version History Panel */}
      <AnimatePresence>
        {showVersionHistory && currentWorkflow && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVersionHistory(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed right-0 top-0 z-50 h-full w-[500px] overflow-y-auto border-l border-border bg-background shadow-2xl"
            >
              <div className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">Version History</h2>
                  <button
                    onClick={() => setShowVersionHistory(false)}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <WorkflowVersionHistory
                  workflowId={currentWorkflow.id}
                  currentVersion={currentWorkflow.version}
                  onRollback={handleRollback}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* HITL Approval Request */}
      <AnimatePresence>
        {executionStream.isSuspended && executionStream.approvalData && currentWorkflow && (
          <ApprovalRequestCard
            approvalData={executionStream.approvalData}
            pipelineId={currentWorkflow.id}
            executionId={executionStream.executionId || ''}
            onApprovalComplete={(approved) => {
              console.log('[STUDIO] Approval submitted:', approved);
            }}
          />
        )}
      </AnimatePresence>

      {/* Run History Sidebar */}
      <AnimatePresence>
        {showRunHistory && currentWorkflow && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 z-40 h-full"
          >
            <RunHistorySidebar
              workflowId={currentWorkflow.id}
              isOpen={showRunHistory}
              onClose={() => setShowRunHistory(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Details Panel (Debug Mode) */}
      <AnimatePresence>
        {isDebugMode && debugSelectedNodeId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setDebugSelectedNode(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-[600px] max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <StepDetailsPanel
                nodeId={debugSelectedNodeId}
                onClose={() => setDebugSelectedNode(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VisualAgentStudio;
