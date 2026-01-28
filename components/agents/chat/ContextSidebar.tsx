"use client";

import { useState } from 'react';
import {
  Activity,
  Wrench,
  BookOpen,
  CheckSquare,
  Shield,
  Database,
  Rocket,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { type AgentContext } from './types';
import { type Incident } from '../IncidentsTimeline';

type TabId = 'ereignisse' | 'tools' | 'wissen' | 'tasks';

interface ContextSidebarProps {
  agentContext: AgentContext;
  incidents?: Incident[];
  tasks?: Array<{ id: string; title: string; status: 'pending' | 'running' | 'completed' }>;
}

const tabs = [
  { id: 'ereignisse' as const, label: 'Ereignisse', icon: Activity },
  { id: 'tools' as const, label: 'Tools', icon: Wrench },
  { id: 'wissen' as const, label: 'Wissen', icon: BookOpen },
  { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare },
];

const permissionLabels = {
  'read-logs': { label: 'Logs lesen', icon: Activity },
  'write-ci': { label: 'CI/CD schreiben', icon: Rocket },
  'read-db': { label: 'DB lesen', icon: Database },
  'write-db': { label: 'DB schreiben', icon: Database },
  'deploy': { label: 'Deployment', icon: Rocket },
};

const incidentTypeConfig = {
  deploy: { icon: Rocket, label: 'Deployment', color: 'text-blue-400' },
  spike: { icon: TrendingUp, label: 'Traffic-Spike', color: 'text-warning' },
  error: { icon: AlertCircle, label: 'Fehler', color: 'text-error' },
  'rate-limit': { icon: Shield, label: 'Rate-Limit', color: 'text-orange-400' },
};

export function ContextSidebar({
  agentContext,
  incidents = [],
  tasks = [],
}: ContextSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('ereignisse');

  return (
    <div className="flex h-full flex-col border-l border-white/6 bg-surface-1">
      {/* Tabs Navigation */}
      <div className="border-b border-white/6">
        <div className="flex" role="tablist" aria-label="Kontext Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors
                  ${
                    isActive
                      ? 'border-primary text-text'
                      : 'border-transparent text-text-muted hover:text-text hover:border-white/10'
                  }
                `}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Ereignisse Tab */}
        {activeTab === 'ereignisse' && (
          <div role="tabpanel" id="panel-ereignisse" aria-labelledby="tab-ereignisse">
            <h3 className="mb-3 text-sm font-semibold text-text">Letzte Ereignisse</h3>
            {incidents.length === 0 ? (
              <p className="text-sm text-text-muted">Keine aktuellen Ereignisse</p>
            ) : (
              <div className="space-y-2">
                {incidents.slice(0, 10).map((incident) => {
                  const config = incidentTypeConfig[incident.type as keyof typeof incidentTypeConfig] || incidentTypeConfig.error;
                  const Icon = config.icon;

                  return (
                    <div
                      key={incident.id}
                      className="flex gap-2 rounded-lg border border-white/6 bg-card/[0.02] p-2.5 text-xs"
                    >
                      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${config.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-text">{config.label}</div>
                        <div className="text-text-muted line-clamp-2">
                          {incident.message}
                        </div>
                        <time className="text-text-subtle">
                          {incident.timestamp.toLocaleTimeString('de-DE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tools & Berechtigungen Tab */}
        {activeTab === 'tools' && (
          <div role="tabpanel" id="panel-tools" aria-labelledby="tab-tools">
            <h3 className="mb-3 text-sm font-semibold text-text">Berechtigungen</h3>
            {agentContext.permissions.length === 0 ? (
              <p className="text-sm text-text-muted">Keine Berechtigungen</p>
            ) : (
              <div className="space-y-2">
                {agentContext.permissions.map((perm) => {
                  const config = permissionLabels[perm];
                  if (!config) return null;

                  const Icon = config.icon;

                  return (
                    <div
                      key={perm}
                      className="flex items-center gap-2 rounded-lg border border-white/6 bg-card/[0.02] px-3 py-2 text-sm"
                    >
                      <Icon className="h-4 w-4 text-text-subtle" />
                      <span className="text-text">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Scope */}
            {agentContext.scope && (
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Scope
                </h4>
                <div className="rounded-lg border border-white/6 bg-card/[0.02] px-3 py-2 text-sm text-text">
                  {agentContext.scope}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wissensquellen Tab */}
        {activeTab === 'wissen' && (
          <div role="tabpanel" id="panel-wissen" aria-labelledby="tab-wissen">
            <h3 className="mb-3 text-sm font-semibold text-text">Datenquellen</h3>
            {agentContext.dataSources.length === 0 ? (
              <p className="text-sm text-text-muted">Keine Datenquellen konfiguriert</p>
            ) : (
              <div className="space-y-2">
                {agentContext.dataSources.map((source, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-white/6 bg-card/[0.02] px-3 py-2 text-sm"
                  >
                    <Database className="h-4 w-4 text-text-subtle" />
                    <span className="text-text">{source}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Memory Toggle */}
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Kontext-Speicher
              </h4>
              <div className="flex items-center gap-2 rounded-lg border border-white/6 bg-card/[0.02] px-3 py-2 text-sm">
                <span className="text-text">Memory</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                    agentContext.memory
                      ? 'bg-success/10 text-success'
                      : 'bg-card/10 text-text-muted'
                  }`}
                >
                  {agentContext.memory ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Laufende Tasks Tab */}
        {activeTab === 'tasks' && (
          <div role="tabpanel" id="panel-tasks" aria-labelledby="tab-tasks">
            <h3 className="mb-3 text-sm font-semibold text-text">Laufende Tasks</h3>
            {tasks.length === 0 ? (
              <p className="text-sm text-text-muted">Keine laufenden Tasks</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 rounded-lg border border-white/6 bg-card/[0.02] p-2.5 text-xs"
                  >
                    <CheckSquare
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        task.status === 'completed'
                          ? 'text-success'
                          : task.status === 'running'
                          ? 'text-warning'
                          : 'text-text-subtle'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text">{task.title}</div>
                      <div
                        className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          task.status === 'completed'
                            ? 'bg-success/10 text-success'
                            : task.status === 'running'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-card/10 text-text-muted'
                        }`}
                      >
                        {task.status === 'completed'
                          ? 'Abgeschlossen'
                          : task.status === 'running'
                          ? 'Läuft...'
                          : 'Ausstehend'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
