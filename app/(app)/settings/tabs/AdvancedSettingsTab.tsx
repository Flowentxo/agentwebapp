'use client';

import { useState } from 'react';
import { Terminal, Key, Server } from 'lucide-react';
import SystemTab from './SystemTab';
import ApiKeysTab from './ApiKeysTab';

export default function AdvancedSettingsTab() {
  const [activeSection, setActiveSection] = useState('system');

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
            onClick={() => scrollToSection('system')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'system' 
                ? 'bg-card/[0.08] text-white' 
                : 'text-white/50 hover:text-white hover:bg-card/[0.04]'
            }`}
          >
            <Server className="w-4 h-4" />
            System Status
          </button>
          <button
            onClick={() => scrollToSection('apikeys')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'apikeys' 
                ? 'bg-card/[0.08] text-white' 
                : 'text-white/50 hover:text-white hover:bg-card/[0.04]'
            }`}
          >
            <Key className="w-4 h-4" />
            API Schlüssel
          </button>
        </div>
      </div>

      <div className="space-y-12 pb-24">
        {/* Section: System */}
        <section id="system" className="scroll-mt-32">
          <div className="mb-6 px-4">
            <h2 className="text-xl font-bold text-white mb-2">System Status</h2>
            <p className="text-sm text-white/50">Überwache Systemgesundheit und Metriken.</p>
          </div>
          <SystemTab />
        </section>

        <div className="h-px w-full bg-card/[0.06]" />

        {/* Section: API Keys */}
        <section id="apikeys" className="scroll-mt-32">
          <div className="mb-6 px-4">
            <h2 className="text-xl font-bold text-white mb-2">API Zugriff</h2>
            <p className="text-sm text-white/50">Verwalte Schlüssel für den programmatischen Zugriff.</p>
          </div>
          <ApiKeysTab />
        </section>
      </div>
    </div>
  );
}
