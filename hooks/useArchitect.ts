/**
 * useArchitect Hook
 * Phase 8: Frontend Hook for AI-Powered Workflow Generation
 *
 * This hook provides the interface between the ArchitectSidebar UI
 * and the backend AI services, managing conversation state and
 * applying generated workflows to the React Flow canvas.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useReactFlow, Node, Edge } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export type ArchitectMode = 'create' | 'modify' | 'fix';

export interface ArchitectMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  mode?: ArchitectMode;
  workflow?: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  suggestions?: string[];
  errors?: string[];
  tokensUsed?: number;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, any>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface UseArchitectOptions {
  currentNodes?: any[];
  currentEdges?: any[];
  onWorkflowApplied?: (nodes: any[], edges: any[]) => void;
  onError?: (error: Error) => void;
  apiBaseUrl?: string;
}

export interface UseArchitectReturn {
  messages: ArchitectMessage[];
  isLoading: boolean;
  sessionId: string | null;
  error: Error | null;
  sendMessage: (prompt: string, mode: ArchitectMode) => Promise<void>;
  sendMessageStream: (prompt: string, mode: ArchitectMode) => Promise<void>;
  clearMessages: () => void;
  applyWorkflow: (workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
  suggestMappings: (targetNodeId: string, targetNodeType: string) => Promise<Record<string, string[]>>;
  validateWorkflow: () => Promise<{ valid: boolean; errors: string[]; suggestions: string[] }>;
  optimizeLayout: () => Promise<void>;
  getNodeLibrary: () => Promise<any[]>;
}

// ============================================================================
// API Client
// ============================================================================

class ArchitectAPI {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async generateWorkflow(
    prompt: string,
    mode: ArchitectMode,
    currentWorkflow?: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/architect/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        mode,
        currentWorkflow,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async *generateWorkflowStream(
    prompt: string,
    mode: ArchitectMode,
    currentWorkflow?: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
  ): AsyncGenerator<any> {
    const response = await fetch(`${this.baseUrl}/architect/generate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        mode,
        currentWorkflow,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            yield JSON.parse(data);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  async continueConversation(
    sessionId: string,
    message: string,
    currentWorkflow?: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/architect/conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message,
        currentWorkflow,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async suggestMappings(
    targetNodeId: string,
    targetNodeType: string,
    availableNodes: WorkflowNode[]
  ): Promise<Record<string, string[]>> {
    const response = await fetch(`${this.baseUrl}/architect/suggest-mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetNodeId,
        targetNodeType,
        availableNodes,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions || {};
  }

  async validateWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Promise<{ valid: boolean; errors: string[]; suggestions: string[] }> {
    const response = await fetch(`${this.baseUrl}/architect/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      valid: data.success,
      errors: data.errors || [],
      suggestions: data.suggestions || [],
    };
  }

  async optimizeLayout(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }> {
    const response = await fetch(`${this.baseUrl}/architect/optimize-layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.workflow;
  }

  async getNodeLibrary(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/architect/nodes`);

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.nodes || [];
  }

  async analyzeError(
    error: { message: string; nodeId?: string; nodeName?: string },
    workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/architect/analyze-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          id: uuidv4(),
          workflowId: 'current',
          executionId: 'current',
          errorType: 'runtime',
          ...error,
          timestamp: new Date(),
        },
        workflow,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useArchitect(options: UseArchitectOptions = {}): UseArchitectReturn {
  const {
    currentNodes = [],
    currentEdges = [],
    onWorkflowApplied,
    onError,
    apiBaseUrl = '/api',
  } = options;

  // State
  const [messages, setMessages] = useState<ArchitectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const apiRef = useRef(new ArchitectAPI(apiBaseUrl));
  const abortControllerRef = useRef<AbortController | null>(null);

  // React Flow instance (if available)
  let reactFlowInstance: ReturnType<typeof useReactFlow> | null = null;
  try {
    reactFlowInstance = useReactFlow();
  } catch {
    // Not within ReactFlowProvider
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Message Sending (Non-Streaming)
  // --------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (prompt: string, mode: ArchitectMode) => {
      const userMessage: ArchitectMessage = {
        id: uuidv4(),
        role: 'user',
        content: prompt,
        timestamp: new Date(),
        status: 'complete',
        mode,
      };

      const assistantMessage: ArchitectMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'pending',
        mode,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const currentWorkflow =
          mode === 'modify' || mode === 'fix'
            ? {
                nodes: currentNodes as WorkflowNode[],
                edges: currentEdges as WorkflowEdge[],
              }
            : undefined;

        let result;

        // Use conversation continuation if we have a session
        if (sessionId) {
          result = await apiRef.current.continueConversation(
            sessionId,
            prompt,
            currentWorkflow
          );
          if (result.sessionId) {
            setSessionId(result.sessionId);
          }
        } else {
          result = await apiRef.current.generateWorkflow(prompt, mode, currentWorkflow);
        }

        // Create new session if returned
        if (result.sessionId && !sessionId) {
          setSessionId(result.sessionId);
        }

        // Update assistant message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content: result.explanation || 'Workflow generated successfully.',
                  status: result.success ? 'complete' : 'error',
                  workflow: result.workflow,
                  suggestions: result.suggestions,
                  errors: result.errors,
                  tokensUsed: result.tokensUsed,
                }
              : msg
          )
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(err instanceof Error ? err : new Error(errorMessage));
        onError?.(err instanceof Error ? err : new Error(errorMessage));

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content: `Error: ${errorMessage}`,
                  status: 'error',
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentNodes, currentEdges, sessionId, onError]
  );

  // --------------------------------------------------------------------------
  // Message Sending (Streaming)
  // --------------------------------------------------------------------------

  const sendMessageStream = useCallback(
    async (prompt: string, mode: ArchitectMode) => {
      const userMessage: ArchitectMessage = {
        id: uuidv4(),
        role: 'user',
        content: prompt,
        timestamp: new Date(),
        status: 'complete',
        mode,
      };

      const assistantMessage: ArchitectMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'streaming',
        mode,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const currentWorkflow =
          mode === 'modify' || mode === 'fix'
            ? {
                nodes: currentNodes as WorkflowNode[],
                edges: currentEdges as WorkflowEdge[],
              }
            : undefined;

        let streamedContent = '';
        let finalWorkflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] } | undefined;
        let suggestions: string[] = [];
        let errors: string[] = [];

        for await (const event of apiRef.current.generateWorkflowStream(
          prompt,
          mode,
          currentWorkflow
        )) {
          if (event.type === 'token') {
            streamedContent += event.data;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: streamedContent }
                  : msg
              )
            );
          } else if (event.type === 'workflow') {
            finalWorkflow = event.data;
          } else if (event.type === 'complete') {
            if (event.data.workflow) {
              finalWorkflow = event.data.workflow;
            }
            suggestions = event.data.suggestions || [];
            errors = event.data.errors || [];
          }
        }

        // Update final message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content: streamedContent || 'Workflow generated.',
                  status: errors.length > 0 ? 'error' : 'complete',
                  workflow: finalWorkflow,
                  suggestions,
                  errors,
                }
              : msg
          )
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(err instanceof Error ? err : new Error(errorMessage));
        onError?.(err instanceof Error ? err : new Error(errorMessage));

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content: `Error: ${errorMessage}`,
                  status: 'error',
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentNodes, currentEdges, onError]
  );

  // --------------------------------------------------------------------------
  // Apply Workflow to Canvas
  // --------------------------------------------------------------------------

  const applyWorkflow = useCallback(
    (workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => {
      if (!workflow.nodes || workflow.nodes.length === 0) {
        console.warn('[useArchitect] No nodes to apply');
        return;
      }

      // Convert to React Flow format
      const rfNodes: Node[] = workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      }));

      const rfEdges: Edge[] = workflow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: 'smoothstep',
        animated: true,
      }));

      // Apply to React Flow if available
      if (reactFlowInstance) {
        // Clear existing and set new
        reactFlowInstance.setNodes(rfNodes);
        reactFlowInstance.setEdges(rfEdges);

        // Fit view after a short delay
        setTimeout(() => {
          reactFlowInstance?.fitView({ padding: 0.2 });
        }, 100);
      }

      // Notify parent component
      onWorkflowApplied?.(rfNodes, rfEdges);

      // Add success message
      const successMessage: ArchitectMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `✅ Applied ${workflow.nodes.length} nodes and ${workflow.edges.length} edges to the canvas.`,
        timestamp: new Date(),
        status: 'complete',
      };

      setMessages((prev) => [...prev, successMessage]);
    },
    [reactFlowInstance, onWorkflowApplied]
  );

  // --------------------------------------------------------------------------
  // Clear Messages
  // --------------------------------------------------------------------------

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);

  // --------------------------------------------------------------------------
  // Suggest Mappings
  // --------------------------------------------------------------------------

  const suggestMappings = useCallback(
    async (targetNodeId: string, targetNodeType: string): Promise<Record<string, string[]>> => {
      try {
        return await apiRef.current.suggestMappings(
          targetNodeId,
          targetNodeType,
          currentNodes as WorkflowNode[]
        );
      } catch (err) {
        console.error('[useArchitect] Suggest mappings failed:', err);
        return {};
      }
    },
    [currentNodes]
  );

  // --------------------------------------------------------------------------
  // Validate Workflow
  // --------------------------------------------------------------------------

  const validateWorkflow = useCallback(async (): Promise<{
    valid: boolean;
    errors: string[];
    suggestions: string[];
  }> => {
    try {
      return await apiRef.current.validateWorkflow(
        currentNodes as WorkflowNode[],
        currentEdges as WorkflowEdge[]
      );
    } catch (err) {
      console.error('[useArchitect] Validation failed:', err);
      return {
        valid: false,
        errors: [err instanceof Error ? err.message : 'Validation failed'],
        suggestions: [],
      };
    }
  }, [currentNodes, currentEdges]);

  // --------------------------------------------------------------------------
  // Optimize Layout
  // --------------------------------------------------------------------------

  const optimizeLayout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);

      const optimized = await apiRef.current.optimizeLayout(
        currentNodes as WorkflowNode[],
        currentEdges as WorkflowEdge[]
      );

      if (optimized) {
        applyWorkflow(optimized);
      }
    } catch (err) {
      console.error('[useArchitect] Optimize layout failed:', err);
      setError(err instanceof Error ? err : new Error('Layout optimization failed'));
    } finally {
      setIsLoading(false);
    }
  }, [currentNodes, currentEdges, applyWorkflow]);

  // --------------------------------------------------------------------------
  // Get Node Library
  // --------------------------------------------------------------------------

  const getNodeLibrary = useCallback(async (): Promise<any[]> => {
    try {
      return await apiRef.current.getNodeLibrary();
    } catch (err) {
      console.error('[useArchitect] Get node library failed:', err);
      return [];
    }
  }, []);

  // --------------------------------------------------------------------------
  // Return
  // --------------------------------------------------------------------------

  return {
    messages,
    isLoading,
    sessionId,
    error,
    sendMessage,
    sendMessageStream,
    clearMessages,
    applyWorkflow,
    suggestMappings,
    validateWorkflow,
    optimizeLayout,
    getNodeLibrary,
  };
}

// ============================================================================
// Additional Utilities
// ============================================================================

/**
 * Hook for error analysis integration with Ops Dashboard
 */
export function useErrorAnalysis(options: {
  apiBaseUrl?: string;
  onFixApplied?: (workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
} = {}) {
  const { apiBaseUrl = '/api', onFixApplied } = options;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const analyzeError = useCallback(
    async (
      error: { message: string; nodeId?: string; nodeName?: string },
      workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
    ) => {
      setIsAnalyzing(true);
      setAnalysis(null);

      try {
        const api = new ArchitectAPI(apiBaseUrl);
        const result = await api.analyzeError(error, workflow);
        setAnalysis(result);
        return result;
      } catch (err) {
        console.error('[useErrorAnalysis] Analysis failed:', err);
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [apiBaseUrl]
  );

  const applyQuickFix = useCallback(
    (fix: { action: () => any }) => {
      const changes = fix.action();
      if (changes && onFixApplied) {
        // Apply changes to workflow
        // This would need to merge with current workflow
        onFixApplied(changes);
      }
    },
    [onFixApplied]
  );

  return {
    isAnalyzing,
    analysis,
    analyzeError,
    applyQuickFix,
  };
}

export default useArchitect;
