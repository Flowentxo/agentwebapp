'use client';

/**
 * StudioSidebar Component
 *
 * Manages the conditional rendering of right-hand panels including:
 * - Configuration Panel (node settings)
 * - Action Config Panel (for action nodes)
 * - Preview Panel (test runs)
 * - Variable Panel (workflow variables)
 *
 * @version 1.0.0
 */

import { memo, ReactNode } from 'react';
import { Node, Edge } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfigurationPanel } from '../ConfigurationPanel';
import { PreviewPanel } from '../PreviewPanel';
import { VariablePanel } from '../VariablePanel';
import { ActionConfigPanel } from '../sidebar/ActionConfigPanel';
import { VariableStore } from '@/lib/studio/variable-store';
import { Variable } from '@/lib/studio/variable-types';
import { StudioMode } from './StudioHeader';

// =====================================================
// TYPES
// =====================================================

export interface StudioSidebarProps {
  /** Current studio mode */
  mode: StudioMode;
  /** Currently selected node */
  selectedNode: Node | null;
  /** All nodes in the workflow */
  nodes: Node[];
  /** All edges in the workflow */
  edges: Edge[];
  /** Variable store instance */
  variableStore: VariableStore;
  /** Current workflow ID */
  workflowId?: string;
  /** Whether config panel is visible */
  showConfig: boolean;
  /** Whether action config panel is visible */
  showActionConfig: boolean;
  /** Whether preview panel is visible */
  showPreview: boolean;
  /** Whether variables panel is visible */
  showVariables: boolean;
  /** Callback to close config panel */
  onCloseConfig: () => void;
  /** Callback to close action config panel */
  onCloseActionConfig: () => void;
  /** Callback to close preview panel */
  onClosePreview: () => void;
  /** Callback to close variables panel */
  onCloseVariables: () => void;
  /** Callback when node is updated */
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  /** Callback when variables change */
  onVariablesChange: (variables: Variable[]) => void;
}

// =====================================================
// ANIMATION VARIANTS
// =====================================================

const panelVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: 320, opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const widePanelVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: 380, opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { duration: 0.2 };

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface AnimatedPanelProps {
  isVisible: boolean;
  children: ReactNode;
  wide?: boolean;
}

const AnimatedPanel = memo(function AnimatedPanel({
  isVisible,
  children,
  wide = false,
}: AnimatedPanelProps) {
  const variants = wide ? widePanelVariants : panelVariants;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={transition}
          className="flex-shrink-0 overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const StudioSidebar = memo(function StudioSidebar({
  mode,
  selectedNode,
  nodes,
  edges,
  variableStore,
  workflowId,
  showConfig,
  showActionConfig,
  showPreview,
  showVariables,
  onCloseConfig,
  onCloseActionConfig,
  onClosePreview,
  onCloseVariables,
  onNodeUpdate,
  onVariablesChange,
}: StudioSidebarProps) {
  const isAdvancedMode = mode === 'advanced';

  return (
    <>
      {/* Configuration Panel - Standard node config */}
      <AnimatedPanel isVisible={showConfig && isAdvancedMode && !showActionConfig}>
        <ConfigurationPanel
          selectedNode={selectedNode}
          onClose={onCloseConfig}
          onUpdate={onNodeUpdate}
          variableStore={variableStore}
          nodes={nodes}
          edges={edges}
        />
      </AnimatedPanel>

      {/* Action Config Panel - For action/skill nodes */}
      <AnimatePresence>
        {showActionConfig && isAdvancedMode && (
          <ActionConfigPanel
            selectedNode={selectedNode}
            nodes={nodes}
            edges={edges}
            onUpdate={onNodeUpdate}
            onClose={onCloseActionConfig}
            isOpen={showActionConfig}
          />
        )}
      </AnimatePresence>

      {/* Preview Panel - Test run execution */}
      <AnimatePresence>
        {showPreview && (
          <PreviewPanel
            nodes={nodes}
            edges={edges}
            isOpen={showPreview}
            onClose={onClosePreview}
            workflowId={workflowId}
            variableStore={variableStore}
          />
        )}
      </AnimatePresence>

      {/* Variables Panel - Workflow variables management */}
      <AnimatedPanel isVisible={showVariables} wide>
        <VariablePanel
          variableStore={variableStore}
          onVariablesChange={onVariablesChange}
          onClose={onCloseVariables}
        />
      </AnimatedPanel>
    </>
  );
});

export default StudioSidebar;
