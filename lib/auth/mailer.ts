/**
 * SINTRA Auth System - Email Sending
 * Resend email delivery with dev bypass for local development
 */

import { Resend } from 'resend';

// =====================================================
// Configuration
// =====================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'SINTRA <onboarding@resend.dev>';
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
const IS_DEV = process.env.NODE_ENV !== 'production';

// Resend client (initialized lazily)
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!RESEND_API_KEY) {
    console.warn('[Mailer] RESEND_API_KEY not configured. Emails will only be logged to console.');
    return null;
  }

  if (!resend) {
    resend = new Resend(RESEND_API_KEY);
  }
  return resend;
}

// =====================================================
// Email Templates
// =====================================================

function getEmailVerificationHtml(verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">SINTRA.AI</h1>
  </div>

  <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>

    <p>Thank you for registering with SINTRA.AI! To complete your registration, please verify your email address by clicking the button below:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Verify Email Address</a>
    </div>

    <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #667eea; word-break: break-all; font-size: 14px;">${verificationUrl}</p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="color: #999; font-size: 12px; margin: 0;">If you didn't create an account with SINTRA.AI, you can safely ignore this email.</p>
  </div>
</body>
</html>
  `;
}

function getPasswordResetHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">SINTRA.AI</h1>
  </div>

  <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>

    <p>We received a request to reset your password. Click the button below to create a new password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
    </div>

    <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #667eea; word-break: break-all; font-size: 14px;">${resetUrl}</p>

    <p style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; color: #856404; font-size: 14px; margin: 20px 0;">
      <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and ensure your account is secure.
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="color: #999; font-size: 12px; margin: 0;">If you didn't request a password reset, you can safely ignore this email.</p>
  </div>
</body>
</html>
  `;
}

// =====================================================
// Email Sending Functions
// =====================================================

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email via Resend
 * @param options - Email options
 * @returns True if sent successfully
 */
async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const client = getResendClient();

  // DEV MODE: Always log to console
  if (IS_DEV) {
    console.log('\n========================================');
    console.log(`[Mailer] Sending email to: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('========================================\n');
  }

  // If no Resend client, just log (useful for development without API key)
  if (!client) {
    console.log('[Mailer] No Resend API key configured. Email logged to console only.');
    return true; // Return true so the app continues working
  }

  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error('[Mailer] Resend error:', error);
      return false;
    }

    console.log('[Mailer] Email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('[Mailer] Failed to send email:', error);
    return false;
  }
}

// =====================================================
// Verification Email
// =====================================================

/**
 * Send email verification email
 * @param email - Recipient email address
 * @param token - Verification token
 * @returns True if sent successfully
 */
export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const verificationUrl = `${APP_BASE_URL}/verify-email?token=${token}`;

  // DEV BYPASS: Always log verification link to console
  console.log('\n========================================');
  console.log('EMAIL VERIFICATION');
  console.log('========================================');
  console.log(`To: ${email}`);
  console.log(`Link: ${verificationUrl}`);
  console.log('========================================\n');

  return sendEmail({
    to: email,
    subject: 'Verify Your Email - SINTRA.AI',
    html: getEmailVerificationHtml(verificationUrl),
  });
}

// =====================================================
// Password Reset Email
// =====================================================

/**
 * Send password reset email
 * @param email - Recipient email address
 * @param token - Reset token
 * @returns True if sent successfully
 */
export async function sendResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${APP_BASE_URL}/reset/confirm?token=${token}`;

  // DEV BYPASS: Always log reset link to console
  console.log('\n========================================');
  console.log('PASSWORD RESET');
  console.log('========================================');
  console.log(`To: ${email}`);
  console.log(`Link: ${resetUrl}`);
  console.log('========================================\n');

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - SINTRA.AI',
    html: getPasswordResetHtml(resetUrl),
  });
}

// =====================================================
// Welcome Email (Optional)
// =====================================================

/**
 * Send welcome email after email verification
 * @param email - Recipient email address
 * @param displayName - User's display name
 * @returns True if sent successfully
 */
