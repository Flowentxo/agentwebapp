'use client';

import { useState } from 'react';
import { CalendarConnect } from './CalendarConnect';
import { UpcomingMeetings } from './UpcomingMeetings';
import { MeetingBriefingModal } from './MeetingBriefingModal';
import { Zap, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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

export function PredictiveContextEngine() {
  const [selectedBriefing, setSelectedBriefing] = useState<MeetingBriefing | null>(null);

  return (
    <div className="space-y-8">
      {/* Quick Insight Card (New) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:bg-card/[0.04] transition-colors"
      >
        {/* Demo Badge */}
        <div className="absolute top-4 right-4">
          <span className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
            DEMO
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl group-hover:scale-105 transition-transform duration-300 border border-indigo-500/20">
            <Zap className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Daily Focus: Q1 Strategy Review</h3>
            <p className="text-sm text-white/60 leading-relaxed mb-6 max-w-2xl">
              You have a critical meeting with <span className="font-bold text-white">Acme Corp</span> tomorrow at 10:00 AM.
              AI analysis suggests focusing on the new product timeline and resource allocation based on their recent activity.
            </p>
            <div className="flex items-center gap-4">
              <button
                className="h-9 px-4 rounded-xl bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
              >
                Connect Calendar for Real Insights
              </button>
              <button
                onClick={() => {/* Logic to open specific briefing */ }}
                className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors flex items-center gap-2"
              >
                View Briefing <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Calendar Connection */}
      <CalendarConnect />

      {/* Upcoming Meetings */}
      <div className="relative">
        <UpcomingMeetings
          onViewBriefing={(briefing) => setSelectedBriefing(briefing)}
        />
      </div>

      {/* Briefing Modal */}
      <MeetingBriefingModal
        briefing={selectedBriefing}
        onClose={() => setSelectedBriefing(null)}
      />
    </div>
  );
}
