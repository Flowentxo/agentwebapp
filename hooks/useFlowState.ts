'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UserAction {
  type: 'reply' | 'archive' | 'open' | 'read';
  timestamp: number;
  agentId: string;
}

interface FlowStateMetrics {
  actionsInWindow: number;
  avgTimePerAction: number;
  consecutiveActions: number;
  isInFlowState: boolean;
  flowStateStartedAt?: number;
}

const FLOW_WINDOW_MS = 120000; // 2 minutes
const FLOW_THRESHOLD = 3; // 3+ actions to trigger flow state
const IDLE_TIMEOUT_MS = 60000; // 1 minute idle breaks flow

export function useFlowState() {
  const [actions, setActions] = useState<UserAction[]>([]);
  const [metrics, setMetrics] = useState<FlowStateMetrics>({
    actionsInWindow: 0,
    avgTimePerAction: 0,
    consecutiveActions: 0,
    isInFlowState: false
  });
  const [showFlowSuggestion, setShowFlowSuggestion] = useState(false);
  const lastActionTimeRef = useRef<number>(Date.now());
  const flowNotifiedRef = useRef(false);

  // Record a user action
  const recordAction = useCallback((type: UserAction['type'], agentId: string) => {
    const now = Date.now();
    const newAction: UserAction = { type, timestamp: now, agentId };

    setActions(prev => {
      // Keep only actions in the last 2 minutes
      const recentActions = prev.filter(
        action => now - action.timestamp < FLOW_WINDOW_MS
      );
      return [...recentActions, newAction];
    });

    lastActionTimeRef.current = now;
  }, []);

  // Calculate metrics from actions
  useEffect(() => {
    const now = Date.now();
    const recentActions = actions.filter(
      action => now - action.timestamp < FLOW_WINDOW_MS
    );

    if (recentActions.length === 0) {
      setMetrics({
        actionsInWindow: 0,
        avgTimePerAction: 0,
        consecutiveActions: 0,
        isInFlowState: false
      });
      flowNotifiedRef.current = false;
      return;
    }

    // Check if user has been idle
    const timeSinceLastAction = now - lastActionTimeRef.current;
    if (timeSinceLastAction > IDLE_TIMEOUT_MS) {
      // User went idle, reset flow state
      flowNotifiedRef.current = false;
      setMetrics(prev => ({
        ...prev,
        isInFlowState: false,
        consecutiveActions: 0
      }));
      return;
    }

    // Calculate time between actions
    const actionCount = recentActions.length;
    let totalTimeBetween = 0;

    for (let i = 1; i < recentActions.length; i++) {
      totalTimeBetween += recentActions[i].timestamp - recentActions[i - 1].timestamp;
    }

    const avgTimePerAction = actionCount > 1 ? totalTimeBetween / (actionCount - 1) : 0;

    // Determine if in flow state
    const isInFlowState = actionCount >= FLOW_THRESHOLD && avgTimePerAction < 40000; // < 40s between actions

    // Find flow state start time
    let flowStateStartedAt: number | undefined;
    if (isInFlowState && recentActions.length >= FLOW_THRESHOLD) {
      flowStateStartedAt = recentActions[recentActions.length - FLOW_THRESHOLD].timestamp;
    }

    setMetrics({
      actionsInWindow: actionCount,
      avgTimePerAction: Math.round(avgTimePerAction / 1000), // Convert to seconds
      consecutiveActions: actionCount,
      isInFlowState,
      flowStateStartedAt
    });

    // Show flow suggestion if just entered flow state
    if (isInFlowState && !flowNotifiedRef.current) {
      setShowFlowSuggestion(true);
      flowNotifiedRef.current = true;
    }
  }, [actions]);

  // Reset flow state
  const resetFlowState = useCallback(() => {
    setActions([]);
    setMetrics({
      actionsInWindow: 0,
      avgTimePerAction: 0,
      consecutiveActions: 0,
      isInFlowState: false
    });
    flowNotifiedRef.current = false;
    setShowFlowSuggestion(false);
  }, []);

  // Dismiss flow suggestion
  const dismissFlowSuggestion = useCallback(() => {
    setShowFlowSuggestion(false);
  }, []);

  return {
    metrics,
    recordAction,
    resetFlowState,
    showFlowSuggestion,
    dismissFlowSuggestion
  };
}
