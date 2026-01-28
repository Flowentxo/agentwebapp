'use client';

import { useEffect, useRef } from 'react';
import { AgentPersona } from '@/lib/agents/personas';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
}

interface MessageListProps {
  messages: Message[];
  agent: AgentPersona;
  isLoading?: boolean;
  streamingMessage?: string;
}

export function MessageList({ messages, agent, isLoading, streamingMessage }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const Icon = agent.icon;

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingMessage]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="message-list-empty premium">
        {/* Premium Welcome Card */}
        <div className="premium-welcome-card">
          {/* Professional Agent Avatar */}
          <div className="premium-agent-header">
            <div
              className="premium-avatar"
              style={{
                background: `linear-gradient(135deg, ${agent.color}15, ${agent.color}25)`,
                borderColor: `${agent.color}40`
              }}
            >
              <Icon size={32} className="premium-avatar-icon" style={{ color: agent.color }} />
            </div>
            <div className="premium-agent-info">
              <h2 className="premium-agent-name">{agent.name}</h2>
              <p className="premium-agent-role">{agent.role}</p>
            </div>
          </div>

          {/* Professional Bio */}
          <div className="premium-bio-section">
            <p className="premium-bio-text">{agent.bio}</p>
          </div>

          {/* Elegant Sample Prompts */}
          <div className="premium-prompts-section">
            <div className="premium-section-label">
              <span className="premium-label-text">Get started with</span>
            </div>
            <div className="premium-prompts-grid">
              {agent.specialties.slice(0, 3).map((specialty, index) => (
                <button
                  key={specialty}
                  className="premium-prompt-card"
                  onClick={() => {
                    console.log(`Demo question: ${specialty}`);
                  }}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <div className="premium-prompt-content">
                    <span className="premium-prompt-text">
                      {specialty === 'ROI Calculator' ? 'Calculate ROI analysis' :
                       specialty === 'Financial Analysis' ? 'Review financial data' :
                       specialty === 'Sales Forecasting' ? 'Forecast sales trends' :
                       `${specialty} assistance`}
                    </span>
                    <svg className="premium-prompt-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Professional Capabilities */}
          <div className="premium-capabilities-section">
            <div className="premium-section-label">
              <span className="premium-label-text">Core capabilities</span>
            </div>
            <div className="premium-capabilities-grid">
              {agent.specialties.map((specialty) => (
                <div key={specialty} className="premium-capability-tag">
                  <svg className="premium-capability-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="2" fill="currentColor" opacity="0.6"/>
                  </svg>
                  <span className="premium-capability-text">{specialty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list premium-chat">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`premium-message premium-message-${message.role}`}
        >
          {message.role === 'assistant' && (
            <div
              className="premium-message-avatar"
              style={{
                background: `linear-gradient(135deg, ${agent.color}15, ${agent.color}25)`,
                borderColor: `${agent.color}40`
              }}
            >
              <Icon size={16} style={{ color: agent.color }} />
            </div>
          )}

          <div className="premium-message-content">
            {message.role === 'assistant' ? (
              <ReactMarkdown
                components={{
                  // Custom rendering for code blocks
                  code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode; [key: string]: any }) {
                    return inline ? (
                      <code className="premium-inline-code" {...props}>
                        {children}
                      </code>
                    ) : (
                      <pre className="premium-code-block">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                  // Custom rendering for lists
                  ul({ children }) {
                    return <ul className="premium-message-list-ul">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="premium-message-list-ol">{children}</ol>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <p className="premium-message-text">{message.content}</p>
            )}
            <span className="premium-message-time">
              {new Date(message.createdAt).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {message.role === 'user' && (
            <div className="premium-message-avatar premium-user-avatar">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="6" r="3" fill="currentColor" opacity="0.6"/>
                <path d="M3 14C3 11.2386 5.23858 9 8 9C10.7614 9 13 11.2386 13 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>
      ))}

      {streamingMessage && (
        <div className="premium-message premium-message-assistant premium-streaming slide-in-fade">
          <div
            className="premium-message-avatar pulse-gentle"
            style={{
              background: `linear-gradient(135deg, ${agent.color}15, ${agent.color}25)`,
              borderColor: `${agent.color}40`
            }}
          >
            <Icon size={16} style={{ color: agent.color }} />
          </div>
          <div className="premium-message-content">
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode; [key: string]: any }) {
                  return inline ? (
                    <code className="premium-inline-code" {...props}>
                      {children}
                    </code>
                  ) : (
                    <pre className="premium-code-block">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                },
                ul({ children }) {
                  return <ul className="premium-message-list-ul">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="premium-message-list-ol">{children}</ol>;
                },
              }}
            >
              {streamingMessage}
            </ReactMarkdown>
            <div className="premium-streaming-indicator">
              <div className="streaming-progress">
                <span className="streaming-bar"></span>
              </div>
              <span className="premium-streaming-text">Streaming</span>
            </div>
          </div>
        </div>
      )}

      {isLoading && !streamingMessage && (
        <div className="premium-message premium-message-assistant">
          <div
            className="premium-message-avatar"
            style={{
              background: `linear-gradient(135deg, ${agent.color}15, ${agent.color}25)`,
              borderColor: `${agent.color}40`
            }}
          >
            <Icon size={16} style={{ color: agent.color }} />
          </div>
          <div className="premium-typing-wrapper">
            <div className="premium-typing-dots">
              <span className="premium-dot"></span>
              <span className="premium-dot"></span>
              <span className="premium-dot"></span>
            </div>
            <span className="premium-typing-text">{agent.name} is analyzing</span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
