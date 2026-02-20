'use client';

import { useState } from 'react';
import { SentinelTabNav, type SentinelTab } from '@/components/agents/property-sentinel/SentinelTabNav';
import { SentinelDashboard } from '@/components/agents/property-sentinel/SentinelDashboard';
import { SentinelChat } from '@/components/agents/property-sentinel/SentinelChat';

export default function PropertySentinelDashboardPage() {
  const [activeTab, setActiveTab] = useState<SentinelTab>('dashboard');

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#030712' }}>
      <SentinelTabNav activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'dashboard' ? <SentinelDashboard /> : <SentinelChat />}
    </div>
  );
}
