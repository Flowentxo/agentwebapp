'use client';

import { useState, useEffect, useRef } from 'react';
import { Lightbulb, Sparkles, TrendingUp, Clock, Zap, Star, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Filter } from 'lucide-react';
import { IdeasAnalytics } from './IdeasAnalytics';
import { motion, AnimatePresence } from 'framer-motion';

interface BusinessIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: string;
  effort: string;
  timeframe: string;
  steps: string[];
  resources: { people: number; tools: string[]; budget: number };
  risks: { risk: string; mitigation: string }[];
  metrics: string[];
  status: string;
  rating?: number;
  votes?: number; // New: Vote count
  userVote?: 'up' | 'down' | null; // New: User's vote
}

export function BusinessIdeas() {
  const [ideas, setIdeas] = useState<BusinessIdea[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedIdea, setExpandedIdea] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  // Mock data fallback
  const mockIdeas: BusinessIdea[] = [
    {
      id: 'mock-1',
      title: 'Automatisierte Lead-Qualifizierung',
      description: 'Implementiere ein KI-gestütztes System zur automatischen Bewertung eingehender Leads.',
      category: 'efficiency',
      impact: 'high',
      effort: 'medium',
      timeframe: 'short',
      steps: ['Lead-Scoring-Modell entwickeln', 'Integration mit CRM', 'A/B Testing'],
      resources: { people: 2, tools: ['OpenAI', 'HubSpot'], budget: 5000 },
      risks: [{ risk: 'Datenqualität', mitigation: 'Datenbereinigung vor Training' }],
      metrics: ['Conversion Rate', 'Time-to-Qualify'],
      status: 'new',
      votes: 5,
    },
    {
      id: 'mock-2',
      title: 'Personalisierte E-Mail-Sequenzen',
      description: 'Nutze KI um individuelle Follow-up E-Mails basierend auf Kundenverhalten zu generieren.',
      category: 'revenue',
      impact: 'high',
      effort: 'low',
      timeframe: 'short',
      steps: ['Template-Bibliothek erstellen', 'Trigger definieren', 'Rollout'],
      resources: { people: 1, tools: ['GPT-4', 'Mailchimp'], budget: 2000 },
      risks: [{ risk: 'Spam-Filter', mitigation: 'Deliverability Testing' }],
      metrics: ['Open Rate', 'Reply Rate'],
      status: 'new',
      votes: 8,
    },
  ];

  useEffect(() => {
    // Prevent double-fetch in React Strict Mode
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/business-ideas?status=new&limit=10', {
        headers: { 'x-user-id': 'demo-user' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.ideas?.length > 0) {
        const ideasWithVotes = data.ideas.map((idea: any) => ({
          ...idea,
          votes: idea.votes || Math.floor(Math.random() * 10),
          userVote: null
        }));
        setIdeas(ideasWithVotes);
      } else {
        // Use mock data as fallback
        setIdeas(mockIdeas);
      }
    } catch (error) {
      console.warn('Using mock ideas (API unavailable):', error);
      setIdeas(mockIdeas);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewIdeas = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/business-ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user' },
        body: JSON.stringify({ count: 3 }),
      });
      const data = await response.json();
      if (data.success) await fetchIdeas();
    } catch (error) {
      console.error('Failed to generate ideas:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateStatus = async (ideaId: string, status: string) => {
    try {
      await fetch(`/api/business-ideas/${ideaId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await fetchIdeas();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // New: Handle Voting
  const handleVote = (ideaId: string, type: 'up' | 'down') => {
    setIdeas(prev => prev.map(idea => {
      if (idea.id !== ideaId) return idea;

      let newVotes = idea.votes || 0;
      let newUserVote = idea.userVote;

      if (idea.userVote === type) {
        // Toggle off
        newUserVote = null;
        newVotes = type === 'up' ? newVotes - 1 : newVotes + 1;
      } else {
        // Switch vote
        if (idea.userVote === 'up') newVotes--;
        if (idea.userVote === 'down') newVotes++;

        newUserVote = type;
        newVotes = type === 'up' ? newVotes + 1 : newVotes - 1;
      }

      return { ...idea, votes: newVotes, userVote: newUserVote };
    }));
  };

  const getImpactColor = (impact: string) => {
    const colors: Record<string, string> = {
      low: 'bg-muted/500/20 text-muted-foreground border-gray-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[impact] || colors.medium;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      revenue: 'from-green-500/20 to-green-600/10 border-green-500/30',
      efficiency: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
      growth: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
      innovation: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
      risk: 'from-red-500/20 to-red-600/10 border-red-500/30',
    };
    return colors[category] || colors.innovation;
  };

  // Filter ideas
  const filteredIdeas = activeFilter === 'all'
    ? ideas
    : ideas.filter(idea => idea.category === activeFilter);

  const categories = ['all', 'revenue', 'efficiency', 'growth', 'innovation'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold oracle-text-primary-color">Business Ideas</h2>
            <p className="text-sm oracle-text-secondary-color">AI-generated opportunities based on your context</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Bar */}
          <div className="flex items-center bg-card/5 rounded-lg p-1 border border-white/10">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeFilter === cat
                  ? 'bg-[var(--oracle-blue)] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-white hover:bg-card/5'
                  }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={generateNewIdeas}
            disabled={isGenerating}
            className="flex items-center gap-2 rounded-lg bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate Ideas'}
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <IdeasAnalytics />

      {/* Ideas Grid */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredIdeas.map((idea) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={idea.id}
              className="oracle-glass-card oracle-glow-hover rounded-xl p-6 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {idea.category}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${getImpactColor(idea.impact)}`}>
                      {idea.impact} impact
                    </span>
                  </div>
                  <h3 className="oracle-text-primary-color font-semibold text-lg mb-2">{idea.title}</h3>
                  <p className="oracle-text-secondary-color text-sm leading-relaxed">{idea.description}</p>
                </div>

                {/* Voting Section */}
                <div className="flex flex-col items-center gap-1 ml-4 bg-black/20 rounded-lg p-1 border border-white/5">
                  <button
                    onClick={() => handleVote(idea.id, 'up')}
                    className={`p-1.5 rounded hover:bg-card/10 transition-colors ${idea.userVote === 'up' ? 'text-green-400' : 'text-muted-foreground'}`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <span className={`text-xs font-bold ${idea.votes && idea.votes > 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {idea.votes || 0}
                  </span>
                  <button
                    onClick={() => handleVote(idea.id, 'down')}
                    className={`p-1.5 rounded hover:bg-card/10 transition-colors ${idea.userVote === 'down' ? 'text-red-400' : 'text-muted-foreground'}`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  <span>{idea.effort} effort</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{idea.timeframe}-term</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>{idea.steps?.length || 0} steps</span>
                </div>
              </div>

              {/* Expand/Collapse */}
              <button
                onClick={() => setExpandedIdea(expandedIdea === idea.id ? null : idea.id)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-4"
              >
                {expandedIdea === idea.id ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show Details
                  </>
                )}
              </button>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedIdea === idea.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 pt-4 border-t border-white/10 overflow-hidden"
                  >
                    {/* Steps */}
                    {idea.steps && idea.steps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                          Implementation Steps
                        </p>
                        <ol className="space-y-2">
                          {idea.steps.map((step, idx) => (
                            <li key={idx} className="flex gap-3 text-sm text-gray-300">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card/10 text-xs font-medium flex-shrink-0">
                                {idx + 1}
                              </span>
                              <span className="pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Metrics */}
                    {idea.metrics && idea.metrics.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Success Metrics
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {idea.metrics.map((metric, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 rounded-lg bg-card/5 border border-white/10 text-xs text-gray-300"
                            >
                              {metric}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => updateStatus(idea.id, 'planning')}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-sm hover:bg-blue-500/20 transition-colors"
                >
                  Start Planning
                </button>
                <button
                  onClick={() => updateStatus(idea.id, 'rejected')}
                  className="px-3 py-1.5 rounded-lg bg-card/5 text-muted-foreground text-sm hover:bg-card/10 transition-colors"
                >
                  Not Now
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredIdeas.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No ideas found for this category.</p>
            <button onClick={() => setActiveFilter('all')} className="text-[var(--oracle-blue)] hover:underline mt-2">
              Show all ideas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
