'use client';

import { RevolutionaryDashboardHero } from '@/components/dashboard/RevolutionaryDashboardHero';
import { AgentActivityFeed } from '@/components/dashboard/AgentActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { AgentHealthMonitor } from '@/components/dashboard/AgentHealthMonitor';
import '@/app/revolutionary-animations.css';

export default function RevolutionaryDashboardPage() {
  return (
    <div className="min-h-screen relative">
      {/* Particle Container */}
      <div id="particle-container" className="particle-container" />

      {/* Ambient Background */}
      <div className="fixed inset-0 -z-20 opacity-20">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-purple-500/30 blur-3xl breathing-slow" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl breathing-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl drifting" />
      </div>

      {/* Main Content */}
      <div className="relative px-6 py-8 space-y-6">
        {/* Hero Section */}
        <div className="animate-fadeInUp">
          <RevolutionaryDashboardHero />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width on large screens */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              <QuickActions />
            </div>

            {/* Activity Feed */}
            <div className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              <AgentActivityFeed />
            </div>
          </div>

          {/* Right Column - 1/3 width on large screens */}
          <div className="space-y-6">
            {/* Agent Health Monitor */}
            <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              <AgentHealthMonitor />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
