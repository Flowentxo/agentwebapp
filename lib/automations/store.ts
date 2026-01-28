/**
 * Automations Store - In-Memory Scheduler
 * Sprint 4 - Automations MVP
 * Features: Parser (every N minutes, daily at HH:MM, RRULE subset), isDue, tick, trigger
 */

import { Automation } from "./types";
import { runsStore } from "@/lib/agents/store";

type TickResult = { automationId: string; runId: string };

// ========== SCHEDULE PARSERS ==========

function parseDaily(schedule: string): { hour: number; minute: number } | null {
  // "daily at 09:00"
  const m1 = schedule.match(/^daily at (\d{2}):(\d{2})$/i);
  if (m1) return { hour: +m1[1], minute: +m1[2] };

  // "RRULE:FREQ=DAILY;BYHOUR=9;BYMINUTE=0"
  const m2 = schedule.match(/^RRULE:FREQ=DAILY;BYHOUR=(\d{1,2});BYMINUTE=(\d{1,2})$/i);
  if (m2) return { hour: +m2[1], minute: +m2[2] };

  return null;
}

function parseEveryMinutes(schedule: string): number | null {
  // "every 5 minutes" or "every 1 minute"
  const m = schedule.match(/^every\s+(\d+)\s+minutes?$/i);
  return m ? Math.max(1, parseInt(m[1], 10)) : null;
}

// ========== IS DUE ==========

function isDue(lastRunAt: string | undefined, now: Date, schedule: string): boolean {
  // Try "every N minutes"
  const every = parseEveryMinutes(schedule);
  if (every != null) {
    if (!lastRunAt) return true;
    const last = new Date(lastRunAt).getTime();
    return now.getTime() - last >= every * 60_000;
  }

  // Try "daily at HH:MM"
  const daily = parseDaily(schedule);
  if (daily) {
    const lastDay = lastRunAt ? new Date(lastRunAt) : undefined;
    const due = new Date(now);
    due.setHours(daily.hour, daily.minute, 0, 0);

    // due if now >= target today and we didn't run today
    const ranToday =
      lastDay &&
      lastDay.getFullYear() === now.getFullYear() &&
      lastDay.getMonth() === now.getMonth() &&
      lastDay.getDate() === now.getDate();

    return now.getTime() >= due.getTime() && !ranToday;
  }

  // Unknown schedule → never due
  return false;
}

// ========== STORE ==========

class AutomationsStore {
  private autos = new Map<string, Automation>();
  private seq = 0;

  list(): Automation[] {
    return Array.from(this.autos.values()).sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );
  }

  get(id: string) {
    return this.autos.get(id);
  }

  create(input: {
    title: string;
    schedule: string;
    action: { type: "agent.run"; agentId: string };
  }): Automation {
    const id = `auto-${Date.now()}-${++this.seq}`;
    const now = new Date().toISOString();

    const a: Automation = {
      id,
      title: input.title.trim() || `Automation ${this.seq}`,
      enabled: true,
      schedule: input.schedule.trim(),
      action: input.action,
      createdAt: now,
      updatedAt: now,
    };

    this.autos.set(id, a);
    return a;
  }

  update(
    id: string,
    patch: Partial<Pick<Automation, "title" | "enabled" | "schedule">>
  ) {
    const cur = this.autos.get(id);
    if (!cur) return null;

    const next: Automation = {
      ...cur,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.autos.set(id, next);
    return next;
  }

  delete(id: string) {
    return this.autos.delete(id);
  }

  async trigger(a: Automation): Promise<{ runId: string }> {
    // Start an Agent run (reuse store logic from Sprint 2)
    const run = runsStore.createRun(a.action.agentId);

    // Simulate state changes similar to Sprint 2 logic
    setTimeout(() => {
      runsStore.updateRunStatus(run.id, "running");
      runsStore.addLog(run.id, {
        level: "info",
        message: `Automation "${a.title}" triggered agent ${a.action.agentId}`,
        timestamp: new Date().toISOString(),
      });

      const dur = 2000 + Math.floor(Math.random() * 2000);
      setTimeout(() => {
        const current = runsStore.getRun(run.id);
        if (current?.status === "cancelled") return;

        runsStore.addLog(run.id, {
          level: "info",
          message: "Automation run completed successfully",
          timestamp: new Date().toISOString(),
        });
        runsStore.updateRunStatus(run.id, "success");
      }, dur);
    }, 300);

    // Update lastRunAt
    const cur = this.get(a.id)!;
    cur.lastRunAt = new Date().toISOString();
    this.autos.set(a.id, cur);

    return { runId: run.id };
  }

  async tick(now: Date): Promise<TickResult[]> {
    const out: TickResult[] = [];

    for (const a of Array.from(this.autos.values())) {
      if (!a.enabled) continue;

      if (isDue(a.lastRunAt, now, a.schedule)) {
        const { runId } = await this.trigger(a);
        out.push({ automationId: a.id, runId });
      }
    }

    return out;
  }
}

export const automationsStore = new AutomationsStore();
export const _internal = { isDue, parseEveryMinutes, parseDaily };
