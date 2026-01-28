/**
 * SINTRA Settings Client - Modern Enterprise Layout
 * Uses Top Navigation Strategy
 */

'use client';

import { useProfile } from '@/hooks/useProfile';
import type { ProfileResponse } from '@/lib/profile/schemas';
import SettingsLayout, { type NavigationOptions } from '@/components/settings/SettingsLayout';

// Consolidated Tab components
import GeneralSettingsTab from './tabs/GeneralSettingsTab';
import SecuritySettingsTab from './tabs/SecuritySettingsTab';
import WorkspaceSettingsTab from './tabs/WorkspaceSettingsTab';
import AdvancedSettingsTab from './tabs/AdvancedSettingsTab';

interface SettingsClientProps {
  initial: ProfileResponse;
}

export default function SettingsClient({ initial }: SettingsClientProps) {
  const { data, loading, error, refresh, update } = useProfile(initial);

  if (error && !data) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-400">
              Fehler beim Laden
            </h2>
          </div>
          <p className="text-red-300/80 text-sm mb-4">{error.message}</p>
          <button
            onClick={refresh}
            className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium transition-colors ring-1 ring-red-500/30"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-border border-t-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Profil wird geladen...</p>
        </div>
      </div>
    );
  }

  const renderTabContent = (
    activeTab: string,
    onNavigateToTab: (tab: string, options?: NavigationOptions) => void,
    navigationOptions: NavigationOptions | null,
    clearNavigationOptions: () => void
  ) => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettingsTab 
            profile={data} 
            onRefresh={refresh} 
            onNavigateToTab={onNavigateToTab}
            onUpdate={update}
            loading={loading}
          />
        );
      case 'security':
        return (
          <SecuritySettingsTab 
            profile={data} 
            onRefresh={refresh}
            autoStartMfaSetup={navigationOptions?.autoStartMfaSetup}
          />
        );
      case 'workspace':
        return <WorkspaceSettingsTab />;
      case 'advanced':
        return <AdvancedSettingsTab />;
      default:
        // Default to General if unknown tab
        return (
          <GeneralSettingsTab 
            profile={data} 
            onRefresh={refresh} 
            onNavigateToTab={onNavigateToTab}
            onUpdate={update}
            loading={loading}
          />
        );
    }
  };

  return (
    <SettingsLayout profile={data}>
      {renderTabContent}
    </SettingsLayout>
  );
}
