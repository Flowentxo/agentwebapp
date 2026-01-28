/**
 * MOCK EXECUTION ENGINE
 *
 * Simulates workflow execution with realistic logs and timing
 * Now supports runtime variable resolution
 */

import { VariableStore } from '@/lib/studio/variable-store';
import { resolveVariablesInObject, extractVariableNames } from '@/lib/studio/variable-resolver';
import { WorkflowContext } from '@/lib/studio/variable-types';
import { ConditionEvaluator } from '@/lib/studio/condition-evaluator';
import { ConditionConfig } from '@/lib/studio/condition-types';

export interface ExecutionLog {
  timestamp: number;
  nodeId: string;
  nodeName: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
  duration?: number;
}

export interface BranchExecution {
  nodeId: string;
  conditionPassed: boolean;
  branchTaken: 'true' | 'false';
  evaluatedRules: Array<{
    ruleId: string;
    result: boolean;
    leftValue: any;
    rightValue?: any;
    error?: string;
  }>;
}

export class MockExecutionEngine {
  private logs: ExecutionLog[] = [];
  private variableStore?: VariableStore;
  private stepOutputs: Record<string, any> = {};
  private activeBranches: BranchExecution[] = [];

  /**
   * Set the variable store for runtime resolution
   */
  setVariableStore(store: VariableStore) {
    this.variableStore = store;
  }

  /**
   * Get active branches (for visual feedback)
   */
  getActiveBranches(): BranchExecution[] {
    return this.activeBranches;
  }

  /**
   * Execute workflow with realistic timing and logs
   */
  async executeWorkflow(nodes: any[], edges: any[], workflowInput?: Record<string, any>): Promise<ExecutionLog[]> {
    console.log('[MockEngine] 🔵 executeWorkflow() called');
    console.log('[MockEngine] 🔵 Received nodes:', nodes.length);
    console.log('[MockEngine] 🔵 Received edges:', edges.length);

    this.logs = [];
    this.stepOutputs = {};
    this.activeBranches = [];

    // Update variable store context with workflow input
    if (this.variableStore && workflowInput) {
      this.variableStore.updateContext({
        input: workflowInput,
        steps: {},
        env: {},
        system: {
          timestamp: Date.now(),
          userId: 'demo-user',
          workflowId: `workflow_${Date.now()}`,
          executionId: `exec_${Date.now()}`
        },
        variables: {}
      });
    }

    // Start message
    console.log('[MockEngine] 🔵 Adding start message...');
    this.addLog({
      timestamp: Date.now(),
      nodeId: 'system',
      nodeName: 'System',
      level: 'info',
      message: `🚀 Workflow gestartet mit ${nodes.length} Modul${nodes.length !== 1 ? 'en' : ''}`,
    });
    console.log('[MockEngine] 🟢 Start message added. Total logs:', this.logs.length);

    await this.delay(300);

    // Sort nodes by execution order (simplified - just use array order)
    console.log('[MockEngine] 🔵 Sorting nodes...');
    const sortedNodes = this.topologicalSort(nodes, edges);
    console.log('[MockEngine] 🟢 Nodes sorted. Count:', sortedNodes.length);

    // Execute each node
    console.log('[MockEngine] 🔵 Starting node execution loop...');
    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      console.log(`[MockEngine] 🔵 Executing node ${i + 1}/${sortedNodes.length}:`, node.data?.label || node.id);

      await this.executeNode(node, i + 1, sortedNodes.length);

      console.log(`[MockEngine] 🟢 Node ${i + 1}/${sortedNodes.length} completed. Total logs:`, this.logs.length);

      // Delay between nodes
      if (i < sortedNodes.length - 1) {
        await this.delay(400);
      }
    }
    console.log('[MockEngine] 🟢 All nodes executed!');

    await this.delay(300);

    // Completion message
    console.log('[MockEngine] 🔵 Adding completion message...');
    this.addLog({
      timestamp: Date.now(),
      nodeId: 'system',
      nodeName: 'System',
      level: 'success',
      message: `✅ Workflow erfolgreich abgeschlossen (${sortedNodes.length} Module verarbeitet)`,
    });
    console.log('[MockEngine] 🟢 Completion message added. Total logs:', this.logs.length);

