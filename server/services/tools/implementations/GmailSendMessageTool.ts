/**
 * Gmail Send Message Tool
 * Phase 12: Tool Execution Layer
 *
 * Sends emails via Gmail API using OAuth tokens
 */

import {
  ToolContext,
  ToolResult,
  ToolParameter,
  GmailSendMessageInput,
  GmailSendMessageOutput,
} from '@/lib/tools/interfaces';
import { AuthenticatedTool } from './AuthenticatedTool';
import { createLogger } from '@/lib/logger';

const logger = createLogger('GmailSendMessageTool');

// Gmail API base URL
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

export class GmailSendMessageTool extends AuthenticatedTool<
  GmailSendMessageInput,
  GmailSendMessageOutput
> {
  id = 'gmail-send-message';
  name = 'Send Email';
  description = 'Send an email via Gmail';
  category = 'communication' as const;
  provider = 'google';
  icon = 'Mail';

  requiredScopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
  ];

  parameters: ToolParameter[] = [
    {
      name: 'to',
      label: 'To',
      type: 'email',
      required: true,
      description: 'Recipient email address(es)',
      placeholder: 'recipient@example.com',
    },
    {
      name: 'subject',
      label: 'Subject',
      type: 'string',
      required: true,
      description: 'Email subject line',
      placeholder: 'Enter subject...',
    },
    {
      name: 'body',
      label: 'Body',
      type: 'string',
      required: true,
      description: 'Email body content',
      placeholder: 'Enter message...',
    },
    {
      name: 'cc',
      label: 'CC',
      type: 'array',
      required: false,
      description: 'CC recipients',
    },
    {
      name: 'bcc',
      label: 'BCC',
      type: 'array',
      required: false,
      description: 'BCC recipients',
    },
    {
      name: 'isHtml',
      label: 'HTML Format',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Send as HTML email',
    },
  ];

  async execute(
    input: GmailSendMessageInput,
    context: ToolContext
  ): Promise<ToolResult<GmailSendMessageOutput>> {
    // Validate input
    const validation = this.validateInput(input);
    if (!validation.valid) {
      return this.error(validation.errors.join(', '), 'VALIDATION_ERROR');
    }

    try {
      // Get access token
      const accessToken = await this.getAccessToken(
        context.userId,
        context.workspaceId
      );

      // Build email message
      const rawMessage = this.buildRawMessage(input);

      // Send via Gmail API
      const response = await this.sendMessage(accessToken, rawMessage);

      logger.info(`[gmail-send-message] Email sent: ${response.id}`);

      return this.success({
        messageId: response.id,
        threadId: response.threadId,
        labelIds: response.labelIds || [],
      });
    } catch (error: any) {
      logger.error('[gmail-send-message] Failed to send email:', error);

      // Handle specific Gmail errors
      if (error.status === 401) {
        return this.error(
          'Gmail authentication failed. Please reconnect your Google account.',
          'AUTH_ERROR'
        );
      }

      if (error.status === 403) {
        return this.error(
          'Gmail access denied. Please check your permissions.',
          'PERMISSION_ERROR'
        );
      }

      if (error.status === 429) {
        return this.error(
          'Gmail rate limit exceeded. Please try again later.',
          'RATE_LIMIT'
        );
      }

      return this.error(error.message || 'Failed to send email', 'SEND_ERROR');
    }
  }

  /**
   * Build RFC 2822 formatted email message
   */
  private buildRawMessage(input: GmailSendMessageInput): string {
    const { to, subject, body, cc, bcc, replyTo, isHtml, attachments } = input;

    // Format recipients
    const toAddresses = Array.isArray(to) ? to.join(', ') : to;
    const ccAddresses = cc?.join(', ');
    const bccAddresses = bcc?.join(', ');

    // Build headers
    const headers: string[] = [
      `To: ${toAddresses}`,
      `Subject: ${subject}`,
    ];

    if (ccAddresses) {
      headers.push(`Cc: ${ccAddresses}`);
    }

    if (bccAddresses) {
      headers.push(`Bcc: ${bccAddresses}`);
    }

    if (replyTo) {
      headers.push(`Reply-To: ${replyTo}`);
    }

    // Set content type
    const contentType = isHtml ? 'text/html' : 'text/plain';
    headers.push(`Content-Type: ${contentType}; charset=utf-8`);
    headers.push('MIME-Version: 1.0');

    // Combine headers and body
    const message = headers.join('\r\n') + '\r\n\r\n' + body;

    // Base64 URL-safe encode
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Send message via Gmail API
   */
  private async sendMessage(
    accessToken: string,
    rawMessage: string
  ): Promise<{
    id: string;
    threadId: string;
    labelIds?: string[];
  }> {
    const url = `${GMAIL_API_BASE}/users/me/messages/send`;

    return this.apiRequest(url, {
      method: 'POST',
      accessToken,
      body: { raw: rawMessage },
    });
  }
}

