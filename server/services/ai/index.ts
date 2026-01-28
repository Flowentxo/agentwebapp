/**
 * AI Services Index
 * Phase 8: Workflow Architect AI
 *
 * This module exports all AI-related services for workflow generation
 * and error analysis.
 */

// Node Definition & Prompts
export {
  NODE_LIBRARY,
  generateArchitectSystemPrompt,
  generateCurrentWorkflowContext,
  generateErrorAnalysisContext,
  getNodeDefinition,
  getNodesByCategory,
  isValidNodeType,
  getNodeOutputSchema,
  type NodeDefinition,
  type NodePort,
  type ConfigField,
} from './NodeDefinitionPrompt';

// Workflow Generator Service
export {
  WorkflowGeneratorService,
  getWorkflowGeneratorService,
  type WorkflowNode,
  type WorkflowEdge,
  type GeneratedWorkflow,
  type GenerationRequest,
  type GenerationResponse,
  type StreamCallbacks,
  type ConversationMessage,
  type VariableReference,
} from './WorkflowGeneratorService';

// Error Analysis Service
export {
  ErrorAnalysisService,
  getErrorAnalysisService,
  type ExecutionError,
  type ErrorAnalysis,
  type SuggestedFix,
  type WorkflowChanges,
  type AnalysisRequest,
  type AnalysisResponse,
  type ExecutionStep,
  type QuickFix,
} from './ErrorAnalysisService';
