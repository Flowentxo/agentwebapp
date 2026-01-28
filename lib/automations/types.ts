/**
 * Automations Types
 * Sprint 4 - Automations MVP
 */

export type AutomationAction = {
  type: "agent.run";
  agentId: string;
};

export interface Automation {
  id: string;
  title: string;
  enabled: boolean;
  schedule: string; // e.g., "every 5 minutes" | "daily at 09:00" | "RRULE:FREQ=DAILY;BYHOUR=9;BYMINUTE=0"
  action: AutomationAction;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}
