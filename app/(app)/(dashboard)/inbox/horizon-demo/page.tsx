'use client';

/**
 * Flowent Horizon UI - Demo Page
 * Test and showcase all Horizon components
 *
 * Access at: /inbox/horizon-demo
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Volume2, VolumeX, Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Import Horizon components
import { HorizonComposer } from '@/components/horizon/HorizonComposer';
import { VoiceModeOverlay } from '@/components/horizon/VoiceModeOverlay';
import { IntelligenceDashboard } from '@/components/horizon/IntelligenceDashboard';
import { FluidOrbWrapper, type OrbState } from '@/components/horizon/visualizer/FluidOrbWrapper';

// ============================================================================
// DEMO PAGE
// ============================================================================

export default function HorizonDemoPage() {
  const [isVoiceModeOpen, setVoiceModeOpen] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [frequency, setFrequency] = useState(0);

  // Handle message send
  const handleSend = useCallback((content: string) => {
    setMessages((prev) => [...prev, content]);
    console.log('[HorizonDemo] Message sent:', content);
  }, []);

  // Handle voice mode
  const handleVoiceModeStart = useCallback(() => {
    setVoiceModeOpen(true);
  }, []);

  // Handle start conversation from dashboard
  const handleStartConversation = useCallback((prompt: string) => {
    setMessages((prev) => [...prev, prompt]);
    console.log('[HorizonDemo] Started conversation with prompt:', prompt);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-card/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/inbox"
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                Horizon UI Demo
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Bio-Digital Interface Components
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-medium rounded-full">
              v1.0.0
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Section 1: FluidOrb Visualizer */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            1. FluidOrb Visualizer
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            WebGL-based fluid sphere with GLSL shaders. Reacts to audio amplitude and frequency.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Orb Display */}
            <div className="flex items-center justify-center p-8 bg-card rounded-2xl">
              <div className="relative">
                <div className={cn('horizon-orb-glow', orbState)} />
                <FluidOrbWrapper
                  amplitude={amplitude}
                  frequency={frequency}
                  state={orbState}
                  size="lg"
                  showParticles
                />
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              {/* State Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Orb State
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['idle', 'listening', 'thinking', 'speaking'] as OrbState[]).map((state) => (
                    <button
                      key={state}
                      onClick={() => setOrbState(state)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        orbState === state
                          ? 'bg-violet-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                      )}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amplitude Slider */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Amplitude: {(amplitude * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={amplitude * 100}
                  onChange={(e) => setAmplitude(Number(e.target.value) / 100)}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Frequency Slider */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Frequency: {(frequency * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={frequency * 100}
                  onChange={(e) => setFrequency(Number(e.target.value) / 100)}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Intelligence Dashboard */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            2. Intelligence Dashboard
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Zero-state view with contextual business chips and quick actions.
          </p>

          <div className="border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-card">
            <IntelligenceDashboard
              pendingApprovals={3}
              unreadMessages={7}
              onStartConversation={handleStartConversation}
              onViewApprovals={() => console.log('View approvals')}
            />
          </div>
        </section>

        {/* Section 3: Messages Log */}
        {messages.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              3. Messages Log
            </h2>
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className="px-4 py-2 bg-white dark:bg-card rounded-lg text-sm text-slate-700 dark:text-slate-300"
                >
                  {msg}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Floating Composer */}
      <HorizonComposer
        onSend={handleSend}
        onVoiceModeStart={handleVoiceModeStart}
        agentName="Flowent AI"
        showVoiceButton
        showPromptStarters
      />

      {/* Voice Mode Overlay */}
      <VoiceModeOverlay
        isOpen={isVoiceModeOpen}
        onClose={() => setVoiceModeOpen(false)}
        agentName="Flowent AI"
      />
    </div>
  );
}
