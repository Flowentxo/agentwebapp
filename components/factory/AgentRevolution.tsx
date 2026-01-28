'use client';

/**
 * AGENT REVOLUTION - INSANELY GREAT EDITION
 *
 * "One prompt. Infinite productivity."
 *
 * Steve Jobs inspired UI/UX:
 * - Bold, uncompromising design
 * - Reduction to essence
 * - Microinteractions that delight
 * - Revolutionary experience
 */

import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  CheckCircle2,
  Zap,
  Code2,
  Cpu,
  Rocket,
  Star,
  MessageSquare,
  Settings,
  TrendingUp,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { TemplateGallery, AgentTemplate } from './TemplateGallery';
import { ROICalculator } from './ROICalculator';

interface CreationStage {
  stage: 'idle' | 'listening' | 'analyzing' | 'designing' | 'implementing' | 'deploying' | 'ready';
  progress: number;
  message: string;
  agentName?: string;
  factoryPhase?: 'creator' | 'coder' | 'deploy';
}

interface RecentAgent {
  id: string;
  name: string;
  createdAt: string;
  status: string;
}

const EXAMPLE_PROMPTS = [
  { text: 'Automate my weekly reports', icon: TrendingUp, color: '#06B6D4' },
  { text: 'Monitor inventory levels', icon: Clock, color: '#F97316' },
  { text: 'Analyze customer feedback', icon: MessageSquare, color: '#8B5CF6' },
  { text: 'Process invoices automatically', icon: Settings, color: '#EC4899' },
];

