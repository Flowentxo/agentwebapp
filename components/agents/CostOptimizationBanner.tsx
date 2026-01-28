'use client';

import { useState, useEffect } from 'react';
import { TrendingDown, Sparkles, X, Info, Check } from 'lucide-react';

interface ModelRecommendation {
  recommendedModel: string;
  currentModel: string;
  reasoning: string;
  potentialSavings: number;
  potentialSavingsPercent: number;
  confidenceScore: number;
  qualityImpact: 'none' | 'minimal' | 'moderate' | 'significant';
}

interface CostOptimizationBannerProps {
  prompt: string;
  currentModel: string;
  onModelChange: (modelId: string) => void;
  conversationHistory?: any[];
  autoOptimizationEnabled?: boolean;
}

export function CostOptimizationBanner({
  prompt,
  currentModel,
  onModelChange,
  conversationHistory = [],
  autoOptimizationEnabled = false,
}: CostOptimizationBannerProps) {
  const [recommendation, setRecommendation] = useState<ModelRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (prompt && prompt.trim().length > 10 && !dismissed) {
      getRecommendation();
    }
  }, [prompt, currentModel]);

  const getRecommendation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/optimization/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          currentModel,
          conversationHistory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.recommendedModel !== currentModel) {
          const rec = data.data;
          setRecommendation(rec);
          setApplied(false);

          // Auto-apply if enabled and meets criteria
          if (
            autoOptimizationEnabled &&
            rec.potentialSavingsPercent >= 10 &&
            rec.confidenceScore >= 70 &&
            rec.qualityImpact !== 'significant'
          ) {
            // Auto-apply recommendation
            onModelChange(rec.recommendedModel);
            setApplied(true);
            setTimeout(() => setDismissed(true), 3000);
          }
        } else {
          setRecommendation(null);
        }
      }
    } catch (error) {
      console.error('Failed to get recommendation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (recommendation) {
      onModelChange(recommendation.recommendedModel);
      setApplied(true);
      setTimeout(() => setDismissed(true), 2000);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setRecommendation(null);
  };

  if (loading || !recommendation || dismissed) {
    return null;
  }

  // Only show if there are significant savings (>10%) and confidence is high (>70%)
  if (
    recommendation.potentialSavingsPercent < 10 ||
    recommendation.confidenceScore < 70
  ) {
    return null;
  }

  const qualityImpactColor = {
    none: 'text-green-600 dark:text-green-400',
    minimal: 'text-green-600 dark:text-green-400',
    moderate: 'text-yellow-600 dark:text-yellow-400',
    significant: 'text-red-600 dark:text-red-400',
  };

  const qualityImpactText = {
    none: 'No quality impact',
    minimal: 'Minimal quality impact',
    moderate: 'Moderate quality impact',
    significant: 'May affect quality',
  };

  return (
    <div className="mb-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            {applied ? (
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {applied ? (
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-100">
                ✅ Optimization Applied!
              </h4>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                Now using {recommendation.recommendedModel} for this conversation.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold text-green-900 dark:text-green-100">
                  Cost Savings Available
                </h4>
              </div>

              <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                {recommendation.reasoning}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="bg-card/50 dark:bg-black/20 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground">Recommended Model</div>
                  <div className="font-semibold text-sm text-green-900 dark:text-green-100">
                    {recommendation.recommendedModel}
                  </div>
                </div>

                <div className="bg-card/50 dark:bg-black/20 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground">Potential Savings</div>
                  <div className="font-semibold text-sm text-green-600 dark:text-green-400">
                    {recommendation.potentialSavingsPercent.toFixed(0)}% cheaper
                  </div>
                </div>

                <div className="bg-card/50 dark:bg-black/20 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground">Quality Impact</div>
                  <div className={`font-semibold text-sm ${qualityImpactColor[recommendation.qualityImpact]}`}>
                    {qualityImpactText[recommendation.qualityImpact]}
                  </div>
                </div>

                <div className="bg-card/50 dark:bg-black/20 rounded-lg p-2">
                  <div className="text-xs text-muted-foreground">Confidence</div>
                  <div className="font-semibold text-sm text-green-900 dark:text-green-100">
                    {recommendation.confidenceScore}%
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleApply}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Sparkles size={14} />
                  Switch to {recommendation.recommendedModel}
                </button>

                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
                >
                  Keep Current Model
                </button>

                <div className="flex-1"></div>

                <button
                  onClick={handleDismiss}
                  className="p-2 hover:bg-black/5 dark:hover:bg-card/5 rounded-lg transition-colors"
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {!applied && recommendation.qualityImpact !== 'none' && (
        <div className="mt-3 pt-3 border-t border-green-500/20 flex items-start gap-2">
          <Info className="h-4 w-4 text-green-600/70 dark:text-green-400/70 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-700/80 dark:text-green-300/80">
            Note: The recommended model may produce slightly different results compared to {recommendation.currentModel}.
            You can always switch back using the model selector.
          </p>
        </div>
      )}
    </div>
  );
}
