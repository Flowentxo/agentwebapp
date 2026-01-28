/**
 * Brain AI v3.0 - Meeting Intelligence View
 *
 * Phase 4: Meeting Intelligence & Voice Processing
 *
 * Features:
 * - Meeting list with status indicators
 * - Transcript viewer with speaker highlighting
 * - AI-generated summary display
 * - Action items with one-click task creation
 * - Decisions timeline
 * - Participant insights
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Video,
  Mic,
  Users,
  Clock,
  Play,
  Pause,
  ChevronRight,
  Check,
  AlertTriangle,
  Loader2,
  FileText,
  ListTodo,
  Target,
  BarChart3,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Plus,
  Calendar,
  User,
  Copy,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type BotStatus = 'ready' | 'joining' | 'in_waiting_room' | 'in_meeting' | 'recording' | 'processing' | 'done' | 'error';

interface Meeting {
  id: string;
  title: string;
  platform: 'zoom' | 'google_meet' | 'microsoft_teams' | 'webex';
  status: BotStatus;
  duration?: number;
  participantCount?: number;
  hasTranscript: boolean;
  hasSummary: boolean;
  createdAt: string;
}

interface TranscriptSegment {
  speakerId: string;
  speakerName?: string;
  text: string;
  startTime: number;
  endTime: number;
}

interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  context: string;
  timestamp: number;
  status: 'pending' | 'in_progress' | 'completed';
}

interface Decision {
  id: string;
  description: string;
  madeBy: string;
  rationale?: string;
  timestamp: number;
}

interface ParticipantInsight {
  speakerId: string;
  speakerName: string;
  speakingTime: number;
  speakingPercentage: number;
  actionItemsAssigned: number;
}

interface MeetingIntelligence {
  meetingId: string;
  summary: {
    title: string;
    overview: string;
    keyPoints: string[];
    duration: number;
    participantCount: number;
  };
  transcript: TranscriptSegment[];
  actionItems: ActionItem[];
  decisions: Decision[];
  participantInsights: ParticipantInsight[];
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MeetingIntelligenceView() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [intelligence, setIntelligence] = useState<MeetingIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'actions' | 'insights'>('summary');
  const [joinUrl, setJoinUrl] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Fetch meetings list
  const fetchMeetings = useCallback(async () => {
    try {
      const response = await fetch('/api/brain/meetings');
      if (!response.ok) throw new Error('Failed to fetch meetings');
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
    // Poll for status updates
    const interval = setInterval(fetchMeetings, 10000);
    return () => clearInterval(interval);
  }, [fetchMeetings]);

  // Load meeting intelligence
  const loadIntelligence = useCallback(async (meetingId: string) => {
    setIsLoadingIntelligence(true);
    try {
      const response = await fetch(`/api/brain/meetings/${meetingId}/intelligence`);
      if (!response.ok) throw new Error('Failed to fetch intelligence');
      const data = await response.json();
      setIntelligence(data.intelligence);
    } catch (error) {
      console.error('Failed to load intelligence:', error);
    } finally {
      setIsLoadingIntelligence(false);
    }
  }, []);

  // Handle meeting selection
  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    if (meeting.hasSummary || meeting.hasTranscript) {
      loadIntelligence(meeting.id);
    } else {
      setIntelligence(null);
    }
  };

  // Join a meeting
  const handleJoinMeeting = async () => {
    if (!joinUrl.trim()) return;

    setIsJoining(true);
    try {
      const response = await fetch('/api/brain/meetings/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingUrl: joinUrl }),
      });

      if (!response.ok) throw new Error('Failed to join meeting');

      const data = await response.json();
      setMeetings(prev => [data.meeting, ...prev]);
      setJoinUrl('');
    } catch (error) {
      console.error('Failed to join meeting:', error);
    } finally {
      setIsJoining(false);
    }
  };

  // Create task from action item
  const handleCreateTask = async (actionItem: ActionItem) => {
    // Would integrate with task management system
    console.log('Creating task:', actionItem);
  };

  return (
    <div className="meeting-intelligence">
      {/* Header */}
      <div className="mi-header">
        <div>
          <h1>Meeting Intelligence</h1>
          <p>AI-powered meeting analysis and insights</p>
        </div>
      </div>

      {/* Join Meeting */}
      <div className="mi-join-section">
        <div className="mi-join-input">
          <Video className="w-5 h-5" />
          <input
            type="text"
            placeholder="Paste meeting URL (Zoom, Teams, Google Meet)..."
            value={joinUrl}
            onChange={e => setJoinUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoinMeeting()}
          />
          <button
            className="mi-join-button"
            onClick={handleJoinMeeting}
            disabled={isJoining || !joinUrl.trim()}
          >
            {isJoining ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Join Meeting
          </button>
        </div>
      </div>

      <div className="mi-content">
        {/* Meetings List */}
        <div className="mi-sidebar">
          <div className="mi-sidebar-header">
            <h3>Recent Meetings</h3>
            <button onClick={fetchMeetings} className="mi-refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="mi-loading">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="mi-empty">
              <Video className="w-8 h-8" />
              <p>No meetings yet</p>
              <span>Join a meeting to start recording</span>
            </div>
          ) : (
            <div className="mi-meetings-list">
              {meetings.map(meeting => (
                <div
                  key={meeting.id}
                  className={`mi-meeting-card ${selectedMeeting?.id === meeting.id ? 'selected' : ''}`}
                  onClick={() => handleSelectMeeting(meeting)}
                >
                  <div className="mi-meeting-icon">
                    <PlatformIcon platform={meeting.platform} />
                  </div>
                  <div className="mi-meeting-info">
                    <h4>{meeting.title}</h4>
                    <div className="mi-meeting-meta">
                      <span><Clock className="w-3 h-3" /> {formatDuration(meeting.duration)}</span>
                      {meeting.participantCount && (
                        <span><Users className="w-3 h-3" /> {meeting.participantCount}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={meeting.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="mi-main">
          {selectedMeeting ? (
            <>
              {/* Meeting Header */}
              <div className="mi-meeting-header">
                <div className="mi-meeting-title">
                  <PlatformIcon platform={selectedMeeting.platform} />
                  <div>
                    <h2>{selectedMeeting.title}</h2>
                    <span>{new Date(selectedMeeting.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <StatusBadge status={selectedMeeting.status} large />
              </div>

              {/* Tabs */}
              <div className="mi-tabs">
                <button
                  className={`mi-tab ${activeTab === 'summary' ? 'active' : ''}`}
                  onClick={() => setActiveTab('summary')}
                >
                  <Sparkles className="w-4 h-4" />
                  Summary
                </button>
                <button
                  className={`mi-tab ${activeTab === 'transcript' ? 'active' : ''}`}
                  onClick={() => setActiveTab('transcript')}
                >
                  <FileText className="w-4 h-4" />
                  Transcript
                </button>
                <button
                  className={`mi-tab ${activeTab === 'actions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('actions')}
                >
                  <ListTodo className="w-4 h-4" />
                  Actions
                  {intelligence?.actionItems.length ? (
                    <span className="mi-tab-badge">{intelligence.actionItems.length}</span>
                  ) : null}
                </button>
                <button
                  className={`mi-tab ${activeTab === 'insights' ? 'active' : ''}`}
                  onClick={() => setActiveTab('insights')}
                >
                  <BarChart3 className="w-4 h-4" />
                  Insights
                </button>
              </div>

              {/* Tab Content */}
              <div className="mi-tab-content">
                {isLoadingIntelligence ? (
                  <div className="mi-loading-content">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p>Loading intelligence...</p>
                  </div>
                ) : !intelligence ? (
                  <div className="mi-no-intelligence">
                    <AlertTriangle className="w-8 h-8" />
                    <p>Intelligence not yet available</p>
                    <span>
                      {selectedMeeting.status === 'recording'
                        ? 'Meeting is still in progress...'
                        : selectedMeeting.status === 'processing'
                        ? 'Processing transcript...'
                        : 'Waiting for transcript...'}
                    </span>
                  </div>
                ) : (
                  <>
                    {activeTab === 'summary' && (
                      <SummaryTab intelligence={intelligence} />
                    )}
                    {activeTab === 'transcript' && (
                      <TranscriptTab segments={intelligence.transcript} />
                    )}
                    {activeTab === 'actions' && (
                      <ActionsTab
                        actionItems={intelligence.actionItems}
                        decisions={intelligence.decisions}
                        onCreateTask={handleCreateTask}
                      />
                    )}
                    {activeTab === 'insights' && (
                      <InsightsTab insights={intelligence.participantInsights} />
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="mi-no-selection">
              <Video className="w-12 h-12" />
              <h3>Select a Meeting</h3>
              <p>Choose a meeting from the list to view its intelligence report</p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .meeting-intelligence {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary, #0f0f1a);
        }

        .mi-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
        }

        .mi-header h1 {
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 4px;
        }

        .mi-header p {
          font-size: 14px;
          color: var(--text-tertiary, #666);
        }

        .mi-join-section {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
        }

        .mi-join-input {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-secondary, #1a1a2e);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 12px;
        }

        .mi-join-input svg {
          color: var(--text-tertiary, #666);
        }

        .mi-join-input input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary, #fff);
          font-size: 14px;
          outline: none;
        }

        .mi-join-input input::placeholder {
          color: var(--text-tertiary, #666);
        }

        .mi-join-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--color-primary, #7c3aed);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mi-join-button:hover:not(:disabled) {
          background: var(--color-primary-dark, #6d28d9);
        }

        .mi-join-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mi-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .mi-sidebar {
          width: 320px;
          border-right: 1px solid var(--border-color, #2a2a4a);
          display: flex;
          flex-direction: column;
        }

        .mi-sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
        }

        .mi-sidebar-header h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .mi-refresh {
          background: none;
          border: none;
          color: var(--text-tertiary, #666);
          cursor: pointer;
          padding: 4px;
        }

        .mi-refresh:hover {
          color: var(--text-primary, #fff);
        }

        .mi-loading,
        .mi-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
          color: var(--text-tertiary, #666);
        }

        .mi-empty p {
          font-size: 14px;
          font-weight: 500;
          margin: 12px 0 4px;
        }

        .mi-empty span {
          font-size: 12px;
        }

        .mi-meetings-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .mi-meeting-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 4px;
        }

        .mi-meeting-card:hover {
          background: var(--bg-secondary, #1a1a2e);
        }

        .mi-meeting-card.selected {
          background: rgba(124, 58, 237, 0.1);
          border: 1px solid var(--color-primary, #7c3aed);
        }

        .mi-meeting-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 10px;
          flex-shrink: 0;
        }

        .mi-meeting-info {
          flex: 1;
          min-width: 0;
        }

        .mi-meeting-info h4 {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mi-meeting-meta {
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }

        .mi-meeting-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-tertiary, #666);
        }

        .mi-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .mi-meeting-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
        }

        .mi-meeting-title {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .mi-meeting-title h2 {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .mi-meeting-title span {
          font-size: 13px;
          color: var(--text-tertiary, #666);
        }

        .mi-tabs {
          display: flex;
          gap: 4px;
          padding: 12px 24px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
        }

        .mi-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-secondary, #999);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mi-tab:hover {
          background: var(--bg-secondary, #1a1a2e);
          color: var(--text-primary, #fff);
        }

        .mi-tab.active {
          background: rgba(124, 58, 237, 0.1);
          color: var(--color-primary, #7c3aed);
        }

        .mi-tab-badge {
          padding: 2px 6px;
          background: var(--color-primary, #7c3aed);
          border-radius: 10px;
          font-size: 11px;
          color: white;
        }

        .mi-tab-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .mi-loading-content,
        .mi-no-intelligence,
        .mi-no-selection {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--text-tertiary, #666);
        }

        .mi-no-selection h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin: 16px 0 8px;
        }

        .mi-no-intelligence p,
        .mi-no-selection p {
          font-size: 14px;
          margin-top: 8px;
        }

        .mi-no-intelligence span {
          font-size: 13px;
          margin-top: 4px;
        }

        /* Summary Tab Styles */
        .summary-section {
          margin-bottom: 24px;
        }

        .summary-section h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 12px;
        }

        .summary-overview {
          padding: 16px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          font-size: 14px;
          color: var(--text-primary, #fff);
          line-height: 1.6;
        }

        .summary-key-points {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .key-point {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 8px;
        }

        .key-point svg {
          color: var(--color-primary, #7c3aed);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .key-point span {
          font-size: 14px;
          color: var(--text-primary, #fff);
          line-height: 1.5;
        }

        /* Transcript Tab Styles */
        .transcript-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .transcript-segment {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 10px;
        }

        .segment-speaker {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 80px;
        }

        .speaker-avatar {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary, #7c3aed);
          border-radius: 50%;
          font-size: 14px;
          font-weight: 600;
          color: white;
        }

        .speaker-name {
          font-size: 11px;
          color: var(--text-tertiary, #666);
          text-align: center;
        }

        .segment-content {
          flex: 1;
        }

        .segment-timestamp {
          font-size: 11px;
          color: var(--color-primary, #7c3aed);
          margin-bottom: 4px;
        }

        .segment-text {
          font-size: 14px;
          color: var(--text-primary, #fff);
          line-height: 1.6;
        }

        /* Actions Tab Styles */
        .actions-section {
          margin-bottom: 32px;
        }

        .actions-section h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 16px;
        }

        .action-item {
          padding: 16px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          border-left: 3px solid var(--color-primary, #7c3aed);
          margin-bottom: 12px;
        }

        .action-item.high {
          border-left-color: #ef4444;
        }

        .action-item.medium {
          border-left-color: #f59e0b;
        }

        .action-item.low {
          border-left-color: #10b981;
        }

        .action-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .action-description {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #fff);
          flex: 1;
        }

        .action-priority {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .action-priority.high {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .action-priority.medium {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .action-priority.low {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .action-meta {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }

        .action-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-tertiary, #666);
        }

        .action-context {
          padding: 10px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-secondary, #999);
          font-style: italic;
          margin-bottom: 12px;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--color-primary, #7c3aed);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button:hover {
          background: var(--color-primary-dark, #6d28d9);
        }

        .decision-item {
          padding: 16px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          margin-bottom: 12px;
        }

        .decision-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .decision-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(16, 185, 129, 0.2);
          border-radius: 8px;
          color: #10b981;
          flex-shrink: 0;
        }

        .decision-content {
          flex: 1;
        }

        .decision-content p {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #fff);
          margin-bottom: 8px;
        }

        .decision-meta {
          display: flex;
          gap: 16px;
        }

        .decision-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-tertiary, #666);
        }

        /* Insights Tab Styles */
        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .insight-card {
          padding: 20px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
        }

        .insight-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .insight-avatar {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary, #7c3aed);
          border-radius: 50%;
          font-size: 18px;
          font-weight: 600;
          color: white;
        }

        .insight-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .insight-stats {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .insight-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .insight-stat-label {
          font-size: 13px;
          color: var(--text-tertiary, #666);
        }

        .insight-stat-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .speaking-bar {
          height: 6px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 8px;
        }

        .speaking-bar-fill {
          height: 100%;
          background: var(--color-primary, #7c3aed);
          border-radius: 3px;
        }

        @media (max-width: 768px) {
          .mi-content {
            flex-direction: column;
          }

          .mi-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border-color, #2a2a4a);
            max-height: 200px;
          }

          .mi-tabs {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function PlatformIcon({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    zoom: '#2D8CFF',
    google_meet: '#00897B',
    microsoft_teams: '#6264A7',
    webex: '#00BCEB',
  };

  return (
    <Video className="w-5 h-5" style={{ color: colors[platform] || '#666' }} />
  );
}

function StatusBadge({ status, large }: { status: BotStatus; large?: boolean }) {
  const configs: Record<BotStatus, { label: string; color: string; icon: React.ReactNode }> = {
    ready: { label: 'Ready', color: '#10b981', icon: <Check className="w-3 h-3" /> },
    joining: { label: 'Joining', color: '#f59e0b', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    in_waiting_room: { label: 'Waiting', color: '#f59e0b', icon: <Clock className="w-3 h-3" /> },
    in_meeting: { label: 'In Meeting', color: '#3b82f6', icon: <Users className="w-3 h-3" /> },
    recording: { label: 'Recording', color: '#ef4444', icon: <Mic className="w-3 h-3" /> },
    processing: { label: 'Processing', color: '#8b5cf6', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    done: { label: 'Completed', color: '#10b981', icon: <CheckCircle2 className="w-3 h-3" /> },
    error: { label: 'Error', color: '#ef4444', icon: <XCircle className="w-3 h-3" /> },
  };

  const config = configs[status];

  return (
    <span
      className={`status-badge ${large ? 'large' : ''}`}
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
    >
      {config.icon}
      {config.label}

      <style jsx>{`
        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
        }

        .status-badge.large {
          padding: 6px 12px;
          font-size: 13px;
        }
      `}</style>
    </span>
  );
}

function SummaryTab({ intelligence }: { intelligence: MeetingIntelligence }) {
  return (
    <div>
      <div className="summary-section">
        <h3><Sparkles className="w-5 h-5" /> Overview</h3>
        <div className="summary-overview">
          {intelligence.summary.overview}
        </div>
      </div>

      <div className="summary-section">
        <h3><Zap className="w-5 h-5" /> Key Points</h3>
        <div className="summary-key-points">
          {intelligence.summary.keyPoints.map((point, i) => (
            <div key={i} className="key-point">
              <CheckCircle2 className="w-4 h-4" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TranscriptTab({ segments }: { segments: TranscriptSegment[] }) {
  return (
    <div className="transcript-container">
      {segments.map((segment, i) => (
        <div key={i} className="transcript-segment">
          <div className="segment-speaker">
            <div className="speaker-avatar">
              {(segment.speakerName || `S${segment.speakerId}`).charAt(0).toUpperCase()}
            </div>
            <span className="speaker-name">{segment.speakerName || `Speaker ${segment.speakerId}`}</span>
          </div>
          <div className="segment-content">
            <div className="segment-timestamp">{formatTimestamp(segment.startTime)}</div>
            <p className="segment-text">{segment.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionsTab({
  actionItems,
  decisions,
  onCreateTask,
}: {
  actionItems: ActionItem[];
  decisions: Decision[];
  onCreateTask: (item: ActionItem) => void;
}) {
  return (
    <div>
      <div className="actions-section">
        <h3><ListTodo className="w-5 h-5" /> Action Items ({actionItems.length})</h3>
        {actionItems.map(item => (
          <div key={item.id} className={`action-item ${item.priority}`}>
            <div className="action-header">
              <span className="action-description">{item.description}</span>
              <span className={`action-priority ${item.priority}`}>{item.priority}</span>
            </div>
            <div className="action-meta">
              {item.assignee && (
                <span><User className="w-3 h-3" /> {item.assignee}</span>
              )}
              {item.dueDate && (
                <span><Calendar className="w-3 h-3" /> {item.dueDate}</span>
              )}
              <span><Clock className="w-3 h-3" /> {formatTimestamp(item.timestamp)}</span>
            </div>
            {item.context && (
              <div className="action-context">&quot;{item.context}&quot;</div>
            )}
            <button className="action-button" onClick={() => onCreateTask(item)}>
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          </div>
        ))}
      </div>

      <div className="actions-section">
        <h3><Target className="w-5 h-5" /> Decisions ({decisions.length})</h3>
        {decisions.map(decision => (
          <div key={decision.id} className="decision-item">
            <div className="decision-header">
              <div className="decision-icon">
                <Check className="w-4 h-4" />
              </div>
              <div className="decision-content">
                <p>{decision.description}</p>
                <div className="decision-meta">
                  <span><User className="w-3 h-3" /> {decision.madeBy}</span>
                  <span><Clock className="w-3 h-3" /> {formatTimestamp(decision.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsTab({ insights }: { insights: ParticipantInsight[] }) {
  return (
    <div className="insights-grid">
      {insights.map(insight => (
        <div key={insight.speakerId} className="insight-card">
          <div className="insight-header">
            <div className="insight-avatar">
              {insight.speakerName.charAt(0).toUpperCase()}
            </div>
            <span className="insight-name">{insight.speakerName}</span>
          </div>
          <div className="insight-stats">
            <div className="insight-stat">
              <span className="insight-stat-label">Speaking Time</span>
              <span className="insight-stat-value">{formatDuration(insight.speakingTime)}</span>
            </div>
            <div className="insight-stat">
              <span className="insight-stat-label">Participation</span>
              <span className="insight-stat-value">{insight.speakingPercentage}%</span>
            </div>
            <div className="speaking-bar">
              <div
                className="speaking-bar-fill"
                style={{ width: `${insight.speakingPercentage}%` }}
              />
            </div>
            <div className="insight-stat">
              <span className="insight-stat-label">Action Items</span>
              <span className="insight-stat-value">{insight.actionItemsAssigned}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDuration(seconds?: number): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default MeetingIntelligenceView;
