'use client';

/**
 * Flowent Inbox v2 - Chat Socket Hook
 * Real-time WebSocket connection for chat functionality
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ChatMessage,
  SocketConnectionState,
  TypingIndicator,
  SendMessagePayload,
  ApprovalActionPayload,
  Artifact,
} from '@/types/inbox';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

interface UseChatSocketOptions {
  threadId: string;
  onMessage?: (message: ChatMessage) => void;
  onMessageStream?: (chunk: { messageId: string; content: string }) => void;
  onMessageComplete?: (messageId: string) => void;
  onTyping?: (indicator: TypingIndicator) => void;
  onError?: (error: Error) => void;
}

interface UseChatSocketReturn {
  connectionState: SocketConnectionState;
  messages: ChatMessage[];
  typingIndicator: TypingIndicator | null;
  sendMessage: (content: string) => void;
  sendApproval: (payload: ApprovalActionPayload) => void;
  isConnected: boolean;
}

export function useChatSocket({
  threadId,
  onMessage,
  onMessageStream,
  onMessageComplete,
  onTyping,
  onError,
}: UseChatSocketOptions): UseChatSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('disconnected');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingIndicator, setTypingIndicator] = useState<TypingIndicator | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!threadId) return;

    setConnectionState('connecting');

    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      query: { threadId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[CHAT_SOCKET] Connected to:', SOCKET_URL);
      setConnectionState('connected');

      // Join the thread room
      socket.emit('thread:join', { threadId });
    });

    socket.on('disconnect', (reason) => {
      console.log('[CHAT_SOCKET] Disconnected:', reason);
      setConnectionState('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[CHAT_SOCKET] Connection error:', error);
      setConnectionState('error');
      onError?.(error);
    });

    // Message events
    socket.on('message:new', (message: ChatMessage) => {
      console.log('[CHAT_SOCKET] New message:', message.id);
      setMessages((prev) => [...prev, message]);
      onMessage?.(message);
    });

    socket.on('message:stream', (chunk: { messageId: string; content: string }) => {
      setMessages((prev) => {
        const existing = prev.find((m) => m.id === chunk.messageId);
        if (existing) {
          return prev.map((m) =>
            m.id === chunk.messageId
              ? { ...m, content: m.content + chunk.content, isStreaming: true }
              : m
          );
        }
        return prev;
      });
      onMessageStream?.(chunk);
    });

    socket.on('message:complete', (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isStreaming: false } : m
        )
      );
      onMessageComplete?.(messageId);
    });

    // Typing events
    socket.on('typing:start', (indicator: TypingIndicator) => {
      if (indicator.threadId === threadId) {
        setTypingIndicator(indicator);
        onTyping?.(indicator);
      }
    });

    socket.on('typing:stop', (indicator: TypingIndicator) => {
      if (indicator.threadId === threadId) {
        setTypingIndicator(null);
        onTyping?.({ ...indicator, isTyping: false });
      }
    });

    // Load initial messages
    socket.on('thread:history', (history: ChatMessage[]) => {
      console.log('[CHAT_SOCKET] Received history:', history.length, 'messages');
      setMessages(history);
    });

    // Error handling
    socket.on('error', (error: { message: string }) => {
      console.error('[CHAT_SOCKET] Error:', error);
      onError?.(new Error(error.message));
    });

    // Cleanup on unmount or threadId change
    return () => {
      console.log('[CHAT_SOCKET] Cleaning up connection');
      socket.emit('thread:leave', { threadId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [threadId, onMessage, onMessageStream, onMessageComplete, onTyping, onError]);

  // Send a message
  const sendMessage = useCallback(
    (content: string) => {
      if (!socketRef.current?.connected || !content.trim()) return;

      const optimisticMessage: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        threadId,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        isOptimistic: true,
      };

      // Add optimistic message immediately
      setMessages((prev) => [...prev, optimisticMessage]);

      // Emit to server
      const payload: SendMessagePayload = {
        threadId,
        content: content.trim(),
      };

      socketRef.current.emit('message:send', payload, (response: { success: boolean; message?: ChatMessage; error?: string }) => {
        if (response.success && response.message) {
          // Replace optimistic message with real one
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticMessage.id ? response.message! : m))
          );
        } else {
          // Remove optimistic message on error
          setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
          onError?.(new Error(response.error || 'Failed to send message'));
        }
      });
    },
    [threadId, onError]
  );

  // Send approval action
  const sendApproval = useCallback(
    (payload: ApprovalActionPayload) => {
      if (!socketRef.current?.connected) return;

      socketRef.current.emit('approval:action', payload, (response: { success: boolean; error?: string }) => {
        if (!response.success) {
          onError?.(new Error(response.error || 'Failed to process approval'));
        }
      });
    },
    [onError]
  );

  return {
    connectionState,
    messages,
    typingIndicator,
    sendMessage,
    sendApproval,
    isConnected: connectionState === 'connected',
  };
}

// Mock hook for development without socket server
export function useChatSocketMock({
  threadId,
}: Pick<UseChatSocketOptions, 'threadId'>): UseChatSocketReturn & {
  updateApprovalStatus: (approvalId: string, status: 'approved' | 'rejected') => void;
} {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingIndicator, setTypingIndicator] = useState<TypingIndicator | null>(null);

  // Load mock messages on mount - includes approval request example
  useEffect(() => {
    // Check if this is a suspended thread (thread-2 or thread-6 in our mock data)
    const isSuspendedThread = threadId === 'thread-2' || threadId === 'thread-6';

    const mockMessages: ChatMessage[] = [
      {
        id: 'msg-1',
        threadId,
        type: 'text',
        role: 'agent',
        content: "Hello! I'm here to help you with your request. How can I assist you today?",
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        agentId: 'dexter',
        agentName: 'Dexter',
      },
      {
        id: 'msg-2',
        threadId,
        type: 'text',
        role: 'user',
        content: threadId === 'thread-2'
          ? 'Please help me send the Q4 marketing report to all stakeholders.'
          : 'I need to analyze the Q4 revenue data and create a summary report.',
        timestamp: new Date(Date.now() - 9 * 60 * 1000),
      },
      {
        id: 'msg-3',
        threadId,
        type: 'text',
        role: 'agent',
        content: threadId === 'thread-2'
          ? "I've prepared the Q4 marketing report and identified 247 stakeholders to send it to. Before I proceed, I need your approval since this will use significant API resources."
          : "I'll analyze the Q4 revenue data for you. Let me pull up the latest figures and create a comprehensive summary.\n\n**Key Findings:**\n- Total Revenue: $2.4M (+12% YoY)\n- Top performing segment: Enterprise (45% of revenue)\n- Customer acquisition cost decreased by 8%\n\nWould you like me to dive deeper into any specific metric?",
        timestamp: new Date(Date.now() - 8 * 60 * 1000),
        agentId: 'dexter',
        agentName: 'Dexter',
      },
    ];

    // Add approval request for suspended threads
    if (isSuspendedThread) {
      mockMessages.push({
        id: 'msg-approval-1',
        threadId,
        type: 'approval_request',
        role: 'agent',
        content: threadId === 'thread-2'
          ? 'I need your approval to send emails to 247 recipients. This will consume approximately 12,350 tokens and cost an estimated $0.0185.'
          : 'The HubSpot API integration requires budget approval. This operation will sync 1,500 contacts and may consume significant API quota.',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        agentId: 'dexter',
        agentName: 'Dexter',
        approval: {
          approvalId: `approval-${threadId}`,
          actionType: threadId === 'thread-2' ? 'send_email' : 'external_api_call',
          status: 'pending',
          cost: threadId === 'thread-2' ? 0.0185 : 0.0342,
          estimatedTokens: threadId === 'thread-2' ? 12350 : 22800,
          payload: threadId === 'thread-2'
            ? {
                recipientCount: 247,
                subject: 'Q4 2025 Marketing Report',
                templateId: 'marketing-q4-report',
              }
            : {
                integration: 'HubSpot',
                operation: 'bulk_contact_sync',
                contactCount: 1500,
              },
          previewData: threadId === 'thread-2'
            ? `Subject: Q4 2025 Marketing Report
To: 247 stakeholders (marketing@company.com, sales@company.com, ...)
Template: marketing-q4-report

Preview:
---
Dear Team,

Please find attached the Q4 2025 Marketing Report with key highlights:
- Campaign performance increased by 23%
- Lead generation up 18% YoY
- Customer engagement metrics at all-time high

Best regards,
Marketing Team`
            : `Integration: HubSpot CRM
Operation: Bulk Contact Sync
Contacts to sync: 1,500
Fields: name, email, company, phone, last_contact
Direction: Bidirectional

Warning: This will update existing contacts and create new ones.`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        },
      });
    }

    // Add artifact messages for specific threads
    if (threadId === 'thread-1') {
      // Dexter's data analysis - add a code artifact
      const codeArtifact: Artifact = {
        id: 'artifact-1',
        type: 'code',
        title: 'revenue_analysis.ts',
        language: 'typescript',
        version: 1,
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
        content: `// Q4 2025 Revenue Analysis Script
import { RevenueData, AnalysisResult } from './types';

interface QuarterlyMetrics {
  revenue: number;
  growth: number;
  topSegment: string;
  customerCount: number;
}

async function analyzeQ4Revenue(data: RevenueData[]): Promise<AnalysisResult> {
  // Calculate total revenue
  const totalRevenue = data.reduce((sum, item) => sum + item.amount, 0);

  // Calculate YoY growth
  const lastYearQ4 = 2_142_857;
  const growth = ((totalRevenue - lastYearQ4) / lastYearQ4) * 100;

  // Find top performing segment
  const segmentRevenue = data.reduce((acc, item) => {
    acc[item.segment] = (acc[item.segment] || 0) + item.amount;
    return acc;
  }, {} as Record<string, number>);

  const topSegment = Object.entries(segmentRevenue)
    .sort(([, a], [, b]) => b - a)[0][0];

  return {
    totalRevenue,
    growthPercentage: growth.toFixed(2),
    topSegment,
    segmentBreakdown: segmentRevenue,
    generatedAt: new Date().toISOString(),
  };
}

// Execute analysis
const result = await analyzeQ4Revenue(revenueData);
console.log(\`Total Revenue: $\${result.totalRevenue.toLocaleString()}\`);
console.log(\`YoY Growth: \${result.growthPercentage}%\`);
console.log(\`Top Segment: \${result.topSegment}\`);`,
        metadata: {
          lineCount: 42,
          wordCount: 156,
        },
      };

      mockMessages.push({
        id: 'msg-artifact-code-1',
        threadId,
        type: 'artifact',
        role: 'agent',
        content: 'I\'ve created a TypeScript analysis script to process the Q4 revenue data. You can review and modify it as needed.',
        timestamp: new Date(Date.now() - 6 * 60 * 1000),
        agentId: 'dexter',
        agentName: 'Dexter',
        artifact: codeArtifact,
      });
    }

    if (threadId === 'thread-3') {
      // Kai's code review - add a code artifact
      const reviewArtifact: Artifact = {
        id: 'artifact-2',
        type: 'code',
        title: 'MainLayout.tsx',
        language: 'typescript',
        version: 2,
        createdAt: new Date(Date.now() - 25 * 60 * 1000),
        updatedAt: new Date(Date.now() - 20 * 60 * 1000),
        content: `'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  // Handle responsive sidebar
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) setIsSidebarOpen(false);
  }, [pathname, isMobile]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isMobile={isMobile}
      />
      <main className={cn(
        'flex-1 flex flex-col overflow-hidden transition-all',
        isSidebarOpen && !isMobile ? 'ml-64' : 'ml-0'
      )}>
        <Topbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}`,
        metadata: {
          lineCount: 52,
          wordCount: 178,
        },
      };

      mockMessages.push({
        id: 'msg-artifact-code-2',
        threadId,
        type: 'artifact',
        role: 'agent',
        content: 'I\'ve reviewed the MainLayout component and applied the suggested fixes. Here\'s the updated version with improved responsive handling.',
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        agentId: 'kai',
        agentName: 'Kai',
        artifact: reviewArtifact,
      });
    }

    if (threadId === 'thread-4') {
      // Cassie's email draft for VIP customer
      const emailArtifact: Artifact = {
        id: 'artifact-3',
        type: 'email_draft',
        title: 'VIP Customer Response Draft',
        version: 1,
        createdAt: new Date(Date.now() - 40 * 60 * 1000),
        content: `# VIP Customer Support Response

**To:** james.wilson@enterprise-corp.com
**Subject:** Re: Urgent - Account Integration Issue

---

Dear Mr. Wilson,

Thank you for reaching out to us regarding the integration issues you're experiencing with your Enterprise account. I understand how critical this is for your operations, and I want to assure you that resolving this is our top priority.

## Current Status

I've reviewed your account and identified the following:

1. **API Rate Limiting** - Your current plan allows 10,000 requests/hour, but your integration is attempting 15,000+ requests during peak hours
2. **Authentication Token** - Your OAuth token expired 2 hours ago and needs to be refreshed
3. **Webhook Configuration** - The endpoint URL in your settings returns a 404 error

## Recommended Actions

1. I've temporarily increased your rate limit to 20,000 requests/hour for the next 48 hours
2. Please regenerate your OAuth token using the dashboard at Settings > API > Tokens
3. Update your webhook URL - the current endpoint appears to be incorrect

## Next Steps

Would you be available for a 15-minute call today at 3 PM EST to walk through the configuration together? I want to ensure everything is working perfectly before the end of your business day.

Best regards,
**Cassie**
*Senior Support Specialist*
Flowent AI Platform`,
        metadata: {
          wordCount: 210,
        },
      };

      mockMessages.push({
        id: 'msg-artifact-email-1',
        threadId,
        type: 'artifact',
        role: 'agent',
        content: 'I\'ve drafted a response for the VIP customer addressing their integration concerns. Please review and let me know if you\'d like any adjustments before sending.',
        timestamp: new Date(Date.now() - 40 * 60 * 1000),
        agentId: 'cassie',
        agentName: 'Cassie',
        artifact: emailArtifact,
      });
    }

    // Add system events for specific threads to demonstrate handoffs and workflow events
    if (threadId === 'thread-1') {
      // Thread 1: Dexter hands off to Emmie for email formatting
      mockMessages.splice(3, 0, {
        id: 'msg-system-1',
        threadId,
        type: 'system_event',
        role: 'system',
        content: 'Workflow started: Q4 Revenue Analysis Pipeline',
        timestamp: new Date(Date.now() - 7 * 60 * 1000),
        metadata: {
          eventType: 'workflow_started',
          workflowName: 'Q4 Revenue Analysis Pipeline',
        },
      });

      mockMessages.push({
        id: 'msg-system-2',
        threadId,
        type: 'system_event',
        role: 'system',
        content: 'Dexter passed context to Emmie (Data Analysis → Email Ops)',
        timestamp: new Date(Date.now() - 4 * 60 * 1000),
        metadata: {
          eventType: 'handoff',
          fromAgent: 'Dexter',
          toAgent: 'Emmie',
          reason: 'Report formatting and distribution',
        },
      });

      mockMessages.push({
        id: 'msg-system-3',
        threadId,
        type: 'system_event',
        role: 'system',
        content: 'Emmie joined the conversation',
        timestamp: new Date(Date.now() - 3.5 * 60 * 1000),
        metadata: {
          eventType: 'agent_joined',
          agentName: 'Emmie',
        },
      });
    }

    if (threadId === 'thread-3') {
      // Thread 3: Kai hands off after code review
      mockMessages.push({
        id: 'msg-system-4',
        threadId,
        type: 'system_event',
        role: 'system',
        content: 'Context shared: Code review findings (3 files, 12 suggestions)',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        metadata: {
          eventType: 'context_shared',
          details: '3 files, 12 suggestions',
        },
      });
    }

    if (threadId === 'thread-4') {
      // Thread 4: VIP support workflow
      mockMessages.splice(2, 0, {
        id: 'msg-system-5',
        threadId,
        type: 'system_event',
        role: 'system',
        content: 'Workflow started: VIP Customer Escalation',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        metadata: {
          eventType: 'workflow_started',
          workflowName: 'VIP Customer Escalation',
          priority: 'high',
        },
      });

      mockMessages.push({
        id: 'msg-system-6',
        threadId,
        type: 'system_event',
        role: 'system',
        content: 'Approval granted by User for rate limit increase',
        timestamp: new Date(Date.now() - 35 * 60 * 1000),
        metadata: {
          eventType: 'approval_granted',
          action: 'Rate limit increase',
          approvedBy: 'User',
        },
      });
    }

    if (threadId === 'thread-2') {
      // Thread 2: Suspended workflow
      mockMessages.push({
        id: 'msg-system-7',
        threadId,
        type: 'system_event',
        role: 'system',
        content: 'Workflow paused: Awaiting approval for bulk email send',
        timestamp: new Date(Date.now() - 4.5 * 60 * 1000),
        metadata: {
          eventType: 'workflow_paused',
          reason: 'Awaiting approval',
        },
      });
    }

    // Sort messages by timestamp after adding system events
    mockMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    setMessages(mockMessages);
  }, [threadId]);

  // Update approval status (used by the page component)
  const updateApprovalStatus = useCallback(
    (approvalId: string, status: 'approved' | 'rejected') => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.type === 'approval_request' && msg.approval?.approvalId === approvalId) {
            return {
              ...msg,
              approval: {
                ...msg.approval,
                status,
                resolvedAt: new Date(),
                resolvedBy: 'current-user',
              },
            };
          }
          return msg;
        })
      );

      // Add a follow-up message based on the action
      setTimeout(() => {
        const followUpMessage: ChatMessage = {
          id: `msg-followup-${Date.now()}`,
          threadId,
          type: 'text',
          role: 'agent',
          content: status === 'approved'
            ? "Thank you for approving! I'm now proceeding with the operation. You'll receive a confirmation once it's complete."
            : "Understood, I've cancelled the operation. Let me know if you'd like to explore alternative approaches or if there's anything else I can help with.",
          timestamp: new Date(),
          agentId: 'dexter',
          agentName: 'Dexter',
        };
        setMessages((prev) => [...prev, followUpMessage]);
      }, 500);
    },
    [threadId]
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        threadId,
        type: 'text',
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Simulate typing indicator
      setTypingIndicator({
        threadId,
        agentId: 'dexter',
        agentName: 'Dexter',
        isTyping: true,
      });

      // Simulate agent response after delay
      setTimeout(() => {
        setTypingIndicator(null);

        const agentMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          threadId,
          type: 'text',
          role: 'agent',
          content: `I understand you're asking about: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"\n\nLet me process that for you. This is a simulated response in development mode.`,
          timestamp: new Date(),
          agentId: 'dexter',
          agentName: 'Dexter',
        };
        setMessages((prev) => [...prev, agentMessage]);
      }, 1500);
    },
    [threadId]
  );

  const sendApproval = useCallback(() => {
    console.log('[MOCK] Approval action sent');
  }, []);

  return {
    connectionState: 'connected',
    messages,
    typingIndicator,
    sendMessage,
    sendApproval,
    updateApprovalStatus,
    isConnected: true,
  };
}
