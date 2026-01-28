'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Bot,
  Clock,
  Filter,
  ChevronDown,
  Target,
  FileText,
  Mail,
  Calendar,
  Users,
  Zap,
} from 'lucide-react';

type ActivityType = 'chat' | 'task_completed' | 'error' | 'lead' | 'email' | 'meeting' | 'automation';

interface Activity {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const ACTIVITY_ICONS: Record<ActivityType, typeof MessageSquare> = {
  chat: MessageSquare,
  task_completed: CheckCircle,
  error: AlertTriangle,
  lead: Target,
  email: Mail,
  meeting: Calendar,
  automation: Zap,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  chat: '#3B82F6',
  task_completed: '#10B981',
  error: '#EF4444',
  lead: '#F59E0B',
  email: '#8B5CF6',
  meeting: '#EC4899',
  automation: '#06B6D4',
};

// Generate mock activities
function generateMockActivities(): Activity[] {
  const agents = [
    { id: 'dexter', name: 'Dexter', avatar: '📊', color: '#10B981' },
    { id: 'cassie', name: 'Cassie', avatar: '💬', color: '#3B82F6' },
    { id: 'kai', name: 'Kai', avatar: '💻', color: '#8B5CF6' },
    { id: 'emmie', name: 'Emmie', avatar: '📧', color: '#F59E0B' },
    { id: 'nova', name: 'Nova', avatar: '🔮', color: '#EC4899' },
  ];

  const activityTemplates: Array<{ type: ActivityType; titleTemplate: string; descriptionTemplate?: string }> = [
    { type: 'chat', titleTemplate: 'Neue Konversation', descriptionTemplate: 'Gespräch mit Benutzer gestartet' },
    { type: 'task_completed', titleTemplate: 'Aufgabe abgeschlossen', descriptionTemplate: 'Datenanalyse wurde erfolgreich beendet' },
    { type: 'lead', titleTemplate: 'Neuer Lead qualifiziert', descriptionTemplate: 'Lead-Score: 85/100' },
    { type: 'email', titleTemplate: 'E-Mail gesendet', descriptionTemplate: 'Follow-up an Kunde versandt' },
    { type: 'meeting', titleTemplate: 'Meeting gebucht', descriptionTemplate: 'Discovery Call für morgen 14:00' },
    { type: 'automation', titleTemplate: 'Automatisierung ausgeführt', descriptionTemplate: 'Workflow "Onboarding" gestartet' },
    { type: 'error', titleTemplate: 'Fehler behoben', descriptionTemplate: 'API-Timeout wurde automatisch gelöst' },
  ];

  const activities: Activity[] = [];
  const now = new Date();

  for (let i = 0; i < 20; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
    const minutesAgo = Math.floor(Math.random() * 720); // Last 12 hours

    activities.push({
      id: `activity-${i}`,
      agentId: agent.id,
      agentName: agent.name,
      agentAvatar: agent.avatar,
      agentColor: agent.color,
      type: template.type,
      title: template.titleTemplate,
      description: template.descriptionTemplate,
      timestamp: new Date(now.getTime() - minutesAgo * 60 * 1000),
    });
  }

  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function ActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ActivityType>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setActivities(generateMockActivities());
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.type === filter);

  if (loading) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-surface rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Aktivitäten</h2>
            <p className="text-sm text-text-muted">Live-Feed deiner Agents</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-surface-elevated rounded-lg border border-border text-sm text-text-muted transition-colors"
          >
            <Filter className="w-4 h-4" />
            {filter === 'all' ? 'Alle' : filter}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 w-48 bg-surface-elevated border border-border rounded-lg shadow-xl z-50"
              >
                <div className="p-1">
                  <FilterButton
                    label="Alle"
                    active={filter === 'all'}
                    onClick={() => { setFilter('all'); setShowFilters(false); }}
                  />
                  <FilterButton
                    label="Chats"
                    icon={MessageSquare}
                    color={ACTIVITY_COLORS.chat}
                    active={filter === 'chat'}
                    onClick={() => { setFilter('chat'); setShowFilters(false); }}
                  />
                  <FilterButton
                    label="Aufgaben"
                    icon={CheckCircle}
                    color={ACTIVITY_COLORS.task_completed}
                    active={filter === 'task_completed'}
                    onClick={() => { setFilter('task_completed'); setShowFilters(false); }}
                  />
                  <FilterButton
                    label="Leads"
                    icon={Target}
                    color={ACTIVITY_COLORS.lead}
                    active={filter === 'lead'}
                    onClick={() => { setFilter('lead'); setShowFilters(false); }}
                  />
                  <FilterButton
                    label="E-Mails"
                    icon={Mail}
                    color={ACTIVITY_COLORS.email}
                    active={filter === 'email'}
                    onClick={() => { setFilter('email'); setShowFilters(false); }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-1">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted">Keine Aktivitäten gefunden</p>
            </div>
          ) : (
            filteredActivities.slice(0, 15).map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isFirst={index === 0}
                isLast={index === filteredActivities.length - 1}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      {filteredActivities.length > 15 && (
        <div className="px-6 py-3 border-t border-border flex-shrink-0">
          <button className="w-full text-center text-sm text-primary hover:text-primary-hover transition-colors">
            Alle {filteredActivities.length} Aktivitäten anzeigen
          </button>
        </div>
      )}
    </div>
  );
}

interface ActivityItemProps {
  activity: Activity;
  isFirst: boolean;
  isLast: boolean;
}

function ActivityItem({ activity, isFirst, isLast }: ActivityItemProps) {
  const Icon = ACTIVITY_ICONS[activity.type];
  const iconColor = ACTIVITY_COLORS[activity.type];

  const timeAgo = getTimeAgo(activity.timestamp);

  return (
    <div className="flex gap-3 p-2 rounded-lg hover:bg-surface/50 transition-colors group">
      {/* Timeline line and icon */}
      <div className="relative flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border mt-1" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-lg">{activity.agentAvatar}</span>
          <span className="text-sm font-medium text-text">{activity.agentName}</span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted">{timeAgo}</span>
        </div>
        <p className="text-sm text-text">{activity.title}</p>
        {activity.description && (
          <p className="text-xs text-text-muted mt-0.5">{activity.description}</p>
        )}
      </div>
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  icon?: typeof MessageSquare;
  color?: string;
  active: boolean;
  onClick: () => void;
}

function FilterButton({ label, icon: Icon, color, active, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-text-muted hover:bg-surface hover:text-text'
      }`}
    >
      {Icon && <Icon className="w-4 h-4" style={{ color: active ? undefined : color }} />}
      {label}
    </button>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `vor ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `vor ${diffDays}d`;
}
