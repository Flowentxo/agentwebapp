'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees: Array<{ email: string; name?: string }>;
  meetingLink?: string;
}

interface MeetingBriefing {
  id: string;
  eventId: string;
  title: string;
  summary?: string;
  keyPoints?: string[];
  status: 'ready' | 'generating';
  confidence: 'low' | 'medium' | 'high' | 'critical';
}

interface UpcomingMeetingsProps {
  onViewBriefing?: (briefing: MeetingBriefing) => void;
}

export function UpcomingMeetings({ onViewBriefing }: UpcomingMeetingsProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [briefings, setBriefings] = useState<Record<string, MeetingBriefing>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingEvents();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUpcomingEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch('/api/calendar/events?hours=24', {
        headers: {
          'x-user-id': 'demo-user',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);

        // Fetch briefings for these events
        if (data.events && data.events.length > 0) {
          await fetchBriefings(data.events);
        }
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBriefings = async (events: CalendarEvent[]) => {
    const briefingsMap: Record<string, MeetingBriefing> = {};

    for (const event of events) {
      try {
        const response = await fetch(`/api/predictions/briefing/${event.id}`, {
          headers: {
            'x-user-id': 'demo-user',
          },
        });

        if (response.ok) {
          const data = await response.json();
          briefingsMap[event.id] = data.briefing;
        }
      } catch (err) {
        // Briefing doesn't exist yet
      }
    }

    setBriefings(briefingsMap);
  };

  const getTimeUntilMeeting = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = start.getTime() - now.getTime();
    const minutes = Math.floor(diff / 1000 / 60);

    if (minutes < 0) return 'In progress';
    if (minutes < 60) return `In ${minutes}min`;
    if (minutes < 1440) return `In ${Math.floor(minutes / 60)}h ${minutes % 60}min`;
    return formatDistanceToNow(start, { addSuffix: true });
  };

  const handleGenerateBriefing = async (eventId: string) => {
    try {
      setBriefings(prev => ({
        ...prev,
        [eventId]: {
          id: 'temp',
          eventId,
          title: 'Generating...',
          status: 'generating',
          confidence: 'medium',
        },
      }));

      // First predict context
      await fetch(`/api/predictions/predict/${eventId}`, {
        method: 'POST',
        headers: {
          'x-user-id': 'demo-user',
        },
      });

      // Then generate briefing
      const response = await fetch(`/api/predictions/briefing/${eventId}`, {
        method: 'POST',
        headers: {
          'x-user-id': 'demo-user',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBriefings(prev => ({
          ...prev,
          [eventId]: data.briefing,
        }));
      }
    } catch (err) {
      console.error('Failed to generate briefing:', err);
      setBriefings(prev => {
        const newBriefings = { ...prev };
        delete newBriefings[eventId];
        return newBriefings;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card/[0.02] border border-white/5 rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/20" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-card/[0.02] border border-white/5 rounded-2xl p-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-card/5 flex items-center justify-center mx-auto mb-4">
             <Calendar className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-white/60 mb-1 font-medium">No upcoming meetings</p>
          <p className="text-[11px] text-white/30 uppercase tracking-wider font-bold">
            Your next 24 hours look clear!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/[0.02] border border-white/5 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-card/[0.02]">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-white/40" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Upcoming Meetings
          </h3>
          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded-lg">
            {events.length}
          </span>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {events.map((event) => {
          const briefing = briefings[event.id];
          const hasBriefing = briefing && briefing.status === 'ready';
          const isGenerating = briefing && briefing.status === 'generating';

          return (
            <div
              key={event.id}
              className="px-6 py-5 hover:bg-card/[0.04] transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-white/90 truncate tracking-tight text-sm">
                      {event.title}
                    </h4>
                    {hasBriefing && (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Ready
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 mb-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{getTimeUntilMeeting(event.startTime)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[200px]">{event.location}</span>
                      </div>
                    )}
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{event.attendees.length} attendees</span>
                      </div>
                    )}
                  </div>

                  {hasBriefing && briefing.summary && (
                    <p className="text-xs text-white/50 line-clamp-2 mb-4 leading-relaxed pl-3 border-l-2 border-indigo-500/30">
                      {briefing.summary}
                    </p>
                  )}

                  <div className="flex items-center gap-3">
                    {hasBriefing ? (
                      <button
                        onClick={() => onViewBriefing?.(briefing)}
                        className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-500/20 transition-colors flex items-center gap-2"
                      >
                        <Sparkles className="w-3 h-3" />
                        View Briefing
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : isGenerating ? (
                      <button
                        disabled
                        className="px-4 py-2 bg-card/5 text-white/30 text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-wait"
                      >
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generating...
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGenerateBriefing(event.id)}
                        className="px-4 py-2 bg-card/5 border border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-card/10 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Sparkles className="w-3 h-3" />
                        Generate Briefing
                      </button>
                    )}

                    {event.meetingLink && (
                      <a
                        href={event.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors"
                      >
                        Join Meeting →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
