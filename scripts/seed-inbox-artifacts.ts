/**
 * Seed Script for Inbox & Artifacts
 *
 * Creates sample threads, messages, and artifacts for testing
 * the Flowent Inbox v2 Split View functionality.
 *
 * Run with: npx tsx scripts/seed-inbox-artifacts.ts
 */

import { getDb } from '../lib/db';
import {
  inboxThreads,
  inboxMessages,
  artifacts,
  inboxApprovals,
  users,
} from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function seedInboxArtifacts() {
  console.log('🌱 Starting Inbox & Artifacts seed...');

  const db = getDb();

  // Get first user or create a demo user
  let userId: string;

  const existingUsers = await db.select().from(users).limit(1);

  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;
    console.log(`✅ Using existing user: ${userId}`);
  } else {
    console.log('⚠️ No users found. Please create a user first.');
    process.exit(1);
  }

  // =========================================
  // CREATE SAMPLE THREADS
  // =========================================

  console.log('📬 Creating sample threads...');

  const threadData = [
    {
      userId,
      subject: 'Q4 Revenue Analysis',
      preview: 'I\'ve analyzed the Q4 revenue data and created a summary report.',
      agentId: 'dexter',
      agentName: 'Dexter',
      status: 'active' as const,
      priority: 'high' as const,
      unreadCount: 2,
      messageCount: 5,
    },
    {
      userId,
      subject: 'Marketing Campaign Email',
      preview: 'I need your approval to send emails to 247 stakeholders.',
      agentId: 'emmie',
      agentName: 'Emmie',
      status: 'suspended' as const,
      priority: 'high' as const,
      unreadCount: 1,
      messageCount: 4,
    },
    {
      userId,
      subject: 'Code Review - MainLayout Component',
      preview: 'I\'ve reviewed the MainLayout component and applied the suggested fixes.',
      agentId: 'kai',
      agentName: 'Kai',
      status: 'active' as const,
      priority: 'medium' as const,
      unreadCount: 0,
      messageCount: 6,
    },
    {
      userId,
      subject: 'VIP Customer Escalation',
      preview: 'I\'ve drafted a response for the VIP customer addressing their integration concerns.',
      agentId: 'cassie',
      agentName: 'Cassie',
      status: 'active' as const,
      priority: 'urgent' as const,
      unreadCount: 3,
      messageCount: 8,
    },
  ];

  const createdThreads = await db
    .insert(inboxThreads)
    .values(threadData)
    .returning();

  console.log(`✅ Created ${createdThreads.length} threads`);

  // =========================================
  // CREATE SAMPLE ARTIFACTS
  // =========================================

  console.log('📎 Creating sample artifacts...');

  // Code artifact for Thread 1 (Dexter)
  const codeArtifact = await db
    .insert(artifacts)
    .values({
      threadId: createdThreads[0].id,
      type: 'code',
      title: 'revenue_analysis.ts',
      language: 'typescript',
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
      version: 1,
      metadata: {
        lineCount: 42,
        wordCount: 156,
        agentId: 'dexter',
        agentName: 'Dexter',
      },
      userId,
    })
    .returning();

  // Code artifact for Thread 3 (Kai)
  const reviewArtifact = await db
    .insert(artifacts)
    .values({
      threadId: createdThreads[2].id,
      type: 'code',
      title: 'MainLayout.tsx',
      language: 'typescript',
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
    <div className="flex h-screen bg-zinc-950">
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
      version: 2,
      metadata: {
        lineCount: 52,
        wordCount: 178,
        agentId: 'kai',
        agentName: 'Kai',
      },
      userId,
    })
    .returning();

  // Email draft artifact for Thread 4 (Cassie)
  const emailArtifact = await db
    .insert(artifacts)
    .values({
      threadId: createdThreads[3].id,
      type: 'email_draft',
      title: 'VIP Customer Response Draft',
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
      version: 1,
      metadata: {
        wordCount: 210,
        agentId: 'cassie',
        agentName: 'Cassie',
      },
      userId,
    })
    .returning();

  console.log(`✅ Created ${[codeArtifact, reviewArtifact, emailArtifact].flat().length} artifacts`);

  // =========================================
  // CREATE SAMPLE MESSAGES
  // =========================================

  console.log('💬 Creating sample messages...');

  // Messages for Thread 1 (Dexter - Q4 Analysis)
  const thread1Messages = [
    {
      threadId: createdThreads[0].id,
      role: 'agent' as const,
      type: 'text' as const,
      content: "Hello! I'm here to help you with your data analysis needs. How can I assist you today?",
      agentId: 'dexter',
      agentName: 'Dexter',
    },
    {
      threadId: createdThreads[0].id,
      role: 'user' as const,
      type: 'text' as const,
      content: 'I need to analyze the Q4 revenue data and create a summary report.',
    },
    {
      threadId: createdThreads[0].id,
      role: 'system' as const,
      type: 'system_event' as const,
      content: 'Workflow started: Q4 Revenue Analysis Pipeline',
      metadata: {
        eventType: 'workflow_started',
        workflowName: 'Q4 Revenue Analysis Pipeline',
      },
    },
    {
      threadId: createdThreads[0].id,
      role: 'agent' as const,
      type: 'text' as const,
      content: "I'll analyze the Q4 revenue data for you. Let me pull up the latest figures and create a comprehensive summary.\n\n**Key Findings:**\n- Total Revenue: $2.4M (+12% YoY)\n- Top performing segment: Enterprise (45% of revenue)\n- Customer acquisition cost decreased by 8%\n\nWould you like me to dive deeper into any specific metric?",
      agentId: 'dexter',
      agentName: 'Dexter',
    },
    {
      threadId: createdThreads[0].id,
      role: 'agent' as const,
      type: 'artifact' as const,
      content: "I've created a TypeScript analysis script to process the Q4 revenue data. You can review and modify it as needed.",
      agentId: 'dexter',
      agentName: 'Dexter',
      artifactId: codeArtifact[0].id,
    },
    {
      threadId: createdThreads[0].id,
      role: 'system' as const,
      type: 'system_event' as const,
      content: 'Dexter passed context to Emmie (Data Analysis → Email Ops)',
      metadata: {
        eventType: 'handoff',
        fromAgent: 'Dexter',
        toAgent: 'Emmie',
        reason: 'Report formatting and distribution',
      },
    },
  ];

  // Messages for Thread 2 (Emmie - Marketing Campaign)
  const thread2Messages = [
    {
      threadId: createdThreads[1].id,
      role: 'agent' as const,
      type: 'text' as const,
      content: "Hello! I'm ready to help with your email communications.",
      agentId: 'emmie',
      agentName: 'Emmie',
    },
    {
      threadId: createdThreads[1].id,
      role: 'user' as const,
      type: 'text' as const,
      content: 'Please help me send the Q4 marketing report to all stakeholders.',
    },
    {
      threadId: createdThreads[1].id,
      role: 'agent' as const,
      type: 'text' as const,
      content: "I've prepared the Q4 marketing report and identified 247 stakeholders to send it to. Before I proceed, I need your approval since this will use significant API resources.",
      agentId: 'emmie',
      agentName: 'Emmie',
    },
    {
      threadId: createdThreads[1].id,
      role: 'system' as const,
      type: 'system_event' as const,
      content: 'Workflow paused: Awaiting approval for bulk email send',
      metadata: {
        eventType: 'workflow_paused',
        reason: 'Awaiting approval',
      },
    },
  ];

  // Add approval request message for Thread 2
  const approvalMessage = await db
    .insert(inboxMessages)
    .values({
      threadId: createdThreads[1].id,
      role: 'agent' as const,
      type: 'approval_request' as const,
      content: 'I need your approval to send emails to 247 recipients. This will consume approximately 12,350 tokens and cost an estimated $0.0185.',
      agentId: 'emmie',
      agentName: 'Emmie',
      approval: {
        approvalId: `approval-${createdThreads[1].id}`,
        actionType: 'send_email',
        status: 'pending',
        cost: 0.0185,
        estimatedTokens: 12350,
        payload: {
          recipientCount: 247,
          subject: 'Q4 2025 Marketing Report',
          templateId: 'marketing-q4-report',
        },
        previewData: `Subject: Q4 2025 Marketing Report
To: 247 stakeholders
Template: marketing-q4-report

Preview:
---
Dear Team,

Please find attached the Q4 2025 Marketing Report with key highlights:
- Campaign performance increased by 23%
- Lead generation up 18% YoY
- Customer engagement metrics at all-time high

Best regards,
Marketing Team`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    })
    .returning();

  // Create inbox approval record
  await db.insert(inboxApprovals).values({
    threadId: createdThreads[1].id,
    messageId: approvalMessage[0].id,
    actionType: 'send_email',
    status: 'pending',
    estimatedCost: 18500, // micro-dollars
    estimatedTokens: 12350,
    payload: {
      recipientCount: 247,
      subject: 'Q4 2025 Marketing Report',
    },
    previewData: 'Send to 247 stakeholders',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  // Update thread with pending approval
  await db
    .update(inboxThreads)
    .set({ pendingApprovalId: approvalMessage[0].id })
    .where(eq(inboxThreads.id, createdThreads[1].id));

  // Insert all messages
  await db.insert(inboxMessages).values([
    ...thread1Messages,
    ...thread2Messages,
  ]);

  // Messages for Thread 3 (Kai - Code Review)
  const thread3Messages = [
    {
      threadId: createdThreads[2].id,
      role: 'agent' as const,
      type: 'text' as const,
      content: "I'm ready to review your code. What would you like me to look at?",
      agentId: 'kai',
      agentName: 'Kai',
    },
    {
      threadId: createdThreads[2].id,
      role: 'user' as const,
      type: 'text' as const,
      content: 'Please review the MainLayout component and suggest improvements.',
    },
    {
      threadId: createdThreads[2].id,
      role: 'system' as const,
      type: 'system_event' as const,
      content: 'Context shared: Code review findings (3 files, 12 suggestions)',
      metadata: {
        eventType: 'context_shared',
        details: '3 files, 12 suggestions',
      },
    },
    {
      threadId: createdThreads[2].id,
      role: 'agent' as const,
      type: 'artifact' as const,
      content: "I've reviewed the MainLayout component and applied the suggested fixes. Here's the updated version with improved responsive handling.",
      agentId: 'kai',
      agentName: 'Kai',
      artifactId: reviewArtifact[0].id,
    },
  ];

  // Messages for Thread 4 (Cassie - VIP Support)
  const thread4Messages = [
    {
      threadId: createdThreads[3].id,
      role: 'system' as const,
      type: 'system_event' as const,
      content: 'Workflow started: VIP Customer Escalation',
      metadata: {
        eventType: 'workflow_started',
        workflowName: 'VIP Customer Escalation',
        priority: 'high',
      },
    },
    {
      threadId: createdThreads[3].id,
      role: 'agent' as const,
      type: 'text' as const,
      content: "I'm handling a priority escalation from a VIP customer. Let me analyze their issue.",
      agentId: 'cassie',
      agentName: 'Cassie',
    },
    {
      threadId: createdThreads[3].id,
      role: 'user' as const,
      type: 'text' as const,
      content: 'This customer is very important. Please prepare a detailed response.',
    },
    {
      threadId: createdThreads[3].id,
      role: 'system' as const,
      type: 'system_event' as const,
      content: 'Approval granted by User for rate limit increase',
      metadata: {
        eventType: 'approval_granted',
        action: 'Rate limit increase',
        approvedBy: 'User',
      },
    },
    {
      threadId: createdThreads[3].id,
      role: 'agent' as const,
      type: 'artifact' as const,
      content: "I've drafted a response for the VIP customer addressing their integration concerns. Please review and let me know if you'd like any adjustments before sending.",
      agentId: 'cassie',
      agentName: 'Cassie',
      artifactId: emailArtifact[0].id,
    },
  ];

  await db.insert(inboxMessages).values([
    ...thread3Messages,
    ...thread4Messages,
  ]);

  console.log('✅ Created sample messages for all threads');

  // =========================================
  // SUMMARY
  // =========================================

  console.log('\n═══════════════════════════════════════════');
  console.log('🎉 Seed completed successfully!');
  console.log('═══════════════════════════════════════════');
  console.log(`📬 Threads created: ${createdThreads.length}`);
  console.log(`📎 Artifacts created: 3`);
  console.log(`💬 Messages created: ${thread1Messages.length + thread2Messages.length + thread3Messages.length + thread4Messages.length + 1}`);
  console.log(`⏸️ Pending approvals: 1`);
  console.log('═══════════════════════════════════════════');
  console.log('\nTest the Split View by:');
  console.log('1. Navigate to /inbox');
  console.log('2. Click on a thread');
  console.log('3. Click "Open" on an artifact card to see the Split View');
  console.log('═══════════════════════════════════════════\n');

  process.exit(0);
}

// Run the seed
seedInboxArtifacts().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
