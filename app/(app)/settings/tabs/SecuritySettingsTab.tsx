'use client';

import { useState } from 'react';
import type { ProfileResponse } from '@/lib/profile/schemas';
import SecurityTab from './SecurityTab';
import SessionsTab from './SessionsTab';
import AuditTab from './AuditTab';
import { Shield, Smartphone, Activity } from 'lucide-react';

interface SecuritySettingsTabProps {
  profile: ProfileResponse;
  onRefresh: () => Promise<void>;
  autoStartMfaSetup?: boolean;
}

export default function SecuritySettingsTab({
  profile,
  onRefresh,
  autoStartMfaSetup
}: SecuritySettingsTabProps) {
  const [activeSection, setActiveSection] = useState('security');

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Internal Sub-Navigation */}
      <div className="mb-6">
        <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSection('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'security'
                ? 'bg-[var(--vicy-accent-glow)] text-[var(--vicy-text-primary)] border border-[var(--vicy-accent-20)]'
                : 'text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] hover:bg-[var(--vicy-surface-hover)]'
            }`}
          >
            <Shield className="w-4 h-4" />
            Sicherheit & Login
          </button>
          <button
            onClick={() => setActiveSection('sessions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'sessions'
                ? 'bg-[var(--vicy-accent-glow)] text-[var(--vicy-text-primary)] border border-[var(--vicy-accent-20)]'
                : 'text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] hover:bg-[var(--vicy-surface-hover)]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Aktive Sitzungen
          </button>
          <button
            onClick={() => setActiveSection('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'audit'
                ? 'bg-[var(--vicy-accent-glow)] text-[var(--vicy-text-primary)] border border-[var(--vicy-accent-20)]'
                : 'text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] hover:bg-[var(--vicy-surface-hover)]'
            }`}
          >
            <Activity className="w-4 h-4" />
            Audit Log
          </button>
        </div>
      </div>

      <div className="pb-24">
        {activeSection === 'security' && (
          <div>
            <div className="mb-6 px-4">
              <h2 className="text-xl font-bold text-[var(--vicy-text-primary)] mb-2">Authentifizierung</h2>
              <p className="text-sm text-[var(--vicy-text-secondary)]">Passwörter, 2FA und Sicherheitsoptionen.</p>
            </div>
            <SecurityTab
              profile={profile}
              onRefresh={onRefresh}
              autoStartMfaSetup={autoStartMfaSetup}
            />
          </div>
        )}

        {activeSection === 'sessions' && (
          <div>
            <div className="mb-6 px-4">
              <h2 className="text-xl font-bold text-[var(--vicy-text-primary)] mb-2">Geräte & Sitzungen</h2>
              <p className="text-sm text-[var(--vicy-text-secondary)]">Verwalte deine aktiven Anmeldungen.</p>
            </div>
            <SessionsTab userId={profile.id} />
          </div>
        )}

        {activeSection === 'audit' && (
          <div>
            <div className="mb-6 px-4">
              <h2 className="text-xl font-bold text-[var(--vicy-text-primary)] mb-2">Sicherheits-Protokoll</h2>
              <p className="text-sm text-[var(--vicy-text-secondary)]">Historie aller sicherheitsrelevanten Aktionen.</p>
            </div>
            <AuditTab userId={profile.id} />
          </div>
        )}
      </div>
    </div>
  );
}
