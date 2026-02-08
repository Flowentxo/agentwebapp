/**
 * Pipeline Cockpit Components
 *
 * Central exports for the Cockpit-Upgrade feature set.
 * Phase 1: Core Components
 * Phase 2: Enterprise Features (EmergencyStop, Reasoning, Audit)
 */

// Phase 1: Core Components
export { CockpitCanvas } from './CockpitCanvas';
export { CockpitSidebar } from './CockpitSidebar';
export { TriggerCockpit } from './TriggerCockpit';
export { AutopilotToggle, DEFAULT_AUTOPILOT_CONFIG } from './AutopilotToggle';
export { ApprovalQueuePanel } from './ApprovalQueuePanel';
export { LiveStepTracker } from './LiveStepTracker';

// Phase 2: Enterprise Features
export { EmergencyStopButton } from './EmergencyStopButton';
export { ReasoningCard, ReasoningCardCompact } from './ReasoningCard';
export { AuditTrailPanel } from './AuditTrailPanel';

// Types - Phase 1
export type { TriggerType } from './TriggerCockpit';
export type { AutopilotConfig } from './AutopilotToggle';
export type { ApprovalRequest } from './ApprovalQueuePanel';
export type { ExecutionStep } from './LiveStepTracker';

// Types - Phase 2
export type { ConfidenceFactor, ReasoningData } from './ReasoningCard';
export type { AuditEvent, AuditEventType } from './AuditTrailPanel';
