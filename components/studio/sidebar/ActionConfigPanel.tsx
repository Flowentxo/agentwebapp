'use client';

/**
 * ACTION CONFIG PANEL
 * Phase 13: Action Configuration UI & Variable Mapping
 * Phase 16: Error Recovery & Self-Healing
 *
 * The main container component for configuring action nodes in the workflow editor.
 * This panel appears on the right side when an action node is selected.
 *
 * Features:
 * - Connects to React Flow state
 * - Only visible when an action node is selected
 * - Displays node title and description
 * - Contains the DynamicActionForm for tool configuration
 * - Shows tool outputs for reference
 * - Error Handling & Retry Configuration (Phase 16)
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Node, Edge } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Settings,
  Zap,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Info,
  Shield,
  RefreshCw,
  Clock,
  SkipForward,
  StopCircle,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DynamicActionForm } from './DynamicActionForm';
import { getToolById } from '@/lib/tools/definitions';
import {
  RetryPolicy,
  OnErrorAction,
  DEFAULT_RETRY_POLICY,
  DEFAULT_ON_ERROR,
} from '@/types/workflow';

// ============================================================================
// TYPES
// ============================================================================

export interface ActionConfigPanelProps {
  /** Currently selected node (null if none selected) */
  selectedNode: Node | null;
  /** All nodes in the workflow */
  nodes: Node[];
  /** All edges in the workflow */
  edges: Edge[];
  /** Callback to update node data */
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  /** Callback to close the panel */
  onClose: () => void;
  /** Whether the panel is open */
  isOpen?: boolean;
}

type ConfigTab = 'configuration' | 'error-handling';

// ============================================================================
// HELPER: Check if node is an action node
// ============================================================================

function isActionNode(node: Node | null): boolean {
  if (!node) return false;

  // Check node type or category
  const nodeType = node.type;
  const category = node.data?.category;

  return (
    nodeType === 'actionNode' ||
    nodeType === 'action' ||
    nodeType === 'custom' ||
    category === 'action' ||
    category === 'skill'
  );
}

// ============================================================================
// TAB BUTTON COMPONENT (Enterprise White)
// ============================================================================

interface TabButtonProps {
  tab: ConfigTab;
  activeTab: ConfigTab;
  onClick: () => void;
  icon: typeof Settings;
  label: string;
}

function TabButton({ tab, activeTab, onClick, icon: Icon, label }: TabButtonProps) {
  const isActive = tab === activeTab;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all relative',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon size={14} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
      <span>{label}</span>
      {isActive && (
        <motion.div
          layoutId="activeConfigTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
        />
      )}
    </button>
  );
}

// ============================================================================
// ERROR HANDLING TAB COMPONENT (Enterprise White - Phase 16)
// ============================================================================

interface ErrorHandlingTabProps {
  node: Node;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}

