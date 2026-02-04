'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAgentById, getAllAgents } from '@/lib/agents/personas';
import {
  MessageCircle,
  Settings,
  Bell,
  User,
  Send,
  Paperclip,
  Mic,
  Sparkles,
  ChevronRight,
  MoreVertical,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw
} from 'lucide-react';
import '@/app/sintra-chat.css';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
}

export default function SintraChatPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const agent = getAgentById(agentId);
  const allAgents = getAllAgents();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string>('default-workspace');
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch workspace ID from localStorage
  useEffect(() => {
    const storedWorkspaceId = localStorage.getItem('current-workspace-id');
    if (storedWorkspaceId) {
      setWorkspaceId(storedWorkspaceId);
    }
  }, []);

  // Fetch existing messages
  const fetchMessages = useCallback(async () => {
    if (!agent) return;

    try {
      const response = await fetch(`/api/agents/${agentId}/chat`, {
        headers: {
          'x-workspace-id': workspaceId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, [agent, agentId, workspaceId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Handle sending messages with streaming
  const handleSendMessage = async (content: string) => {
    if (!agent || !content.trim()) return;

    // Add user message optimistically
    const optimisticUserMessage: Message = {
      id: `temp-user-${Date.now()}`,
      content: content.trim(),
      role: 'user',
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticUserMessage]);
    setInputValue('');
    setIsLoading(true);
    setStreamingMessage('');

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({ content: content.trim() }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.chunk) {
                accumulatedResponse += data.chunk;
                setStreamingMessage(accumulatedResponse);
              }

              if (data.done) {
                // Add final assistant message
                const assistantMessage: Message = {
                  id: `assistant-${Date.now()}`,
                  content: accumulatedResponse,
                  role: 'assistant',
                  createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, assistantMessage]);
                setStreamingMessage('');
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Parse error:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);

      // Remove optimistic user message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticUserMessage.id));

      // Show error message to user
      const errorMessage = error.name === 'AbortError'
        ? 'Request cancelled'
        : `Failed to send message: ${error.message}`;

      alert(errorMessage);
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
      abortControllerRef.current = null;
    }
  };

  // Handle textarea auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Handle Enter key to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  if (!agent) {
    return (
      <div className="sintra-chat-container">
        <div className="sintra-main-chat">
          <div className="sintra-onboarding-card">
            <h1>Agent not found</h1>
            <p>The requested agent does not exist.</p>
            <button onClick={() => router.push('/agents/browse')}>
              Back to Agents
            </button>
          </div>
        </div>
      </div>
    );
  }

  const Icon = agent.icon;

  return (
    <div className="sintra-chat-container">
      {/* Sidebar - Minimalistic Icons */}
      <aside className="sintra-sidebar">
        {allAgents.map((a) => {
          const AgentIcon = a.icon;
          return (
            <div
              key={a.id}
              className={`sintra-sidebar-icon ${a.id === agentId ? 'active' : ''}`}
              onClick={() => router.push(`/agents/${a.id}/sintra`)}
              title={a.name}
            >
              <AgentIcon size={20} />
              <span className="sintra-sidebar-label">{a.name}</span>
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
        <div className="sintra-sidebar-icon" title="Settings">
          <Settings size={20} />
        </div>
        <div className="sintra-sidebar-icon" title="Notifications">
          <Bell size={20} />
        </div>
        <div className="sintra-sidebar-icon" title="Profile">
          <User size={20} />
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="sintra-main-chat">
        <div className="sintra-chat-wrapper">
          {/* Agent Header */}
          <header className="sintra-agent-header">
            <div
              className="sintra-agent-avatar"
              style={{ background: `linear-gradient(135deg, ${agent.color}, ${agent.color}dd)` }}
            >
              <Icon size={24} />
            </div>
            <div className="sintra-agent-info">
              <h1 className="sintra-agent-name">{agent.name}</h1>
              <p className="sintra-agent-description">{agent.role}</p>
            </div>
            <div className="sintra-agent-status">
              <span className="sintra-status-dot"></span>
              Online
            </div>
            <button
              className="sintra-input-icon-btn"
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              title="Info Panel"
            >
              <MoreVertical size={20} />
            </button>
          </header>

          {/* Messages Container */}
          <div className="sintra-messages-container">
            {messages.length === 0 && !isLoading ? (
              /* Onboarding Card */
              <div className="sintra-onboarding-card">
                <div
                  className="sintra-onboarding-avatar"
                  style={{ background: `linear-gradient(135deg, ${agent.color}, ${agent.color}dd)` }}
                >
                  <Icon size={40} />
                </div>
                <h2 className="sintra-onboarding-title">
                  Hi, I'm {agent.name}!
                </h2>
                <p className="sintra-onboarding-description">
                  {agent.bio}
                </p>
                <div className="sintra-onboarding-prompts">
                  {agent.specialties.slice(0, 3).map((specialty, index) => (
                    <button
                      key={index}
                      className="sintra-prompt-btn"
                      onClick={() => {
                        const prompt = `Help me with ${specialty.toLowerCase()}`;
                        handleSendMessage(prompt);
                      }}
                    >
                      <span>Help me with {specialty.toLowerCase()}</span>
                      <ChevronRight size={18} className="sintra-prompt-icon" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Chat Messages */}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`sintra-chat-bubble ${message.role}`}
                  >
                    <div className="sintra-bubble-content">
                      <div>{message.content}</div>
                      <div className="sintra-message-meta">
                        <span className="sintra-message-time">
                          {new Date(message.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {message.role === 'assistant' && (
                          <div className="sintra-message-actions">
                            <button className="sintra-message-action-btn" title="Copy">
                              <Copy size={14} />
                            </button>
                            <button className="sintra-message-action-btn" title="Like">
                              <ThumbsUp size={14} />
                            </button>
                            <button className="sintra-message-action-btn" title="Dislike">
                              <ThumbsDown size={14} />
                            </button>
                            <button className="sintra-message-action-btn" title="Regenerate">
                              <RotateCcw size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Streaming Message */}
                {streamingMessage && (
                  <div className="sintra-chat-bubble agent">
                    <div className="sintra-bubble-content">
                      <div>{streamingMessage}</div>
                      <div className="sintra-message-meta">
                        <span className="sintra-message-time">Now</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Typing Indicator */}
                {isLoading && !streamingMessage && (
                  <div className="sintra-typing-indicator">
                    <div className="sintra-typing-dots">
                      <span className="sintra-typing-dot"></span>
                      <span className="sintra-typing-dot"></span>
                      <span className="sintra-typing-dot"></span>
                    </div>
                    <span className="sintra-typing-text">
                      {agent.name} is thinking...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="sintra-input-area">
            <div className="sintra-input-wrapper">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${agent.name}...`}
                className="sintra-input-field"
                disabled={isLoading}
                rows={1}
              />
              <div className="sintra-input-actions">
                <button className="sintra-input-icon-btn" title="Attach file">
                  <Paperclip size={20} />
                </button>
                <button className="sintra-input-icon-btn" title="Voice input">
                  <Mic size={20} />
                </button>
                <button className="sintra-input-icon-btn" title="AI Assist">
                  <Sparkles size={20} />
                </button>
                <button
                  className="sintra-send-btn"
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  title="Send message"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Optional Right Info Panel */}
      {showInfoPanel && (
        <aside className="sintra-info-panel active">
          <div className="sintra-info-section">
            <h3 className="sintra-info-title">Agent Info</h3>
            <div className="sintra-info-item">
              <strong>Status:</strong> Active
            </div>
            <div className="sintra-info-item">
              <strong>Model:</strong> GPT-4 Turbo
            </div>
            <div className="sintra-info-item">
              <strong>Response Time:</strong> ~2s
            </div>
          </div>

          <div className="sintra-info-section">
            <h3 className="sintra-info-title">Capabilities</h3>
            {agent.specialties.map((specialty, index) => (
              <div key={index} className="sintra-info-item">
                {specialty}
              </div>
            ))}
          </div>

          <div className="sintra-info-section">
            <h3 className="sintra-info-title">Recent Activity</h3>
            <div className="sintra-info-item">
              {messages.length} messages today
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
