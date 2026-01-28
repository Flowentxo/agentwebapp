'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Play, Pause, ChevronRight, Sparkles, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

type PerformanceRating = 'super' | 'gut' | 'okay' | 'braucht-hilfe';

interface AgentActivity {
  summary: string[];
  currentTask?: string;
}

interface Agent {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  category: string;
  status: 'active' | 'paused' | 'error';
  performanceScore: number;
}

interface FriendlyAgentCardProps {
  agent: Agent;
  todayActivity?: AgentActivity;
  onToggle: (agentId: string) => void;
}

export function FriendlyAgentCard({ agent, todayActivity, onToggle }: FriendlyAgentCardProps) {
  const router = useRouter();
  const isActive = agent.status === 'active';
  const rating = getSimpleRating(agent.performanceScore);

  // Generate default activity if none provided
  const activity: AgentActivity = todayActivity || {
    summary: generateDefaultSummary(agent.category),
    currentTask: isActive ? generateCurrentTask(agent.category) : undefined,
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative bg-surface-elevated rounded-xl p-5 border-2 transition-all cursor-pointer
        ${isActive
          ? 'border-green-500/50 hover:border-green-500 shadow-lg shadow-green-500/5'
          : 'border-border hover:border-primary/30'}
      `}
      onClick={() => router.push(`/agents/${agent.id}`)}
    >
      {/* Status Indicator */}
      <div className="absolute top-4 right-4">
        <span className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          ${isActive
            ? 'bg-green-500/20 text-green-400'
            : 'bg-surface text-text-muted'}
        `}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-muted/500'}`} />
          {isActive ? 'Arbeitet gerade' : 'Pausiert'}
        </span>
      </div>

      {/* Agent Avatar & Name */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${agent.color || '#8B5CF6'}40, ${agent.color || '#8B5CF6'}20)`
          }}
        >
          {agent.avatar || getAgentEmoji(agent.category)}
        </div>
        <div>
          <h3 className="font-semibold text-lg text-text">{agent.name}</h3>
          <p className="text-sm text-text-muted">{getHumanCategory(agent.category)}</p>
        </div>
      </div>

      {/* Today's Summary - Human readable! */}
      {isActive && activity.summary.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Heute erledigt:</p>
          <div className="space-y-1.5">
            {activity.summary.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-text">
                <span className="text-green-400">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simple Performance Indicator - No percentages! */}
      <div className="flex items-center justify-between mb-4 p-3 bg-surface rounded-lg">
        <span className="text-sm text-text-muted">Wie läuft's?</span>
        <div className="flex items-center gap-2">
          {rating === 'super' && (
            <>
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-green-400 font-medium">Super!</span>
            </>
          )}
          {rating === 'gut' && (
            <span className="text-blue-400 font-medium">Läuft gut 👍</span>
          )}
          {rating === 'okay' && (
            <span className="text-text-muted font-medium">Okay</span>
          )}
          {rating === 'braucht-hilfe' && (
            <span className="text-yellow-400 font-medium">Braucht Hilfe ⚠️</span>
          )}
        </div>
      </div>

      {/* Current Activity (if active) */}
      {isActive && activity.currentTask && (
        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-text">
            <span className="text-primary">💬 Gerade:</span> "{activity.currentTask}"
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-medium transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/agents/${agent.id}`);
          }}
        >
          <ChevronRight className="w-4 h-4" />
          Öffnen
        </button>

        <button
          className={`
            flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors
            ${isActive
              ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}
          `}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(agent.id);
          }}
        >
          {isActive ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Starten
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// Helper Functions
function getSimpleRating(score: number): PerformanceRating {
  if (score >= 90) return 'super';
  if (score >= 75) return 'gut';
  if (score >= 50) return 'okay';
  return 'braucht-hilfe';
}

function getHumanCategory(category: string): string {
  const map: Record<string, string> = {
    'sales': 'Hilft bei Kundengewinnung',
    'support': 'Beantwortet Kundenfragen',
    'marketing': 'Erstellt Inhalte',
    'hr': 'Hilft bei Bewerbungen',
    'finance': 'Kümmert sich um Rechnungen',
    'operations': 'Automatisiert Abläufe',
    'general': 'Dein Helfer',
  };
  return map[category] || 'Dein Helfer';
}

function getAgentEmoji(category: string): string {
  const map: Record<string, string> = {
    'sales': '💼',
    'support': '🎧',
    'marketing': '📣',
    'hr': '👥',
    'finance': '💰',
    'operations': '⚙️',
    'general': '🤖',
  };
  return map[category] || '🤖';
}

function generateDefaultSummary(category: string): string[] {
  const summaries: Record<string, string[]> = {
    'sales': [
      '12 Leads kontaktiert',
      '3 Meetings vereinbart',
      '5 Follow-ups gesendet',
    ],
    'support': [
      '24 Kundenfragen beantwortet',
      '2 Probleme gelöst',
      'Alle Tickets bearbeitet',
    ],
    'marketing': [
      '5 Social-Media-Posts erstellt',
      '2 Newsletter vorbereitet',
      'Content-Kalender aktualisiert',
    ],
    'hr': [
      '8 Bewerbungen gesichtet',
      '2 Interviews geplant',
      'Onboarding-Docs aktualisiert',
    ],
    'finance': [
      '15 Rechnungen verarbeitet',
      'Monatsabschluss vorbereitet',
      '3 Zahlungserinnerungen gesendet',
    ],
    'operations': [
      '50 Datensätze synchronisiert',
      '3 Workflows ausgeführt',
      'Berichte generiert',
    ],
    'general': [
      'Aufgaben erledigt',
      'Nachrichten beantwortet',
      'Daten aktualisiert',
    ],
  };
  return summaries[category] || summaries['general'];
}

function generateCurrentTask(category: string): string {
  const tasks: Record<string, string> = {
    'sales': 'Schreibe gerade ein Angebot...',
    'support': 'Beantworte eine Kundenanfrage...',
    'marketing': 'Erstelle einen Blog-Beitrag...',
    'hr': 'Analysiere eine Bewerbung...',
    'finance': 'Prüfe eine Rechnung...',
    'operations': 'Synchronisiere Daten...',
    'general': 'Bearbeite eine Anfrage...',
  };
  return tasks[category] || tasks['general'];
}
