'use client';

import { useState } from 'react';
import { Building2, Users } from 'lucide-react';
import WorkspacesTab from './WorkspacesTab';
import OrganizationTab from './OrganizationTab';

interface WorkspaceSettingsTabProps {
  // Add props if needed, likely empty for now as WorkspacesTab uses context
}

export default function WorkspaceSettingsTab() {
  const [activeSection, setActiveSection] = useState('workspaces');

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Internal Sub-Navigation */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 mb-8">
        <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => scrollToSection('workspaces')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'workspaces' 
                ? 'bg-card/[0.08] text-white' 
                : 'text-white/50 hover:text-white hover:bg-card/[0.04]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Meine Workspaces
          </button>
          <button
            onClick={() => scrollToSection('organization')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'organization' 
                ? 'bg-card/[0.08] text-white' 
                : 'text-white/50 hover:text-white hover:bg-card/[0.04]'
            }`}
          >
            <Users className="w-4 h-4" />
            Organisation & Team
          </button>
        </div>
      </div>

      <div className="space-y-12 pb-24">
        {/* Section: Workspaces */}
        <section id="workspaces" className="scroll-mt-32">
          <div className="mb-6 px-4">
            <h2 className="text-xl font-bold text-white mb-2">Workspaces verwalten</h2>
            <p className="text-sm text-white/50">Erstelle und verwalte deine Arbeitsumgebungen.</p>
          </div>
          <WorkspacesTab />
        </section>

        <div className="h-px w-full bg-card/[0.06]" />

        {/* Section: Organization */}
        <section id="organization" className="scroll-mt-32">
          <div className="mb-6 px-4">
            <h2 className="text-xl font-bold text-white mb-2">Organisation</h2>
            <p className="text-sm text-white/50">Verwalte Team-Mitglieder und Rollen.</p>
          </div>
          <OrganizationTab />
        </section>
      </div>
    </div>
  );
}
