/**
 * Chat Components - Barrel Export
 *
 * Central export for all chat-related components
 */

// Core Chat Components
export { AgentChat } from './AgentChat';

// Horizon UI Components
export { AgentSelector, useAgentSelector } from './AgentSelector';
export { HorizonComposer } from './HorizonComposer';

// Re-export types
export type { AgentPersona } from '@/lib/agents/personas';
