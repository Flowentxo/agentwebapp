
import { NextRequest, NextResponse } from 'next/server';
import { gmailOAuthService } from '@/server/services/GmailOAuthService';

/**
 * POST /api/integrations/gmail/send
 * 
 * Sends an email using the authenticated user's Gmail account.
 * Used by Workflow Agents.
 */
export async function POST(req: NextRequest) {
  try {
    // Get user ID from headers (set by middleware or gateway)
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User ID missing' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { to, subject, htmlBody, textBody } = body;

    if (!to || !subject || (!htmlBody && !textBody)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and body (htmlBody or textBody)' },
        { status: 400 }
      );
    }

    // Call service to send email
    const result = await gmailOAuthService.sendEmail(userId, {
      to,
      subject,
      body: htmlBody || textBody, // GmailOAuthService expects 'body'
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('[GMAIL_API] Send error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
