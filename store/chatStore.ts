/**
 * Chat Store - Context-Aware Chat State Management
 *
 * Manages chat context for seamless handoffs between different parts
 * of the application (e.g., Dashboard -> Buddy Chat).
 *
 * Features:
 * - Active context management for pre-populated prompts
 * - Context types for different handoff sources
 * - Auto-clear after consumption
 * - Persistent context for page reloads (optional)
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BuddyInsight } from '@/components/budget/intelligence';

// =====================================================
// TYPES & INTERFACES
// =====================================================

/**
 * Context types for different handoff sources
 */
export type ChatContextType =
  | 'finance_alert'
  | 'finance_insight'
  | 'anomaly_detected'
  | 'budget_warning'
  | 'general_query'
  | 'workflow_error'
  | 'support_ticket';

/**
 * Finance-specific context data
 */
export interface FinanceContextData {
  healthScore: number;
  status: 'excellent' | 'good' | 'fair' | 'warning' | 'critical';
  monthlySpend: number;
  monthlyLimit: number;
  utilization: number;
  daysRemaining: number;
  anomalies?: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  recommendations?: string[];
  forecast?: {
    projectedMonthEnd: number;
    projectedOverage: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  } | null;
}

/**
 * Active context for chat handoff
 */
export interface ChatContext {
  type: ChatContextType;
  source: string; // e.g., 'budget_dashboard', 'workflow_editor'
  timestamp: string;
  initialPrompt: string;
  data: FinanceContextData | Record<string, any>;
  metadata?: {
    priority?: 'low' | 'normal' | 'high' | 'critical';
    autoSend?: boolean; // Automatically send the prompt
    showContextPill?: boolean; // Show context indicator in chat
  };
}

/**
 * Chat message for history
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Chat Store State
 */
interface ChatStoreState {
  // Active context for handoffs
  activeContext: ChatContext | null;

  // Current agent
  activeAgentId: string | null;

  // Message history (optional - for cross-session persistence)
  messageHistory: Map<string, ChatMessage[]>;

  // Actions
  setContext: (context: ChatContext) => void;
  clearContext: () => void;
  hasActiveContext: () => boolean;
  consumeContext: () => ChatContext | null;

  setActiveAgent: (agentId: string) => void;
  addMessage: (agentId: string, message: ChatMessage) => void;
  clearMessages: (agentId: string) => void;
}

// =====================================================
// CONTEXT GENERATORS
// =====================================================

/**
 * Generate an intelligent prompt based on finance insight data
 */
export function generateFinancePrompt(insight: BuddyInsight): string {
  const parts: string[] = [];

  // Health score context
  if (insight.healthScore < 50) {
    parts.push(
      `Buddy, mein Budget-Health-Score ist kritisch niedrig bei ${insight.healthScore}/100 (${insight.status}).`
    );
  } else if (insight.healthScore < 75) {
    parts.push(
      `Buddy, ich möchte meinen Budget-Status besprechen. Mein Health Score liegt bei ${insight.healthScore}/100.`
    );
  } else {
    parts.push(
      `Buddy, kannst du mir eine Übersicht über meinen aktuellen Finanzstatus geben?`
    );
  }

  // Anomalies
  if (insight.anomalies && insight.anomalies.length > 0) {
    const criticalAnomalies = insight.anomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      parts.push(
        `Es wurden ${criticalAnomalies.length} kritische Anomalie(n) erkannt: "${criticalAnomalies[0].message}".`
      );
    } else {
      parts.push(
        `Es gibt ${insight.anomalies.length} auffällige Muster in meinen Ausgaben.`
      );
    }
  }

  // Overage warning
  if (insight.forecast?.projectedOverage && insight.forecast.projectedOverage > 0) {
    parts.push(
      `Die Prognose zeigt eine Überschreitung von $${insight.forecast.projectedOverage.toFixed(2)}.`
    );
  }

  // Utilization warning
  if (insight.budget.utilization > 80) {
    parts.push(
      `Ich habe bereits ${insight.budget.utilization.toFixed(0)}% meines Budgets verbraucht.`
    );
  }

  // Request for action
  if (insight.healthScore < 50) {
    parts.push('Was sollte ich sofort tun, um meine Situation zu verbessern?');
  } else if (insight.anomalies && insight.anomalies.length > 0) {
    parts.push('Kannst du mir erklären, was diese Anomalien bedeuten?');
  } else {
    parts.push('Gib mir bitte eine detaillierte Analyse und Empfehlungen.');
  }

  return parts.join(' ');
}