// ============================================================================
// GMAIL READ MESSAGES TOOL
// ============================================================================

export class GmailReadMessagesTool extends AuthenticatedTool<
  { query?: string; maxResults?: number },
  { messages: Array<{ id: string; snippet: string; from: string; subject: string }> }
> {
  id = 'gmail-read-messages';
  name = 'Read Emails';
  description = 'Read emails from Gmail inbox';
  category = 'communication' as const;
  provider = 'google';
  icon = 'Inbox';

  requiredScopes = ['https://www.googleapis.com/auth/gmail.readonly'];

  parameters: ToolParameter[] = [
    {
      name: 'query',
      label: 'Search Query',
      type: 'string',
      required: false,
      description: 'Gmail search query (e.g., "is:unread from:example@gmail.com")',
      placeholder: 'is:unread',
    },
    {
      name: 'maxResults',
      label: 'Max Results',
      type: 'number',
      required: false,
      default: 10,
      description: 'Maximum number of emails to retrieve',
    },
  ];

  async execute(
    input: { query?: string; maxResults?: number },
    context: ToolContext
  ): Promise<ToolResult<{ messages: Array<{ id: string; snippet: string; from: string; subject: string }> }>> {
    try {
      const accessToken = await this.getAccessToken(
        context.userId,
        context.workspaceId
      );

      const maxResults = input.maxResults || 10;
      const query = input.query || '';

      // List messages
      const listUrl = `${GMAIL_API_BASE}/users/me/messages?maxResults=${maxResults}${query ? `&q=${encodeURIComponent(query)}` : ''}`;

      const listResponse = await this.apiRequest<{
        messages?: Array<{ id: string; threadId: string }>;
      }>(listUrl, { accessToken });

      if (!listResponse.messages || listResponse.messages.length === 0) {
        return this.success({ messages: [] });
      }

      // Fetch message details (first 10)
      const messageDetails = await Promise.all(
        listResponse.messages.slice(0, 10).map(async (msg) => {
          const detailUrl = `${GMAIL_API_BASE}/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`;
          const detail = await this.apiRequest<{
            id: string;
            snippet: string;
            payload: {
              headers: Array<{ name: string; value: string }>;
            };
          }>(detailUrl, { accessToken });

          const fromHeader = detail.payload.headers.find((h) => h.name === 'From');
          const subjectHeader = detail.payload.headers.find((h) => h.name === 'Subject');

          return {
            id: detail.id,
            snippet: detail.snippet,
            from: fromHeader?.value || 'Unknown',
            subject: subjectHeader?.value || '(no subject)',
          };
        })
      );

      return this.success({ messages: messageDetails });
    } catch (error: any) {
      logger.error('[gmail-read-messages] Failed:', error);
      return this.error(error.message, 'READ_ERROR');
    }
  }
}

// Export tool instances
export const gmailSendMessageTool = new GmailSendMessageTool();
export const gmailReadMessagesTool = new GmailReadMessagesTool();
