'use client';

import { useState } from 'react';
import {
  X,
  User,
  Layout,
  Eye,
  Bell,
  Sparkles,
  RotateCcw,
  Check,
  Settings as SettingsIcon,
} from 'lucide-react';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { ViewMode } from '@/lib/types/preferences';

interface DashboardSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardSettings({ isOpen, onClose }: DashboardSettingsProps) {
  const { preferences, updatePreference, togglePreference, resetPreferences } = usePreferences();
  const [activeTab, setActiveTab] = useState<'layout' | 'appearance' | 'behavior' | 'intelligence'>(
    'layout'
  );

  if (!isOpen) return null;

  const tabs = [
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'appearance', label: 'Appearance', icon: Eye },
    { id: 'behavior', label: 'Behavior', icon: Bell },
    { id: 'intelligence', label: 'Intelligence', icon: Sparkles },
  ] as const;

  const viewModes: { value: ViewMode; label: string; description: string }[] = [
    { value: 'detailed', label: 'Detailed', description: 'Full information with all metrics' },
    { value: 'compact', label: 'Compact', description: 'Space-saving view' },
    { value: 'cards', label: 'Cards', description: 'Visual card-based layout' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in-up"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="glass-effect animate-scale-in relative w-full max-w-3xl rounded-2xl border border-white/10 bg-surface-1 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--accent))]/20">
                <SettingsIcon className="h-5 w-5 text-[rgb(var(--accent))]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">Dashboard Settings</h2>
                <p className="text-sm text-text-muted">Customize your experience</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-card/5 text-text-muted transition-all hover:bg-card/10 hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-white/10 bg-card/5 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[rgb(var(--accent))] text-white shadow-lg'
                      : 'text-text-muted hover:bg-card/5 hover:text-text'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-6">
            {/* Layout Tab */}
            {activeTab === 'layout' && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-text">View Mode</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {viewModes.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => updatePreference('viewMode', mode.value)}
                        className={`focus-ring rounded-xl border p-4 text-left transition-all ${
                          preferences.viewMode === mode.value
                            ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10'
                            : 'border-white/10 bg-card/5 hover:border-white/20 hover:bg-card/10'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-text">{mode.label}</p>
                            <p className="mt-1 text-xs text-text-muted">{mode.description}</p>
                          </div>
                          {preferences.viewMode === mode.value && (
                            <Check className="h-5 w-5 text-[rgb(var(--accent))]" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-text">Dashboard Sections</h3>
                  <div className="space-y-2">
                    {[
                      { key: 'showGreeting', label: 'Personal Greeting' },
                      { key: 'showInsights', label: 'Smart Insights' },
                      { key: 'showQuickActions', label: 'Quick Actions Panel' },
                      { key: 'showRecentActivity', label: 'Recent Activity Feed' },
                    ].map((section) => (
                      <label
                        key={section.key}
                        className="focus-ring flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-card/5 p-4 transition-all hover:border-white/20 hover:bg-card/10"
                      >
                        <span className="text-sm font-medium text-text">{section.label}</span>
                        <div
                          onClick={() => togglePreference(section.key as keyof typeof preferences)}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            preferences[section.key as keyof typeof preferences]
                              ? 'bg-[rgb(var(--accent))]'
                              : 'bg-card/20'
                          }`}
                        >
                          <div
                            className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-md transition-transform ${
                              preferences[section.key as keyof typeof preferences]
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-text">Personal</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-2 block text-sm text-text-muted">Display Name</label>
                      <input
                        type="text"
                        value={preferences.displayName || ''}
                        onChange={(e) => updatePreference('displayName', e.target.value)}
                        placeholder="Your name"
                        className="focus-ring w-full rounded-lg border border-white/10 bg-card/5 px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-[rgb(var(--accent))] focus:bg-card/10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-text">Display Options</h3>
                  <div className="space-y-2">
                    <label className="focus-ring flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-card/5 p-4 transition-all hover:border-white/20 hover:bg-card/10">
                      <span className="text-sm font-medium text-text">Reduced Motion</span>
                      <div
                        onClick={() => togglePreference('reducedMotion')}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          preferences.reducedMotion ? 'bg-[rgb(var(--accent))]' : 'bg-card/20'
                        }`}
                      >
                        <div
                          className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-md transition-transform ${
                            preferences.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </div>
                    </label>

                    <div className="rounded-lg border border-white/10 bg-card/5 p-4">
                      <label className="mb-2 block text-sm font-medium text-text">
                        Time Format
                      </label>
                      <div className="flex gap-2">
                        {(['12h', '24h'] as const).map((format) => (
                          <button
                            key={format}
                            onClick={() => updatePreference('timeFormat', format)}
                            className={`focus-ring flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                              preferences.timeFormat === format
                                ? 'bg-[rgb(var(--accent))] text-white'
                                : 'bg-card/5 text-text-muted hover:bg-card/10 hover:text-text'
                            }`}
                          >
                            {format === '12h' ? '12-hour' : '24-hour'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Behavior Tab */}
            {activeTab === 'behavior' && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-text">Auto-Refresh</h3>
                  <div className="space-y-3">
                    <label className="focus-ring flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-card/5 p-4 transition-all hover:border-white/20 hover:bg-card/10">
                      <span className="text-sm font-medium text-text">Enable Auto-Refresh</span>
                      <div
                        onClick={() => togglePreference('autoRefresh')}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          preferences.autoRefresh ? 'bg-[rgb(var(--accent))]' : 'bg-card/20'
                        }`}
                      >
                        <div
                          className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-md transition-transform ${
                            preferences.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </div>
                    </label>

                    {preferences.autoRefresh && (
                      <div className="rounded-lg border border-white/10 bg-card/5 p-4">
                        <label className="mb-2 block text-sm font-medium text-text">
                          Refresh Interval: {preferences.refreshInterval}s
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="120"
                          step="10"
                          value={preferences.refreshInterval}
                          onChange={(e) =>
                            updatePreference('refreshInterval', parseInt(e.target.value))
                          }
                          className="w-full"
                        />
                        <div className="mt-2 flex justify-between text-xs text-text-muted">
                          <span>10s</span>
                          <span>120s</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-text">Notifications</h3>
                  <div className="space-y-2">
                    <label className="focus-ring flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-card/5 p-4 transition-all hover:border-white/20 hover:bg-card/10">
                      <span className="text-sm font-medium text-text">Enable Notifications</span>
                      <div
                        onClick={() =>
                          updatePreference('notifications', {
                            ...preferences.notifications,
                            enabled: !preferences.notifications.enabled,
                          })
                        }
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          preferences.notifications.enabled
                            ? 'bg-[rgb(var(--accent))]'
                            : 'bg-card/20'
                        }`}
                      >
                        <div
                          className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-md transition-transform ${
                            preferences.notifications.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </div>
                    </label>

                    {preferences.notifications.enabled && (
                      <>
                        <label className="focus-ring flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-card/5 p-4 transition-all hover:border-white/20 hover:bg-card/10">
                          <span className="text-sm font-medium text-text">Critical Only</span>
                          <div
                            onClick={() =>
                              updatePreference('notifications', {
                                ...preferences.notifications,
                                criticalOnly: !preferences.notifications.criticalOnly,
                              })
                            }
                            className={`relative h-6 w-11 rounded-full transition-colors ${
                              preferences.notifications.criticalOnly
                                ? 'bg-[rgb(var(--accent))]'
                                : 'bg-card/20'
                            }`}
                          >
                            <div
                              className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-md transition-transform ${
                                preferences.notifications.criticalOnly
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </div>
                        </label>

                        <label className="focus-ring flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-card/5 p-4 transition-all hover:border-white/20 hover:bg-card/10">
                          <span className="text-sm font-medium text-text">Sound</span>
                          <div
                            onClick={() =>
                              updatePreference('notifications', {
                                ...preferences.notifications,
                                sound: !preferences.notifications.sound,
                              })
                            }
                            className={`relative h-6 w-11 rounded-full transition-colors ${
                              preferences.notifications.sound
                                ? 'bg-[rgb(var(--accent))]'
                                : 'bg-card/20'
                            }`}
                          >
                            <div
                              className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-md transition-transform ${
                                preferences.notifications.sound ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </div>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Intelligence Tab */}
            {activeTab === 'intelligence' && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-text">Smart Features</h3>
                  <div className="space-y-2">
                    {[
                      {
                        key: 'smartRecommendations',
                        label: 'Smart Recommendations',
                        description: 'Get personalized suggestions based on your usage',
                      },
                      {
                        key: 'predictiveInsights',
                        label: 'Predictive Insights',
                        description: 'See trends and predictions for agent performance',
                      },
                      {
                        key: 'autoActions',
                        label: 'Automatic Actions',
                        description: 'Allow system to take automatic corrective actions',
                      },
                    ].map((feature) => (
                      <label
                        key={feature.key}
                        className="focus-ring flex cursor-pointer items-start justify-between rounded-lg border border-white/10 bg-card/5 p-4 transition-all hover:border-white/20 hover:bg-card/10"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text">{feature.label}</p>
                          <p className="mt-1 text-xs text-text-muted">{feature.description}</p>
                        </div>
                        <div
                          onClick={() => togglePreference(feature.key as keyof typeof preferences)}
                          className={`relative ml-3 h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                            preferences[feature.key as keyof typeof preferences]
                              ? 'bg-[rgb(var(--accent))]'
                              : 'bg-card/20'
                          }`}
                        >
                          <div
                            className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-md transition-transform ${
                              preferences[feature.key as keyof typeof preferences]
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <div className="flex gap-3">
                    <Sparkles className="h-5 w-5 flex-shrink-0 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-text">AI-Powered Intelligence</p>
                      <p className="mt-1 text-xs text-text-muted">
                        These features use machine learning to provide personalized insights and
                        predictions. You can disable them at any time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 p-6">
            <button
              onClick={resetPreferences}
              className="btn-premium focus-ring flex items-center gap-2 rounded-lg border border-white/10 bg-card/5 px-4 py-2 text-sm font-medium text-text transition-all hover:border-white/20 hover:bg-card/10"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="btn-premium focus-ring rounded-lg bg-[rgb(var(--accent))] px-6 py-2 text-sm font-medium text-white shadow-lg transition-all hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
