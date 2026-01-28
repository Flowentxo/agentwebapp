'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Settings,
  Download,
  HelpCircle,
  Zap
} from 'lucide-react';

interface QuickAction {
  icon: typeof Plus;
  label: string;
  description: string;
  href: string;
  color: string;
}

const actions: QuickAction[] = [
  {
    icon: Plus,
    label: 'Neuen Agent erstellen',
    description: 'Starte mit einem neuen Helfer',
    href: '/revolution',
    color: 'bg-primary/10 text-primary hover:bg-primary/20',
  },
  {
    icon: MessageSquare,
    label: 'Mit Agent chatten',
    description: 'Sprich mit deinen Agents',
    href: '/agents/browse',
    color: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
  },
  {
    icon: Zap,
    label: 'Workflow erstellen',
    description: 'Automatisiere Abläufe',
    href: '/brain',
    color: 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20',
  },
  {
    icon: HelpCircle,
    label: 'Hilfe & Support',
    description: 'Fragen? Wir helfen gerne!',
    href: '/settings',
    color: 'bg-green-500/10 text-green-400 hover:bg-green-500/20',
  },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => router.push(action.href)}
          className={`
            p-4 rounded-xl border border-border transition-all text-left
            hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
            ${action.color}
          `}
        >
          <action.icon className="w-6 h-6 mb-3" />
          <h3 className="font-medium text-text text-sm mb-1">{action.label}</h3>
          <p className="text-xs text-text-muted">{action.description}</p>
        </motion.button>
      ))}
    </div>
  );
}
