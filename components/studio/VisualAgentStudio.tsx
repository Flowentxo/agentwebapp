'use client';

/**
 * VISUAL AGENT STUDIO (Redesign Scaffold)
 * Guided (Wizard) + Advanced (Canvas-first)
 *
 * With V2 Execution Stream & Data Context Panel integration
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Node, useNodesState, useEdgesState } from 'reactflow';
import { VisualCanvas } from './VisualCanvas';
import { ConfigurationPanel } from './ConfigurationPanel';
import { PreviewPanel } from './PreviewPanel';
import { VariablePanel } from './VariablePanel';
import { SaveDialog } from './SaveDialog';
import { TemplateDialog } from './TemplateDialog';
import { TemplateMarketplace } from './TemplateMarketplace';
import { SaveAsTemplateDialog } from './SaveAsTemplateDialog';
import { ToolRegistry } from './ToolRegistry';
import { ConnectionsDialog } from './ConnectionsDialog';
import { WorkflowVersionHistory } from './WorkflowVersionHistory';
import { DataContextPanel } from './panels/DataContextPanel';
// Phase 13: Action Configuration UI & Variable Mapping
import { ActionConfigPanel } from './sidebar/ActionConfigPanel';
// Phase 13: Flight Recorder Components
import { RunHistorySidebar } from './RunHistorySidebar';
import { RunHeader } from './RunHeader';
import { StepDetailsPanel } from './StepDetailsPanel';
import { usePipelineStore } from '@/components/pipelines/store/usePipelineStore';
import { ModuleTemplate, WorkflowTemplate, CustomTool } from '@/lib/studio/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Play,
  MoreHorizontal,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Check,
  Database,
  Loader2,
  History,
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import {
  createWorkflow,
  updateWorkflow,
  Workflow,
  publishWorkflow,
  archiveWorkflow,
  unarchiveWorkflow,
  rollbackWorkflow,
} from '@/lib/api/workflows-client';
import { VariableStore } from '@/lib/studio/variable-store';
import { Variable } from '@/lib/studio/variable-types';
import { useExecutionStreamV2 } from '@/hooks/useExecutionStreamV2';
import { ApprovalRequestCard } from './ApprovalRequestCard';

type Mode = 'guided' | 'advanced';

export function VisualAgentStudio() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('Mein Agent');
  const [agentVisibility, setAgentVisibility] = useState<'private' | 'team' | 'public'>('private');

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // UI state
  const [mode, setMode] = useState<Mode>('guided');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [showToolRegistry, setShowToolRegistry] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDataContext, setShowDataContext] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  // Phase 13: Flight Recorder - Debug Mode State
  const [showRunHistory, setShowRunHistory] = useState(false);
  // Phase 13: Action Config Panel State
  const [showActionConfig, setShowActionConfig] = useState(false);

  // Flight Recorder store
  const {
    isDebugMode,
    currentRun,
    selectedNodeId: debugSelectedNodeId,
    exitDebugMode,
    setSelectedNode: setDebugSelectedNode,
  } = usePipelineStore();

  // Theme hook for dark/light mode
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Variable Store
  const variableStore = useMemo(() => new VariableStore(), []);

  // V2 Execution Stream Hook
  const executionStream = useExecutionStreamV2();

  // Create node name lookup map for DataContextPanel
  const nodeNames = useMemo(() => {
    const map: Record<string, string> = {};
    nodes.forEach(node => {
      map[node.id] = node.data?.label || node.id;
    });
    return map;
  }, [nodes]);

  // Cleanup execution stream on unmount
  useEffect(() => {
    return () => {
      executionStream.unsubscribe();
    };
  }, [executionStream]);

  // Library data (use-case grouped)
  const libraryGroups = [
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

  const templateOptions = [
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

  const handleNodeSelect = useCallback(
    (node: Node | null) => {
      // Phase 13: In debug mode, clicking a node opens the step details panel
      if (isDebugMode && node) {
        setDebugSelectedNode(node.id);
        return;
      }

      setSelectedNode(node);
      setShowConfig(!!node && mode === 'advanced');

      // Phase 13: Show ActionConfigPanel for action/skill nodes
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

  const handleNodeUpdate = useCallback((nodeId: string, data: any) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node)),
    );
  }, []);

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
  }, []);

  const handleOpenTemplates = useCallback(() => setShowTemplateGallery(true), []);

  const handleOpenMarketplace = useCallback(() => {
    setShowMarketplace(true);
    setShowWelcome(false);
  }, []);

  const handleDeployTemplate = useCallback(
    (template: WorkflowTemplate) => {
      setNodes(template.nodes);
      setEdges(template.edges);
      setShowMarketplace(false);
      setShowWelcome(false);
    },
    [setNodes, setEdges],
  );

  const handleSaveAsTemplate = useCallback(() => {
    if (nodes.length === 0) {
      alert('Cannot save empty workflow as template');
      return;
    }
    setShowSaveAsTemplate(true);
  }, [nodes]);

  const handleOpenToolRegistry = useCallback(() => setShowToolRegistry(true), []);

  const handleOpenConnections = useCallback(() => setShowConnections(true), []);

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

  const handleDragStart = useCallback((module: ModuleTemplate) => {
    console.log('Dragging module:', module.name);
  }, []);

  const handleDragEnd = useCallback(() => {}, []);

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

  // Handle pipeline execution with V2 stream
  const handleExecutePipeline = useCallback(async () => {
    if (!currentWorkflow) {
      alert('Please save the workflow first');
      return;
    }

    // Reset previous execution state
    executionStream.reset();
    setIsExecuting(true);

    try {
      const response = await fetch(`/api/pipelines/${currentWorkflow.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user', // TODO: Get from auth context
        },
        body: JSON.stringify({
          inputs: {},
          triggerType: 'manual',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Subscribe to execution updates
        executionStream.subscribe(
          currentWorkflow.id,
          data.executionId
        );

        // Open the DataContextPanel to show live updates
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

  // Update isExecuting based on execution stream status
  useEffect(() => {
    if (executionStream.status === 'completed' || executionStream.status === 'error') {
      setIsExecuting(false);
    }
  }, [executionStream.status]);

  const handleToggleDataContext = useCallback(() => {
    setShowDataContext(prev => !prev);
  }, []);

  const goNextStep = useCallback(() => {
    setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as typeof prev) : prev));
  }, []);
  const goPrevStep = useCallback(() => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as typeof prev) : prev)), []);

  // Simple template loader to populate canvas with starter nodes
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
    setEdges([{ id: 'e1-2', source: 'trigger', target: 'action' }, { id: 'e2-3', source: 'action', target: 'output' }]);
    setShowWelcome(false);
  }, [setNodes, setEdges]);

  return (
    <div className={cn(
      "flex h-screen w-full overflow-hidden transition-colors duration-200",
      "bg-background"
    )}>
      {/* Left Sidebar - Module Library */}
      <div className={cn(
        "flex-shrink-0 transition-all duration-200",
        showLibrary ? 'w-80' : 'w-12',
        "border-r border-border bg-card"
      )}>
        <div className={cn(
          "flex items-center justify-between px-3 py-2",
          isDark ? "border-b border-white/10" : "border-b-2 border-border"
        )}>
          <div className={cn(
            "text-[10px] font-bold uppercase tracking-widest",
            isDark ? "text-zinc-500" : "text-muted-foreground"
          )}>
            {showLibrary ? 'Module Library' : ''}
          </div>
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className={cn(
              "transition-colors",
              isDark ? "text-zinc-400 hover:text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {showLibrary ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
        {showLibrary && (
          <div className="px-3 pb-4 space-y-3 overflow-y-auto h-[calc(100vh-80px)]">
            <div className="flex items-center gap-2">
              <input
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors",
                  isDark
                    ? "bg-zinc-900 border border-white/10 text-white placeholder:text-zinc-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    : "bg-card border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                )}
                placeholder="Search modules"
              />
            </div>
            <div className={cn(
              "flex items-center justify-between text-xs font-medium",
              isDark ? "text-zinc-400" : "text-muted-foreground"
            )}>
              <span>Show Advanced</span>
              <input type="checkbox" className={cn(
                "rounded",
                isDark ? "border-zinc-600 bg-zinc-800" : "border-border"
              )} />
            </div>
            {libraryGroups.map((group) => {
              const autoOpen = mode === 'guided' && currentStep === 2 && group.id === 'sales';
              return (
                <details
                  key={group.id}
                  open={autoOpen || group.defaultOpen}
                  className={cn(
                    "rounded-xl",
                    isDark
                      ? "border border-white/10 bg-zinc-900/50"
                      : "border-2 border-border bg-muted/50/50"
                  )}
                >
                  <summary className={cn(
                    "cursor-pointer px-3 py-2 text-sm font-semibold",
                    isDark ? "text-white" : "text-foreground"
                  )}>
                    {group.title}
                  </summary>
                  <div className="space-y-2 px-3 pb-3">
                    {group.items.map((item) => (
                      <div
                        key={item.title}
                        className={cn(
                          "group rounded-xl p-3 cursor-grab transition-all",
                          isDark
                            ? "border border-white/10 bg-zinc-900 hover:bg-zinc-800 hover:border-white/20"
                            : "border-2 border-border bg-card hover:bg-muted/50 hover:shadow-sm hover:border-border"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold border",
                            isDark
                              ? "bg-primary/20 text-primary border-primary/30"
                              : "bg-primary/10 text-primary border-primary/20"
                          )}>
                            {item.title.slice(0, 1)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-semibold",
                                isDark ? "text-white" : "text-foreground"
                              )}>
                                {item.title}
                              </span>
                              {item.badges.map((b) => (
                                <span
                                  key={b}
                                  className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                    isDark
                                      ? "bg-primary/20 text-primary border border-primary/30"
                                      : "bg-primary/10 text-primary border border-primary/20"
                                  )}
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                            <p className={cn(
                              "text-xs font-medium",
                              isDark ? "text-zinc-400" : "text-muted-foreground"
                            )}>
                              {item.desc}
                            </p>
                            <div className="flex gap-1 mt-1">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full",
                                    isDark
                                      ? "bg-zinc-800 text-zinc-400 border border-white/10"
                                      : "bg-muted text-muted-foreground border border-border"
                                  )}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className={cn(
                            "opacity-0 group-hover:opacity-100 text-xs",
                            isDark ? "text-zinc-500" : "text-muted-foreground"
                          )}>
                            ...
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={cn(
          "flex items-center gap-4 px-4 py-3 backdrop-blur-xl transition-colors duration-200",
          "border-b border-border bg-card"
        )}>
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <div>
              <div className={cn(
                "text-sm font-semibold",
                isDark ? "text-white" : "text-foreground"
              )}>Agent Studio</div>
              <div className={cn(
                "flex items-center gap-2 text-xs font-medium",
                isDark ? "text-zinc-400" : "text-muted-foreground"
              )}>
                <span className={cn(
                  "px-2 py-0.5 rounded-full",
                  isDark
                    ? "bg-zinc-800 border border-white/10 text-zinc-300"
                    : "bg-muted border border-border text-muted-foreground"
                )}>Draft</span>
                <span>Last tested: 5 min ago</span>
                <span className="text-muted-foreground">- Unsaved changes</span>
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className={cn(
              "rounded-full p-1 text-xs",
              isDark
                ? "bg-zinc-800 border border-white/10"
                : "bg-muted border border-border"
            )}>
              <button
                className={cn(
                  "px-3 py-1 rounded-full font-medium transition-colors",
                  mode === 'guided'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setMode('guided')}
              >
                Guided
              </button>
              <button
                className={cn(
                  "px-3 py-1 rounded-full font-medium transition-colors",
                  mode === 'advanced'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setMode('advanced')}
              >
                Advanced
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm flex items-center gap-1 hover:bg-primary/90 transition-colors"
              >
                <Save className="h-4 w-4" />Save
              </button>
              <button
                onClick={handleExecutePipeline}
                disabled={isExecuting || !currentWorkflow}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  isDark
                    ? "bg-zinc-800 text-zinc-200 border border-white/10 hover:bg-zinc-700 hover:border-white/20"
                    : "bg-card text-foreground border-2 border-border hover:bg-muted/50 hover:border-border"
                )}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Test Run
                  </>
                )}
              </button>
              <button
                onClick={handleToggleDataContext}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1 transition-colors",
                  showDataContext
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-600'
                    : isDark
                      ? "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700 hover:border-white/20"
                      : "bg-card border-2 border-border text-foreground hover:bg-muted/50 hover:border-border"
                )}
                title="Toggle Data Context Panel"
              >
                <Database className="h-4 w-4" />
                {executionStream.status !== 'idle' && (
                  <span className="text-xs">
                    {executionStream.progress}%
                  </span>
                )}
              </button>
              {/* Phase 13: Run History Button */}
              <button
                onClick={() => setShowRunHistory(!showRunHistory)}
                disabled={!currentWorkflow}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  showRunHistory || isDebugMode
                    ? 'bg-primary/10 border border-primary/30 text-primary'
                    : isDark
                      ? "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700 hover:border-white/20"
                      : "bg-card border-2 border-border text-foreground hover:bg-muted/50 hover:border-border"
                )}
                title="Run History (Time-Travel Debug)"
              >
                <History className="h-4 w-4" />
                {isDebugMode && currentRun && (
                  <span className="text-xs">#{currentRun.runNumber}</span>
                )}
              </button>
              <div className="relative">
                <button
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1 transition-colors",
                    isDark
                      ? "bg-zinc-800 text-zinc-200 border border-white/10 hover:bg-zinc-700 hover:border-white/20"
                      : "bg-card text-foreground border-2 border-border hover:bg-muted/50 hover:border-border"
                  )}
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                >
                  <MoreHorizontal className="h-4 w-4" />More
                </button>
                {showMoreMenu && (
                  <div className={cn(
                    "absolute right-0 mt-2 w-56 rounded-xl shadow-lg z-10",
                    isDark
                      ? "border border-white/10 bg-zinc-900"
                      : "border-2 border-border bg-card"
                  )}>
                    <button className={cn(
                      "w-full text-left px-3 py-2 font-medium transition-colors",
                      isDark ? "text-zinc-200 hover:bg-zinc-800" : "text-foreground hover:bg-muted/50"
                    )} onClick={handleOpenVariables}>Variables</button>
                    <button className={cn(
                      "w-full text-left px-3 py-2 font-medium transition-colors",
                      isDark ? "text-zinc-200 hover:bg-zinc-800" : "text-foreground hover:bg-muted/50"
                    )} onClick={handleOpenConnections}>Connections</button>
                    <button className={cn(
                      "w-full text-left px-3 py-2 font-medium transition-colors",
                      isDark ? "text-zinc-200 hover:bg-zinc-800" : "text-foreground hover:bg-muted/50"
                    )} onClick={handleOpenToolRegistry}>Tools</button>
                    <button className={cn(
                      "w-full text-left px-3 py-2 font-medium transition-colors",
                      isDark ? "text-zinc-200 hover:bg-zinc-800" : "text-foreground hover:bg-muted/50"
                    )} onClick={handleSaveAsTemplate}>Save as Template</button>
                    <button className={cn(
                      "w-full text-left px-3 py-2 font-medium transition-colors",
                      isDark ? "text-zinc-200 hover:bg-zinc-800" : "text-foreground hover:bg-muted/50"
                    )} onClick={handleOpenVersionHistory}>Version History</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Guided Stepper */}
        {mode === 'guided' && (
          <div className="border-b-2 border-border bg-card/95 px-4 py-3 flex items-center gap-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 ${
                  currentStep === step ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground'
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full text-[11px] font-medium flex items-center justify-center ${
                    currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-muted-foreground'
                  }`}
                >
                  {currentStep > step ? <Check className="h-3 w-3" /> : step}
                </div>
                <span className="text-sm">
                  {step === 1 && 'Was soll passieren?'}
                  {step === 2 && 'Workflow bauen'}
                  {step === 3 && 'Testen & speichern'}
                </span>
              </div>
            ))}
          </div>
        )}
        {/* Body */}
        <div className="flex-1 relative flex">
          {/* Guided step content overlay */}
          {mode === 'guided' && (
            <div className="absolute left-4 top-4 z-20 max-w-md space-y-4 bg-card border-2 border-border rounded-2xl p-5 backdrop-blur-xl shadow-lg">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-foreground">Was soll passieren?</h3>
                  <p className="text-sm font-medium text-muted-foreground">Waehle einen Use Case. Wir laden sofort einen Starter-Workflow auf den Canvas.</p>
                  <div className="grid grid-cols-1 gap-3">
                    {templateOptions.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          loadTemplateById(tpl.id);
                          goNextStep();
                        }}
                        className={`w-full text-left rounded-xl border-2 px-4 py-3 transition ${
                          selectedTemplateId === tpl.id
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-foreground hover:border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-lg font-semibold">{tpl.title}</div>
                            <div className="text-sm font-medium text-muted-foreground">{tpl.desc}</div>
                            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                              {tpl.bullets.map((b) => (
                                <li key={b}>- {b}</li>
                              ))}
                            </ul>
                          </div>
                          {selectedTemplateId === tpl.id && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={goNextStep}
                      disabled={!selectedTemplateId}
                      className="px-5 py-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 flex items-center gap-2 hover:bg-primary/90 transition-colors"
                    >
                      Weiter <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-foreground">Workflow bauen</h3>
                  <p className="text-sm font-medium text-muted-foreground">Passe den vorgegebenen Workflow an. Ziehe weitere Module aus der Library auf den Canvas.</p>
                  <div className="rounded-xl border-2 border-border bg-muted/50 p-3 text-xs font-medium text-muted-foreground">
                    Tipp: Library links ist eingeklappt. Oeffne sie, um Aktionen hinzuzufuegen und verbinde die Nodes per Drag & Drop.
                  </div>
                  <div className="flex justify-between">
                    <button onClick={goPrevStep} className="px-4 py-2 text-sm border-2 border-border rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors">Zurueck</button>
                    <button onClick={goNextStep} className="px-5 py-3 bg-primary text-primary-foreground rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors">
                      Weiter <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-foreground">Testen & speichern</h3>
                  <div className="rounded-xl border-2 border-border bg-muted/50 p-3 space-y-2 text-sm text-foreground">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status</span>
                      <span className="text-primary font-semibold">Draft</span>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">Validation: Keine Blocker gefunden.</div>
                  </div>
                  <div className="space-y-2">
                    <input
                      className="w-full rounded-xl bg-card px-3 py-2.5 text-sm border-2 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none"
                      placeholder="Agent Name"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                    />
                    <select
                      className="w-full rounded-xl bg-card px-3 py-2.5 text-sm border-2 border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none"
                      value={agentVisibility}
                      onChange={(e) => setAgentVisibility(e.target.value as 'private' | 'team' | 'public')}
                    >
                      <option value="private">Private</option>
                      <option value="team">Team</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                  <div className="flex justify-between">
                    <button onClick={goPrevStep} className="px-4 py-2 text-sm border-2 border-border rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors">Zurueck</button>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 text-sm border-2 border-border rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors">Save Draft</button>
                      <button className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">Test Run</button>
                      <button
                        className="px-4 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
                        onClick={() =>
                          handleSaveWorkflow({
                            name: agentName || 'Mein Agent',
                            description: '',
                            tags: [],
                            status: 'draft',
                            visibility: agentVisibility,
                          })
                        }
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Canvas */}
          <div className="flex-1 relative">
            {/* Phase 13: Debug Mode Header Overlay */}
            {isDebugMode && <RunHeader />}

            <VisualCanvas
              onNodeSelect={handleNodeSelect}
              onSave={handleSave}
              onOpenPreview={handleOpenPreview}
              onOpenVariables={handleOpenVariables}
              onOpenTemplates={handleOpenTemplates}
              onOpenMarketplace={handleOpenMarketplace}
              onSaveAsTemplate={handleSaveAsTemplate}
              onOpenToolRegistry={handleOpenToolRegistry}
              onOpenConnections={handleOpenConnections}
              onOpenVersionHistory={handleOpenVersionHistory}
              currentWorkflow={currentWorkflow}
              onPublish={handlePublish}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
            />

            {/* Empty State Overlay (only Advanced) */}
            {mode === 'advanced' && showWelcome && nodes.length === 0 && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <div className="pointer-events-auto max-w-2xl rounded-2xl border-2 border-border bg-card p-8 shadow-2xl">
                  <h1 className="text-3xl font-bold text-foreground mb-4">Define Goal</h1>
                  <p className="text-sm font-medium text-muted-foreground mb-6">Waehle ein Ziel oder starte mit einem Template.</p>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { title: 'CRM Follow-up', desc: 'Automatische Follow-ups im CRM' },
                      { title: 'Support Auto-Reply', desc: 'Antworten auf Support-Anfragen' },
                    ].map((tpl) => (
                      <div
                        key={tpl.title}
                        className="rounded-xl border-2 border-border bg-card p-4 hover:border-border hover:shadow-sm cursor-pointer transition-all"
                        onClick={() => setShowWelcome(false)}
                      >
                        <div className="text-xl mb-2 text-primary">*</div>
                        <div className="text-sm font-semibold text-foreground">{tpl.title}</div>
                        <div className="text-xs font-medium text-muted-foreground">{tpl.desc}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowTemplateGallery(true)} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                      Use Template
                    </button>
                    <button onClick={() => setShowWelcome(false)} className="flex-1 rounded-xl border-2 border-border px-6 py-3 text-sm font-medium text-foreground transition hover:bg-muted/50">
                      Start from Scratch
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side Panels */}
          <AnimatePresence>
            {showConfig && mode === 'advanced' && !showActionConfig && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 overflow-hidden"
              >
                <ConfigurationPanel
                  selectedNode={selectedNode}
                  onClose={() => {
                    setShowConfig(false);
                    setSelectedNode(null);
                  }}
                  onUpdate={handleNodeUpdate}
                  variableStore={variableStore}
                  nodes={nodes}
                  edges={edges}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 13: Action Config Panel for action nodes */}
          <AnimatePresence>
            {showActionConfig && mode === 'advanced' && (
              <ActionConfigPanel
                selectedNode={selectedNode}
                nodes={nodes}
                edges={edges}
                onUpdate={handleNodeUpdate}
                onClose={() => {
                  setShowActionConfig(false);
                  setShowConfig(false);
                  setSelectedNode(null);
                }}
                isOpen={showActionConfig}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showPreview && (
              <PreviewPanel
                nodes={nodes}
                edges={edges}
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                workflowId={currentWorkflow?.id}
                variableStore={variableStore}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showVariables && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 overflow-hidden"
              >
                <VariablePanel
                  variableStore={variableStore}
                  onVariablesChange={(variables: Variable[]) => {
                    console.log('Variables updated:', variables.length);
                  }}
                  onClose={() => setShowVariables(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Data Context Panel (V2 Execution State) */}
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

      {/* Template Gallery (ShadCN Dialog) */}
      <TemplateDialog
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onTemplateSelect={handleTemplateSelect}
      />

      {/* Template Marketplace */}
      <AnimatePresence>
        {showMarketplace && (
          <TemplateMarketplace onDeployTemplate={handleDeployTemplate} onClose={() => setShowMarketplace(false)} />
        )}
      </AnimatePresence>

      {/* Save as Template Dialog */}
      <AnimatePresence>
        {showSaveAsTemplate && (
          <SaveAsTemplateDialog nodes={nodes} edges={edges} onClose={() => setShowSaveAsTemplate(false)} />
        )}
      </AnimatePresence>

      {/* Tool Registry */}
      <AnimatePresence>
        {showToolRegistry && (
          <ToolRegistry onClose={() => setShowToolRegistry(false)} onSelectTool={handleSelectTool} />
        )}
      </AnimatePresence>

      {/* Connections Dialog */}
      <AnimatePresence>
        {showConnections && (
          <ConnectionsDialog isOpen={showConnections} onClose={() => setShowConnections(false)} />
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

      {/* HITL Approval Request Card */}
      <AnimatePresence>
        {executionStream.isSuspended && executionStream.approvalData && currentWorkflow && (
          <ApprovalRequestCard
            approvalData={executionStream.approvalData}
            pipelineId={currentWorkflow.id}
            executionId={executionStream.executionId || ''}
            onApprovalComplete={(approved) => {
              console.log('[STUDIO] Approval submitted:', approved);
              // The execution stream will automatically update via socket events
            }}
          />
        )}
      </AnimatePresence>

      {/* Phase 13: Flight Recorder - Run History Sidebar */}
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

      {/* Phase 13: Flight Recorder - Step Details Panel (Debug Mode) */}
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
