'use client';

import { useState } from 'react';
import {
  Sparkles,
  FileText,
  Tag,
  CheckSquare,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DocumentInsights {
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  entities: {
    people: string[];
    organizations: string[];
    locations: string[];
  };
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    score: number;
  };
}

interface DocumentInsightsPanelProps {
  insights: DocumentInsights;
  fileName?: string;
}

export function DocumentInsightsPanel({ insights, fileName }: DocumentInsightsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'keyTopics'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'negative':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'oracle-text-secondary-color bg-muted/500/20 border-gray-500/30';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😟';
      default:
        return '😐';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30">
          <Sparkles className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold oracle-text-primary-color">AI-Extracted Insights</h3>
          {fileName && (
            <p className="text-sm oracle-text-secondary-color">From: {fileName}</p>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 overflow-hidden">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full flex items-center justify-between p-4 hover:bg-blue-500/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-400" />
            <span className="font-medium oracle-text-primary-color">Summary</span>
          </div>
          {expandedSections.has('summary') ? (
            <ChevronUp className="h-5 w-5 oracle-text-secondary-color" />
          ) : (
            <ChevronDown className="h-5 w-5 oracle-text-secondary-color" />
          )}
        </button>

        {expandedSections.has('summary') && (
          <div className="px-4 pb-4">
            <p className="oracle-text-secondary-color leading-relaxed">{insights.summary}</p>
          </div>
        )}
      </div>

      {/* Key Topics Section */}
      <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 overflow-hidden">
        <button
          onClick={() => toggleSection('keyTopics')}
          className="w-full flex items-center justify-between p-4 hover:bg-purple-500/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Tag className="h-5 w-5 text-purple-400" />
            <span className="font-medium oracle-text-primary-color">
              Key Topics ({insights.keyTopics.length})
            </span>
          </div>
          {expandedSections.has('keyTopics') ? (
            <ChevronUp className="h-5 w-5 oracle-text-secondary-color" />
          ) : (
            <ChevronDown className="h-5 w-5 oracle-text-secondary-color" />
          )}
        </button>

        {expandedSections.has('keyTopics') && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {insights.keyTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 text-sm font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Items Section */}
      {insights.actionItems && insights.actionItems.length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 overflow-hidden">
          <button
            onClick={() => toggleSection('actionItems')}
            className="w-full flex items-center justify-between p-4 hover:bg-orange-500/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-orange-400" />
              <span className="font-medium oracle-text-primary-color">
                Action Items ({insights.actionItems.length})
              </span>
            </div>
            {expandedSections.has('actionItems') ? (
              <ChevronUp className="h-5 w-5 oracle-text-secondary-color" />
            ) : (
              <ChevronDown className="h-5 w-5 oracle-text-secondary-color" />
            )}
          </button>

          {expandedSections.has('actionItems') && (
            <div className="px-4 pb-4">
              <ul className="space-y-2">
                {insights.actionItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="oracle-text-secondary-color">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Entities Section */}
      {insights.entities && (
        <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 overflow-hidden">
          <button
            onClick={() => toggleSection('entities')}
            className="w-full flex items-center justify-between p-4 hover:bg-green-500/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-400" />
              <span className="font-medium oracle-text-primary-color">
                Entities
              </span>
            </div>
            {expandedSections.has('entities') ? (
              <ChevronUp className="h-5 w-5 oracle-text-secondary-color" />
            ) : (
              <ChevronDown className="h-5 w-5 oracle-text-secondary-color" />
            )}
          </button>

          {expandedSections.has('entities') && (
            <div className="px-4 pb-4 space-y-3">
              {insights.entities.people && insights.entities.people.length > 0 && (
                <div>
                  <p className="text-xs font-medium oracle-text-secondary-color uppercase tracking-wider mb-2">
                    People
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {insights.entities.people.map((person, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-xs"
                      >
                        {person}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {insights.entities.organizations && insights.entities.organizations.length > 0 && (
                <div>
                  <p className="text-xs font-medium oracle-text-secondary-color uppercase tracking-wider mb-2">
                    Organizations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {insights.entities.organizations.map((org, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-xs"
                      >
                        {org}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {insights.entities.locations && insights.entities.locations.length > 0 && (
                <div>
                  <p className="text-xs font-medium oracle-text-secondary-color uppercase tracking-wider mb-2">
                    Locations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {insights.entities.locations.map((location, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-xs"
                      >
                        {location}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sentiment Section */}
      {insights.sentiment && (
        <div className={`rounded-xl bg-gradient-to-br border p-4 ${getSentimentColor(insights.sentiment.overall)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">Sentiment Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getSentimentEmoji(insights.sentiment.overall)}</span>
              <span className="text-lg font-semibold capitalize">
                {insights.sentiment.overall}
              </span>
            </div>
          </div>

          {insights.sentiment.score !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">Confidence</span>
                <span className="text-xs font-bold">{Math.round(insights.sentiment.score * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-card/10">
                <div
                  className="h-full rounded-full bg-current transition-all duration-500"
                  style={{ width: `${insights.sentiment.score * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
