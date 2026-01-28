'use client';

import { useState, useEffect } from 'react';
import { Collaboration } from '@/lib/agents/collaboration-engine';
import { REVOLUTIONARY_PERSONAS } from '@/lib/agents/personas-revolutionary';
import { AgentConversationBubble } from './AgentConversationBubble';
import { RevolutionaryAvatar } from './RevolutionaryAvatar';
import { Users, Zap, Target, TrendingUp, ChevronDown, ChevronUp, Send, Download, FileText } from 'lucide-react';

interface AgentCollaborationCardProps {
  collaboration: Collaboration;
  onComplete?: () => void;
  showMessages?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function AgentCollaborationCard({
  collaboration,
  onComplete,
  showMessages = true
}: AgentCollaborationCardProps) {
  const [isExpanded, setIsExpanded] = useState(showMessages);
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);

  const agents = collaboration.involvedAgents
    .map(id => REVOLUTIONARY_PERSONAS[id as keyof typeof REVOLUTIONARY_PERSONAS])
    .filter(Boolean);

  const getStatusColor = () => {
    switch (collaboration.status) {
      case 'planning': return '#60a5fa'; // blue
      case 'executing': return '#fbbf24'; // amber
      case 'debating': return '#a78bfa'; // purple
      case 'completed': return '#34d399'; // green
      default: return '#6b7280'; // gray
    }
  };

