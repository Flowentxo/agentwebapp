import { testAgentById } from './agentTestService';
import { getAllAgents } from '@/lib/agents/personas';

/**
 * Whitelist der erlaubten Agents (case-insensitive)
 */
const AGENT_WHITELIST = ['dexter', 'cassie', 'emmie', 'aura'];

export interface CleanupAction {
  agentId: string;
  agentName: string;
  action: 'keep' | 'delete';
  reason: string;
  testStatus?: 'OK' | 'FAIL';
}

export interface CleanupPlan {
  total: number;
  toKeep: number;
  toDelete: number;
  actions: CleanupAction[];
  timestamp: string;
}

export interface CleanupResult {
  plan: CleanupPlan;
  executed: boolean;
  deleted: string[];
  kept: string[];
  errors: { agentId: string; error: string }[];
  timestamp: string;
}

/**
 * Prüft, ob ein Agent auf der Whitelist steht
 */
function isWhitelisted(agentName: string): boolean {
  return AGENT_WHITELIST.includes(agentName.toLowerCase());
}

/**
 * Erstellt einen Cleanup-Plan ohne Ausführung
 * Zeigt Vorschau, welche Agents gelöscht würden
 */
export async function createCleanupPlan(): Promise<CleanupPlan> {
  const agents = getAllAgents();
  const actions: CleanupAction[] = [];

  for (const agent of agents) {
    // Test Agent-Funktionalität
    const testResult = await testAgentById(agent.id);

    // Entscheidungslogik
    if (testResult.status === 'OK' && isWhitelisted(agent.name)) {
      // Agent ist OK und auf Whitelist → Behalten
      actions.push({
        agentId: agent.id,
        agentName: agent.name,
        action: 'keep',
        reason: 'Funktioniert und auf Whitelist',
        testStatus: 'OK',
      });
    } else if (testResult.status === 'FAIL') {
      // Agent fehlerhaft → Löschen
      actions.push({
        agentId: agent.id,
        agentName: agent.name,
        action: 'delete',
        reason: `Fehlerhaft: ${testResult.error || 'Test fehlgeschlagen'}`,
        testStatus: 'FAIL',
      });
    } else if (!isWhitelisted(agent.name)) {
      // Agent funktioniert, aber nicht auf Whitelist → Löschen
      actions.push({
        agentId: agent.id,
        agentName: agent.name,
        action: 'delete',
        reason: 'Nicht auf Whitelist (erlaubt: Dexter, Cassie, Emmie, Aura)',
        testStatus: 'OK',
      });
    }
  }

  const toKeep = actions.filter(a => a.action === 'keep').length;
  const toDelete = actions.filter(a => a.action === 'delete').length;

  return {
    total: agents.length,
    toKeep,
    toDelete,
    actions,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Führt den Cleanup aus (nur für Custom Agents)
 * System-Agents (Dexter, Cassie, Emmie, Aura) werden NIEMALS gelöscht
 */
export async function executeCleanup(
  plan: CleanupPlan,
  deleteFunction?: (agentId: string) => Promise<void>
): Promise<CleanupResult> {
  const deleted: string[] = [];
  const kept: string[] = [];
  const errors: { agentId: string; error: string }[] = [];

  for (const action of plan.actions) {
    if (action.action === 'keep') {
      kept.push(action.agentId);
      console.log(`✅ Agent ${action.agentName} (${action.agentId}) behalten - ${action.reason}`);
      continue;
    }

    // Sicherheitscheck: System-Agents NIEMALS löschen
    if (isWhitelisted(action.agentName)) {
      console.warn(`⚠️  SICHERHEIT: Agent ${action.agentName} ist auf Whitelist und wird NICHT gelöscht`);
      kept.push(action.agentId);
      continue;
    }

    // Lösche Agent (nur wenn deleteFunction bereitgestellt)
    if (deleteFunction) {
      try {
        await deleteFunction(action.agentId);
        deleted.push(action.agentId);
        console.log(`🗑️  Agent ${action.agentName} (${action.agentId}) gelöscht - ${action.reason}`);
      } catch (error: any) {
        errors.push({
          agentId: action.agentId,
          error: error.message || 'Löschfehler',
        });
        console.error(`❌ Fehler beim Löschen von ${action.agentName}:`, error);
      }
    } else {
      console.log(`🔍 DRY-RUN: Agent ${action.agentName} würde gelöscht werden - ${action.reason}`);
    }
  }

  return {
    plan,
    executed: !!deleteFunction,
    deleted,
    kept,
    errors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Haupt-Cleanup-Funktion mit Dry-Run-Option
 */
export async function cleanAgents(
  dryRun: boolean = true,
  deleteFunction?: (agentId: string) => Promise<void>
): Promise<CleanupResult> {
  console.log('═══════════════════════════════════════════');
  console.log(`🧹 Agent Cleanup ${dryRun ? '(DRY-RUN)' : '(EXECUTION)'}`);
  console.log('═══════════════════════════════════════════');
  console.log(`📋 Whitelist: ${AGENT_WHITELIST.join(', ')}`);
  console.log('═══════════════════════════════════════════');

  // Erstelle Plan
  const plan = await createCleanupPlan();

  console.log(`\n📊 Cleanup-Plan erstellt:`);
  console.log(`   Total Agents: ${plan.total}`);
  console.log(`   Zu behalten: ${plan.toKeep}`);
  console.log(`   Zu löschen: ${plan.toDelete}`);
  console.log('');

  // Führe aus (oder Dry-Run)
  const result = await executeCleanup(
    plan,
    dryRun ? undefined : deleteFunction
  );

  console.log('═══════════════════════════════════════════');
  console.log('📈 Cleanup-Ergebnis:');
  console.log(`   Behalten: ${result.kept.length}`);
  console.log(`   Gelöscht: ${result.deleted.length}`);
  console.log(`   Fehler: ${result.errors.length}`);
  console.log('═══════════════════════════════════════════');

  return result;
}

/**
 * Validiert, ob ein Agent sicher gelöscht werden kann
 */
export function canDeleteAgent(agentName: string): boolean {
  return !isWhitelisted(agentName);
}

/**
 * Gibt die aktuelle Whitelist zurück
 */
export function getWhitelist(): string[] {
  return [...AGENT_WHITELIST];
}
