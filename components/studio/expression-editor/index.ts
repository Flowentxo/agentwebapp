/**
 * Expression Editor Components
 *
 * n8n-style expression editor for workflow variable management.
 *
 * Components:
 * - ExpressionEditorModal: Full-featured modal with variable selector, editor, and preview
 * - VariableTreeView: Searchable tree view for displaying available variables
 * - useExpressionPreview: Hook for real-time expression evaluation
 */

export { ExpressionEditorModal } from './ExpressionEditorModal';
export type { default as ExpressionEditorModalProps } from './ExpressionEditorModal';

export { VariableTreeView } from './VariableTreeView';
export type { VariableTreeItem } from './VariableTreeView';

export {
  useExpressionPreview,
  extractAvailableVariables
} from './useExpressionPreview';

export type {
  WorkflowContext,
  ExpressionPreviewResult
} from './useExpressionPreview';
