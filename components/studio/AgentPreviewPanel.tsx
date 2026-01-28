'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { AgentConfig } from './AgentStudio';

interface AgentPreviewPanelProps {
  config: AgentConfig;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AgentPreviewPanel({ config }: AgentPreviewPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI response (in production, this would call the AI API)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const assistantMessage: Message = {
        role: 'assistant',
        content: `This is a preview response based on your agent configuration. In production, this agent would use the ${config.model} model with the following instructions:\n\n"${config.systemInstructions.substring(0, 100)}..."`,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Preview error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStarterClick = (starter: string) => {
    handleSend(starter);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
            style={{ backgroundColor: config.color }}
          >
            {config.icon}
          </div>
          <div>
            <h3 className="font-semibold">{config.name}</h3>
            <p className="text-sm text-muted-foreground">Preview Mode</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4"
              style={{ backgroundColor: config.color }}
            >
              {config.icon}
            </div>
            <h3 className="text-lg font-semibold mb-2">{config.name}</h3>
            {config.description && (
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {config.description}
              </p>
            )}

            {/* Conversation Starters */}
            {config.conversationStarters.length > 0 && (
              <div className="space-y-2 w-full max-w-md mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Try asking:
                </p>
                {config.conversationStarters
                  .filter((s) => s.trim())
                  .map((starter, index) => (
                    <button
                      key={index}
                      onClick={() => handleStarterClick(starter)}
                      className="w-full px-4 py-3 text-left border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm">{starter}</span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-lg mr-2 flex-shrink-0"
                style={{ backgroundColor: config.color }}
              >
                {config.icon}
              </div>
            )}

            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg mr-2"
              style={{ backgroundColor: config.color }}
            >
              {config.icon}
            </div>
            <div className="bg-muted px-4 py-2 rounded-lg">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <span
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Send a message..."
            className="flex-1 px-4 py-2 border rounded-lg bg-background"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
