/**
 * EMAIL EXECUTOR V2
 *
 * Sends emails using nodemailer for WorkflowExecutionEngineV2.
 * Supports:
 * - SMTP configuration (Gmail, custom SMTP)
 * - HTML and plain text emails
 * - Variable substitution in templates
 * - Attachments
 * - CC/BCC recipients
 *
 * Phase 2: Essential Logic Nodes
 */

import nodemailer from 'nodemailer';
import { createLogger } from '@/lib/logger';
import {
  INodeExecutor,
  NodeExecutorInput,
  NodeExecutorOutput,
  ExecutionState,
  VARIABLE_PATTERN,
} from '@/types/execution';
import { resolveVariablePath } from '../VariableService';

const logger = createLogger('email-executor-v2');

// ============================================================================
// TYPES
// ============================================================================

export interface EmailNodeData {
  /** Label for the node */
  label?: string;

  // SMTP Configuration
  /** SMTP host (e.g., smtp.gmail.com) */
  smtpHost?: string;
  /** SMTP port (default: 587 for TLS, 465 for SSL) */
  smtpPort?: number;
  /** Use secure connection (SSL) */
  secure?: boolean;
  /** SMTP username (often email address) */
  smtpUser?: string;
  /** SMTP password or app password */
  smtpPassword?: string;
  /** Use environment variables for SMTP config */
  useEnvConfig?: boolean;

  // Email Content
  /** Sender email address */
  from?: string;
  /** Sender name */
  fromName?: string;
  /** Recipient email address(es) - comma-separated or array */
  to: string | string[];
  /** CC recipients */
  cc?: string | string[];
  /** BCC recipients */
  bcc?: string | string[];
  /** Reply-to address */
  replyTo?: string;
  /** Email subject */
  subject: string;
  /** Plain text body */
  text?: string;
  /** HTML body */
  html?: string;
  /** Use HTML template */
  useTemplate?: boolean;
  /** Template name (if using templates) */
  templateName?: string;
  /** Template variables */
  templateVariables?: Record<string, any>;

  // Attachments
  /** Attachments array */
  attachments?: EmailAttachment[];

  // Options
  /** Priority: high, normal, low */
  priority?: 'high' | 'normal' | 'low';
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface EmailAttachment {
  /** Filename */
  filename: string;
  /** Content (base64 or buffer) */
  content?: string | Buffer;
  /** URL to fetch content from */
  path?: string;
  /** Content type */
  contentType?: string;
  /** Content ID for inline images */
  cid?: string;
}

export interface EmailSendResult {
  /** Whether the email was sent successfully */
  success: boolean;
  /** Message ID from SMTP server */
  messageId?: string;
  /** Recipients that accepted the email */
  accepted: string[];
  /** Recipients that rejected the email */
  rejected: string[];
  /** Response from SMTP server */
  response?: string;
  /** Error message if failed */
  error?: string;
  /** Timestamp when email was sent */
  sentAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create nodemailer transporter from configuration.
 */
function createTransporter(nodeData: EmailNodeData): nodemailer.Transporter {
  // Use environment variables if configured
  if (nodeData.useEnvConfig) {
    const host = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST;
    const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || '587');
    const user = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_SERVER_PASSWORD;

    if (!host || !user || !pass) {
      throw new Error('SMTP environment variables not configured. Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Use node configuration
  const host = nodeData.smtpHost;
  const port = nodeData.smtpPort || 587;
  const user = nodeData.smtpUser;
  const pass = nodeData.smtpPassword;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration incomplete. Required: smtpHost, smtpUser, smtpPassword');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: nodeData.secure ?? (port === 465),
    auth: { user, pass },
  });
}

/**
 * Resolve variable references in a string template.
 */
function resolveTemplate(
  template: string,
  state: ExecutionState,
  customVars: Record<string, any> = {}
): string {
  if (!template) return '';

  // First replace custom template variables (e.g., {{name}})
  let resolved = template;
  for (const [key, value] of Object.entries(customVars)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    resolved = resolved.replace(pattern, String(value ?? ''));
  }

  // Then resolve state variables (e.g., {{nodeId.output.field}})
  resolved = resolved.replace(VARIABLE_PATTERN, (match, path) => {
    const result = resolveVariablePath(path.trim(), state);
    if (result.found) {
      return typeof result.value === 'object'
        ? JSON.stringify(result.value)
        : String(result.value ?? '');
    }
    logger.debug('Variable not found in template', { path, match });
    return match; // Keep original if not found
  });

  return resolved;
}

/**
 * Parse recipients string to array.
 */
function parseRecipients(recipients: string | string[] | undefined): string[] {
  if (!recipients) return [];
  if (Array.isArray(recipients)) return recipients.filter(Boolean);
  return recipients.split(',').map(r => r.trim()).filter(Boolean);
}

/**
 * Build email options from node data and resolved variables.
 */
function buildMailOptions(
  nodeData: EmailNodeData,
  state: ExecutionState,
  inputs: any
): nodemailer.SendMailOptions {
  // Merge template variables with inputs
  const templateVars = {
    ...inputs,
    ...(nodeData.templateVariables || {}),
  };

  // Resolve from address
  const from = nodeData.fromName
    ? `"${nodeData.fromName}" <${nodeData.from || process.env.SMTP_FROM}>`
    : nodeData.from || process.env.SMTP_FROM;

  // Resolve recipients with variable substitution
  const toRaw = typeof nodeData.to === 'string'
    ? resolveTemplate(nodeData.to, state, templateVars)
    : nodeData.to;

  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to: parseRecipients(toRaw),
    subject: resolveTemplate(nodeData.subject, state, templateVars),
  };