export async function sendWelcomeEmail(
  email: string,
  displayName: string | null
): Promise<boolean> {
  const name = displayName || 'there';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SINTRA.AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">SINTRA.AI</h1>
  </div>

  <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Welcome, ${name}!</h2>

    <p>Your email has been verified successfully. You now have full access to SINTRA.AI's powerful AI agent platform.</p>

    <h3 style="color: #667eea; margin-top: 30px;">What's Next?</h3>
    <ul style="padding-left: 20px;">
      <li style="margin-bottom: 10px;">Explore the dashboard and familiarize yourself with the interface</li>
      <li style="margin-bottom: 10px;">Create your first AI agent workflow</li>
      <li style="margin-bottom: 10px;">Browse the knowledge base for tips and best practices</li>
      <li style="margin-bottom: 10px;">Join our community to connect with other users</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_BASE_URL}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Get Started</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="color: #999; font-size: 12px; margin: 0;">Need help? Contact us at support@sintra.ai</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to SINTRA.AI!',
    html,
  });
}

// =====================================================
// New Device Login Alert Email
// =====================================================

export interface NewDeviceDetails {
  deviceDescription: string;
  ipAddress: string;
  browser: string;
  os: string;
  deviceType: string;
  loginTime: Date;
}

function getNewDeviceLoginHtml(details: NewDeviceDetails): string {
  const loginTimeStr = details.loginTime.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const deviceIcon = details.deviceType === 'mobile' ? 'Mobile' :
                     details.deviceType === 'tablet' ? 'Tablet' : 'Desktop';

  const sessionsUrl = `${APP_BASE_URL}/settings?tab=sessions`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neuer Login erkannt - SINTRA.AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">SINTRA.AI</h1>
  </div>

  <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <h2 style="color: #856404; margin: 0 0 8px 0; font-size: 18px;">New Login Detected</h2>
      <p style="color: #856404; margin: 0; font-size: 14px;">
        We detected a login from a new device or location.
      </p>
    </div>

    <h3 style="color: #333; margin-top: 0; margin-bottom: 16px;">Login Details:</h3>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666; width: 120px;">
          Device
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333; font-weight: 500;">
          ${deviceIcon}: ${details.deviceDescription}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">
          Browser
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333;">
          ${details.browser}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">
          System
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333;">
          ${details.os}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">
          IP Address
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333; font-family: monospace;">
          ${details.ipAddress}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px; color: #666;">
          Time
        </td>
        <td style="padding: 12px; color: #333;">
          ${loginTimeStr}
        </td>
      </tr>
    </table>

    <p style="color: #333; margin-bottom: 24px;">
      <strong>Was this you?</strong> If yes, you can ignore this message.
    </p>

    <div style="background: #fee2e2; border: 1px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <p style="color: #b91c1c; margin: 0; font-size: 14px;">
        <strong>If you didn't perform this login:</strong>
      </p>
      <ol style="color: #b91c1c; margin: 12px 0 0 0; padding-left: 20px; font-size: 14px;">
        <li style="margin-bottom: 4px;">End all unknown sessions immediately</li>
        <li style="margin-bottom: 4px;">Change your password</li>
        <li>Enable two-factor authentication</li>
      </ol>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${sessionsUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Review Sessions
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
      This email was sent automatically because a new device was used for login.<br>
      You can manage email notifications in your <a href="${APP_BASE_URL}/settings?tab=notifications" style="color: #667eea;">settings</a>.
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Send new device login alert email
 * @param email - Recipient email address
 * @param details - Device and login details
 * @returns True if sent successfully
 */
export async function sendNewDeviceLoginEmail(
  email: string,
  details: NewDeviceDetails
): Promise<boolean> {
  // DEV BYPASS: Log alert to console
  console.log('\n========================================');
  console.log('NEW DEVICE LOGIN ALERT');
  console.log('========================================');
  console.log(`To: ${email}`);
  console.log(`Device: ${details.deviceDescription}`);
  console.log(`Browser: ${details.browser}`);
  console.log(`OS: ${details.os}`);
  console.log(`IP: ${details.ipAddress}`);
  console.log(`Time: ${details.loginTime.toISOString()}`);
  console.log('========================================\n');

  return sendEmail({
    to: email,
    subject: 'New Login Detected - SINTRA.AI',
    html: getNewDeviceLoginHtml(details),
  });
}

// =====================================================
// Test Email (for debugging)
// =====================================================

/**
 * Send a test email to verify Resend configuration
 * @param email - Recipient email address
 * @returns True if sent successfully
 */
export async function sendTestEmail(email: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Test Email - SINTRA.AI',
    html: '<h1>Test Email</h1><p>If you received this, Resend is configured correctly!</p>',
  });
}

// =====================================================
// Cleanup (not needed for Resend, kept for compatibility)
// =====================================================

/**
 * Close mailer connection (for graceful shutdown)
 */
export async function closeMailer(): Promise<void> {
  // Resend doesn't need explicit cleanup
  resend = null;
}
