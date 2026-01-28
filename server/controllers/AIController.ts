/**
 * AI Controller
 * Phase 8: API Endpoints for Workflow Architect
 *
 * Provides REST API and streaming endpoints for the AI-powered
 * workflow generation and error analysis services.
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  WorkflowGeneratorService,
  getWorkflowGeneratorService,
  GenerationRequest,
  WorkflowNode,
  WorkflowEdge,
} from '../services/ai/WorkflowGeneratorService';
import {
  ErrorAnalysisService,
  getErrorAnalysisService,
  ExecutionError,
  AnalysisRequest,
} from '../services/ai/ErrorAnalysisService';
import { NODE_LIBRARY, getNodeDefinition } from '../services/ai/NodeDefinitionPrompt';

// ============================================================================
// Types
// ============================================================================

interface GenerateWorkflowBody {
  prompt: string;
  mode?: 'create' | 'modify' | 'fix';
  currentWorkflow?: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  workspaceId?: string;
}

interface ContinueConversationBody {
  sessionId: string;
  message: string;
  currentWorkflow?: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
}

interface AnalyzeErrorBody {
  error: ExecutionError;
  workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  executionTrace?: Array<{
    nodeId: string;
    nodeName: string;
    status: 'success' | 'failed' | 'skipped';
    input?: any;
    output?: any;
    duration?: number;
    error?: string;
  }>;
}

interface SuggestMappingsBody {
  targetNodeId: string;
  targetNodeType: string;
  availableNodes: WorkflowNode[];
}

// ============================================================================
// Controller
// ============================================================================

export class AIController {
  private router: Router;
  private generatorService: WorkflowGeneratorService;
  private analysisService: ErrorAnalysisService;
  private activeSessions: Map<string, { createdAt: Date; lastActivity: Date }>;

  constructor() {
    this.router = Router();
    this.generatorService = getWorkflowGeneratorService();
    this.analysisService = getErrorAnalysisService();
    this.activeSessions = new Map();

    this.initializeRoutes();
    this.startSessionCleanup();
  }

  /**
   * Returns the Express router
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Initializes all routes
   */
  private initializeRoutes(): void {
    // Workflow Generation
    this.router.post('/architect/generate', this.generateWorkflow.bind(this));
    this.router.post('/architect/generate/stream', this.generateWorkflowStream.bind(this));
    this.router.post('/architect/conversation', this.continueConversation.bind(this));
    this.router.delete('/architect/conversation/:sessionId', this.clearConversation.bind(this));

    // Error Analysis
    this.router.post('/architect/analyze-error', this.analyzeError.bind(this));
    this.router.post('/architect/fix-workflow', this.generateFixedWorkflow.bind(this));
    this.router.post('/architect/analyze-patterns', this.analyzeErrorPatterns.bind(this));

    // Node Library
    this.router.get('/architect/nodes', this.getNodeLibrary.bind(this));
    this.router.get('/architect/nodes/:type', this.getNodeDetails.bind(this));
    this.router.post('/architect/suggest-mappings', this.suggestMappings.bind(this));

    // Validation
    this.router.post('/architect/validate', this.validateWorkflow.bind(this));
    this.router.post('/architect/optimize-layout', this.optimizeLayout.bind(this));

    // Templates
    this.router.get('/architect/templates', this.getTemplates.bind(this));
    this.router.post('/architect/templates/:templateId', this.generateFromTemplate.bind(this));

    // Health Check
    this.router.get('/architect/health', this.healthCheck.bind(this));
  }

  // --------------------------------------------------------------------------
  // Workflow Generation Endpoints
  // --------------------------------------------------------------------------

  /**
   * POST /api/architect/generate
   * Generates a workflow from a natural language prompt
   */
  private async generateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as GenerateWorkflowBody;

      if (!body.prompt || typeof body.prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      const request: GenerationRequest = {
        prompt: body.prompt,
        mode: body.mode || 'create',
        currentNodes: body.currentWorkflow?.nodes,
        currentEdges: body.currentWorkflow?.edges,
        workspaceId: body.workspaceId,
        userId: (req as any).userId,
      };

      const result = await this.generatorService.generateWorkflow(request);

      res.json(result);
    } catch (error) {
      console.error('[AI_CONTROLLER] Generate workflow failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      });
    }
  }

  /**
   * POST /api/architect/generate/stream
   * Generates a workflow with streaming response
   */
  private async generateWorkflowStream(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as GenerateWorkflowBody;

      if (!body.prompt || typeof body.prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const request: GenerationRequest = {
        prompt: body.prompt,
        mode: body.mode || 'create',
        currentNodes: body.currentWorkflow?.nodes,
        currentEdges: body.currentWorkflow?.edges,
        workspaceId: body.workspaceId,
        userId: (req as any).userId,
      };

      try {
        for await (const event of this.generatorService.generateWorkflowStream(request)) {
          const data = JSON.stringify(event);
          res.write(`data: ${data}\n\n`);

          // Flush the response
          if ((res as any).flush) {
            (res as any).flush();
          }
        }
      } catch (streamError) {
        const errorEvent = JSON.stringify({
          type: 'error',
          data: { message: streamError instanceof Error ? streamError.message : 'Stream failed' },
        });
        res.write(`data: ${errorEvent}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('[AI_CONTROLLER] Stream generation failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Stream failed',
      });
    }
  }

  /**
   * POST /api/architect/conversation
   * Continues a multi-turn conversation for iterative workflow building
   */
  private async continueConversation(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as ContinueConversationBody;

      if (!body.message || typeof body.message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      // Create new session if not provided
      const sessionId = body.sessionId || uuidv4();

      // Track session
      this.activeSessions.set(sessionId, {
        createdAt: this.activeSessions.get(sessionId)?.createdAt || new Date(),
        lastActivity: new Date(),
      });

      const result = await this.generatorService.continueConversation(
        sessionId,
        body.message,
        body.currentWorkflow?.nodes,
        body.currentWorkflow?.edges
      );

      res.json({
        sessionId,
        ...result,
      });
    } catch (error) {
      console.error('[AI_CONTROLLER] Conversation failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Conversation failed',
      });
    }
  }

  /**
   * DELETE /api/architect/conversation/:sessionId
   * Clears conversation history for a session
   */
  private async clearConversation(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      this.generatorService.clearConversation(sessionId);
      this.activeSessions.delete(sessionId);

      res.json({ success: true, message: 'Conversation cleared' });
    } catch (error) {
      console.error('[AI_CONTROLLER] Clear conversation failed:', error);
      res.status(500).json({ error: 'Failed to clear conversation' });
    }
  }

  // --------------------------------------------------------------------------
  // Error Analysis Endpoints
  // --------------------------------------------------------------------------

  /**
   * POST /api/architect/analyze-error
   * Analyzes a workflow execution error
   */
  private async analyzeError(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as AnalyzeErrorBody;

      if (!body.error || !body.workflow) {
        res.status(400).json({ error: 'Error and workflow are required' });
        return;
      }

      const request: AnalysisRequest = {
        error: body.error,
        workflow: body.workflow,
        executionTrace: body.executionTrace,
      };

      const result = await this.analysisService.analyzeError(request);

      res.json(result);
    } catch (error) {
      console.error('[AI_CONTROLLER] Error analysis failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      });
    }
  }

  /**
   * POST /api/architect/fix-workflow
   * Generates a fixed version of the workflow
   */
  private async generateFixedWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as AnalyzeErrorBody;

      if (!body.error || !body.workflow) {
        res.status(400).json({ error: 'Error and workflow are required' });
        return;
      }

      const request: AnalysisRequest = {
        error: body.error,
        workflow: body.workflow,
        executionTrace: body.executionTrace,
      };

      const fixedWorkflow = await this.analysisService.generateFixedWorkflow(request);

      if (fixedWorkflow) {
        res.json({
          success: true,
          workflow: fixedWorkflow,
        });
      } else {
        res.json({
          success: false,
          error: 'Could not generate fixed workflow',
        });
      }
    } catch (error) {
      console.error('[AI_CONTROLLER] Fix generation failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Fix generation failed',
      });
    }
  }

  /**
   * POST /api/architect/analyze-patterns
   * Analyzes multiple errors to find patterns
   */
  private async analyzeErrorPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { errors } = req.body as { errors: ExecutionError[] };

      if (!errors || !Array.isArray(errors)) {
        res.status(400).json({ error: 'Errors array is required' });
        return;
      }

      const analysis = await this.analysisService.analyzeErrorPatterns(errors);

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      console.error('[AI_CONTROLLER] Pattern analysis failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Pattern analysis failed',
      });
    }
  }

  // --------------------------------------------------------------------------
  // Node Library Endpoints
  // --------------------------------------------------------------------------

  /**
   * GET /api/architect/nodes
   * Returns the complete node library
   */
  private async getNodeLibrary(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;

      let nodes = NODE_LIBRARY;

      if (category && typeof category === 'string') {
        nodes = nodes.filter((n) => n.category === category);
      }

      // Return simplified node list
      const simplified = nodes.map((node) => ({
        type: node.type,
        name: node.name,
        category: node.category,
        description: node.description,
        inputCount: node.inputs.length,
        outputCount: node.outputs.length,
      }));

      res.json({
        success: true,
        nodes: simplified,
        categories: ['trigger', 'action', 'logic', 'transform', 'integration'],
      });
    } catch (error) {
      console.error('[AI_CONTROLLER] Get node library failed:', error);
      res.status(500).json({ error: 'Failed to get node library' });
    }
  }

  /**
   * GET /api/architect/nodes/:type
   * Returns detailed information about a specific node type
   */
  private async getNodeDetails(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;

      const node = getNodeDefinition(type);

      if (!node) {
        res.status(404).json({ error: `Node type "${type}" not found` });
        return;
      }

      res.json({
        success: true,
        node,
      });
    } catch (error) {
      console.error('[AI_CONTROLLER] Get node details failed:', error);
      res.status(500).json({ error: 'Failed to get node details' });
    }
  }

  /**
   * POST /api/architect/suggest-mappings
   * Suggests variable mappings for a target node
   */
  private async suggestMappings(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as SuggestMappingsBody;

      if (!body.targetNodeId || !body.targetNodeType || !body.availableNodes) {
        res.status(400).json({ error: 'Target node info and available nodes are required' });
        return;
      }

      const targetNode: WorkflowNode = {
        id: body.targetNodeId,
        type: body.targetNodeType,
        position: { x: 0, y: 0 },
        data: { label: '', config: {} },
      };

      const suggestions = this.generatorService.suggestVariableMappings(
        targetNode,
        body.availableNodes
      );

      // Convert Map to object for JSON serialization
      const suggestionsObject: Record<string, string[]> = {};
      for (const [key, value] of suggestions) {
        suggestionsObject[key] = value;
      }

      res.json({
        success: true,
        suggestions: suggestionsObject,
      });
    } catch (error) {
      console.error('[AI_CONTROLLER] Suggest mappings failed:', error);
      res.status(500).json({ error: 'Failed to suggest mappings' });
    }
  }

  // --------------------------------------------------------------------------
  // Validation Endpoints
  // --------------------------------------------------------------------------

  /**
   * POST /api/architect/validate
   * Validates a workflow structure
   */
  private async validateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { nodes, edges } = req.body as { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

      if (!nodes || !Array.isArray(nodes)) {
        res.status(400).json({ error: 'Nodes array is required' });
        return;
      }

      const result = this.generatorService.validateWorkflow({
        nodes,
        edges: edges || [],
      });

      res.json({
        success: result.errors.length === 0,
        workflow: result.workflow,
        errors: result.errors,
        suggestions: result.suggestions,
      });
    } catch (error) {
      console.error('[AI_CONTROLLER] Validation failed:', error);
      res.status(500).json({ error: 'Validation failed' });
    }
  }

  /**
   * POST /api/architect/optimize-layout
   * Optimizes the layout of a workflow
   */
  private async optimizeLayout(req: Request, res: Response): Promise<void> {
    try {
      const { nodes, edges } = req.body as { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

      if (!nodes || !Array.isArray(nodes)) {
        res.status(400).json({ error: 'Nodes array is required' });
        return;
      }

      const optimized = this.generatorService.optimizeLayout({
        nodes,
        edges: edges || [],
      });

      res.json({
        success: true,
        workflow: optimized,
      });
    } catch (error) {
      console.error('[AI_CONTROLLER] Layout optimization failed:', error);
      res.status(500).json({ error: 'Layout optimization failed' });
    }
  }

  // --------------------------------------------------------------------------
  // Template Endpoints
  // --------------------------------------------------------------------------

  /**
   * GET /api/architect/templates
   * Returns available workflow templates
   */
  private async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = [
        {
          id: 'lead-notification',
          name: 'Lead Notification',
          description: 'Notify sales team when a new lead comes in via webhook',
          category: 'Sales',
          nodes: ['trigger_webhook', 'action_email', 'action_slack'],
        },
        {
          id: 'data-sync',
          name: 'Data Sync',
          description: 'Periodically sync data from an API to your database',
          category: 'Data',
          nodes: ['trigger_schedule', 'action_http', 'action_database'],
        },
        {
          id: 'approval-flow',
          name: 'Approval Workflow',
          description: 'Route requests for approval based on amount threshold',
          category: 'Business',
          nodes: ['trigger_webhook', 'logic_if', 'action_email'],
        },
        {
          id: 'customer-onboarding',
          name: 'Customer Onboarding',
          description: 'Welcome new customers with email, CRM update, and team notification',
          category: 'Customer',
          nodes: ['trigger_event', 'action_email', 'integration_hubspot', 'action_slack'],
        },
        {
          id: 'ai-processor',
          name: 'AI Content Processor',
          description: 'Process incoming content with AI and store results',
          category: 'AI',
          nodes: ['trigger_webhook', 'action_ai', 'action_database'],
        },
      ];

      res.json({
        success: true,
        templates,
      });
    } catch (error) {
      console.error('[AI_CONTROLLER] Get templates failed:', error);
      res.status(500).json({ error: 'Failed to get templates' });
    }
  }

  /**
   * POST /api/architect/templates/:templateId
   * Generates a workflow from a template with customizations
   */
  private async generateFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const customizations = req.body as Record<string, any>;

      const result = await this.generatorService.generateFromTemplate(templateId, customizations);

      res.json(result);
    } catch (error) {
      console.error('[AI_CONTROLLER] Template generation failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Template generation failed',
      });
    }
  }

  // --------------------------------------------------------------------------
  // Health Check
  // --------------------------------------------------------------------------

  /**
   * GET /api/architect/health
   * Health check for the AI services
   */
  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

      res.json({
        status: hasOpenAIKey ? 'healthy' : 'degraded',
        services: {
          workflowGenerator: hasOpenAIKey ? 'available' : 'unavailable',
          errorAnalysis: hasOpenAIKey ? 'available' : 'unavailable',
        },
        activeSessions: this.activeSessions.size,
        nodeLibrarySize: NODE_LIBRARY.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    }
  }

  // --------------------------------------------------------------------------
  // Session Management
  // --------------------------------------------------------------------------

  /**
   * Starts periodic cleanup of stale sessions
   */
  private startSessionCleanup(): void {
    const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

    setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of this.activeSessions) {
        if (now.getTime() - session.lastActivity.getTime() > SESSION_TTL) {
          this.generatorService.clearConversation(sessionId);
          this.activeSessions.delete(sessionId);
        }
      }
    }, CLEANUP_INTERVAL);
  }
}

// ============================================================================
// Factory Export
// ============================================================================

let controllerInstance: AIController | null = null;

export function getAIController(): AIController {
  if (!controllerInstance) {
    controllerInstance = new AIController();
  }
  return controllerInstance;
}

export function createAIRouter(): Router {
  return getAIController().getRouter();
}

export default AIController;