/**
 * Create a finance context from BuddyInsight
 */
export function createFinanceContext(
  insight: BuddyInsight,
  options: {
    autoSend?: boolean;
    source?: string;
  } = {}
): ChatContext {
  const hasAnomalies = insight.anomalies && insight.anomalies.length > 0;
  const isCritical = insight.healthScore < 50;

  let contextType: ChatContextType = 'finance_insight';
  if (isCritical) {
    contextType = 'budget_warning';
  } else if (hasAnomalies) {
    contextType = 'anomaly_detected';
  }

  return {
    type: contextType,
    source: options.source || 'budget_dashboard',
    timestamp: new Date().toISOString(),
    initialPrompt: generateFinancePrompt(insight),
    data: {
      healthScore: insight.healthScore,
      status: insight.status,
      monthlySpend: insight.budget.currentSpend,
      monthlyLimit: insight.budget.monthlyLimit,
      utilization: insight.budget.utilization,
      daysRemaining: insight.budget.daysRemaining,
      anomalies: insight.anomalies,
      recommendations: insight.recommendations,
      forecast: insight.forecast,
    } as FinanceContextData,
    metadata: {
      priority: isCritical ? 'critical' : hasAnomalies ? 'high' : 'normal',
      autoSend: options.autoSend ?? false,
      showContextPill: true,
    },
  };
}

// =====================================================
// ZUSTAND STORE
// =====================================================

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeContext: null,
      activeAgentId: null,
      messageHistory: new Map(),

      // Set context for handoff
      setContext: (context: ChatContext) => {
        console.log('[ChatStore] Setting context:', context.type, context.source);
        set({ activeContext: context });
      },

      // Clear context
      clearContext: () => {
        console.log('[ChatStore] Clearing context');
        set({ activeContext: null });
      },

      // Check if there's an active context
      hasActiveContext: () => {
        return get().activeContext !== null;
      },

      // Consume and return context (get + clear in one operation)
      consumeContext: () => {
        const context = get().activeContext;
        if (context) {
          console.log('[ChatStore] Consuming context:', context.type);
          set({ activeContext: null });
        }
        return context;
      },

      // Set active agent
      setActiveAgent: (agentId: string) => {
        set({ activeAgentId: agentId });
      },

      // Add message to history
      addMessage: (agentId: string, message: ChatMessage) => {
        const history = get().messageHistory;
        const agentMessages = history.get(agentId) || [];
        history.set(agentId, [...agentMessages, message]);
        set({ messageHistory: new Map(history) });
      },

      // Clear messages for agent
      clearMessages: (agentId: string) => {
        const history = get().messageHistory;
        history.delete(agentId);
        set({ messageHistory: new Map(history) });
      },
    }),
    {
      name: 'chat-context-store',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for temporary context
      partialize: (state) => ({
        // Only persist the activeContext, not message history
        activeContext: state.activeContext,
      }),
    }
  )
);

// =====================================================
// HOOKS FOR COMMON OPERATIONS
// =====================================================

/**
 * Hook to check and consume finance context
 */
export function useFinanceContext() {
  const { activeContext, consumeContext, hasActiveContext } = useChatStore();

  const isFinanceContext =
    activeContext?.type === 'finance_insight' ||
    activeContext?.type === 'finance_alert' ||
    activeContext?.type === 'anomaly_detected' ||
    activeContext?.type === 'budget_warning';

  return {
    hasContext: hasActiveContext() && isFinanceContext,
    context: isFinanceContext ? activeContext : null,
    consume: consumeContext,
  };
}

export default useChatStore;
