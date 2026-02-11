'use client';

import { useState } from 'react';
import { Building2, Users } from 'lucide-react';
import WorkspacesTab from './WorkspacesTab';
import OrganizationTab from './OrganizationTab';

export default function WorkspaceSettingsTab() {
  const [activeSection, setActiveSection] = useState('workspaces');

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Internal Sub-Navigation */}
      <div className="mb-6">
        <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSection('workspaces')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'workspaces'
                ? 'bg-[var(--vicy-accent-glow)] text-[var(--vicy-text-primary)] border border-[var(--vicy-accent-20)]'
                : 'text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] hover:bg-[var(--vicy-surface-hover)]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Meine Workspaces
          </button>
          <button
            onClick={() => setActiveSection('organization')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'organization'
                ? 'bg-[var(--vicy-accent-glow)] text-[var(--vicy-text-primary)] border border-[var(--vicy-accent-20)]'
                : 'text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] hover:bg-[var(--vicy-surface-hover)]'
            }`}
          >
            <Users className="w-4 h-4" />
            Organisation & Team
          </button>
        </div>
      </div>

      <div className="pb-24">
        {activeSection === 'workspaces' && (
          <div>
            <div className="mb-6 px-4">
              <h2 className="text-xl font-bold text-[var(--vicy-text-primary)] mb-2">Workspaces verwalten</h2>
              <p className="text-sm text-[var(--vicy-text-secondary)]">Erstelle und verwalte deine Arbeitsumgebungen.</p>
            </div>
            <WorkspacesTab />
          </div>
        )}

        {activeSection === 'organization' && (
          <div>
            <div className="mb-6 px-4">
              <h2 className="text-xl font-bold text-[var(--vicy-text-primary)] mb-2">Organisation</h2>
              <p className="text-sm text-[var(--vicy-text-secondary)]">Verwalte Team-Mitglieder und Rollen.</p>
            </div>
            <OrganizationTab />
          </div>
        )}
      </div>
    </div>
  );
}
