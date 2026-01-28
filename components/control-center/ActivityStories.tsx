'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  MessageCircle,
  UserPlus,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  BookOpen
} from 'lucide-react';

type ActivityType = 'email' | 'conversation' | 'lead' | 'task' | 'error' | 'automation';

interface Activity {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  details?: {
    emailType?: 'followup' | 'initial' | 'response';
    recipient?: string;
    customerName?: string;
    resolved?: boolean;
    score?: number;
    preview?: string;
  };
}

// Generate mock activities with human-readable stories
function generateMockActivities(): Activity[] {
  const activities: Activity[] = [
    {
      id: '1',
      agentName: 'Cassie',
      agentId: 'cassie',
      agentAvatar: '💬',
      type: 'conversation',
      title: 'Kundengespräch',
      description: 'Hat ein Gespräch mit einem Besucher geführt',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      details: {
        customerName: 'Maria S.',
        resolved: true,
        preview: 'Frage zur Preisgestaltung beantwortet'
      }
    },
    {
      id: '2',
      agentName: 'Emmie',
      agentId: 'emmie',
      agentAvatar: '📧',
      type: 'email',
      title: 'E-Mail versendet',
      description: 'Follow-up E-Mail geschickt',
      timestamp: new Date(Date.now() - 23 * 60 * 1000),
      details: {
        emailType: 'followup',
        recipient: 'Kunde XYZ',
        preview: 'Vielen Dank für Ihr Interesse...'
      }
    },
    {
      id: '3',
      agentName: 'Nova',
      agentId: 'nova',
      agentAvatar: '🔮',
      type: 'lead',
      title: 'Neuer Lead',
      description: 'Vielversprechenden Lead gefunden',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      details: {
        score: 87,
      }
    },
    {
      id: '4',
      agentName: 'Dexter',
      agentId: 'dexter',
      agentAvatar: '📊',
      type: 'task',
      title: 'Aufgabe abgeschlossen',
      description: 'Datenanalyse fertiggestellt',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '5',
      agentName: 'Kai',
      agentId: 'kai',
      agentAvatar: '💻',
      type: 'automation',
      title: 'Workflow ausgeführt',
      description: 'Automatischer Bericht generiert',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  ];

  return activities;
}

export function ActivityStories() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActivities(generateMockActivities());
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-surface rounded-lg" />
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
          <div className="p-2 rounded-lg bg-purple-500/10">
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Was ist passiert?</h2>
            <p className="text-sm text-text-muted">Live-Updates</p>
          </div>
        </div>
      </div>

      {/* Stories */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ActivityStory activity={activity} />
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-border flex-shrink-0">
        <button className="w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary-hover transition-colors">
          Alle Aktivitäten anzeigen
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ActivityStory({ activity }: { activity: Activity }) {
  const timeAgo = formatTimeAgo(activity.timestamp);
  const Icon = getActivityIcon(activity.type);
  const iconColor = getActivityColor(activity.type);
  const story = generateStory(activity);

  return (
    <div className="flex gap-3 p-3 bg-surface rounded-lg hover:bg-surface/80 transition-colors">
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Time & Agent */}
        <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
          <span>{timeAgo}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span>{activity.agentAvatar}</span>
            <span>{activity.agentName}</span>
          </span>
        </div>

        {/* Story */}
        <p className="text-sm text-text leading-relaxed">
          {story}
        </p>

        {/* Optional Preview */}
        {activity.details?.preview && (
          <p className="mt-1.5 text-xs text-text-muted italic bg-surface-elevated px-2 py-1 rounded">
            "{activity.details.preview}"
          </p>
        )}
      </div>
    </div>
  );
}

// Generate human-readable stories from activity data
function generateStory(activity: Activity): string {
  switch (activity.type) {
    case 'email':
      const emailType = activity.details?.emailType === 'followup' ? 'Follow-up ' : '';
      return `Hat eine ${emailType}E-Mail an ${activity.details?.recipient || 'einen Kunden'} geschickt.`;

    case 'conversation':
      const resolved = activity.details?.resolved ? ' und das Anliegen gelöst' : '';
      return `Hat ein Gespräch mit ${activity.details?.customerName || 'einem Besucher'} geführt${resolved}. 👍`;

    case 'lead':
      const leadScore = activity.details?.score;
      const scoreText = leadScore && leadScore > 80
        ? ' ⭐ Sieht sehr vielversprechend aus!'
        : '';
      return `Hat einen neuen Interessenten gefunden!${scoreText}`;

    case 'task':
      return `Hat eine Aufgabe abgeschlossen: "${activity.title}" ✅`;

    case 'error':
      return 'Konnte etwas nicht erledigen und braucht vielleicht deine Hilfe. ⚠️';

    case 'automation':
      return `Hat einen automatischen Ablauf gestartet: ${activity.title}`;

    default:
      return activity.description;
  }
}

function getActivityIcon(type: ActivityType) {
  const icons = {
    email: Mail,
    conversation: MessageCircle,
    lead: UserPlus,
    task: CheckCircle,
    error: AlertTriangle,
    automation: Clock,
  };
  return icons[type] || CheckCircle;
}

function getActivityColor(type: ActivityType): string {
  const colors = {
    email: 'bg-blue-500/20 text-blue-400',
    conversation: 'bg-purple-500/20 text-purple-400',
    lead: 'bg-green-500/20 text-green-400',
    task: 'bg-emerald-500/20 text-emerald-400',
    error: 'bg-yellow-500/20 text-yellow-400',
    automation: 'bg-cyan-500/20 text-cyan-400',
  };
  return colors[type] || 'bg-slate-700 text-muted-foreground';
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Gerade eben';
  if (seconds < 3600) return `Vor ${Math.floor(seconds / 60)} Min`;
  if (seconds < 86400) return `Vor ${Math.floor(seconds / 3600)} Std`;
  return `Vor ${Math.floor(seconds / 86400)} Tagen`;
}
