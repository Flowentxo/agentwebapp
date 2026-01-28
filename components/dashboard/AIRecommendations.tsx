'use client';

import { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Zap,
  Shield,
  Activity,
  ChevronRight,
  ChevronDown,
  Clock,
  Target,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Recommendation, RecommendationPriority } from '@/lib/intelligence/recommendation-engine';

interface AIRecommendationsProps {
  recommendations: Recommendation[];
  onActionClick?: (recommendation: Recommendation, actionIndex: number) => void;
}

export function AIRecommendations({ recommendations, onActionClick }: AIRecommendationsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Separate primary (critical/high) from secondary (medium/low)
  const primaryRecommendations = recommendations.filter(
    r => r.priority === 'critical' || r.priority === 'high'
  );
  const secondaryRecommendations = recommendations.filter(
    r => r.priority === 'medium' || r.priority === 'low'
  );

  // Zero UI: No primary recommendations - Minimal badge only
  if (primaryRecommendations.length === 0) {
    return (
      <div className="space-y-6">
        {/* Minimal Success Badge - Zero UI Philosophy */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 animate-fade-in-up">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 shadow-sm animate-pulse-once">
              <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">All systems optimal</p>
              <p className="text-xs text-text-muted">No action required</p>
            </div>
          </div>

          {/* Optional: Show secondary recommendations if any */}
          {secondaryRecommendations.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-text-muted transition-all hover:bg-card/5 hover:text-text"
              aria-expanded={showAll}
              aria-controls="secondary-recommendations"
            >
              {showAll ? 'Hide' : 'View'} {secondaryRecommendations.length} optimization{secondaryRecommendations.length > 1 ? 's' : ''}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Secondary recommendations (collapsed by default) */}
        {showAll && secondaryRecommendations.length > 0 && (
          <div className="space-y-3 animate-fade-in-up" id="secondary-recommendations">
            {secondaryRecommendations.map((rec) => (
              <SecondaryRecommendationCard
                key={rec.id}
                recommendation={rec}
                expandedId={expandedId}
                onToggle={setExpandedId}
                onActionClick={onActionClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // iOS Lock Screen Style: Show only top 1-2 primary recommendations
  const visiblePrimary = primaryRecommendations.slice(0, 2);

  const getPriorityStyles = (priority: RecommendationPriority) => {
    switch (priority) {
      case 'critical':
        return {
          border: 'border-red-500/20',
          bg: 'bg-gradient-to-br from-red-500/10 to-rose-500/5',
          badge: 'bg-red-500/20 text-red-400',
          icon: 'text-red-400',
          glow: 'shadow-red-500/20',
        };
      case 'high':
        return {
          border: 'border-amber-500/20',
          bg: 'bg-gradient-to-br from-amber-500/10 to-orange-500/5',
          badge: 'bg-amber-500/20 text-amber-400',
          icon: 'text-amber-400',
          glow: 'shadow-amber-500/20',
        };
      case 'medium':
        return {
          border: 'border-blue-500/20',
          bg: 'bg-gradient-to-br from-blue-500/5 to-cyan-500/5',
          badge: 'bg-blue-500/20 text-blue-400',
          icon: 'text-blue-400',
          glow: 'shadow-blue-500/20',
        };
      case 'low':
        return {
          border: 'border-green-500/20',
          bg: 'bg-gradient-to-br from-green-500/5 to-emerald-500/5',
          badge: 'bg-green-500/20 text-green-400',
          icon: 'text-green-400',
          glow: 'shadow-green-500/20',
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return Zap;
      case 'maintenance':
        return Shield;
      case 'optimization':
        return Target;
      case 'security':
        return Shield;
      case 'capacity':
        return Activity;
      case 'proactive':
        return Sparkles;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header - Only show when there are primary recommendations */}
      {visiblePrimary.length > 0 && (
        <div className="flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-[rgb(var(--accent))]" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-text">Up Next</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] animate-pulse" aria-hidden="true"></div>
            Live
          </div>
        </div>
      )}

      {/* Primary Recommendations - iOS Style (Max 2) */}
      <div className="space-y-6">
        {visiblePrimary.map((rec, index) => {
          const styles = getPriorityStyles(rec.priority);
          const Icon = getTypeIcon(rec.type);
          const isExpanded = expandedId === rec.id;

          return (
            <div
              key={rec.id}
              className={`group relative overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} backdrop-blur-sm transition-all hover:shadow-2xl ${styles.glow} animate-fade-in-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="p-6">
                {/* Compact Header */}
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${styles.bg} border ${styles.border} shadow-lg`}>
                    <Icon className={`h-6 w-6 ${styles.icon}`} aria-hidden="true" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold text-text leading-tight">{rec.title}</h3>
                      <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${styles.badge}`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-text-muted leading-relaxed">{rec.description}</p>

                    {/* Key Info - Always Visible */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-muted">
                      {rec.timeframe && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{rec.timeframe}</span>
                        </div>
                      )}
                      {rec.confidence >= 80 && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]" aria-hidden="true"></div>
                          <span>{rec.confidence}% confidence</span>
                        </div>
                      )}
                    </div>

                    {/* Primary Action - Prominent */}
                    <div className="mt-5 flex flex-wrap gap-3">
                      {rec.actions.map((action, actionIndex) => (
                        <button
                          type="button"
                          key={actionIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onActionClick) {
                              onActionClick(rec, actionIndex);
                            }
                            if (action.href) {
                              window.location.href = action.href;
                            }
                          }}
                          className={`btn-premium flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                            action.isPrimary
                              ? 'bg-[rgb(var(--accent))] text-white shadow-lg shadow-[rgb(var(--accent))]/30 hover:shadow-xl hover:shadow-[rgb(var(--accent))]/40 hover:scale-105'
                              : 'border border-white/10 bg-card/5 text-text hover:bg-card/10'
                          }`}
                        >
                          {action.label}
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ))}
                    </div>

                    {/* Details - Collapsed by Default, Expand on Click */}
                    {(rec.impact || rec.predictedOutcome) && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                        className="mt-4 flex items-center gap-2 text-xs text-text-muted hover:text-text transition-colors"
                        aria-expanded={isExpanded}
                        aria-controls={`rec-details-${rec.id}`}
                      >
                        {isExpanded ? 'Hide' : 'Show'} details
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-white/10 pt-4 animate-fade-in-up" id={`rec-details-${rec.id}`}>
                        {rec.impact && (
                          <div>
                            <p className="text-xs font-semibold uppercase text-text-muted tracking-wide">Impact</p>
                            <p className="mt-1 text-sm text-text">{rec.impact}</p>
                          </div>
                        )}
                        {rec.predictedOutcome && (
                          <div>
                            <p className="text-xs font-semibold uppercase text-text-muted tracking-wide">Predicted Outcome</p>
                            <p className="mt-1 text-sm text-green-400">{rec.predictedOutcome}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More Secondary Recommendations - Only with primary recommendations */}
      {visiblePrimary.length > 0 && secondaryRecommendations.length > 0 && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="w-full rounded-xl border border-white/10 bg-card/5 px-4 py-3 text-sm text-text-muted transition-all hover:bg-card/10 hover:text-text flex items-center justify-center gap-2"
            aria-expanded={showAll}
            aria-controls="secondary-recommendations"
          >
            {showAll ? 'Hide' : 'Show'} {secondaryRecommendations.length} additional optimization{secondaryRecommendations.length > 1 ? 's' : ''}
            <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {showAll && (
            <div className="space-y-3 animate-fade-in-up" id="secondary-recommendations">
              {secondaryRecommendations.map((rec) => (
                <SecondaryRecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  expandedId={expandedId}
                  onToggle={setExpandedId}
                  onActionClick={onActionClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Powered Badge - Only show with primary recommendations */}
      {visiblePrimary.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
          <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--accent))]" aria-hidden="true" />
          <span>Powered by AI</span>
        </div>
      )}
    </div>
  );
}

// Secondary Recommendation Card (Compact)
function SecondaryRecommendationCard({
  recommendation: rec,
  expandedId,
  onToggle,
  onActionClick,
}: {
  recommendation: Recommendation;
  expandedId: string | null;
  onToggle: (id: string | null) => void;
  onActionClick?: (recommendation: Recommendation, actionIndex: number) => void;
}) {
  const isExpanded = expandedId === rec.id;

  const getPriorityStyles = (priority: RecommendationPriority) => {
    switch (priority) {
      case 'medium':
        return { border: 'border-blue-500/20', icon: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' };
      case 'low':
        return { border: 'border-green-500/20', icon: 'text-green-400', badge: 'bg-green-500/20 text-green-400' };
      default:
        return { border: 'border-white/10', icon: 'text-text-muted', badge: 'bg-card/10 text-text-muted' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return Zap;
      case 'maintenance': return Shield;
      case 'optimization': return Target;
      case 'security': return Shield;
      case 'capacity': return Activity;
      default: return Sparkles;
    }
  };

  const styles = getPriorityStyles(rec.priority);
  const Icon = getTypeIcon(rec.type);

  return (
    <div className={`rounded-xl border ${styles.border} bg-card/5 backdrop-blur-sm p-4 transition-all hover:bg-card/10`}>
      <button
        type="button"
        className="flex items-center justify-between w-full text-left cursor-pointer"
        onClick={() => onToggle(isExpanded ? null : rec.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(isExpanded ? null : rec.id);
          }
        }}
        aria-expanded={isExpanded}
        aria-controls={`rec-details-${rec.id}`}
      >
        <div className="flex items-center gap-3 flex-1">
          <Icon className={`h-4 w-4 ${styles.icon} flex-shrink-0`} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-text truncate">{rec.title}</h4>
            <p className="text-xs text-text-muted truncate">{rec.description}</p>
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 text-text-muted flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3 animate-fade-in-up" id={`rec-details-${rec.id}`}>
          <p className="text-xs text-text-muted">{rec.impact}</p>
          <div className="flex flex-wrap gap-2">
            {rec.actions.map((action, index) => (
              <button
                type="button"
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onActionClick) {
                    onActionClick(rec, index);
                  }
                  if (action.href) {
                    window.location.href = action.href;
                  }
                }}
                className="text-xs rounded-lg px-3 py-1.5 border border-white/10 bg-card/5 text-text hover:bg-card/10 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
