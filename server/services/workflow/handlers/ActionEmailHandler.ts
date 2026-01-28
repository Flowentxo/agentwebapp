/**
 * ACTION EMAIL HANDLER
 *
 * Node handler for sending emails via Resend or fallback SMTP.
 * Supports template interpolation and attachments.
 */

import { Node } from 'reactflow';
import { NodeExecutor, ExecutionContext } from '@/server/services/WorkflowExecutionEngine';
import { createLogger } from '@/lib/logger';

const logger = createLogger('email-handler');

// =============================================================================
// EMAIL CONFIGURATION
// =============================================================================

interface EmailConfig {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  bodyType?: 'text' | 'html';
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    contentType?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: 'resend' | 'smtp' | 'mock';
  sentAt: string;
  recipients: string[];
  error?: string;
}

// =============================================================================
// EMAIL SERVICE ABSTRACTION
// =============================================================================

class EmailService {
  private resendApiKey = process.env.RESEND_API_KEY;
  private smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  };

  /**
   * Send email using the best available provider
   */
  async sendEmail(config: EmailConfig): Promise<EmailResult> {
    // 1. Try Resend first (recommended)
    if (this.resendApiKey) {
      return this.sendViaResend(config);
    }

    // 2. Try SMTP fallback
    if (this.smtpConfig.host && this.smtpConfig.user) {
      return this.sendViaSMTP(config);
    }

    // 3. Mock mode for development/testing
    logger.warn('No email provider configured, using mock mode');
    return this.sendViaMock(config);
  }

  /**
   * Send email via Resend API
   */
  private async sendViaResend(config: EmailConfig): Promise<EmailResult> {
    try {
      const recipients = Array.isArray(config.to) ? config.to : [config.to];

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.from || process.env.EMAIL_FROM || 'noreply@flowent.ai',
          to: recipients,
          cc: config.cc,
          bcc: config.bcc,
          subject: config.subject,
          html: config.bodyType === 'html' ? config.body : undefined,
          text: config.bodyType !== 'html' ? config.body : undefined,
          reply_to: config.replyTo,
          attachments: config.attachments?.map((att) => ({
            filename: att.filename,
            content: att.content,
            content_type: att.contentType,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Resend API error: ${response.status}`);
      }

      const result = await response.json();

      logger.info('Email sent via Resend', {
        messageId: result.id,
        recipients,
      });

      return {
        success: true,
        messageId: result.id,
        provider: 'resend',
        sentAt: new Date().toISOString(),
        recipients,
      };
    } catch (error: any) {
      logger.error('Resend email failed', { error: error.message });
      return {
        success: false,
        provider: 'resend',
        sentAt: new Date().toISOString(),
        recipients: Array.isArray(config.to) ? config.to : [config.to],
        error: error.message,
      };
    }
  }

  /**
   * Send email via SMTP (using nodemailer)
   */
  private async sendViaSMTP(config: EmailConfig): Promise<EmailResult> {
    try {
      // Dynamic import to avoid loading nodemailer if not needed
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.createTransport({
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        secure: this.smtpConfig.port === 465,
        auth: {
          user: this.smtpConfig.user,
          pass: this.smtpConfig.password,
        },
      });

      const recipients = Array.isArray(config.to) ? config.to : [config.to];

      const info = await transporter.sendMail({
        from: config.from || process.env.EMAIL_FROM || 'noreply@flowent.ai',
        to: recipients.join(', '),
        cc: Array.isArray(config.cc) ? config.cc.join(', ') : config.cc,
        bcc: Array.isArray(config.bcc) ? config.bcc.join(', ') : config.bcc,
        subject: config.subject,
        text: config.bodyType !== 'html' ? config.body : undefined,
        html: config.bodyType === 'html' ? config.body : undefined,
        replyTo: config.replyTo,
        attachments: config.attachments?.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          contentType: att.contentType,
        })),
      });

      logger.info('Email sent via SMTP', {
        messageId: info.messageId,
        recipients,
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp',
        sentAt: new Date().toISOString(),
        recipients,
      };
    } catch (error: any) {
      logger.error('SMTP email failed', { error: error.message });
      return {
        success: false,
        provider: 'smtp',
        sentAt: new Date().toISOString(),
        recipients: Array.isArray(config.to) ? config.to : [config.to],
        error: error.message,
      };
    }
  }

  /**
   * Mock email sending for development/testing
   */
  private async sendViaMock(config: EmailConfig): Promise<EmailResult> {
    const recipients = Array.isArray(config.to) ? config.to : [config.to];
    const mockId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Mock email sent', {
      messageId: mockId,
      to: recipients,
      subject: config.subject,
      bodyPreview: config.body.substring(0, 100),
    });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      messageId: mockId,
      provider: 'mock',
      sentAt: new Date().toISOString(),
      recipients,
    };
  }
}

// Singleton instance
const emailService = new EmailService();

// =============================================================================
// ACTION EMAIL HANDLER
// =============================================================================

export class ActionEmailHandler implements NodeExecutor {
  /**
   * Execute the email action node
   */
  async execute(
    node: Node,
    context: ExecutionContext,
    inputs: any
  ): Promise<EmailResult> {
    const startTime = Date.now();

    // Extract configuration from node data
    const {
      to,
      cc,
      bcc,
      subject,
      body,
      bodyType = 'text',
      from,
      replyTo,
      attachments,
    } = node.data;

    // Validate required fields
    if (!to) {
      throw new Error('Email recipient (to) is required');
    }
    if (!subject) {
      throw new Error('Email subject is required');
    }
    if (!body) {
      throw new Error('Email body is required');
    }

    // Interpolate variables in all text fields
    const emailConfig: EmailConfig = {
      to: this.interpolate(to, context, inputs),
      cc: cc ? this.interpolate(cc, context, inputs) : undefined,
      bcc: bcc ? this.interpolate(bcc, context, inputs) : undefined,
      subject: this.interpolate(subject, context, inputs),
      body: this.interpolate(body, context, inputs),
      bodyType,
      from: from ? this.interpolate(from, context, inputs) : undefined,
      replyTo: replyTo ? this.interpolate(replyTo, context, inputs) : undefined,
      attachments,
    };

    logger.info('Executing email action', {
      nodeId: node.id,
      to: emailConfig.to,
      subject: emailConfig.subject,
      bodyType,
    });

    // Send the email
    const result = await emailService.sendEmail(emailConfig);

    // Log execution time
    const durationMs = Date.now() - startTime;
    logger.info('Email action completed', {
      nodeId: node.id,
      success: result.success,
      durationMs,
      provider: result.provider,
    });

    if (!result.success) {
      throw new Error(`Email sending failed: ${result.error}`);
    }

    return result;
  }

  /**
   * Interpolate variables in a string template
   * Supports: {{input.field}}, {{nodeId.field}}, {{trigger.data}}
   */
  private interpolate(
    template: string | string[],
    context: ExecutionContext,
    inputs: any
  ): string | string[] {
    if (Array.isArray(template)) {
      return template.map((item) => this.interpolateString(item, context, inputs));
    }
    return this.interpolateString(template, context, inputs);
  }

  private interpolateString(
    template: string,
    context: ExecutionContext,
    inputs: any
  ): string {
    if (!template) return '';

    let result = template;

    // Replace {{input}} with actual input
    result = result.replace(/\{\{input\}\}/g, JSON.stringify(inputs));

    // Replace {{variable.path}} patterns
    const variableRegex = /\{\{([a-zA-Z0-9_.-]+)\}\}/g;
    result = result.replace(variableRegex, (match, path) => {
      // Try input first
      if (path.startsWith('input.')) {
        const inputPath = path.slice(6);
        const value = this.getNestedValue(inputs, inputPath);
        return value !== undefined ? String(value) : match;
      }

      // Try context variables
      if (path.startsWith('trigger.')) {
        const value = this.getNestedValue(context.variables, path);
        return value !== undefined ? String(value) : match;
      }

      // Try node outputs
      const parts = path.split('.');
      const nodeId = parts[0];
      const nodePath = parts.slice(1).join('.');

      if (context.nodeOutputs.has(nodeId)) {
        const nodeOutput = context.nodeOutputs.get(nodeId);
        const value = nodePath ? this.getNestedValue(nodeOutput, nodePath) : nodeOutput;
        return value !== undefined ? String(value) : match;
      }

      // Try nodes by type
      if (context.nodes) {
        const matchingNode = context.nodes.find((n) => n.type === nodeId);
        if (matchingNode && context.nodeOutputs.has(matchingNode.id)) {
          const nodeOutput = context.nodeOutputs.get(matchingNode.id);
          const value = nodePath ? this.getNestedValue(nodeOutput, nodePath) : nodeOutput;
          return value !== undefined ? String(value) : match;
        }
      }

      // Fallback to context variables
      const value = this.getNestedValue(context.variables, path);
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    if (!path) return obj;
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Export singleton instance
export const actionEmailHandler = new ActionEmailHandler();

// =============================================================================
// FACTORY REGISTRATION
// =============================================================================

/**
 * Register the email handler with the workflow execution engine
 */
export function registerEmailHandler(engine: any): void {
  engine.registerExecutor('action-email', actionEmailHandler);
  engine.registerExecutor('email', actionEmailHandler);
  engine.registerExecutor('send-email', actionEmailHandler);
  logger.info('Email handler registered');
}