  // Add CC/BCC
  if (nodeData.cc) {
    const ccRaw = typeof nodeData.cc === 'string'
      ? resolveTemplate(nodeData.cc, state, templateVars)
      : nodeData.cc;
    mailOptions.cc = parseRecipients(ccRaw);
  }

  if (nodeData.bcc) {
    const bccRaw = typeof nodeData.bcc === 'string'
      ? resolveTemplate(nodeData.bcc, state, templateVars)
      : nodeData.bcc;
    mailOptions.bcc = parseRecipients(bccRaw);
  }

  // Reply-to
  if (nodeData.replyTo) {
    mailOptions.replyTo = resolveTemplate(nodeData.replyTo, state, templateVars);
  }

  // Email body
  if (nodeData.html) {
    mailOptions.html = resolveTemplate(nodeData.html, state, templateVars);
  }

  if (nodeData.text) {
    mailOptions.text = resolveTemplate(nodeData.text, state, templateVars);
  }

  // Fallback: if only HTML provided, generate text version
  if (mailOptions.html && !mailOptions.text) {
    mailOptions.text = stripHtml(mailOptions.html as string);
  }

  // Priority
  if (nodeData.priority) {
    mailOptions.priority = nodeData.priority;
  }

  // Custom headers
  if (nodeData.headers) {
    mailOptions.headers = nodeData.headers;
  }

  // Attachments
  if (nodeData.attachments && nodeData.attachments.length > 0) {
    mailOptions.attachments = nodeData.attachments.map(att => ({
      filename: att.filename,
      content: att.content,
      path: att.path,
      contentType: att.contentType,
      cid: att.cid,
    }));
  }

  return mailOptions;
}

/**
 * Strip HTML tags to create plain text version.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

export class EmailExecutorV2 implements INodeExecutor {
  /**
   * Execute an email node to send an email.
   */
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs } = input;
    const nodeData = (node.data || {}) as EmailNodeData;

    logger.debug('Executing email node', {
      nodeId: node.id,
      nodeName: nodeData.label,
      to: nodeData.to,
    });

    try {
      // Validate required fields
      if (!nodeData.to) {
        throw new Error('Recipient (to) is required');
      }

      if (!nodeData.subject) {
        throw new Error('Subject is required');
      }

      if (!nodeData.html && !nodeData.text) {
        throw new Error('Email body (html or text) is required');
      }

      // Create transporter
      const transporter = createTransporter(nodeData);

      // Build mail options
      const mailOptions = buildMailOptions(nodeData, context.state, inputs);

      logger.info('Sending email', {
        nodeId: node.id,
        to: mailOptions.to,
        subject: mailOptions.subject,
        hasHtml: !!mailOptions.html,
        attachmentCount: mailOptions.attachments?.length || 0,
      });

      // Send the email
      const info = await transporter.sendMail(mailOptions);

      const result: EmailSendResult = {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted as string[],
        rejected: info.rejected as string[],
        response: info.response,
        sentAt: new Date().toISOString(),
      };

      logger.info('Email sent successfully', {
        nodeId: node.id,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      });

      // Close the transporter
      transporter.close();

      return {
        data: result,
        success: true,
      };
    } catch (error: any) {
      logger.error('Email execution failed', {
        nodeId: node.id,
        error: error.message,
        code: error.code,
      });

      const result: EmailSendResult = {
        success: false,
        accepted: [],
        rejected: parseRecipients(nodeData.to),
        error: error.message,
        sentAt: new Date().toISOString(),
      };

      return {
        data: result,
        success: false,
        error: `Email send failed: ${error.message}`,
      };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const emailExecutorV2 = new EmailExecutorV2();
export default emailExecutorV2;