  const getStatusIcon = () => {
    switch (collaboration.status) {
      case 'planning': return <Users className="h-4 w-4" />;
      case 'executing': return <Zap className="h-4 w-4" />;
      case 'debating': return <Target className="h-4 w-4" />;
      case 'completed': return <TrendingUp className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  // Animate messages appearing
  useEffect(() => {
    if (isExpanded && collaboration.messages.length > visibleMessages) {
      const timer = setTimeout(() => {
        setVisibleMessages(prev => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, visibleMessages, collaboration.messages.length]);

  // Complete callback
  useEffect(() => {
    if (collaboration.status === 'completed' && onComplete) {
      onComplete();
    }
  }, [collaboration.status, onComplete]);

  // Send user message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userInput.trim() || isSending) return;

    setIsSending(true);

    try {
      const response = await fetch(`${API_BASE}/api/collaborations/${collaboration.id}/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user'
        },
        body: JSON.stringify({
          content: userInput.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      console.log('[USER_INTERACTION] Message sent successfully');
      setUserInput('');
    } catch (error) {
      console.error('[USER_INTERACTION] Failed to send:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Download document
  const handleDownloadDocument = async (documentType: string) => {
    setIsGeneratingDoc(true);

    try {
      const response = await fetch(`${API_BASE}/api/collaborations/${collaboration.id}/generate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user'
        },
        body: JSON.stringify({ documentType })
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      // Download PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentType}-${collaboration.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('[DOCUMENT] Downloaded:', documentType);
    } catch (error) {
      console.error('[DOCUMENT] Failed to download:', error);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-3xl border transition-all duration-500 breathing-slow micro-lift"
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.03) 100%)',
        borderColor: getStatusColor() + '30',
        boxShadow: `0 8px 32px ${getStatusColor()}20`
      }}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Status Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1 mb-3 text-xs font-bold uppercase tracking-wide glowing"
              style={{
                background: `${getStatusColor()}20`,
                color: getStatusColor(),
                border: `1px solid ${getStatusColor()}40`
              }}
            >
              {getStatusIcon()}
              {collaboration.status}
            </div>

            {/* Task Description */}
            <h3 className="text-xl font-bold text-text mb-2">
              {collaboration.taskDescription}
            </h3>

            {/* Team Avatars */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">Team:</span>
              <div className="flex -space-x-3">
                {agents.map((agent, index) => (
                  <div
                    key={agent.id}
                    className="relative breathing-fast"
                    style={{
                      zIndex: agents.length - index,
                      animationDelay: `${index * 0.2}s`
                    }}
                  >
                    <RevolutionaryAvatar
                      personality={agent}
                      size="sm"
                      animated={true}
                      showGlow={false}
                    />
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium text-text">
                {agents.length} {agents.length === 1 ? 'Agent' : 'Agents'}
              </span>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          {collaboration.messages.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-card/10 micro-bounce"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-text-muted" />
              ) : (
                <ChevronDown className="h-5 w-5 text-text-muted" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {isExpanded && collaboration.messages.length > 0 && (
        <div className="p-6 space-y-3 max-h-[600px] overflow-y-auto">
          {collaboration.messages.slice(0, visibleMessages).map((message, index) => (
            <AgentConversationBubble
              key={message.id}
              message={message}
              isAnimating={index === visibleMessages - 1}
            />
          ))}

          {visibleMessages < collaboration.messages.length && (
            <div className="flex justify-center py-4">
              <div className="flex gap-1">
                <div
                  className="h-2 w-2 rounded-full animate-pulse"
                  style={{ background: getStatusColor() }}
                />
                <div
                  className="h-2 w-2 rounded-full animate-pulse"
                  style={{ background: getStatusColor(), animationDelay: '0.2s' }}
                />
                <div
                  className="h-2 w-2 rounded-full animate-pulse"
                  style={{ background: getStatusColor(), animationDelay: '0.4s' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Interaction Input (only when executing) */}
      {isExpanded && (collaboration.status === 'executing' || collaboration.status === 'debating') && (
        <div className="px-6 py-4 border-t border-white/10">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask a question or provide input..."
              disabled={isSending}
              className="flex-1 px-4 py-2 rounded-xl border border-white/10 bg-card/5 text-text placeholder-text-muted focus:outline-none focus:border-purple-500/50 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!userInput.trim() || isSending}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </form>
          <p className="mt-2 text-xs text-text-muted">
            Agents will see your message and may respond
          </p>
        </div>
      )}

      {/* Download Deliverables (only when completed) */}
      {collaboration.status === 'completed' && isExpanded && (
        <div className="px-6 py-4 border-t border-white/10">
          <button
            onClick={() => setShowDownloads(!showDownloads)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-500/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-green-400" />
              <div className="text-left">
                <p className="font-medium text-text">Download Business Documents</p>
                <p className="text-xs text-text-muted">Export collaboration results as professional PDFs</p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-green-400 transition-transform ${showDownloads ? 'rotate-180' : ''}`} />
          </button>

          {showDownloads && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => handleDownloadDocument('business-plan')}
                disabled={isGeneratingDoc}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-card/5 hover:bg-card/10 transition-all disabled:opacity-50 text-left"
              >
                <Download className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="font-medium text-text text-sm">Business Plan</p>
                  <p className="text-xs text-text-muted">Comprehensive strategy & financials</p>
                </div>
              </button>

              <button
                onClick={() => handleDownloadDocument('marketing-strategy')}
                disabled={isGeneratingDoc}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-card/5 hover:bg-card/10 transition-all disabled:opacity-50 text-left"
              >
                <Download className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="font-medium text-text text-sm">Marketing Strategy</p>
                  <p className="text-xs text-text-muted">Campaign plan & audience analysis</p>
                </div>
              </button>

              <button
                onClick={() => handleDownloadDocument('technical-doc')}
                disabled={isGeneratingDoc}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-card/5 hover:bg-card/10 transition-all disabled:opacity-50 text-left"
              >
                <Download className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="font-medium text-text text-sm">Technical Documentation</p>
                  <p className="text-xs text-text-muted">Architecture & implementation</p>
                </div>
              </button>

              <button
                onClick={() => handleDownloadDocument('generic-report')}
                disabled={isGeneratingDoc}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-card/5 hover:bg-card/10 transition-all disabled:opacity-50 text-left"
              >
                <Download className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="font-medium text-text text-sm">Full Report</p>
                  <p className="text-xs text-text-muted">Complete collaboration transcript</p>
                </div>
              </button>
            </div>
          )}

          {isGeneratingDoc && (
            <div className="mt-3 text-center text-sm text-text-muted">
              <span className="inline-flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
                Generating PDF document...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer Stats */}
      {!isExpanded && collaboration.messages.length > 0 && (
        <div className="px-6 py-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">
              {collaboration.messages.length} {collaboration.messages.length === 1 ? 'message' : 'messages'}
            </span>
            <span className="text-text-subtle">
              {new Date(collaboration.startedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {/* Completion Glow */}
      {collaboration.status === 'completed' && (
        <div
          className="absolute inset-0 opacity-10 blur-3xl pointer-events-none breathing"
          style={{
            background: `radial-gradient(circle at center, ${getStatusColor()}, transparent 70%)`
          }}
        />
      )}
    </div>
  );
}