    console.log('[MockEngine] ✅ executeWorkflow() COMPLETE. Returning', this.logs.length, 'logs');
    return this.logs;
  }

  /**
   * Execute a single node with realistic simulation
   */
  private async executeNode(node: any, index: number, total: number) {
    console.log(`[MockEngine] 🔵 executeNode() called for node ${index}/${total}`);
    const startTime = Date.now();

    // Resolve variables in node data
    let resolvedNodeData = { ...node.data };
    const variableErrors: string[] = [];

    if (this.variableStore) {
      console.log(`[MockEngine] 🔵 Resolving variables in node data...`);

      // Update variable store context with current step outputs
      this.variableStore.updateContext({
        steps: this.stepOutputs
      });

      // Resolve all variables in node data
      const { resolved, allVariables, allErrors } = resolveVariablesInObject(
        node.data,
        this.variableStore
      );

      resolvedNodeData = resolved;
      variableErrors.push(...allErrors);

      if (Object.keys(allVariables).length > 0) {
        console.log(`[MockEngine] ✅ Resolved ${Object.keys(allVariables).length} variables`);

        // Log variable resolution
        this.addLog({
          timestamp: Date.now(),
          nodeId: node.id,
          nodeName: node.data.label || `Node ${index}`,
          level: 'info',
          message: `🔧 Variablen aufgelöst: ${Object.keys(allVariables).join(', ')}`,
          data: { variables: allVariables }
        });
      }

      if (allErrors.length > 0) {
        console.warn(`[MockEngine] ⚠️ Variable resolution errors:`, allErrors);

        // Log errors as warnings
        this.addLog({
          timestamp: Date.now(),
          nodeId: node.id,
          nodeName: node.data.label || `Node ${index}`,
          level: 'warning',
          message: `⚠️ Variable-Fehler: ${allErrors.join(', ')}`,
        });
      }
    }

    const nodeName = resolvedNodeData.label || `Node ${index}`;
    const nodeType = this.getNodeType({ ...node, data: resolvedNodeData });
    console.log(`[MockEngine] 🔵 Node name: "${nodeName}", type: "${nodeType}"`);

    // Start execution
    console.log(`[MockEngine] 🔵 Adding start log for "${nodeName}"...`);
    this.addLog({
      timestamp: startTime,
      nodeId: node.id,
      nodeName,
      level: 'info',
      message: `⚙️ [${index}/${total}] Starte Ausführung von "${nodeName}"...`,
    });
    console.log(`[MockEngine] 🟢 Start log added. Total logs:`, this.logs.length);

    // Simulate processing time (300-800ms)
    const processingTime = Math.floor(Math.random() * 500) + 300;
    console.log(`[MockEngine] 🔵 Simulating processing time: ${processingTime}ms`);
    await this.delay(processingTime);
    console.log(`[MockEngine] 🟢 Processing delay complete`);

    // Special handling for Condition nodes
    let output: any;
    if (this.isConditionNode(resolvedNodeData)) {
      console.log(`[MockEngine] 🔍 Detected CONDITION node`);
      output = await this.evaluateConditionNode(node, resolvedNodeData, nodeName);
    } else {
      // Generate output based on node type (use resolved data)
      console.log(`[MockEngine] 🔵 Generating output for type: "${nodeType}"`);
      output = this.generateNodeOutput({ ...node, data: resolvedNodeData }, nodeType);
      console.log(`[MockEngine] 🟢 Output generated:`, output);
    }

    // Store output for variable resolution in subsequent nodes
    this.stepOutputs[node.id] = output;

    // Success message
    console.log(`[MockEngine] 🔵 Adding success log for "${nodeName}"...`);
    this.addLog({
      timestamp: Date.now(),
      nodeId: node.id,
      nodeName,
      level: 'success',
      message: `✅ "${nodeName}" erfolgreich ausgeführt`,
      data: output,
      duration: Date.now() - startTime,
    });
    console.log(`[MockEngine] 🟢 Success log added. Total logs:`, this.logs.length);
  }

  /**
   * Check if node is a condition node
   */
  private isConditionNode(nodeData: any): boolean {
    return nodeData.category === 'logic' &&
           nodeData.logicType === 'condition' &&
           nodeData.conditionConfig !== undefined;
  }

  /**
   * Evaluate a condition node using ConditionEvaluator
   */
  private async evaluateConditionNode(node: any, nodeData: any, nodeName: string): Promise<any> {
    if (!this.variableStore) {
      console.warn('[MockEngine] ⚠️ No variable store - cannot evaluate condition');
      this.addLog({
        timestamp: Date.now(),
        nodeId: node.id,
        nodeName,
        level: 'warning',
        message: '⚠️ Bedingung kann nicht ausgewertet werden (keine Variable Store)',
      });

      return {
        status: 'skipped',
        condition: 'unknown',
        branch: 'unknown',
        reason: 'No variable store'
      };
    }

    const conditionConfig: ConditionConfig = nodeData.conditionConfig;

    if (!conditionConfig) {
      console.warn('[MockEngine] ⚠️ No condition config found');
      this.addLog({
        timestamp: Date.now(),
        nodeId: node.id,
        nodeName,
        level: 'warning',
        message: '⚠️ Keine Bedingungskonfiguration gefunden',
      });

      return {
        status: 'error',
        condition: 'missing_config',
        branch: 'unknown'
      };
    }

    try {
      // Create evaluator and evaluate
      const evaluator = new ConditionEvaluator(this.variableStore);
      const result = evaluator.evaluate(conditionConfig);

      console.log('[MockEngine] 🔍 Condition evaluation result:', result);

      // Store branch execution for visual feedback
      const branchExecution: BranchExecution = {
        nodeId: node.id,
        conditionPassed: result.passed,
        branchTaken: result.path,
        evaluatedRules: result.evaluatedRules || []
      };
      this.activeBranches.push(branchExecution);

      // Log evaluation details
      const passedRules = branchExecution.evaluatedRules.filter(r => r.result).length;
      const totalRules = branchExecution.evaluatedRules.length;

      this.addLog({
        timestamp: Date.now(),
        nodeId: node.id,
        nodeName,
        level: result.passed ? 'success' : 'info',
        message: `🔍 Bedingung ausgewertet: ${result.passed ? '✅ WAHR' : '❌ FALSCH'} (${passedRules}/${totalRules} Regeln erfüllt)`,
        data: {
          passed: result.passed,
          branch: result.path,
          evaluatedRules: branchExecution.evaluatedRules
        }
      });

      // Log which branch will be taken
      const branchLabel = result.passed
        ? conditionConfig.trueBranch.label
        : conditionConfig.falseBranch.label;

      this.addLog({
        timestamp: Date.now(),
        nodeId: node.id,
        nodeName,
        level: 'info',
        message: `🎯 Gewählter Pfad: "${branchLabel}"`,
        data: {
          branch: result.path,
          branchConfig: result.passed ? conditionConfig.trueBranch : conditionConfig.falseBranch
        }
      });

      // Log individual rule results if there are multiple rules
      if (branchExecution.evaluatedRules.length > 1) {
        const ruleDetails = branchExecution.evaluatedRules.map((rule, i) => {
          const symbol = rule.result ? '✅' : '❌';
          return `  ${symbol} Regel ${i + 1}: ${rule.result ? 'erfüllt' : 'nicht erfüllt'}`;
        }).join('\n');

        this.addLog({
          timestamp: Date.now(),
          nodeId: node.id,
          nodeName,
          level: 'info',
          message: `📋 Regel-Details:\n${ruleDetails}`,
          data: { rules: branchExecution.evaluatedRules }
        });
      }

      return {
        status: 'evaluated',
        conditionPassed: result.passed,
        branch: result.path,
        branchLabel,
        evaluatedAt: result.evaluatedAt,
        rulesEvaluated: branchExecution.evaluatedRules.length,
        rulesPassed: passedRules
      };

    } catch (error) {
      console.error('[MockEngine] ❌ Condition evaluation failed:', error);

      this.addLog({
        timestamp: Date.now(),
        nodeId: node.id,
        nodeName,
        level: 'error',
        message: `❌ Fehler bei Bedingungsauswertung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      });

      return {
        status: 'error',
        condition: 'evaluation_failed',
        branch: conditionConfig.defaultPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Determine node type from node data
   */
  private getNodeType(node: any): string {
    return node.data.label || node.data.type || 'unknown';
  }

  /**
   * Generate realistic output based on node type
   */
  private generateNodeOutput(node: any, nodeType: string): any {
    const label = nodeType.toLowerCase();

    // Data Analysis
    if (label.includes('data') || label.includes('analysis') || label.includes('analyst')) {
      return {
        status: 'completed',
        insights: [
          '📈 Trend: +15% Wachstum im Vergleich zum Vormonat',
          '⚠️ Anomalie bei Datenpunkt #42 erkannt',
          '✅ Datenqualität: 98.5% valide Einträge'
        ],
        dataPoints: Math.floor(Math.random() * 2000) + 500,
        processingTime: `${(Math.random() * 2 + 0.5).toFixed(2)}s`,
        summary: 'Analyse erfolgreich durchgeführt'
      };
    }

    // Customer Support
    if (label.includes('customer') || label.includes('support') || label.includes('cassie')) {
      return {
        status: 'completed',
        response: 'Vielen Dank für Ihre Anfrage! Unser Team wird sich innerhalb von 24 Stunden bei Ihnen melden.',
        sentiment: 'positive',
        confidence: (Math.random() * 0.2 + 0.8).toFixed(2),
        category: 'general_inquiry',
        priority: 'medium'
      };
    }

    // Content Generation
    if (label.includes('content') || label.includes('generation') || label.includes('writer')) {
      return {
        status: 'completed',
        generatedText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...',
        wordCount: Math.floor(Math.random() * 200) + 150,
        language: 'de',
        tone: 'professional',
        readingTime: '2 min'
      };
    }

    // Code Review / Code Assistant
    if (label.includes('code') || label.includes('review') || label.includes('kai')) {
      return {
        status: 'completed',
        issues: [
          { severity: 'low', message: 'Consider using const instead of let' },
          { severity: 'medium', message: 'Function complexity: 12 (threshold: 10)' }
        ],
        linesReviewed: Math.floor(Math.random() * 500) + 100,
        suggestions: 3,
        quality: 'good'
      };
    }

    // Email
    if (label.includes('email') || label.includes('mail')) {
      return {
        status: 'sent',
        recipient: 'user@example.com',
        subject: 'Workflow Notification',
        messageId: `msg_${Math.random().toString(36).substr(2, 9)}`,
        deliveryTime: `${(Math.random() * 0.5 + 0.2).toFixed(2)}s`
      };
    }

    // Slack
    if (label.includes('slack') || label.includes('message')) {
      return {
        status: 'sent',
        channel: '#general',
        messageId: `ts_${Date.now()}`,
        reactions: Math.floor(Math.random() * 5),
        timestamp: new Date().toISOString()
      };
    }

    // Research
    if (label.includes('research') || label.includes('search')) {
      return {
        status: 'completed',
        sources: Math.floor(Math.random() * 10) + 5,
        relevantDocuments: Math.floor(Math.random() * 20) + 10,
        summary: 'Recherche erfolgreich abgeschlossen',
        confidenceScore: (Math.random() * 0.3 + 0.7).toFixed(2)
      };
    }

    // Condition / Logic
    if (label.includes('condition') || label.includes('if') || label.includes('logic')) {
      return {
        status: 'evaluated',
        condition: 'true',
        branch: 'primary',
        executionPath: 'A'
      };
    }

    // Loop
    if (label.includes('loop') || label.includes('iterate')) {
      return {
        status: 'completed',
        iterations: Math.floor(Math.random() * 5) + 3,
        itemsProcessed: Math.floor(Math.random() * 50) + 10,
        avgTimePerItem: `${(Math.random() * 0.2 + 0.1).toFixed(2)}s`
      };
    }

    // Delay
    if (label.includes('delay') || label.includes('wait')) {
      return {
        status: 'completed',
        delayDuration: '5s',
        triggeredAt: new Date().toISOString()
      };
    }

    // Default generic output
    return {
      status: 'completed',
      output: `Modul "${nodeType}" erfolgreich ausgeführt`,
      timestamp: new Date().toISOString(),
      executionId: Math.random().toString(36).substr(2, 9)
    };
  }

  /**
   * Simple topological sort (for now, just return nodes in order)
   * TODO: Implement proper topological sort based on edges
   */
  private topologicalSort(nodes: any[], edges: any[]): any[] {
    // For now, just return nodes as-is
    // In a real implementation, we would:
    // 1. Build adjacency list from edges
    // 2. Find nodes with no incoming edges (start nodes)
    // 3. Process nodes in dependency order
    return [...nodes];
  }

  /**
   * Add log to the collection
   */
  private addLog(log: ExecutionLog) {
    this.logs.push(log);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
