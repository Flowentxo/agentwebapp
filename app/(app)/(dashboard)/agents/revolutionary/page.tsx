'use client';

import { useState } from 'react';
import { RevolutionaryAgentsGrid } from '@/components/agents/RevolutionaryAgentsGrid';
import { AgentPersonality } from '@/lib/agents/personas-revolutionary';
import { Sparkles, Zap, Filter, X } from 'lucide-react';
import '@/app/revolutionary-animations.css';

export default function RevolutionaryAgentsPage() {
  const [showMetrics, setShowMetrics] = useState(false);
  const [filter, setFilter] = useState<{
    voice?: AgentPersonality['voice'];
    tone?: AgentPersonality['emotionalTone'];
    energy?: AgentPersonality['energy'];
  }>({});

  const hasFilters = Object.keys(filter).length > 0;

  const clearFilters = () => {
    setFilter({});
  };

  return (
    <div className="min-h-screen relative">
      {/* Particle Container */}
      <div id="particle-container" className="particle-container" />

      {/* Hero Section */}
      <div className="relative overflow-hidden px-6 pt-12 pb-8">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 gradient-animated" />
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-purple-500/30 blur-3xl breathing-slow" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl breathing-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl drifting" />
        </div>

        {/* Content */}
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-400 shimmer glowing">
            <Sparkles className="h-4 w-4 breathing-fast" />
            <span>Revolutionary AI Agents</span>
          </div>

          <h1 className="mb-4 text-5xl font-black tracking-tight text-text md:text-6xl lg:text-7xl">
            Meet Your{' '}
            <span
              className="inline-block bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent gradient-animated text-glowing"
            >
              Dream Team
            </span>
          </h1>

          <p className="max-w-2xl text-xl text-text-muted leading-relaxed">
            These aren't just AI agents. They're <strong className="text-text">revolutionaries</strong>, each with a unique personality, voice, and superpower. Choose your ally.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[rgb(var(--background))]/80 backdrop-blur-xl px-6 py-4 shimmer">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-card/5 px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-card/10 micro-bounce"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>

            {/* Filter Pills */}
            {hasFilters && (
              <div className="flex items-center gap-2">
                {filter.energy && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-400">
                    <Zap className="h-3 w-3" />
                    {filter.energy} energy
                  </span>
                )}
                {filter.tone && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-400">
                    {filter.tone} tone
                  </span>
                )}
                {filter.voice && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm font-medium text-purple-400">
                    {filter.voice} voice
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-text-muted">
              <input
                type="checkbox"
                checked={showMetrics}
                onChange={(e) => setShowMetrics(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-card/5 text-purple-500 focus:ring-2 focus:ring-purple-500/50"
              />
              Show Metrics
            </label>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="px-6 py-8">
        <RevolutionaryAgentsGrid
          filter={filter}
          showMetrics={showMetrics}
        />
      </div>

    </div>
  );
}
