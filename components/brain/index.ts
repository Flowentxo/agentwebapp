/**
 * Brain AI v3.0 - Component Exports
 *
 * Central export for all Brain AI UI components:
 * - Omnibar (Command Palette)
 * - BrainChat (Streaming Chat with RAG)
 * - AIUsageDashboard (ISO 42001 Compliance)
 * - ConnectedSourcesHub (Integration Management)
 * - StandupWizard (Report Generation)
 */

// ============================================
// CORE COMPONENTS
// ============================================

// Universal Command Palette (Cmd+K)
export { Omnibar, OmnibarTrigger } from './Omnibar';

// Streaming Chat Interface
export { BrainChat, default as BrainChatDefault } from './BrainChat';

// AI Usage Dashboard (ISO 42001)
export { AIUsageDashboard, default as AIUsageDashboardDefault } from './AIUsageDashboard';

// Connected Sources Integration Hub
export { ConnectedSourcesHub, default as ConnectedSourcesHubDefault } from './ConnectedSourcesHub';

// Standup Generator Wizard
export { StandupWizard, default as StandupWizardDefault } from './StandupWizard';

// Meeting Intelligence View (Phase 4)
export { MeetingIntelligenceView, default as MeetingIntelligenceViewDefault } from './MeetingIntelligenceView';

// ============================================
// EXISTING COMPONENTS (re-export)
// ============================================

// Budget Usage
export { default as BudgetUsage } from './BudgetUsage';

// Business Ideas
export { default as BusinessIdeas } from './BusinessIdeas';

// Daily Learning
export { default as DailyLearningQuestions } from './DailyLearningQuestions';

// Document Upload
export { default as DocumentUpload } from './DocumentUpload';

// Ideas Analytics
export { default as IdeasAnalytics } from './IdeasAnalytics';

// Knowledge Graph
export { default as KnowledgeGraph } from './KnowledgeGraph';

// Knowledge Library
export { default as KnowledgeLibrary } from './KnowledgeLibrary';

// Upcoming Meetings
export { default as UpcomingMeetings } from './UpcomingMeetings';
