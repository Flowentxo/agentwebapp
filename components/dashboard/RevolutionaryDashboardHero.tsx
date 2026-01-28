'use client';

import { useState, useEffect } from 'react';
import { REVOLUTIONARY_PERSONAS } from '@/lib/agents/personas-revolutionary';
import { RevolutionaryAvatar } from '@/components/agents/RevolutionaryAvatar';
import { useSoundEffects } from '@/lib/agents/sound-engine';
import { Sparkles, Zap, Users, Activity, ChevronRight } from 'lucide-react';

export function RevolutionaryDashboardHero() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAgents, setActiveAgents] = useState(4);
  const [totalTasks, setTotalTasks] = useState(0);
  const sound = useSoundEffects();

  const agents = Object.values(REVOLUTIONARY_PERSONAS).slice(0, 12);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate task count increasing
  useEffect(() => {
    const timer = setInterval(() => {
      setTotalTasks(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 p-8 backdrop-blur-xl">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-purple-500/30 blur-3xl breathing-slow" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl breathing-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl drifting" />
      </div>

      <div className="relative">
        {/* Greeting & Time */}
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1 text-sm font-medium text-purple-400 shimmer">
            <Activity className="h-3 w-3 breathing-fast" />
            <span>System Online</span>
          </div>

          <h1 className="mb-2 text-5xl font-black tracking-tight text-text md:text-6xl">
            {getGreeting()}{' '}
            <span className="inline-block bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent gradient-animated text-glowing">
              Commander
            </span>
          </h1>

          <p className="text-lg text-text-muted">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            {' • '}
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Active Agents */}
          <div className="group rounded-2xl border border-white/10 bg-card/5 p-4 backdrop-blur-xl transition-all duration-300 hover:bg-card/10 micro-lift">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 breathing-fast">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text">{activeAgents}</div>
                <div className="text-xs text-text-muted">Active Agents</div>
              </div>
            </div>
            <div className="h-1 rounded-full bg-card/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000"
                style={{ width: `${(activeAgents / 12) * 100}%` }}
              />
            </div>
          </div>

          {/* Tasks Completed */}
          <div className="group rounded-2xl border border-white/10 bg-card/5 p-4 backdrop-blur-xl transition-all duration-300 hover:bg-card/10 micro-lift">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 breathing-fast" style={{ animationDelay: '0.5s' }}>
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text">{totalTasks}</div>
                <div className="text-xs text-text-muted">Tasks Today</div>
              </div>
            </div>
            <div className="h-1 rounded-full bg-card/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000"
                style={{ width: `${Math.min((totalTasks / 100) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* System Health */}
          <div className="group rounded-2xl border border-white/10 bg-card/5 p-4 backdrop-blur-xl transition-all duration-300 hover:bg-card/10 micro-lift">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 breathing-fast" style={{ animationDelay: '1s' }}>
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text">98%</div>
                <div className="text-xs text-text-muted">Health Score</div>
              </div>
            </div>
            <div className="h-1 rounded-full bg-card/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                style={{ width: '98%' }}
              />
            </div>
          </div>
        </div>

        {/* Agent Grid Preview */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-muted">
              Your AI Team
            </h3>
            <div className="flex -space-x-4">
              {agents.slice(0, 8).map((agent, index) => (
                <div
                  key={agent.id}
                  className="breathing-fast cursor-pointer transition-transform hover:scale-110 hover:z-10"
                  style={{
                    zIndex: agents.length - index,
                    animationDelay: `${index * 0.1}s`
                  }}
                  onClick={() => sound.playAgentSound(agent.id, 'select')}
                >
                  <RevolutionaryAvatar
                    personality={agent}
                    size="md"
                    animated={true}
                    showGlow={false}
                  />
                </div>
              ))}
              {agents.length > 8 && (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 bg-card/10 text-xs font-bold text-text backdrop-blur-xl breathing-fast" style={{ animationDelay: '0.8s' }}>
                  +{agents.length - 8}
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              sound.playClick();
              window.location.href = '/agents/revolutionary';
            }}
            className="group flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-6 py-3 text-sm font-bold text-purple-400 transition-all duration-300 hover:bg-purple-500/20 hover:scale-105 micro-bounce"
          >
            <Sparkles className="h-4 w-4" />
            <span>View All Agents</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
