'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  Target,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lightbulb,
  DollarSign,
  Award,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Meh,
  Frown,
} from 'lucide-react';

interface MeetingBriefing {
  id: string;
  eventId: string;
  title: string;
  summary?: string;
  keyPoints?: string[];
  lastInteractions?: Array<{
    date: string;
    type: string;
    summary: string;
  }>;
  painPoints?: string[];
  suggestedTalkingPoints?: string[];
  competitorIntel?: {
    competitors: string[];
    insights: string[];
  };
  pricingInfo?: {
    currentTier?: string;
    opportunities?: string[];
  };
  actionItems?: string[];
  relevantDocuments?: Array<{
    id: string;
    title: string;
    url: string;
  }>;
  relevantIdeas?: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  confidence: 'low' | 'medium' | 'high' | 'critical';
  status: string;
}

interface MeetingBriefingModalProps {
  briefing: MeetingBriefing | null;
  onClose: () => void;
}

export function MeetingBriefingModal({
  briefing,
  onClose,
}: MeetingBriefingModalProps) {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [showCommentField, setShowCommentField] = useState(false);

  useEffect(() => {
    // Mark briefing as viewed when opened
    if (briefing) {
      markAsViewed(briefing.id);
    }
  }, [briefing]);

  const markAsViewed = async (briefingId: string) => {
    try {
      await fetch(`/api/predictions/briefing/${briefingId}/viewed`, {
        method: 'PATCH',
        headers: {
          'x-user-id': 'demo-user',
        },
      });
    } catch (err) {
      console.error('Failed to mark briefing as viewed:', err);
    }
  };

  const submitFeedback = async (feedback: 'very_helpful' | 'helpful' | 'not_helpful') => {
    if (!briefing) return;

    try {
      await fetch(`/api/predictions/feedback/${briefing.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({
          feedback,
          comment: comment.trim() || undefined,
        }),
      });

      setFeedbackGiven(true);
      setSelectedFeedback(feedback);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  if (!briefing) return null;

  const confidenceColors = {
    low: 'bg-muted text-foreground',
    medium: 'bg-blue-500/20 text-blue-700',
    high: 'bg-green-100 text-green-700',
    critical: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="oracle-bg-primary rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/10">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between oracle-bg-secondary">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold oracle-text-primary-color">
                Meeting Briefing
              </h2>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  confidenceColors[briefing.confidence]
                }`}
              >
                {briefing.confidence} confidence
              </span>
            </div>
            <p className="text-sm oracle-text-secondary-color">{briefing.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 oracle-hover-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 oracle-text-tertiary-color" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary */}
          {briefing.summary && (
            <section>
              <h3 className="text-sm font-semibold oracle-text-primary-color mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Summary
              </h3>
              <p className="text-sm oracle-text-secondary-color leading-relaxed bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                {briefing.summary}
              </p>
            </section>
          )}

          {/* Key Points */}
          {briefing.keyPoints && briefing.keyPoints.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold oracle-text-primary-color mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                Key Points
              </h3>
              <ul className="space-y-2">
                {briefing.keyPoints.map((point, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm oracle-text-secondary-color"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Last Interactions */}
          {briefing.lastInteractions && briefing.lastInteractions.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold oracle-text-primary-color mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                Recent Interactions
              </h3>
              <div className="space-y-3">
                {briefing.lastInteractions.map((interaction, index) => (
                  <div
                    key={index}
                    className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-purple-600">
                        {interaction.type}
                      </span>
                      <span className="text-xs oracle-text-tertiary-color">
                        {interaction.date}
                      </span>
                    </div>
                    <p className="text-sm oracle-text-secondary-color">{interaction.summary}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pain Points */}
          {briefing.painPoints && briefing.painPoints.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold oracle-text-primary-color mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                Pain Points
              </h3>
              <ul className="space-y-2">
                {briefing.painPoints.map((point, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm oracle-text-secondary-color p-3 bg-orange-500/10 rounded-lg border border-orange-500/20"
                  >
                    <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Suggested Talking Points */}
          {briefing.suggestedTalkingPoints &&
            briefing.suggestedTalkingPoints.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold oracle-text-primary-color mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  Suggested Talking Points
                </h3>
                <ul className="space-y-2">
                  {briefing.suggestedTalkingPoints.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm oracle-text-secondary-color p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20"
                    >
                      <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

          {/* Competitor Intel */}
          {briefing.competitorIntel &&
            briefing.competitorIntel.insights &&
            briefing.competitorIntel.insights.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold oracle-text-primary-color mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-red-600" />
                  Competitor Intelligence
                </h3>
                <div className="space-y-2">
                  {briefing.competitorIntel.competitors &&
                    briefing.competitorIntel.competitors.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {briefing.competitorIntel.competitors.map((comp, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-red-500/10 text-red-600 text-xs font-medium rounded border border-red-500/20"
                          >
                            {comp}
                          </span>
                        ))}
                      </div>
                    )}
                  <ul className="space-y-2">
                    {briefing.competitorIntel.insights.map((insight, index) => (
                      <li
                        key={index}
                        className="text-sm oracle-text-secondary-color p-3 bg-red-500/10 rounded-lg border border-red-500/20"
                      >
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

          {/* Pricing Info */}
          {briefing.pricingInfo && (
            <section>
              <h3 className="text-sm font-semibold oracle-text-primary-color mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Pricing Information
              </h3>
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 space-y-2">
                {briefing.pricingInfo.currentTier && (
                  <div>
                    <span className="text-xs font-medium text-green-600">
                      Current Tier:
                    </span>
                    <p className="text-sm oracle-text-secondary-color">
                      {briefing.pricingInfo.currentTier}
                    </p>
                  </div>
                )}
                {briefing.pricingInfo.opportunities &&
                  briefing.pricingInfo.opportunities.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-green-700">
                        Opportunities:
                      </span>
                      <ul className="space-y-1 mt-1">
                        {briefing.pricingInfo.opportunities.map((opp, index) => (
                          <li key={index} className="text-sm text-foreground">
                            • {opp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </section>
          )}

          {/* Action Items */}
          {briefing.actionItems && briefing.actionItems.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Action Items
              </h3>
              <ul className="space-y-2">
                {briefing.actionItems.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-foreground p-3 bg-blue-500/10 rounded-lg border border-blue-100"
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Feedback Section */}
        <div className="px-6 py-5 border-t border-white/10 oracle-bg-secondary">
          {!feedbackGiven ? (
            <div className="space-y-4">
              <p className="text-sm font-medium oracle-text-primary-color">Was this briefing helpful?</p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => submitFeedback('very_helpful')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 oracle-bg-primary border-2 border-white/10 rounded-lg hover:border-green-500 hover:bg-green-500/10 transition-all group"
                >
                  <Smile className="w-5 h-5 oracle-text-tertiary-color group-hover:text-green-600" />
                  <span className="text-sm font-medium oracle-text-secondary-color group-hover:text-green-600">
                    Very Helpful
                  </span>
                </button>

                <button
                  onClick={() => submitFeedback('helpful')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 oracle-bg-primary border-2 border-white/10 rounded-lg hover:border-blue-500 hover:bg-blue-500/10 transition-all group"
                >
                  <Meh className="w-5 h-5 oracle-text-tertiary-color group-hover:text-blue-600" />
                  <span className="text-sm font-medium oracle-text-secondary-color group-hover:text-blue-600">
                    Somewhat Helpful
                  </span>
                </button>

                <button
                  onClick={() => submitFeedback('not_helpful')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 oracle-bg-primary border-2 border-white/10 rounded-lg hover:border-red-500 hover:bg-red-500/10 transition-all group"
                >
                  <Frown className="w-5 h-5 oracle-text-tertiary-color group-hover:text-red-600" />
                  <span className="text-sm font-medium oracle-text-secondary-color group-hover:text-red-600">
                    Not Helpful
                  </span>
                </button>
              </div>

              {/* Optional Comment Field */}
              {!showCommentField ? (
                <button
                  onClick={() => setShowCommentField(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  + Add optional comment
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us more about your experience (optional)..."
                    className="w-full px-3 py-2 oracle-bg-primary border border-white/10 rounded-lg text-sm oracle-text-primary-color placeholder:oracle-text-tertiary-color focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-600">
                  Thank you for your feedback!
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {!feedbackGiven && (
            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="px-6 py-2 oracle-bg-primary border border-white/10 oracle-text-secondary-color rounded-lg oracle-hover-secondary transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