export function AgentRevolution() {
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<CreationStage>({
    stage: 'idle',
    progress: 0,
    message: '',
    factoryPhase: 'creator'
  });
  const [isListening, setIsListening] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<any>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [recentAgents, setRecentAgents] = useState<RecentAgent[]>([]);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showROICalculator, setShowROICalculator] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        setStage({ stage: 'idle', progress: 0, message: '', factoryPhase: 'creator' });
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setStage({ stage: 'idle', progress: 0, message: '', factoryPhase: 'creator' });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Rotating example prompts
  useEffect(() => {
    if (stage.stage === 'idle' && !input) {
      const interval = setInterval(() => {
        setCurrentExampleIndex((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [stage.stage, input]);

  // Timer for elapsed time
  useEffect(() => {
    if (stage.stage !== 'idle' && stage.stage !== 'ready') {
      if (!timerRef.current) {
        setStartTime(Date.now());
        timerRef.current = setInterval(() => {
          setElapsedTime(Math.floor((Date.now() - startTime) / 100) / 10);
        }, 100);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (stage.stage === 'idle') {
        setElapsedTime(0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [stage.stage, startTime]);

  // Update factory phase based on progress
  useEffect(() => {
    if (stage.progress < 40) {
      setStage(prev => ({ ...prev, factoryPhase: 'creator' }));
    } else if (stage.progress < 80) {
      setStage(prev => ({ ...prev, factoryPhase: 'coder' }));
    } else if (stage.progress < 100) {
      setStage(prev => ({ ...prev, factoryPhase: 'deploy' }));
    }
  }, [stage.progress]);

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setStage({ stage: 'idle', progress: 0, message: '', factoryPhase: 'creator' });
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setStage({ stage: 'listening', progress: 0, message: 'Listening...', factoryPhase: 'creator' });
    }
  };

  const handleCreate = async () => {
    if (!input.trim()) return;

    setStage({ stage: 'analyzing', progress: 10, message: 'CREATOR analyzing your vision...', factoryPhase: 'creator' });

    try {
      // Simulate progress with factory phases
      setTimeout(() => {
        setStage({ stage: 'designing', progress: 30, message: 'CREATOR designing blueprint...', factoryPhase: 'creator' });
      }, 1500);

      setTimeout(() => {
        setStage({ stage: 'implementing', progress: 50, message: 'CODER building intelligence...', factoryPhase: 'coder' });
      }, 3000);

      setTimeout(() => {
        setStage({ stage: 'implementing', progress: 70, message: 'CODER implementing logic...', factoryPhase: 'coder' });
      }, 5000);

      setTimeout(() => {
        setStage({ stage: 'deploying', progress: 90, message: 'Deploying your agent...', factoryPhase: 'deploy' });
      }, 7000);

      // Real API call - using the dual-purpose /revolution endpoint
      const response = await fetch('/api/revolution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user'
        },
        body: JSON.stringify({ request: input })
      });

      if (!response.ok) throw new Error('Creation failed');

      const result = await response.json();

      setCreatedAgent(result.agent);
      setStage({
        stage: 'ready',
        progress: 100,
        message: 'Ready to work!',
        agentName: result.agent.blueprint?.name || 'Your Agent',
        factoryPhase: 'deploy'
      });
      setShowRating(true);

      // Add to recent agents
      const newAgent: RecentAgent = {
        id: result.agent.id,
        name: result.agent.blueprint?.name || 'Agent',
        createdAt: new Date().toISOString(),
        status: 'active'
      };
      setRecentAgents(prev => [newAgent, ...prev.slice(0, 2)]);

    } catch (error: any) {
      setStage({ stage: 'idle', progress: 0, message: '', factoryPhase: 'creator' });
      alert(error.message);
    }
  };

  const handleReset = () => {
    setInput('');
    setStage({ stage: 'idle', progress: 0, message: '', factoryPhase: 'creator' });
    setCreatedAgent(null);
    setElapsedTime(0);
    setShowRating(false);
    setRating(0);
    inputRef.current?.focus();
  };

  const handleRating = (stars: number) => {
    setRating(stars);
    // In real app: Send rating to backend
    setTimeout(() => setShowRating(false), 1500);
  };

  // Handle template selection from gallery
  const handleTemplateSelect = (template: AgentTemplate) => {
    setInput(template.previewPrompt);
    setShowTemplateGallery(false);
    // Auto-focus on input after template selection
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const getStageColor = () => {
    switch (stage.stage) {
      case 'listening': return 'rgb(99, 102, 241)'; // Indigo (design system accent)
      case 'analyzing': return 'rgb(139, 92, 246)'; // Purple
      case 'designing': return 'rgb(236, 72, 153)'; // Pink
      case 'implementing': return 'rgb(249, 115, 22)'; // Orange
      case 'deploying': return 'rgb(34, 197, 94)'; // Green
      case 'ready': return 'rgb(99, 102, 241)'; // Indigo (primary accent)
      default: return 'rgb(99, 102, 241)'; // Indigo (design system primary)
    }
  };

  const getFactoryPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'creator': return Sparkles;
      case 'coder': return Code2;
      case 'deploy': return Rocket;
      default: return Cpu;
    }
  };

  // ============================================
  // AGENT READY VIEW (Success Screen)
  // ============================================

  if (stage.stage === 'ready' && createdAgent) {
    return (
      <div className="min-h-screen p-6 overflow-hidden relative bg-[rgb(var(--surface-0))]">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl breathing-slow" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl breathing-slow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Success Animation */}
          <div className="text-center mb-8 pt-6">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center animate-scale-in"
              style={{
                background: 'linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(34, 197, 94) 100%)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              }}
            >
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-text mb-6 animate-fade-in">
              Meet {stage.agentName}
            </h1>

            <p className="text-sm text-text-muted mb-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Created in {elapsedTime}s
            </p>

            <p className="text-sm text-text-muted animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Ready to transform your workflow
            </p>
          </div>

          {/* Agent Preview Card */}
          <div
            className="rounded-xl p-6 mb-6 glass border border-white/10 animate-slide-up shadow-lg"
          >
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(249, 115, 22) 100%)',
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                }}
              >
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-text mb-3">
                  Hi! I'm {stage.agentName}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  I'm your new AI assistant, built specifically for your needs. I'm ready to help you achieve more with less effort. What would you like me to do first?
                </p>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => window.location.href = '/agents/studio'}
                className="group p-4 rounded-lg bg-[rgb(var(--accent))]/10 hover:bg-[rgb(var(--accent))]/20 transition-all duration-300 text-left border border-[rgb(var(--accent))]/30 hover:border-[rgb(var(--accent))]/50 micro-lift"
              >
                <div className="text-sm font-semibold text-[rgb(var(--accent))] mb-2 group-hover:text-[rgb(var(--accent))] transition-colors flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Visual Builder
                </div>
                <div className="text-xs text-text-muted">Build agents with drag-and-drop</div>
              </button>
              <button className="group p-4 rounded-lg bg-card/5 hover:bg-card/10 transition-all duration-300 text-left border border-white/10 hover:border-white/20 micro-lift">
                <div className="text-sm font-semibold text-text mb-2 group-hover:text-text transition-colors flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Start Working
                </div>
                <div className="text-xs text-text-muted">Begin your first task immediately</div>
              </button>
              <button className="group p-4 rounded-lg bg-card/5 hover:bg-card/10 transition-all duration-300 text-left border border-white/10 hover:border-white/20 micro-lift">
                <div className="text-sm font-semibold text-text mb-2 group-hover:text-text transition-colors flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configure
                </div>
                <div className="text-xs text-text-muted">Customize agent behavior</div>
              </button>
            </div>
          </div>

          {/* Rating Section */}
          {showRating && (
            <div className="text-center mb-8 animate-fade-in">
              <p className="text-text-muted mb-4">How was your experience?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((stars) => (
                  <button
                    key={stars}
                    onClick={() => handleRating(stars)}
                    className="transition-transform hover:scale-110 micro-bounce"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        stars <= rating
                          ? 'fill-[rgb(var(--accent))] text-[rgb(var(--accent))]'
                          : 'text-text-muted/50 hover:text-[rgb(var(--accent))]'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-lg text-text text-sm font-medium transition-all duration-300 bg-card/5 border border-white/10 hover:bg-card/10 micro-lift"
            >
              Create Another Agent
            </button>
            <button
              className="px-6 py-2.5 rounded-lg text-white text-sm font-medium transition-all duration-300 hover:opacity-90 micro-lift"
              style={{
                background: 'linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(249, 115, 22) 100%)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
              }}
            >
              Go to Dashboard →
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes scale-in {
            from {
              transform: scale(0);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slide-up {
            from {
              opacity: 0;
              transform: translateY(40px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-scale-in {
            animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .animate-fade-in {
            animation: fade-in 0.8s ease-out forwards;
            opacity: 0;
          }
          .animate-slide-up {
            animation: slide-up 0.8s ease-out 0.3s forwards;
            opacity: 0;
          }
        `}</style>
      </div>
    );
  }

  // ============================================
  // MAIN CREATION VIEW
  // ============================================

  return (
    <div className="min-h-screen p-6 overflow-hidden relative bg-[rgb(var(--surface-0))]">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl breathing-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl breathing-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl breathing-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8 pt-6">
          {/* Logo with Factory Phase Indicator */}
          <div className="inline-flex items-center justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500"
              style={{
                background: `linear-gradient(135deg, ${getStageColor()} 0%, ${getStageColor()}CC 100%)`,
                boxShadow: `0 8px 24px ${getStageColor()}40`,
              }}
            >
              {stage.stage === 'idle' || stage.stage === 'listening' ? (
                <Sparkles className="h-8 w-8 text-white" />
              ) : stage.stage === 'ready' ? (
                <CheckCircle2 className="h-8 w-8 text-white" />
              ) : (
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              )}
            </div>
          </div>

          {/* Main Headlines */}
          {stage.stage === 'idle' ? (
            <>
              <h1 className="text-3xl font-bold text-text mb-4 tracking-tight">
                Create your perfect AI Agent
              </h1>
              <p className="text-sm text-text-muted">
                One prompt. Infinite productivity.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-text mb-4">
                {stage.message}
              </h2>
              <p className="text-sm text-text-muted">
                {elapsedTime > 0 && `${elapsedTime}s`}
                {elapsedTime > 8 && ' • Almost there...'}
              </p>

              {/* Factory Process Indicator */}
              <div className="flex justify-center gap-4 mt-6">
                {['creator', 'coder', 'deploy'].map((phase) => {
                  const Icon = getFactoryPhaseIcon(phase);
                  const isActive = stage.factoryPhase === phase;
                  const isPast =
                    (phase === 'creator' && ['coder', 'deploy'].includes(stage.factoryPhase || '')) ||
                    (phase === 'coder' && stage.factoryPhase === 'deploy');

                  return (
                    <div
                      key={phase}
                      className={`flex flex-col items-center transition-all duration-500 ${
                        isActive ? 'scale-105' : 'scale-100'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-1.5 transition-all duration-500 ${
                          isActive ? 'animate-pulse' : ''
                        }`}
                        style={{
                          background: isPast || isActive
                            ? `linear-gradient(135deg, ${getStageColor()} 0%, ${getStageColor()}CC 100%)`
                            : 'rgba(255, 255, 255, 0.05)',
                          border: isActive ? `2px solid ${getStageColor()}` : '2px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: isActive ? `0 4px 16px ${getStageColor()}60` : 'none',
                        }}
                      >
                        <Icon className={`h-5 w-5 ${isPast || isActive ? 'text-white' : 'text-text-muted/50'}`} />
                      </div>
                      <span className={`text-xs font-medium uppercase tracking-wider ${
                        isActive ? 'text-text' : isPast ? 'text-text-muted' : 'text-text-muted/50'
                      }`}>
                        {phase}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Main Input Area */}
        <div className="max-w-4xl mx-auto mb-8">
          <div
            className="rounded-xl overflow-hidden transition-all duration-500 relative glass border border-white/10"
            style={{
              borderColor: stage.stage !== 'idle' ? getStageColor() : undefined,
              boxShadow: stage.stage !== 'idle'
                ? `0 8px 24px ${getStageColor()}30`
                : undefined,
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleCreate();
                }
              }}
              placeholder={stage.stage === 'idle' ? 'Describe what you need...' : ''}
              disabled={stage.stage !== 'idle' && stage.stage !== 'listening'}
              className="w-full bg-transparent text-text placeholder-text-muted/50 outline-none resize-none p-6 text-base font-normal"
              rows={4}
              style={{
                lineHeight: 1.5
              }}
            />

            {/* Progress Bar */}
            {stage.stage !== 'idle' && (
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/50">
                <div
                  className="h-full transition-all duration-500 relative overflow-hidden"
                  style={{
                    width: `${stage.progress}%`,
                    background: `linear-gradient(90deg, ${getStageColor()} 0%, ${getStageColor()}CC 100%)`,
                  }}
                >
                  <div className="absolute inset-0 animate-shimmer" style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {/* Voice Button */}
            <button
              onClick={handleVoiceToggle}
              disabled={stage.stage !== 'idle' && stage.stage !== 'listening'}
              className="group relative"
            >
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  isListening ? 'scale-110' : 'hover:scale-105'
                }`}
                style={{
                  background: isListening
                    ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  boxShadow: isListening ? '0 8px 32px rgba(239, 68, 68, 0.5)' : 'none',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {isListening ? (
                  <MicOff className="h-5 w-5 text-white animate-pulse" />
                ) : (
                  <Mic className="h-5 w-5 text-text-muted group-hover:text-white transition-colors" />
                )}
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-text-muted">
                {isListening ? 'Stop' : 'Speak'}
              </div>
            </button>

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={!input.trim() || (stage.stage !== 'idle' && stage.stage !== 'listening')}
              className="group relative"
            >
              <div
                className={`px-8 py-3 rounded-lg font-semibold text-sm text-white transition-all duration-300 micro-lift ${
                  input.trim() && (stage.stage === 'idle' || stage.stage === 'listening')
                    ? 'cursor-pointer'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                style={{
                  background:
                    input.trim() && (stage.stage === 'idle' || stage.stage === 'listening')
                      ? 'linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(249, 115, 22) 100%)'
                      : 'rgba(255, 255, 255, 0.1)',
                  boxShadow:
                    input.trim() && (stage.stage === 'idle' || stage.stage === 'listening')
                      ? '0 8px 32px rgba(99, 102, 241, 0.5)'
                      : 'none',
                }}
              >
                {stage.stage !== 'idle' && stage.stage !== 'listening' ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </div>
                ) : (
                  'Create Agent'
                )}
              </div>
              {input.trim() && (stage.stage === 'idle' || stage.stage === 'listening') && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-text-muted">
                  ⌘ + Enter
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Template Gallery Button */}
        {stage.stage === 'idle' && (
          <div className="text-center mb-8 animate-fade-in">
            <button
              onClick={() => setShowTemplateGallery(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.15)'
              }}
            >
              <LayoutGrid className="h-4 w-4 text-purple-400" />
              <span className="text-purple-300">Template-Galerie durchsuchen</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
                8 Templates
              </span>
            </button>
          </div>
        )}

        {/* Quick Actions Panel - Rotating Examples */}
        {stage.stage === 'idle' && !input && (
          <div className="text-center animate-fade-in">
            <p className="text-text-muted text-sm mb-4 font-medium">Quick start ideas</p>
            <div className="flex flex-wrap justify-center gap-3">
              {EXAMPLE_PROMPTS.map((prompt, index) => {
                const Icon = prompt.icon;
                const isActive = index === currentExampleIndex;
                return (
                  <button
                    key={index}
                    onClick={() => setInput(prompt.text)}
                    className={`group px-4 py-2 rounded-lg text-sm transition-all duration-500 flex items-center gap-2 micro-lift ${
                      isActive ? 'scale-105' : ''
                    }`}
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${prompt.color}20 0%, ${prompt.color}10 100%)`
                        : 'rgba(255, 255, 255, 0.03)',
                      border: `2px solid ${isActive ? `${prompt.color}50` : 'rgba(255, 255, 255, 0.1)'}`,
                      boxShadow: isActive ? `0 8px 32px ${prompt.color}20` : 'none',
                    }}
                  >
                    <Icon
                      className="h-4 w-4 transition-colors"
                      style={{ color: isActive ? prompt.color : 'rgb(var(--text-muted))' }}
                    />
                    <span
                      className="font-normal transition-colors"
                      style={{ color: isActive ? prompt.color : 'rgb(var(--text-muted))' }}
                    >
                      {prompt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Agents Section */}
        {stage.stage === 'idle' && recentAgents.length > 0 && (
          <div className="mt-20 animate-fade-in">
            <h3 className="text-lg font-semibold text-text mb-4 text-center">Recent Agents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {recentAgents.map((agent, index) => (
                <div
                  key={agent.id}
                  className="p-4 rounded-lg glass border border-white/10 hover:border-[rgb(var(--accent))]/50 transition-all duration-300 cursor-pointer group micro-lift"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(249, 115, 22) 100%)',
                      }}
                    >
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-text font-semibold truncate group-hover:text-[rgb(var(--accent))] transition-colors">
                        {agent.name}
                      </div>
                      <div className="text-xs text-text-muted">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-text-muted">{agent.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ROI Calculator Sidebar */}
      {stage.stage === 'idle' && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 w-72 z-40 hidden xl:block animate-fade-in">
          <ROICalculator
            variant="sidebar"
            isExpanded={showROICalculator}
            onToggle={() => setShowROICalculator(!showROICalculator)}
          />
        </div>
      )}

      {/* Template Gallery Modal */}
      <TemplateGallery
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onSelectTemplate={handleTemplateSelect}
      />

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
