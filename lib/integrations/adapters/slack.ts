/**
 * SLACK INTEGRATION ADAPTER
 *
 * Enterprise-grade Slack integration:
 * - OAuth 2.0 authentication
 * - Message sending & formatting
 * - Channel management
 * - Real-time webhooks
 * - Slash commands support
 */

import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

// ============================================
// TYPES
// ============================================

export interface SlackConfig {
  clientId: string;
  clientSecret: string;
  signingSecret: string;
  redirectUri: string;
}

export interface SlackTokens {
  accessToken: string;
  teamId: string;
  teamName: string;
  userId: string;
  scope: string;
  botUserId?: string;
  expiresAt?: number;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  memberCount?: number;
  topic?: string;
  purpose?: string;
}

export interface SlackUser {
  id: string;
  name: string;
  realName: string;
  email?: string;
  isAdmin: boolean;
  isBot: boolean;
  avatar?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  threadTs?: string;
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
}

export interface SlackBlock {
  type: "section" | "divider" | "header" | "context" | "actions" | "image";
  text?: {
    type: "plain_text" | "mrkdwn";
    text: string;
    emoji?: boolean;
  };
  accessory?: {
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  elements?: Array<{
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>;
}

export interface SlackAttachment {
  color?: string;
  pretext?: string;
  author_name?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  ts?: number;
}

// ============================================
// SLACK SERVICE
// ============================================

export class SlackService {
  private config: SlackConfig;
  private tokens: SlackTokens | null = null;
  private userId: string;
  private baseUrl = "https://slack.com/api";

  constructor(userId: string, config?: Partial<SlackConfig>) {
    this.userId = userId;
    this.config = {
      clientId: config?.clientId || process.env.SLACK_CLIENT_ID || "",
      clientSecret: config?.clientSecret || process.env.SLACK_CLIENT_SECRET || "",
      signingSecret: config?.signingSecret || process.env.SLACK_SIGNING_SECRET || "",
      redirectUri: config?.redirectUri || process.env.SLACK_REDIRECT_URI || "",
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const scopes = [
      "channels:read",
      "channels:join",
      "chat:write",
      "chat:write.public",
      "users:read",
      "users:read.email",
      "team:read",
      "im:write",
      "groups:read",
    ].join(",");

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: scopes,
      redirect_uri: this.config.redirectUri,
      ...(state && { state }),
    });

    return `https://slack.com/oauth/v2/authorize?${params}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<SlackTokens> {
    const response = await fetch(`${this.baseUrl}/oauth.v2.access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack auth failed: ${data.error}`);
    }

    this.tokens = {
      accessToken: data.access_token,
      teamId: data.team.id,
      teamName: data.team.name,
      userId: data.authed_user.id,
      scope: data.scope,
      botUserId: data.bot_user_id,
    };

    await this.saveTokens();
    return this.tokens;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.tokens) {
      await this.loadTokens();
    }

    if (!this.tokens?.accessToken) {
      throw new Error("Not authenticated with Slack");
    }

    const url = `${this.baseUrl}/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  // ============================================
  // CHANNEL OPERATIONS
  // ============================================

  async getChannels(limit = 200): Promise<SlackChannel[]> {
    const result = await this.request<{
      channels: Array<{
        id: string;
        name: string;
        is_private: boolean;
        is_member: boolean;
        num_members?: number;
        topic?: { value: string };
        purpose?: { value: string };
      }>;
    }>(`conversations.list?limit=${limit}&types=public_channel,private_channel`);

    return result.channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      isPrivate: ch.is_private,
      isMember: ch.is_member,
      memberCount: ch.num_members,
      topic: ch.topic?.value,
      purpose: ch.purpose?.value,
    }));
  }

  async joinChannel(channelId: string): Promise<void> {
    await this.request("conversations.join", {
      method: "POST",
      body: JSON.stringify({ channel: channelId }),
    });
  }

  async createChannel(
    name: string,
    isPrivate = false
  ): Promise<SlackChannel> {
    const result = await this.request<{
      channel: {
        id: string;
        name: string;
        is_private: boolean;
        is_member: boolean;
      };
    }>("conversations.create", {
      method: "POST",
      body: JSON.stringify({
        name: name.toLowerCase().replace(/\s+/g, "-"),
        is_private: isPrivate,
      }),
    });

    return {
      id: result.channel.id,
      name: result.channel.name,
      isPrivate: result.channel.is_private,
      isMember: result.channel.is_member,
    };
  }

  // ============================================
  // MESSAGE OPERATIONS
  // ============================================

  async sendMessage(message: SlackMessage): Promise<{ ts: string; channel: string }> {
    const result = await this.request<{
      ts: string;
      channel: string;
    }>("chat.postMessage", {
      method: "POST",
      body: JSON.stringify({
        channel: message.channel,
        text: message.text,
        blocks: message.blocks,
        attachments: message.attachments,
        thread_ts: message.threadTs,
        unfurl_links: message.unfurlLinks ?? true,
        unfurl_media: message.unfurlMedia ?? true,
      }),
    });

    return { ts: result.ts, channel: result.channel };
  }

  async sendDirectMessage(
    userId: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<{ ts: string; channel: string }> {
    // Open DM channel first
    const dmResult = await this.request<{ channel: { id: string } }>(
      "conversations.open",
      {
        method: "POST",
        body: JSON.stringify({ users: userId }),
      }
    );

    return this.sendMessage({
      channel: dmResult.channel.id,
      text,
      blocks,
    });
  }

  async updateMessage(
    channel: string,
    ts: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<void> {
    await this.request("chat.update", {
      method: "POST",
      body: JSON.stringify({
        channel,
        ts,
        text,
        blocks,
      }),
    });
  }

  async deleteMessage(channel: string, ts: string): Promise<void> {
    await this.request("chat.delete", {
      method: "POST",
      body: JSON.stringify({ channel, ts }),
    });
  }

  async addReaction(
    channel: string,
    ts: string,
    emoji: string
  ): Promise<void> {
    await this.request("reactions.add", {
      method: "POST",
      body: JSON.stringify({
        channel,
        timestamp: ts,
        name: emoji.replace(/:/g, ""),
      }),
    });
  }

  // ============================================
  // USER OPERATIONS
  // ============================================

  async getUsers(limit = 200): Promise<SlackUser[]> {
    const result = await this.request<{
      members: Array<{
        id: string;
        name: string;
        real_name: string;
        profile: {
          email?: string;
          image_72?: string;
        };
        is_admin: boolean;
        is_bot: boolean;
      }>;
    }>(`users.list?limit=${limit}`);

    return result.members.map((user) => ({
      id: user.id,
      name: user.name,
      realName: user.real_name,
      email: user.profile?.email,
      isAdmin: user.is_admin,
      isBot: user.is_bot,
      avatar: user.profile?.image_72,
    }));
  }

  async getUserInfo(userId: string): Promise<SlackUser> {
    const result = await this.request<{
      user: {
        id: string;
        name: string;
        real_name: string;
        profile: {
          email?: string;
          image_72?: string;
        };
        is_admin: boolean;
        is_bot: boolean;
      };
    }>(`users.info?user=${userId}`);

    return {
      id: result.user.id,
      name: result.user.name,
      realName: result.user.real_name,
      email: result.user.profile?.email,
      isAdmin: result.user.is_admin,
      isBot: result.user.is_bot,
      avatar: result.user.profile?.image_72,
    };
  }

  // ============================================
  // RICH MESSAGE BUILDERS
  // ============================================

  static buildNotificationBlocks(
    title: string,
    message: string,
    context?: string
  ): SlackBlock[] {
    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: title,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message,
        },
      },
    ];

    if (context) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: context,
          },
        ],
      });
    }

    return blocks;
  }

  static buildActionBlocks(
    text: string,
    actions: Array<{
      id: string;
      text: string;
      style?: "primary" | "danger";
      url?: string;
    }>
  ): SlackBlock[] {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text,
        },
      },
      {
        type: "actions",
        elements: actions.map((action) => ({
          type: action.url ? "button" : "button",
          text: {
            type: "plain_text",
            text: action.text,
            emoji: true,
          },
          action_id: action.id,
          ...(action.style && { style: action.style }),
          ...(action.url && { url: action.url }),
        })),
      },
    ];
  }

  static buildAgentMessageBlocks(
    agentName: string,
    agentIcon: string,
    message: string,
    metadata?: Record<string, string>
  ): SlackBlock[] {
    const blocks: SlackBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${agentIcon} *${agentName}*\n${message}`,
        },
      },
    ];

    if (metadata && Object.keys(metadata).length > 0) {
      blocks.push({
        type: "context",
        elements: Object.entries(metadata).map(([key, value]) => ({
          type: "mrkdwn",
          text: `*${key}:* ${value}`,
        })),
      });
    }

    return blocks;
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  verifyWebhookSignature(
    signature: string,
    timestamp: string,
    body: string
  ): boolean {
    const crypto = require("crypto");
    const sigBase = `v0:${timestamp}:${body}`;
    const computedSig = `v0=${crypto
      .createHmac("sha256", this.config.signingSecret)
      .update(sigBase)
      .digest("hex")}`;

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSig)
    );
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  private async saveTokens(): Promise<void> {
    if (!this.tokens) return;

    const db = getDb();
    try {
      await db.execute(sql`
        INSERT INTO integrations (user_id, service, credentials, status, updated_at)
        VALUES (${this.userId}, 'slack', ${JSON.stringify(this.tokens)}, 'connected', NOW())
        ON CONFLICT (user_id, service)
        DO UPDATE SET credentials = ${JSON.stringify(this.tokens)}, status = 'connected', updated_at = NOW()
      `);
    } catch (error) {
      console.error("[SLACK] Failed to save tokens:", error);
    }
  }

  private async loadTokens(): Promise<void> {
    const db = getDb();
    try {
      const result = await db.execute(sql`
        SELECT credentials FROM integrations
        WHERE user_id = ${this.userId} AND service = 'slack'
        LIMIT 1
      `);

      const rows = result as unknown as Array<{ credentials: string }>;
      if (rows[0]?.credentials) {
        this.tokens =
          typeof rows[0].credentials === "string"
            ? JSON.parse(rows[0].credentials)
            : rows[0].credentials;
      }
    } catch (error) {
      console.error("[SLACK] Failed to load tokens:", error);
    }
  }

  /**
   * Check if connected
   */
  async isConnected(): Promise<boolean> {
    await this.loadTokens();
    return !!this.tokens?.accessToken;
  }

  /**
   * Get connection info
   */
  async getConnectionInfo(): Promise<{
    connected: boolean;
    teamName?: string;
    teamId?: string;
  }> {
    await this.loadTokens();
    return {
      connected: !!this.tokens?.accessToken,
      teamName: this.tokens?.teamName,
      teamId: this.tokens?.teamId,
    };
  }

  /**
   * Disconnect integration
   */
  async disconnect(): Promise<void> {
    const db = getDb();
    try {
      await db.execute(sql`
        UPDATE integrations SET status = 'disconnected', credentials = NULL
        WHERE user_id = ${this.userId} AND service = 'slack'
      `);
      this.tokens = null;
    } catch (error) {
      console.error("[SLACK] Failed to disconnect:", error);
    }
  }
}

// Export singleton factory
export function createSlackService(userId: string): SlackService {
  return new SlackService(userId);
}
