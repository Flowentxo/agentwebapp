/**
 * PHASE 49-50: Cassie Ticket API Routes
 * Customer Support ticket management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { CassieCapabilities } from '@/lib/agents/cassie';

// ============================================
// POST: Create ticket or perform actions
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, workspaceId, ...data } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'create': {
        const ticket = await CassieCapabilities.tickets.createTicket(workspaceId, {
          customerId: data.customerId,
          subject: data.subject,
          description: data.description,
          priority: data.priority || 'medium',
          channel: data.channel || 'web',
          tags: data.tags || [],
          assigneeId: data.assigneeId,
        });

        return NextResponse.json({
          success: true,
          data: ticket,
        });
      }

      case 'update': {
        if (!data.ticketId) {
          return NextResponse.json(
            { success: false, error: 'ticketId is required for update' },
            { status: 400 }
          );
        }

        const updated = await CassieCapabilities.tickets.updateTicket(
          workspaceId,
          data.ticketId,
          data.updates
        );

        if (!updated) {
          return NextResponse.json(
            { success: false, error: 'Ticket not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: updated,
        });
      }

      case 'auto_assign': {
        const assignments = await CassieCapabilities.tickets.autoAssign(
          workspaceId,
          data.ticketIds
        );

        return NextResponse.json({
          success: true,
          data: { assignments },
        });
      }

      case 'handle_inquiry': {
        if (!data.customerId || !data.message) {
          return NextResponse.json(
            { success: false, error: 'customerId and message are required' },
            { status: 400 }
          );
        }

        const result = await CassieCapabilities.handleCustomerInquiry(
          workspaceId,
          data.customerId,
          data.message,
          {
            customerName: data.customerName,
            category: data.category,
            previousMessages: data.previousMessages,
            agentName: data.agentName,
            companyName: data.companyName,
          }
        );

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[CASSIE_TICKETS_POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed',
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get tickets with filtering
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const action = searchParams.get('action');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'stats': {
        const stats = await CassieCapabilities.tickets.getStats({ workspaceId });
        return NextResponse.json({
          success: true,
          data: stats,
        });
      }

      case 'queues': {
        const queues = await CassieCapabilities.tickets.getQueues(workspaceId);
        return NextResponse.json({
          success: true,
          data: { queues },
        });
      }

      case 'sla': {
        const ticketIds = searchParams.get('ticketIds')?.split(',');
        const slaStatus = await CassieCapabilities.tickets.getSLAStatus(
          workspaceId,
          ticketIds
        );
        return NextResponse.json({
          success: true,
          data: { slaStatus },
        });
      }

      case 'customer_history': {
        const customerId = searchParams.get('customerId');
        if (!customerId) {
          return NextResponse.json(
            { success: false, error: 'customerId is required' },
            { status: 400 }
          );
        }

        const history = await CassieCapabilities.getCustomerHistory(
          workspaceId,
          customerId
        );
        return NextResponse.json({
          success: true,
          data: history,
        });
      }

      case 'dashboard': {
        const dashboard = await CassieCapabilities.getSupportDashboard(workspaceId);
        return NextResponse.json({
          success: true,
          data: dashboard,
        });
      }

      default: {
        // Get tickets with filters
        const status = searchParams.get('status') as 'open' | 'pending' | 'resolved' | 'closed' | undefined;
        const priority = searchParams.get('priority') as 'low' | 'medium' | 'high' | 'urgent' | undefined;
        const assigneeId = searchParams.get('assigneeId') || undefined;
        const customerId = searchParams.get('customerId') || undefined;
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const sortBy = searchParams.get('sortBy') as 'createdAt' | 'updatedAt' | 'priority' | undefined;
        const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;

        const result = await CassieCapabilities.tickets.getTickets({
          workspaceId,
          status,
          priority,
          assigneeId,
          customerId,
          limit,
          offset,
          sortBy,
          sortOrder,
        });

        return NextResponse.json({
          success: true,
          data: result,
        });
      }
    }
  } catch (error) {
    console.error('[CASSIE_TICKETS_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
