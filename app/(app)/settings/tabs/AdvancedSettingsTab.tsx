'use client';

import { useState } from 'react';
import { Key, Server } from 'lucide-react';
import SystemTab from './SystemTab';
import ApiKeysTab from './ApiKeysTab';

export default function AdvancedSettingsTab() {
  const [activeSection, setActiveSection] = useState('system');

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Internal Sub-Navigation */}
      <div className="mb-6">
        <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSection('system')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'system'
                ? 'bg-[var(--vicy-accent-glow)] text-[var(--vicy-text-primary)] border border-[var(--vicy-accent-20)]'
                : 'text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] hover:bg-[var(--vicy-surface-hover)]'
            }`}
          >
            <Server className="w-4 h-4" />
            System Status
          </button>
          <button
            onClick={() => setActiveSection('apikeys')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeSection === 'apikeys'
                ? 'bg-[var(--vicy-accent-glow)] text-[var(--vicy-text-primary)] border border-[var(--vicy-accent-20)]'
                : 'text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] hover:bg-[var(--vicy-surface-hover)]'
            }`}
          >
            <Key className="w-4 h-4" />
            API Schlüssel
          </button>
        </div>
      </div>

      <div className="pb-24">
        {activeSection === 'system' && (
          <div>
            <div className="mb-6 px-4">
              <h2 className="text-xl font-bold text-[var(--vicy-text-primary)] mb-2">System Status</h2>
              <p className="text-sm text-[var(--vicy-text-secondary)]">Überwache Systemgesundheit und Metriken.</p>
            </div>
            <SystemTab />
          </div>
        )}

        {activeSection === 'apikeys' && (
          <div>
            <div className="mb-6 px-4">
              <h2 className="text-xl font-bold text-[var(--vicy-text-primary)] mb-2">API Zugriff</h2>
              <p className="text-sm text-[var(--vicy-text-secondary)]">Verwalte Schlüssel für den programmatischen Zugriff.</p>
            </div>
            <ApiKeysTab />
          </div>
        )}
      </div>
    </div>
  );
}
