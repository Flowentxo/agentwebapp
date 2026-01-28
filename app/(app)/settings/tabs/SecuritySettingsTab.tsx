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
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b-2 border-border mb-8">
        <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => scrollToSection('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'security'
                ? 'bg-muted text-foreground border border-border shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            Sicherheit & Login
          </button>
          <button
            onClick={() => scrollToSection('sessions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'sessions'
                ? 'bg-muted text-foreground border border-border shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Aktive Sitzungen
          </button>
           <button
            onClick={() => scrollToSection('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'audit'
                ? 'bg-muted text-foreground border border-border shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Audit Log
          </button>
        </div>
      </div>

      <div className="space-y-12 pb-24">
        {/* Section: Security */}
        <section id="security" className="scroll-mt-32">
          <div className="mb-6 px-4">
            <h2 className="text-xl font-bold text-foreground mb-2">Authentifizierung</h2>
            <p className="text-sm text-muted-foreground">Passwörter, 2FA und Sicherheitsoptionen.</p>
          </div>
          <SecurityTab
            profile={profile}
            onRefresh={onRefresh}
            autoStartMfaSetup={autoStartMfaSetup}
          />
        </section>

        <div className="h-px w-full bg-slate-200" />

        {/* Section: Sessions */}
        <section id="sessions" className="scroll-mt-32">
          <div className="mb-6 px-4">
            <h2 className="text-xl font-bold text-foreground mb-2">Geräte & Sitzungen</h2>
            <p className="text-sm text-muted-foreground">Verwalte deine aktiven Anmeldungen.</p>
          </div>
          <SessionsTab userId={profile.id} />
        </section>

         <div className="h-px w-full bg-slate-200" />

        {/* Section: Audit */}
        <section id="audit" className="scroll-mt-32">
           <div className="mb-6 px-4">
            <h2 className="text-xl font-bold text-foreground mb-2">Sicherheits-Protokoll</h2>
            <p className="text-sm text-muted-foreground">Historie aller sicherheitsrelevanten Aktionen.</p>
          </div>
          <AuditTab userId={profile.id} />
        </section>
      </div>
    </div>
  );
}
