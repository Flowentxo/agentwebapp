/**
 * QUALITY EVALUATION DASHBOARD
 *
 * Admin page for reviewing AI response quality based on user feedback.
 *
 * Features:
 * - Global satisfaction metrics
 * - Review queue for negative feedback
 * - Quality breakdown by model/prompt/agent
 * - Direct link to Prompt Lab for improvements
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  User,
  Cpu,
  FileText,
  Play,
  RefreshCw,
  ChevronRight,
  XCircle,
  Eye,
  Zap,
  BarChart3,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface FeedbackItem {
  id: string;
  traceId: string;
  userId?: string;
  rating: 'positive' | 'negative';
  comment?: string;
  promptSlug?: string;
  agentId?: string;
  model?: string;
  userMessage?: string;
  aiResponse?: string;
  reviewStatus: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  trace?: {
    provider: string;
    responseTimeMs: number | null;
    totalTokens: number | null;
    totalCost: string | null;
  };
}

interface QualityMetrics {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  satisfactionScore: number;
  pendingReviews: number;
}

interface ModelQuality {
  model: string;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  satisfactionScore: number;
}

interface PromptQuality {
  promptSlug: string;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  satisfactionScore: number;
}

interface EvaluationData {
  days: number;
  metrics: QualityMetrics;
  reviewQueue: {
    items: FeedbackItem[];
    total: number;
  };
  qualityByModel: ModelQuality[];
  qualityByPrompt: PromptQuality[];
  mostFailingPrompt: PromptQuality | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EvaluationDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [updating, setUpdating] = useState(false);

  // ────────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ────────────────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/evaluation?days=30&limit=50');
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('[EVALUATION_PAGE] Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ────────────────────────────────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────────────────────────────────

  const handleUpdateStatus = async (
    id: string,
    status: 'reviewed' | 'resolved' | 'dismissed',
    notes?: string
  ) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/evaluation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });

      if (!res.ok) throw new Error('Failed to update');

      // Refresh data
      await fetchData();
      setSelectedItem(null);
    } catch (error) {
      console.error('[EVALUATION_PAGE] Update error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenInPlayground = (promptSlug: string) => {
    // Navigate to prompts page with the prompt pre-selected
    router.push(`/admin/prompts?slug=${encodeURIComponent(promptSlug)}`);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Loading State
  // ────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-card/5 rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-card/5 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-card/5 rounded-xl" />
      </div>
    );
  }

  const metrics = data?.metrics;
  const reviewQueue = data?.reviewQueue?.items || [];
  const mostFailing = data?.mostFailingPrompt;

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          Header
      ═══════════════════════════════════════════════════════════════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/admin"
              className="p-2 -ml-2 rounded-lg hover:bg-card/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-amber-400" />
              <span>Quality Evaluation</span>
            </h1>
          </div>
          <p className="text-white/50 ml-10">
            Review AI response quality and user feedback
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-card/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:border-white/20 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          KPI Cards
      ═══════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Satisfaction Score */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${
              (metrics?.satisfactionScore || 0) >= 80
                ? 'bg-emerald-500/20'
                : (metrics?.satisfactionScore || 0) >= 60
                ? 'bg-amber-500/20'
                : 'bg-red-500/20'
            }`}>
              {(metrics?.satisfactionScore || 0) >= 80 ? (
                <ThumbsUp className="w-5 h-5 text-emerald-400" />
              ) : (metrics?.satisfactionScore || 0) >= 60 ? (
                <TrendingUp className="w-5 h-5 text-amber-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
            <span className={`text-xs font-medium ${
              (metrics?.satisfactionScore || 0) >= 80
                ? 'text-emerald-400'
                : (metrics?.satisfactionScore || 0) >= 60
                ? 'text-amber-400'
                : 'text-red-400'
            }`}>
              {(metrics?.satisfactionScore || 0) >= 80 ? 'Excellent' :
               (metrics?.satisfactionScore || 0) >= 60 ? 'Good' : 'Needs Work'}
            </span>
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">
            {metrics?.satisfactionScore || 0}%
          </p>
          <p className="text-xs text-white/50 mt-1">Satisfaction Score</p>
        </div>

        {/* Total Feedback */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400">{metrics?.positiveFeedback || 0}</span>
              <span className="text-white/30">/</span>
              <span className="text-red-400">{metrics?.negativeFeedback || 0}</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">
            {metrics?.totalFeedback || 0}
          </p>
          <p className="text-xs text-white/50 mt-1">Total Feedback (30d)</p>
        </div>

        {/* Pending Reviews */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${
              (metrics?.pendingReviews || 0) > 10
                ? 'bg-red-500/20'
                : (metrics?.pendingReviews || 0) > 0
                ? 'bg-amber-500/20'
                : 'bg-emerald-500/20'
            }`}>
              <Clock className={`w-5 h-5 ${
                (metrics?.pendingReviews || 0) > 10
                  ? 'text-red-400'
                  : (metrics?.pendingReviews || 0) > 0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`} />
            </div>
            {(metrics?.pendingReviews || 0) > 0 && (
              <span className="text-xs text-amber-400">Needs attention</span>
            )}
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">
            {metrics?.pendingReviews || 0}
          </p>
          <p className="text-xs text-white/50 mt-1">Pending Reviews</p>
        </div>

        {/* Most Failing Prompt */}
        <div className="glass-command-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            {mostFailing && (
              <button
                onClick={() => handleOpenInPlayground(mostFailing.promptSlug)}
                className="text-xs text-violet-400 hover:underline flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                Fix
              </button>
            )}
          </div>
          <p className="text-lg font-bold text-white truncate">
            {mostFailing?.promptSlug || 'None'}
          </p>
          <p className="text-xs text-white/50 mt-1">
            {mostFailing
              ? `${mostFailing.satisfactionScore}% satisfaction`
              : 'Most Failing Prompt'}
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          Main Content - Split View
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─────────────────────────────────────────────────────────────
            Left: Review Queue
        ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 glass-command-panel p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ThumbsDown className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Review Queue</h3>
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                {reviewQueue.filter((r) => r.reviewStatus === 'pending').length} pending
              </span>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {reviewQueue.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No feedback to review</p>
                <p className="text-sm mt-1">All caught up!</p>
              </div>
            ) : (
              reviewQueue.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedItem?.id === item.id
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-card/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
                          item.rating === 'negative'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {item.rating === 'negative' ? (
                            <ThumbsDown className="w-3 h-3" />
                          ) : (
                            <ThumbsUp className="w-3 h-3" />
                          )}
                          {item.rating}
                        </span>

                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          item.reviewStatus === 'pending'
                            ? 'bg-amber-500/20 text-amber-400'
                            : item.reviewStatus === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-card/10 text-white/50'
                        }`}>
                          {item.reviewStatus}
                        </span>

                        {item.model && (
                          <span className="text-xs text-white/40 flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            {item.model.split('-').slice(0, 2).join('-')}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-white/80 line-clamp-2">
                        {item.userMessage || 'No message recorded'}
                      </p>

                      {item.comment && (
                        <p className="text-xs text-white/50 mt-2 italic">
                          "{item.comment}"
                        </p>
                      )}
                    </div>

                    <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${
                      selectedItem?.id === item.id ? 'text-red-400 rotate-90' : 'text-white/30'
                    }`} />
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {item.promptSlug && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {item.promptSlug}
                      </span>
                    )}
                    {item.agentId && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.agentId}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            Right: Detail Panel / Quality Breakdown
        ───────────────────────────────────────────────────────────── */}
        <div className="glass-command-panel p-4">
          {selectedItem ? (
            <FeedbackDetailPanel
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onUpdateStatus={handleUpdateStatus}
              onOpenPlayground={handleOpenInPlayground}
              updating={updating}
            />
          ) : (
            <QualityBreakdownPanel
              qualityByModel={data?.qualityByModel || []}
              qualityByPrompt={data?.qualityByPrompt || []}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FEEDBACK DETAIL PANEL
// ============================================================================

function FeedbackDetailPanel({
  item,
  onClose,
  onUpdateStatus,
  onOpenPlayground,
  updating,
}: {
  item: FeedbackItem;
  onClose: () => void;
  onUpdateStatus: (id: string, status: 'reviewed' | 'resolved' | 'dismissed', notes?: string) => void;
  onOpenPlayground: (promptSlug: string) => void;
  updating: boolean;
}) {
  const [notes, setNotes] = useState('');

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-400" />
          Review Details
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-white/40 hover:text-white transition-colors"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* User Message */}
        <div>
          <label className="text-xs font-medium text-white/50 mb-1 block">
            User Message
          </label>
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-sm text-white/80">
              {item.userMessage || 'Not recorded'}
            </p>
          </div>
        </div>

        {/* AI Response */}
        <div>
          <label className="text-xs font-medium text-white/50 mb-1 block">
            AI Response
          </label>
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg max-h-48 overflow-y-auto">
            <p className="text-sm text-white/80 whitespace-pre-wrap">
              {item.aiResponse || 'Not recorded'}
            </p>
          </div>
        </div>

        {/* User Comment */}
        {item.comment && (
          <div>
            <label className="text-xs font-medium text-white/50 mb-1 block">
              User Comment
            </label>
            <div className="p-3 bg-card/5 border border-white/10 rounded-lg">
              <p className="text-sm text-white/80 italic">"{item.comment}"</p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {item.model && (
            <div className="p-2 bg-card/5 rounded-lg">
              <span className="text-white/40">Model:</span>
              <p className="text-white font-medium truncate">{item.model}</p>
            </div>
          )}
          {item.promptSlug && (
            <div className="p-2 bg-card/5 rounded-lg">
              <span className="text-white/40">Prompt:</span>
              <p className="text-white font-medium truncate">{item.promptSlug}</p>
            </div>
          )}
          {item.trace?.responseTimeMs && (
            <div className="p-2 bg-card/5 rounded-lg">
              <span className="text-white/40">Latency:</span>
              <p className="text-white font-medium">{item.trace.responseTimeMs}ms</p>
            </div>
          )}
          {item.trace?.totalTokens && (
            <div className="p-2 bg-card/5 rounded-lg">
              <span className="text-white/40">Tokens:</span>
              <p className="text-white font-medium">{item.trace.totalTokens}</p>
            </div>
          )}
        </div>

        {/* Review Notes */}
        <div>
          <label className="text-xs font-medium text-white/50 mb-1 block">
            Review Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this issue..."
            className="w-full h-20 px-3 py-2 bg-card/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-white/10 space-y-2">
        {item.promptSlug && (
          <button
            onClick={() => onOpenPlayground(item.promptSlug!)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors"
          >
            <Play className="w-4 h-4" />
            Open in Playground
          </button>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onUpdateStatus(item.id, 'reviewed', notes)}
            disabled={updating}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50 text-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            Reviewed
          </button>

          <button
            onClick={() => onUpdateStatus(item.id, 'resolved', notes)}
            disabled={updating}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50 text-sm"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Resolved
          </button>

          <button
            onClick={() => onUpdateStatus(item.id, 'dismissed', notes)}
            disabled={updating}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-card/10 border border-white/20 text-white/60 rounded-lg hover:bg-card/20 transition-colors disabled:opacity-50 text-sm"
          >
            <XCircle className="w-3.5 h-3.5" />
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// QUALITY BREAKDOWN PANEL
// ============================================================================

function QualityBreakdownPanel({
  qualityByModel,
  qualityByPrompt,
}: {
  qualityByModel: ModelQuality[];
  qualityByPrompt: PromptQuality[];
}) {
  return (
    <div className="space-y-6">
      {/* Model Quality */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-semibold text-white">Quality by Model</h4>
        </div>
        <div className="space-y-2">
          {qualityByModel.length === 0 ? (
            <p className="text-xs text-white/40 text-center py-4">No data yet</p>
          ) : (
            qualityByModel.slice(0, 5).map((model) => (
              <div
                key={model.model}
                className="flex items-center justify-between p-2 bg-card/5 rounded-lg"
              >
                <span className="text-xs text-white/70 truncate flex-1">
                  {model.model.split('-').slice(0, 3).join('-')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-card/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        model.satisfactionScore >= 80
                          ? 'bg-emerald-400'
                          : model.satisfactionScore >= 60
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${model.satisfactionScore}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-8 text-right ${
                    model.satisfactionScore >= 80
                      ? 'text-emerald-400'
                      : model.satisfactionScore >= 60
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    {model.satisfactionScore}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Prompt Quality */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-violet-400" />
          <h4 className="text-sm font-semibold text-white">Quality by Prompt</h4>
        </div>
        <div className="space-y-2">
          {qualityByPrompt.length === 0 ? (
            <p className="text-xs text-white/40 text-center py-4">No data yet</p>
          ) : (
            qualityByPrompt.slice(0, 5).map((prompt) => (
              <div
                key={prompt.promptSlug}
                className="flex items-center justify-between p-2 bg-card/5 rounded-lg"
              >
                <span className="text-xs text-white/70 truncate flex-1">
                  {prompt.promptSlug}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-card/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        prompt.satisfactionScore >= 80
                          ? 'bg-emerald-400'
                          : prompt.satisfactionScore >= 60
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${prompt.satisfactionScore}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-8 text-right ${
                    prompt.satisfactionScore >= 80
                      ? 'text-emerald-400'
                      : prompt.satisfactionScore >= 60
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    {prompt.satisfactionScore}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-white/40">≥80%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs text-white/40">60-79%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-xs text-white/40">&lt;60%</span>
        </div>
      </div>
    </div>
  );
}
