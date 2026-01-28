'use client';

/**
 * INTELLIGENT AGENT CREATOR - PRODUCTION EDITION
 * 
 * Advanced AI agent creation interface with:
 * - Intelligent request analysis
 * - Real-time complexity detection
 * - Context-aware agent generation
 * - Comprehensive error handling
 * - Rate limiting feedback
 * - Progress tracking with ETA
 * - Multi-modal input (voice + text)
 * - Agent preview and customization
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
  Shield,
  AlertCircle,
  Info,
  Target,
  Brain,
  Network,
  BarChart3,
  Users,
  Workflow,
  Lightbulb,
  RefreshCw,
  Download,
  Share,
  Heart
} from 'lucide-react';

interface CreationStage {
  stage: 'idle' | 'analyzing' | 'designing' | 'implementing' | 'deploying' | 'ready' | 'error';
  progress: number;
  message: string;
  agentName?: string;
  factoryPhase?: 'creator' | 'coder' | 'deploy';
  estimatedTime?: number;
  complexity?: 'simple' | 'moderate' | 'complex';
  domains?: string[];
}

interface RequestAnalysis {
  complexity: 'simple' | 'moderate' | 'complex';
  domains: string[];
  suggestedCapabilities: string[];
  estimatedProcessingTime: number;
}

interface AgentCreationResponse {
  success: boolean;
  agent?: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    blueprint: {
      name: string;
      title: string;
      description: string;
      purpose: string;
      skills: string[];
      integrations: string[];
      personality: any;
      reasoningStyle: string;
    };
    metadata: {
      processingTime: number;
      userId: string;
      requestComplexity: 'simple' | 'moderate' | 'complex';
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface UserPreferences {
  personality: 'professional' | 'friendly' | 'technical' | 'creative';
  learningMode: 'static' | 'adaptive' | 'evolutionary';
  collaborationStyle: 'independent' | 'team-oriented' | 'hybrid';
}

interface RequestContext {
  currentWorkflow: string;
  existingIntegrations: string[];
  industry: string;
}

const COMPLEXITY_CONFIG = {
  simple: { color: '#10B981', icon: Lightbulb, timeMultiplier: 1 },
  moderate: { color: '#F59E0B', icon: Target, timeMultiplier: 1.5 },
  complex: { color: '#EF4444', icon: Brain, timeMultiplier: 2 }
};

const DOMAIN_ICONS = {
  crm: Users,
  data: BarChart3,
  communication: MessageSquare,
  automation: Workflow,
  technical: Code2
};

export function IntelligentAgentCreator() {
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<CreationStage>({
    stage: 'idle',
    progress: 0,
    message: '',
    factoryPhase: 'creator'
  });
  const [isListening, setIsListening] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<AgentCreationResponse['agent'] | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [requestAnalysis, setRequestAnalysis] = useState<RequestAnalysis | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    personality: 'professional',
    learningMode: 'adaptive',
    collaborationStyle: 'hybrid'
  });
  const [requestContext, setRequestContext] = useState<RequestContext>({
    currentWorkflow: '',
    existingIntegrations: [],
    industry: ''
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        analyzeRequest(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setError('Voice recognition failed. Please try again.');
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
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);

  // Real-time request analysis
  const analyzeRequest = (text: string) => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    if (text.trim().length < 5) {
      setRequestAnalysis(null);
      return;
    }

    analysisTimeoutRef.current = setTimeout(() => {
      const analysis = performRequestAnalysis(text);
      setRequestAnalysis(analysis);
    }, 500);
  };

  const performRequestAnalysis = (text: string): RequestAnalysis => {
    const lowerText = text.toLowerCase();
    
    // Complexity detection
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (lowerText.includes('integrate') || lowerText.includes('orchestrate') || 
        lowerText.includes('enterprise') || lowerText.includes('scalable')) {
      complexity = 'complex';
    } else if (lowerText.includes('analyze') || lowerText.includes('manage') || 
               lowerText.includes('automate') || lowerText.includes('workflow')) {
      complexity = 'moderate';
    }

    // Domain detection
    const domains = [];
    if (lowerText.includes('customer') || lowerText.includes('sales') || lowerText.includes('crm')) domains.push('crm');
    if (lowerText.includes('data') || lowerText.includes('report') || lowerText.includes('analytics')) domains.push('data');
    if (lowerText.includes('email') || lowerText.includes('message') || lowerText.includes('communication')) domains.push('communication');
    if (lowerText.includes('automate') || lowerText.includes('workflow') || lowerText.includes('task')) domains.push('automation');
    if (lowerText.includes('api') || lowerText.includes('technical') || lowerText.includes('system')) domains.push('technical');

    // Suggested capabilities
    const capabilities = [];
    if (domains.includes('data')) capabilities.push('Data Analysis', 'Report Generation');
    if (domains.includes('crm')) capabilities.push('Customer Management', 'Sales Tracking');
    if (domains.includes('communication')) capabilities.push('Email Management', 'Notification System');
    if (domains.includes('automation')) capabilities.push('Process Automation', 'Task Scheduling');
    if (domains.includes('technical')) capabilities.push('API Integration', 'System Monitoring');

    // Estimated processing time
    const baseTime = complexity === 'simple' ? 8000 : complexity === 'moderate' ? 12000 : 18000;
    const estimatedProcessingTime = baseTime + (domains.length * 2000);

    return {
      complexity,
      domains: domains.length > 0 ? domains : ['general'],
      suggestedCapabilities: capabilities.length > 0 ? capabilities : ['Task Management'],
      estimatedProcessingTime
    };
  };

  // Handle voice toggle
  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      setError('Voice recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setStage({ stage: 'idle', progress: 0, message: '', factoryPhase: 'creator' });
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setStage({ stage: 'analyzing', progress: 10, message: 'Listening...', factoryPhase: 'creator' });
      setError(null);
    }
  };

  // Enhanced agent creation
  const handleCreate = async () => {
    if (!input.trim() || stage.stage !== 'idle') return;

    setError(null);
    setStage({ 
      stage: 'analyzing', 
      progress: 10, 
      message: 'Analyzing your requirements...', 
      factoryPhase: 'creator',
      complexity: requestAnalysis?.complexity,
      domains: requestAnalysis?.domains,
      estimatedTime: requestAnalysis?.estimatedProcessingTime
    });
    setStartTime(Date.now());

    try {
      const response = await fetch('/api/revolution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user'
        },
        body: JSON.stringify({
          request: input,
          preferences: userPreferences,
          context: requestContext
        })
      });

      const data: AgentCreationResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Agent creation failed');
      }

      if (data.success && data.agent) {
        setCreatedAgent(data.agent);
        setStage({
          stage: 'ready',
          progress: 100,
          message: 'Your AI agent is ready!',
          agentName: data.agent.blueprint.name,
          factoryPhase: 'deploy'
        });
        setRateLimitInfo({
          remaining: response.headers.get('X-RateLimit-Remaining'),
          resetTime: response.headers.get('X-RateLimit-Reset'),
          processingTime: response.headers.get('X-Processing-Time')
        });
      } else {
        throw new Error(data.error?.message || 'Unknown error occurred');
      }

    } catch (error: any) {
      console.error('Agent creation failed:', error);
      setError(error.message);
      setStage({
        stage: 'error',
        progress: 0,
        message: 'Agent creation failed',
        factoryPhase: 'creator'
      });
    }
  };

  // Reset function
  const handleReset = () => {
    setInput('');
    setStage({ stage: 'idle', progress: 0, message: '', factoryPhase: 'creator' });
    setCreatedAgent(null);
    setElapsedTime(0);
    setRequestAnalysis(null);
    setError(null);
    setRateLimitInfo(null);
    inputRef.current?.focus();
  };

  // Get stage color and icon
  const getStageConfig = () => {
    const config = COMPLEXITY_CONFIG[stage.complexity || 'simple'];
    const Icon = config.icon;
    return { color: config.color, Icon };
  };

  const { color, Icon } = getStageConfig();

  // Error state
  if (stage.stage === 'error') {
    return (
      <div className="min-h-screen p-6 overflow-hidden relative bg-[rgb(var(--surface-0))] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center bg-red-500/20">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-4">Agent Creation Failed</h1>
          <p className="text-text-muted mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-lg text-text text-sm font-medium transition-all duration-300 bg-card/5 border border-white/10 hover:bg-card/10"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (stage.stage === 'ready' && createdAgent) {
    return (
      <div className="min-h-screen p-6 overflow-hidden relative bg-[rgb(var(--surface-0))]">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl breathing-slow" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl breathing-slow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Success Animation */}
          <div className="text-center mb-8 pt-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center animate-scale-in bg-gradient-to-br from-green-500 to-blue-500">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-text mb-6 animate-fade-in">
              Meet {createdAgent.blueprint.name}
            </h1>
            <p className="text-sm text-text-muted mb-3 animate-fade-in">
              Created in {createdAgent.metadata.processingTime}ms
            </p>
            <p className="text-sm text-text-muted animate-fade-in">
              Complexity: {createdAgent.metadata.requestComplexity} | 
              Domains: {createdAgent.blueprint.skills.slice(0, 3).join(', ')}
            </p>
          </div>

          {/* Agent Details */}
          <div className="rounded-xl p-6 mb-6 glass border border-white/10 animate-slide-up">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-text mb-3">
                  {createdAgent.blueprint.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed mb-4">
                  {createdAgent.blueprint.description}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Purpose:</span>
                    <p className="text-text">{createdAgent.blueprint.purpose}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Skills:</span>
                    <p className="text-text">{createdAgent.blueprint.skills.slice(0, 3).join(', ')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <button className="group p-4 rounded-lg bg-[rgb(var(--accent))]/10 hover:bg-[rgb(var(--accent))]/20 transition-all duration-300 text-left border border-[rgb(var(--accent))]/30">
                <MessageSquare className="h-5 w-5 text-[rgb(var(--accent))] mb-2" />
                <div className="text-sm font-semibold text-[rgb(var(--accent))]">Chat</div>
                <div className="text-xs text-text-muted">Start conversation</div>
              </button>
              <button className="group p-4 rounded-lg bg-card/5 hover:bg-card/10 transition-all duration-300 text-left border border-white/10">
                <Settings className="h-5 w-5 text-text mb-2" />
                <div className="text-sm font-semibold text-text">Configure</div>
                <div className="text-xs text-text-muted">Customize behavior</div>
              </button>
              <button className="group p-4 rounded-lg bg-card/5 hover:bg-card/10 transition-all duration-300 text-left border border-white/10">
                <Share className="h-5 w-5 text-text mb-2" />
                <div className="text-sm font-semibold text-text">Share</div>
                <div className="text-xs text-text-muted">Collaborate</div>
              </button>
              <button className="group p-4 rounded-lg bg-card/5 hover:bg-card/10 transition-all duration-300 text-left border border-white/10">
                <Download className="h-5 w-5 text-text mb-2" />
                <div className="text-sm font-semibold text-text">Export</div>
                <div className="text-xs text-text-muted">Download config</div>
              </button>
            </div>
          </div>

          {/* Rate Limit Info */}
          {rateLimitInfo && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Info className="h-4 w-4" />
                <span className="text-sm font-medium">Rate Limit Status</span>
              </div>
              <p className="text-sm text-text-muted">
                Remaining requests: {rateLimitInfo.remaining} | 
                Reset time: {new Date(parseInt(rateLimitInfo.resetTime) * 1000).toLocaleTimeString()}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-lg text-text text-sm font-medium transition-all duration-300 bg-card/5 border border-white/10 hover:bg-card/10"
            >
              Create Another Agent
            </button>
            <button className="px-6 py-2.5 rounded-lg text-white text-sm font-medium transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90">
              Go to Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main creation interface
  return (
    <div className="min-h-screen p-6 overflow-hidden relative bg-[rgb(var(--surface-0))]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl breathing-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl breathing-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-6">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-text mb-4">
            Intelligent Agent Creator
          </h1>
          <p className="text-sm text-text-muted">
            Create personalized AI agents with advanced analysis and context awareness
          </p>
        </div>

        {/* Request Analysis Panel */}
        {requestAnalysis && stage.stage === 'idle' && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="glass border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-5 w-5" style={{ color }} />
                <span className="text-sm font-medium text-text">
                  Analysis: {requestAnalysis.complexity} complexity
                </span>
                <span className="text-xs text-text-muted">
                  ({Math.round(requestAnalysis.estimatedProcessingTime / 1000)}s estimated)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-text-muted">Domains:</span>
                  <div className="flex gap-2 mt-1">
                    {requestAnalysis.domains.map(domain => {
                      const DomainIcon = DOMAIN_ICONS[domain as keyof typeof DOMAIN_ICONS] || Network;
                      return (
                        <div key={domain} className="flex items-center gap-1 px-2 py-1 rounded bg-card/5">
                          <DomainIcon className="h-3 w-3 text-text-muted" />
                          <span className="text-xs text-text-muted capitalize">{domain}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-text-muted">Capabilities:</span>
                  <p className="text-xs text-text mt-1">
                    {requestAnalysis.suggestedCapabilities.slice(0, 3).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Input Area */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="rounded-xl overflow-hidden glass border border-white/10 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                analyzeRequest(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleCreate();
                }
              }}
              placeholder="Describe the AI agent you need. Be specific about its purpose, capabilities, and integrations..."
              disabled={stage.stage !== 'idle' && stage.stage !== 'analyzing'}
              className="w-full bg-transparent text-text placeholder-text-muted/50 outline-none resize-none p-6 text-base font-normal"
              rows={4}
            />

            {/* Progress Bar */}
            {stage.stage !== 'idle' && (
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/50">
                <div
                  className="h-full transition-all duration-500 relative overflow-hidden"
                  style={{
                    width: `${stage.progress}%`,
                    background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={handleVoiceToggle}
              disabled={stage.stage !== 'idle' && stage.stage !== 'analyzing'}
              className="group relative"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 ${
                isListening ? 'scale-110' : 'hover:scale-105'
              }`}
              style={{
                background: isListening
                  ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                  : 'rgba(255, 255, 255, 0.05)',
                boxShadow: isListening ? '0 8px 32px rgba(239, 68, 68, 0.5)' : 'none',
              }}>
                {isListening ? (
                  <MicOff className="h-5 w-5 text-white animate-pulse" />
                ) : (
                  <Mic className="h-5 w-5 text-text-muted group-hover:text-white transition-colors" />
                )}
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-text-muted">
                {isListening ? 'Stop' : 'Voice'}
              </div>
            </button>

            <button
              onClick={handleCreate}
              disabled={!input.trim() || (stage.stage !== 'idle' && stage.stage !== 'analyzing')}
              className="group relative"
            >
              <div className={`px-8 py-3 rounded-lg font-semibold text-sm text-white transition-all duration-300 ${
                input.trim() && (stage.stage === 'idle' || stage.stage === 'analyzing')
                  ? 'cursor-pointer'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              style={{
                background: input.trim() && (stage.stage === 'idle' || stage.stage === 'analyzing')
                  ? 'linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(249, 115, 22) 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
              }}>
                {stage.stage !== 'idle' && stage.stage !== 'analyzing' ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </div>
                ) : (
                  'Create Agent'
                )}
              </div>
              {input.trim() && (stage.stage === 'idle' || stage.stage === 'analyzing') && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-text-muted">
                  ⌘ + Enter
                </div>
              )}
            </button>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="group relative"
            >
              <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-105 bg-card/5 border border-white/10">
                <Settings className="h-5 w-5 text-text-muted group-hover:text-white transition-colors" />
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-text-muted">
                Advanced
              </div>
            </button>
          </div>
        </div>

        {/* Advanced Options Panel */}
        {showAdvanced && stage.stage === 'idle' && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="glass border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text mb-4">Advanced Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Personality</label>
                  <select
                    value={userPreferences.personality}
                    onChange={(e) => setUserPreferences(prev => ({ 
                      ...prev, 
                      personality: e.target.value as UserPreferences['personality'] 
                    }))}
                    className="w-full bg-card/5 border border-white/10 rounded-lg px-3 py-2 text-text text-sm"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="technical">Technical</option>
                    <option value="creative">Creative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Learning Mode</label>
                  <select
                    value={userPreferences.learningMode}
                    onChange={(e) => setUserPreferences(prev => ({ 
                      ...prev, 
                      learningMode: e.target.value as UserPreferences['learningMode'] 
                    }))}
                    className="w-full bg-card/5 border border-white/10 rounded-lg px-3 py-2 text-text text-sm"
                  >
                    <option value="static">Static</option>
                    <option value="adaptive">Adaptive</option>
                    <option value="evolutionary">Evolutionary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Collaboration</label>
                  <select
                    value={userPreferences.collaborationStyle}
                    onChange={(e) => setUserPreferences(prev => ({ 
                      ...prev, 
                      collaborationStyle: e.target.value as UserPreferences['collaborationStyle'] 
                    }))}
                    className="w-full bg-card/5 border border-white/10 rounded-lg px-3 py-2 text-text text-sm"
                  >
                    <option value="independent">Independent</option>
                    <option value="team-oriented">Team-oriented</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Industry</label>
                  <input
                    type="text"
                    value={requestContext.industry}
                    onChange={(e) => setRequestContext(prev => ({ ...prev, industry: e.target.value }))}
                    placeholder="e.g., Healthcare, Finance, Technology"
                    className="w-full bg-card/5 border border-white/10 rounded-lg px-3 py-2 text-text text-sm placeholder-text-muted/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Current Workflow</label>
                  <input
                    type="text"
                    value={requestContext.currentWorkflow}
                    onChange={(e) => setRequestContext(prev => ({ ...prev, currentWorkflow: e.target.value }))}
                    placeholder="Describe your current process"
                    className="w-full bg-card/5 border border-white/10 rounded-lg px-3 py-2 text-text text-sm placeholder-text-muted/50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Error</span>
              </div>
              <p className="text-sm text-text-muted mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        .breathing-slow {
          animation: breathe 4s ease-in-out infinite;
        }
        @keyframes scale-in {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1;(0); }
        }
        .animate-scale-in { transform: translateY 0.6s cubic-bezier(0.34, 1.56, 0. animation: scale-in64, 1); }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; opacity: 0; }
        .animate-slide-up { animation: slide-up 0.8s ease-out 0.3s forwards; opacity: 0; }
      `}</style>
    </div>
  );
}