function ErrorHandlingTab({ node, onUpdate }: ErrorHandlingTabProps) {
  // Get current settings or defaults
  const currentSettings = node.data?.settings || {};
  const retryPolicy: RetryPolicy = {
    maxAttempts: currentSettings.retryPolicy?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts,
    backoffMs: currentSettings.retryPolicy?.backoffMs ?? DEFAULT_RETRY_POLICY.backoffMs,
    exponentialBackoff: currentSettings.retryPolicy?.exponentialBackoff ?? DEFAULT_RETRY_POLICY.exponentialBackoff,
  };
  const onError: OnErrorAction = currentSettings.onError ?? DEFAULT_ON_ERROR;
  const timeoutMs: number | undefined = currentSettings.timeoutMs;
  const isCritical: boolean = currentSettings.isCritical ?? false;

  // State for switches
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(retryPolicy.maxAttempts > 1);

  // Update settings
  const updateSettings = useCallback((updates: Record<string, unknown>) => {
    const newSettings = {
      ...currentSettings,
      ...updates,
    };
    onUpdate(node.id, {
      ...node.data,
      settings: newSettings,
    });
  }, [currentSettings, node.data, node.id, onUpdate]);

  // Toggle auto-retry
  const handleAutoRetryToggle = (enabled: boolean) => {
    setAutoRetryEnabled(enabled);
    updateSettings({
      retryPolicy: {
        ...retryPolicy,
        maxAttempts: enabled ? 3 : 1,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Auto-Retry Section */}
      <div className="bg-card rounded-xl border-2 border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center">
              <RefreshCw size={20} className="text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Auto-Retry</h4>
              <p className="text-xs text-muted-foreground">Automatically retry on failure</p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => handleAutoRetryToggle(!autoRetryEnabled)}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              autoRetryEnabled ? 'bg-primary' : 'bg-slate-200'
            )}
          >
            <motion.div
              initial={false}
              animate={{ x: autoRetryEnabled ? 24 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-card shadow-md"
            />
          </button>
        </div>

        {/* Retry Options (visible when enabled) */}
        <AnimatePresence>
          {autoRetryEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t-2 border-border space-y-4">
                {/* Max Retries */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">
                    Max Retries
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={retryPolicy.maxAttempts}
                      onChange={(e) => updateSettings({
                        retryPolicy: { ...retryPolicy, maxAttempts: parseInt(e.target.value) }
                      })}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="w-8 text-center text-sm font-mono font-semibold text-foreground bg-muted rounded-lg px-2 py-1">
                      {retryPolicy.maxAttempts}
                    </span>
                  </div>
                </div>

                {/* Retry Strategy */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">
                    Retry Strategy
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateSettings({
                        retryPolicy: { ...retryPolicy, exponentialBackoff: false }
                      })}
                      className={cn(
                        'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2',
                        !retryPolicy.exponentialBackoff
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-card border-border text-muted-foreground hover:border-border'
                      )}
                    >
                      <Clock size={14} />
                      Fixed
                    </button>
                    <button
                      onClick={() => updateSettings({
                        retryPolicy: { ...retryPolicy, exponentialBackoff: true }
                      })}
                      className={cn(
                        'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2',
                        retryPolicy.exponentialBackoff
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-card border-border text-muted-foreground hover:border-border'
                      )}
                    >
                      <RefreshCw size={14} />
                      Exponential
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {retryPolicy.exponentialBackoff
                      ? 'Delay doubles after each attempt (1s → 2s → 4s...)'
                      : `Fixed delay of ${retryPolicy.backoffMs}ms between retries`}
                  </p>
                </div>

                {/* Base Delay */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">
                    Base Delay (ms)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="30000"
                    step="100"
                    value={retryPolicy.backoffMs}
                    onChange={(e) => updateSettings({
                      retryPolicy: { ...retryPolicy, backoffMs: parseInt(e.target.value) || 1000 }
                    })}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-border text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* On Error Behavior Section */}
      <div className="bg-card rounded-xl border-2 border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">On Error Behavior</h4>
            <p className="text-xs text-muted-foreground">What happens after retries fail</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateSettings({ onError: 'stop' })}
            className={cn(
              'flex flex-col items-center gap-2 px-4 py-4 rounded-xl text-sm font-medium transition-all border-2',
              onError === 'stop'
                ? 'bg-red-500/10 border-red-500/30 text-red-700'
                : 'bg-card border-border text-muted-foreground hover:border-border'
            )}
          >
            <StopCircle size={24} className={onError === 'stop' ? 'text-red-500' : 'text-muted-foreground'} />
            <span>Stop Workflow</span>
          </button>
          <button
            onClick={() => updateSettings({ onError: 'continue' })}
            className={cn(
              'flex flex-col items-center gap-2 px-4 py-4 rounded-xl text-sm font-medium transition-all border-2',
              onError === 'continue'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                : 'bg-card border-border text-muted-foreground hover:border-border'
            )}
          >
            <SkipForward size={24} className={onError === 'continue' ? 'text-emerald-500' : 'text-muted-foreground'} />
            <span>Continue</span>
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          {onError === 'stop'
            ? 'Workflow will halt immediately if this node fails after all retries.'
            : 'Workflow will skip this node and continue to next nodes if it fails.'}
        </p>
      </div>

      {/* Timeout Section */}
      <div className="bg-card rounded-xl border-2 border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 border-2 border-violet-200 flex items-center justify-center">
            <Clock size={20} className="text-violet-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Timeout</h4>
            <p className="text-xs text-muted-foreground">Maximum execution time</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1000"
            max="600000"
            step="1000"
            value={timeoutMs || 60000}
            onChange={(e) => updateSettings({ timeoutMs: parseInt(e.target.value) || 60000 })}
            className="flex-1 px-3 py-2.5 rounded-xl border-2 border-border text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <span className="text-sm text-muted-foreground">ms</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Default: 60,000ms (1 minute). Max: 600,000ms (10 minutes).
        </p>
      </div>

      {/* Critical Node Toggle */}
      <div className="bg-card rounded-xl border-2 border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
              <Shield size={20} className="text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Critical Node</h4>
              <p className="text-xs text-muted-foreground">Always stop workflow on failure</p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => updateSettings({ isCritical: !isCritical })}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              isCritical ? 'bg-red-500' : 'bg-slate-200'
            )}
          >
            <motion.div
              initial={false}
              animate={{ x: isCritical ? 24 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-card shadow-md"
            />
          </button>
        </div>
        {isCritical && (
          <p className="text-xs text-red-600 mt-3 flex items-start gap-1.5 bg-red-500/10 p-2 rounded-lg">
            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
            This node is critical. Workflow will always stop on failure, even if &quot;Continue&quot; is selected above.
          </p>
        )}
      </div>

      {/* Self-Healing: Error Port */}
      <div className="bg-card rounded-xl border-2 border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border-2 border-orange-200 flex items-center justify-center">
              <SkipForward size={20} className="text-orange-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Error Fallback Port</h4>
              <p className="text-xs text-muted-foreground">Enable visual error handling path</p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => updateSettings({ hasErrorPort: !currentSettings.hasErrorPort })}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              currentSettings.hasErrorPort ? 'bg-orange-500' : 'bg-slate-200'
            )}
          >
            <motion.div
              initial={false}
              animate={{ x: currentSettings.hasErrorPort ? 24 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-card shadow-md"
            />
          </button>
        </div>
        {currentSettings.hasErrorPort && (
          <div className="mt-3 p-3 bg-orange-50 rounded-lg border-2 border-orange-200">
            <p className="text-xs text-orange-700 flex items-start gap-1.5">
              <Info size={12} className="mt-0.5 flex-shrink-0" />
              An &quot;On Error&quot; output port will appear on this node. Connect it to a fallback workflow path that executes when this node fails.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-orange-600 font-mono">On Error → Fallback Path</span>
            </div>
          </div>
        )}
      </div>

      {/* Preview Summary */}
      <div className="bg-muted/50 rounded-xl border-2 border-border p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Behavior Summary
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-foreground">
              {autoRetryEnabled
                ? `Retry up to ${retryPolicy.maxAttempts} times with ${retryPolicy.exponentialBackoff ? 'exponential' : 'fixed'} backoff`
                : 'No automatic retries'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'w-2 h-2 rounded-full',
              onError === 'stop' || isCritical ? 'bg-red-500' : 'bg-emerald-500'
            )} />
            <span className="text-foreground">
              {isCritical
                ? 'Always stop workflow on failure (critical)'
                : onError === 'stop'
                  ? 'Stop workflow on failure'
                  : 'Continue workflow on failure'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-foreground">
              Timeout after {((timeoutMs || 60000) / 1000).toFixed(0)}s
            </span>
          </div>
          {currentSettings.hasErrorPort && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-foreground">
                Error fallback port enabled (self-healing)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OUTPUT DISPLAY COMPONENT
// ============================================================================

interface OutputDisplayProps {
  toolId: string;
  nodeId: string;
}

function OutputDisplay({ toolId, nodeId }: OutputDisplayProps) {
  const tool = getToolById(toolId);
  const [copiedPath, setCopiedPath] = React.useState<string | null>(null);

  if (!tool?.outputs || tool.outputs.length === 0) return null;

  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(`{{${nodeId}.output.${path}}}`);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ArrowRight size={14} className="text-emerald-500" />
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Outputs
        </h4>
      </div>

      <div className="space-y-1.5">
        {tool.outputs.map(output => (
          <div
            key={output.key}
            className={cn(
              'group flex items-center gap-2 px-2.5 py-1.5 rounded-lg',
              'bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border-2 border-emerald-500/30'
            )}
          >
            <span className="flex-1 min-w-0">
              <span className="font-mono text-xs text-emerald-700 block truncate">
                {`{{${nodeId}.output.${output.key}}}`}
              </span>
              {output.description && (
                <span className="text-[10px] text-muted-foreground block truncate">
                  {output.description}
                </span>
              )}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-card border-2 border-border text-muted-foreground">
              {output.type}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(output.key)}
              className={cn(
                'p-1 rounded opacity-0 group-hover:opacity-100',
                'hover:bg-emerald-200 transition-all'
              )}
              title="Copy variable path"
            >
              {copiedPath === output.key ? (
                <Check size={12} className="text-emerald-500" />
              ) : (
                <Copy size={12} className="text-muted-foreground" />
              )}
            </button>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Info size={10} />
        Use these outputs in downstream nodes
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActionConfigPanel({
  selectedNode,
  nodes,
  edges,
  onUpdate,
  onClose,
  isOpen = true,
}: ActionConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<ConfigTab>('configuration');

  // Determine if we should show the panel
  const shouldShow = isOpen && selectedNode && isActionNode(selectedNode);

  // Get tool info
  const selectedToolId = selectedNode?.data?.selectedTool as string | undefined;
  const tool = selectedToolId ? getToolById(selectedToolId) : null;

  // Node info
  const nodeLabel = selectedNode?.data?.label || 'Action Node';
  const nodeDescription = selectedNode?.data?.description || tool?.description || '';
  const nodeColor = selectedNode?.data?.color || tool?.color || '#6366F1';

  // Reset tab when node changes
  React.useEffect(() => {
    setActiveTab('configuration');
  }, [selectedNode?.id]);

  if (!shouldShow || !selectedNode) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 380, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'flex-shrink-0 h-full overflow-hidden',
          'border-l-2 border-border bg-muted/50'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 border-b-2 border-border p-4 bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Configure Action</h2>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'p-1.5 rounded-xl transition-colors border-2 border-border',
                  'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <X size={18} />
              </button>
            </div>

            {/* Node Info Card */}
            <div
              className="flex items-center gap-3 p-3 rounded-xl border-2"
              style={{
                backgroundColor: `${nodeColor}08`,
                borderColor: `${nodeColor}40`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border-2"
                style={{
                  backgroundColor: `${nodeColor}15`,
                  borderColor: `${nodeColor}40`,
                }}
              >
                <Zap size={20} style={{ color: nodeColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {nodeLabel}
                </h3>
                {nodeDescription && (
                  <p className="text-xs text-muted-foreground truncate">
                    {nodeDescription}
                  </p>
                )}
              </div>
            </div>

            {/* Node ID Badge */}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono px-2 py-0.5 rounded-lg bg-muted border-2 border-border">
                ID: {selectedNode.id}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b-2 border-border bg-card">
            <TabButton
              tab="configuration"
              activeTab={activeTab}
              onClick={() => setActiveTab('configuration')}
              icon={Settings}
              label="Configuration"
            />
            <TabButton
              tab="error-handling"
              activeTab={activeTab}
              onClick={() => setActiveTab('error-handling')}
              icon={Shield}
              label="Error Handling"
            />
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {activeTab === 'configuration' && (
              <>
                {/* Action Form */}
                <DynamicActionForm
                  node={selectedNode}
                  nodes={nodes}
                  edges={edges}
                  onUpdate={onUpdate}
                />

                {/* Divider */}
                {selectedToolId && (
                  <div className="border-t-2 border-border pt-4">
                    {/* Outputs Section */}
                    <OutputDisplay toolId={selectedToolId} nodeId={selectedNode.id} />
                  </div>
                )}

                {/* Connection Status */}
                {tool?.requiredConnection && (
                  <div className="border-t-2 border-border pt-4">
                    <ConnectionStatus provider={tool.requiredConnection} />
                  </div>
                )}
              </>
            )}

            {activeTab === 'error-handling' && (
              <ErrorHandlingTab
                node={selectedNode}
                onUpdate={onUpdate}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t-2 border-border p-4 bg-card">
            <button
              onClick={onClose}
              className={cn(
                'w-full py-2.5 rounded-xl text-sm font-semibold',
                'bg-primary text-white',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// CONNECTION STATUS COMPONENT
// ============================================================================

interface ConnectionStatusProps {
  provider: string;
}

function ConnectionStatus({ provider }: ConnectionStatusProps) {
  // In a real app, this would check the actual connection status
  const isConnected = false; // Placeholder

  const providerLabels: Record<string, string> = {
    google: 'Google',
    hubspot: 'HubSpot',
    slack: 'Slack',
    salesforce: 'Salesforce',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ExternalLink size={14} className="text-muted-foreground" />
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Required Connection
        </h4>
      </div>

      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border-2',
          isConnected
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        )}
      >
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full',
            isConnected ? 'bg-emerald-500' : 'bg-amber-500'
          )}
        />
        <span className="flex-1 text-sm text-foreground">
          {providerLabels[provider] || provider}
        </span>
        {isConnected ? (
          <span className="text-xs text-emerald-500 font-medium">Connected</span>
        ) : (
          <button
            className={cn(
              'text-xs px-3 py-1.5 rounded-lg font-medium',
              'bg-amber-500/20 text-amber-700 border-2 border-amber-300',
              'hover:bg-amber-200 transition-colors'
            )}
          >
            Connect
          </button>
        )}
      </div>

      {!isConnected && (
        <p className="text-[10px] text-amber-600 flex items-center gap-1">
          <AlertTriangle size={10} />
          Connect your account to use this tool
        </p>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ActionConfigPanel;
