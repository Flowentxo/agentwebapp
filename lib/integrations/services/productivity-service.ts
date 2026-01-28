/**
 * Productivity Integration Services
 *
 * Provides comprehensive API access for:
 * - Notion (pages, databases, blocks)
 * - Slack (messages, channels, users)
 * - Dropbox (files, folders, sharing)
 */

import { BaseIntegrationService, ApiError } from './base-service';

// ============================================================================
// NOTION SERVICE
// ============================================================================

export interface NotionUser {
  object: 'user';
  id: string;
  type: 'person' | 'bot';
  name: string;
  avatar_url: string | null;
  person?: {
    email: string;
  };
  bot?: {
    owner: {
      type: 'user' | 'workspace';
      workspace?: boolean;
      user?: NotionUser;
    };
  };
}

export interface NotionPage {
  object: 'page';
  id: string;
  created_time: string;
  created_by: { object: 'user'; id: string };
  last_edited_time: string;
  last_edited_by: { object: 'user'; id: string };
  archived: boolean;
  icon: { type: 'emoji' | 'external' | 'file'; emoji?: string; external?: { url: string }; file?: { url: string } } | null;
  cover: { type: 'external' | 'file'; external?: { url: string }; file?: { url: string } } | null;
  properties: Record<string, any>;
  parent: {
    type: 'database_id' | 'page_id' | 'workspace';
    database_id?: string;
    page_id?: string;
    workspace?: boolean;
  };
  url: string;
}

export interface NotionDatabase {
  object: 'database';
  id: string;
  created_time: string;
  created_by: { object: 'user'; id: string };
  last_edited_time: string;
  last_edited_by: { object: 'user'; id: string };
  title: Array<{
    type: 'text';
    text: { content: string; link: string | null };
    annotations: Record<string, boolean>;
    plain_text: string;
    href: string | null;
  }>;
  description: Array<{
    type: 'text';
    text: { content: string; link: string | null };
    plain_text: string;
  }>;
  icon: { type: 'emoji' | 'external' | 'file'; emoji?: string; external?: { url: string }; file?: { url: string } } | null;
  cover: { type: 'external' | 'file'; external?: { url: string }; file?: { url: string } } | null;
  properties: Record<string, NotionProperty>;
  parent: {
    type: 'database_id' | 'page_id' | 'workspace';
    database_id?: string;
    page_id?: string;
    workspace?: boolean;
  };
  url: string;
  archived: boolean;
  is_inline: boolean;
}

export interface NotionProperty {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

export interface NotionBlock {
  object: 'block';
  id: string;
  parent: {
    type: 'database_id' | 'page_id' | 'block_id';
    database_id?: string;
    page_id?: string;
    block_id?: string;
  };
  type: string;
  created_time: string;
  created_by: { object: 'user'; id: string };
  last_edited_time: string;
  last_edited_by: { object: 'user'; id: string };
  archived: boolean;
  has_children: boolean;
  [key: string]: any;
}

export interface NotionSearchResult {
  object: 'list';
  results: Array<NotionPage | NotionDatabase>;
  next_cursor: string | null;
  has_more: boolean;
}

class NotionService extends BaseIntegrationService {
  constructor() {
    super('notion', 'https://api.notion.com/v1');
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      'Notion-Version': '2022-06-28',
    };
  }

  protected parsePaginatedResponse<T>(response: any): { items: T[]; nextCursor?: string } {
    return {
      items: response.results || [],
      nextCursor: response.has_more ? response.next_cursor : undefined,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getUsers(userId);
      return true;
    } catch {
      return false;
    }
  }

  // ============ Users API ============

  async getUsers(userId: string): Promise<NotionUser[]> {
    const response = await this.request<any>(userId, '/users');
    return response.results || [];
  }

  async getUser(userId: string, notionUserId: string): Promise<NotionUser> {
    return this.request(userId, `/users/${notionUserId}`);
  }

  async getMe(userId: string): Promise<NotionUser> {
    return this.request(userId, '/users/me');
  }

  // ============ Pages API ============

  async getPage(userId: string, pageId: string): Promise<NotionPage> {
    return this.request(userId, `/pages/${pageId}`);
  }

  async getPageProperty(
    userId: string,
    pageId: string,
    propertyId: string,
    options: { page_size?: number; start_cursor?: string } = {}
  ): Promise<any> {
    const params = new URLSearchParams();
    if (options.page_size) params.set('page_size', options.page_size.toString());
    if (options.start_cursor) params.set('start_cursor', options.start_cursor);

    const queryString = params.toString();
    const path = `/pages/${pageId}/properties/${propertyId}${queryString ? `?${queryString}` : ''}`;
    return this.request(userId, path);
  }

  async createPage(
    userId: string,
    page: {
      parent: { database_id?: string; page_id?: string };
      properties: Record<string, any>;
      children?: any[];
      icon?: { type: 'emoji' | 'external'; emoji?: string; external?: { url: string } };
      cover?: { type: 'external'; external: { url: string } };
    }
  ): Promise<NotionPage> {
    return this.request(userId, '/pages', {
      method: 'POST',
      body: JSON.stringify(page),
    });
  }

  async updatePage(
    userId: string,
    pageId: string,
    updates: {
      properties?: Record<string, any>;
      archived?: boolean;
      icon?: { type: 'emoji' | 'external'; emoji?: string; external?: { url: string } } | null;
      cover?: { type: 'external'; external: { url: string } } | null;
    }
  ): Promise<NotionPage> {
    return this.request(userId, `/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async archivePage(userId: string, pageId: string): Promise<NotionPage> {
    return this.updatePage(userId, pageId, { archived: true });
  }

  async restorePage(userId: string, pageId: string): Promise<NotionPage> {
    return this.updatePage(userId, pageId, { archived: false });
  }

  // ============ Databases API ============

  async getDatabase(userId: string, databaseId: string): Promise<NotionDatabase> {
    return this.request(userId, `/databases/${databaseId}`);
  }

  async queryDatabase(
    userId: string,
    databaseId: string,
    query: {
      filter?: any;
      sorts?: Array<{ property: string; direction: 'ascending' | 'descending' } | { timestamp: 'created_time' | 'last_edited_time'; direction: 'ascending' | 'descending' }>;
      start_cursor?: string;
      page_size?: number;
    } = {}
  ): Promise<{ results: NotionPage[]; next_cursor: string | null; has_more: boolean }> {
    return this.request(userId, `/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(query),
    });
  }

  async createDatabase(
    userId: string,
    database: {
      parent: { page_id: string } | { database_id: string };
      title: Array<{ type: 'text'; text: { content: string } }>;
      properties: Record<string, any>;
      icon?: { type: 'emoji' | 'external'; emoji?: string; external?: { url: string } };
      cover?: { type: 'external'; external: { url: string } };
      is_inline?: boolean;
    }
  ): Promise<NotionDatabase> {
    return this.request(userId, '/databases', {
      method: 'POST',
      body: JSON.stringify(database),
    });
  }

  async updateDatabase(
    userId: string,
    databaseId: string,
    updates: {
      title?: Array<{ type: 'text'; text: { content: string } }>;
      description?: Array<{ type: 'text'; text: { content: string } }>;
      properties?: Record<string, any>;
      icon?: { type: 'emoji' | 'external'; emoji?: string; external?: { url: string } } | null;
      cover?: { type: 'external'; external: { url: string } } | null;
      is_inline?: boolean;
      archived?: boolean;
    }
  ): Promise<NotionDatabase> {
    return this.request(userId, `/databases/${databaseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ============ Blocks API ============

  async getBlock(userId: string, blockId: string): Promise<NotionBlock> {
    return this.request(userId, `/blocks/${blockId}`);
  }

  async getBlockChildren(
    userId: string,
    blockId: string,
    options: { start_cursor?: string; page_size?: number } = {}
  ): Promise<{ results: NotionBlock[]; next_cursor: string | null; has_more: boolean }> {
    const params = new URLSearchParams();
    if (options.page_size) params.set('page_size', options.page_size.toString());
    if (options.start_cursor) params.set('start_cursor', options.start_cursor);

    const queryString = params.toString();
    const path = `/blocks/${blockId}/children${queryString ? `?${queryString}` : ''}`;
    return this.request(userId, path);
  }

  async appendBlockChildren(
    userId: string,
    blockId: string,
    children: any[]
  ): Promise<{ results: NotionBlock[] }> {
    return this.request(userId, `/blocks/${blockId}/children`, {
      method: 'PATCH',
      body: JSON.stringify({ children }),
    });
  }

  async updateBlock(
    userId: string,
    blockId: string,
    block: any
  ): Promise<NotionBlock> {
    return this.request(userId, `/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(block),
    });
  }

  async deleteBlock(userId: string, blockId: string): Promise<NotionBlock> {
    return this.request(userId, `/blocks/${blockId}`, {
      method: 'DELETE',
    });
  }

  // ============ Search API ============

  async search(
    userId: string,
    query: {
      query?: string;
      filter?: { property: 'object'; value: 'page' | 'database' };
      sort?: { direction: 'ascending' | 'descending'; timestamp: 'last_edited_time' };
      start_cursor?: string;
      page_size?: number;
    } = {}
  ): Promise<NotionSearchResult> {
    return this.request(userId, '/search', {
      method: 'POST',
      body: JSON.stringify(query),
    });
  }

  // ============ Comments API ============

  async getComments(
    userId: string,
    options: {
      block_id?: string;
      start_cursor?: string;
      page_size?: number;
    }
  ): Promise<{ results: any[]; next_cursor: string | null; has_more: boolean }> {
    const params = new URLSearchParams();
    if (options.block_id) params.set('block_id', options.block_id);
    if (options.start_cursor) params.set('start_cursor', options.start_cursor);
    if (options.page_size) params.set('page_size', options.page_size.toString());

    return this.request(userId, `/comments?${params.toString()}`);
  }

  async createComment(
    userId: string,
    comment: {
      parent?: { page_id: string };
      discussion_id?: string;
      rich_text: Array<{ type: 'text'; text: { content: string } }>;
    }
  ): Promise<any> {
    return this.request(userId, '/comments', {
      method: 'POST',
      body: JSON.stringify(comment),
    });
  }
}

// ============================================================================
// SLACK SERVICE
// ============================================================================

export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  color: string;
  real_name: string;
  tz: string;
  tz_label: string;
  tz_offset: number;
  profile: {
    title: string;
    phone: string;
    skype: string;
    real_name: string;
    real_name_normalized: string;
    display_name: string;
    display_name_normalized: string;
    status_text: string;
    status_emoji: string;
    status_expiration: number;
    avatar_hash: string;
    email: string;
    first_name: string;
    last_name: string;
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
    team: string;
  };
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  is_app_user: boolean;
  updated: number;
  has_2fa: boolean;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  created: number;
  is_archived: boolean;
  is_general: boolean;
  unlinked: number;
  name_normalized: string;
  is_shared: boolean;
  is_org_shared: boolean;
  is_pending_ext_shared: boolean;
  pending_shared: any[];
  context_team_id: string;
  updated: number;
  creator: string;
  is_ext_shared: boolean;
  shared_team_ids: string[];
  pending_connected_team_ids: any[];
  is_member: boolean;
  topic: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose: {
    value: string;
    creator: string;
    last_set: number;
  };
  previous_names: string[];
  num_members: number;
}

export interface SlackMessage {
  type: string;
  subtype?: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  reply_users_count?: number;
  latest_reply?: string;
  reply_users?: string[];
  replies?: Array<{ user: string; ts: string }>;
  subscribed?: boolean;
  attachments?: any[];
  blocks?: any[];
  reactions?: Array<{
    name: string;
    count: number;
    users: string[];
  }>;
  files?: any[];
}

export interface SlackTeam {
  id: string;
  name: string;
  domain: string;
  email_domain: string;
  icon: {
    image_34: string;
    image_44: string;
    image_68: string;
    image_88: string;
    image_102: string;
    image_132: string;
    image_230: string;
    image_default: boolean;
  };
  enterprise_id?: string;
  enterprise_name?: string;
}

class SlackService extends BaseIntegrationService {
  constructor() {
    super('slack', 'https://slack.com/api');
  }

  protected parsePaginatedResponse<T>(response: any): { items: T[]; nextCursor?: string } {
    // Slack uses response_metadata.next_cursor for pagination
    const items = response.channels || response.messages || response.members || response.users || [];
    return {
      items,
      nextCursor: response.response_metadata?.next_cursor || undefined,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      const response = await this.authTest(userId);
      return response.ok === true;
    } catch {
      return false;
    }
  }

  private async slackRequest<T>(
    userId: string,
    method: string,
    data: Record<string, any> = {},
    httpMethod: 'GET' | 'POST' = 'POST'
  ): Promise<T> {
    const url = httpMethod === 'GET'
      ? `/${method}?${new URLSearchParams(data as Record<string, string>).toString()}`
      : `/${method}`;

    const options: RequestInit = httpMethod === 'POST'
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data as Record<string, string>).toString(),
        }
      : { method: 'GET' };

    const response = await this.request<any>(userId, url, options);

    if (!response.ok) {
      throw new ApiError(`Slack API error: ${response.error}`, 400);
    }

    return response;
  }

  // ============ Auth API ============

  async authTest(userId: string): Promise<{
    ok: boolean;
    url: string;
    team: string;
    user: string;
    team_id: string;
    user_id: string;
    bot_id?: string;
  }> {
    return this.slackRequest(userId, 'auth.test');
  }

  // ============ Users API ============

  async listUsers(
    userId: string,
    options: { cursor?: string; limit?: number; include_locale?: boolean } = {}
  ): Promise<{ members: SlackUser[]; response_metadata?: { next_cursor: string } }> {
    return this.slackRequest(userId, 'users.list', {
      limit: (options.limit || 100).toString(),
      ...(options.cursor && { cursor: options.cursor }),
      ...(options.include_locale && { include_locale: 'true' }),
    });
  }

  async getUser(userId: string, slackUserId: string): Promise<{ user: SlackUser }> {
    return this.slackRequest(userId, 'users.info', { user: slackUserId });
  }

  async getUserByEmail(userId: string, email: string): Promise<{ user: SlackUser }> {
    return this.slackRequest(userId, 'users.lookupByEmail', { email });
  }

  async getUserPresence(userId: string, slackUserId: string): Promise<{
    presence: 'active' | 'away';
    online: boolean;
    auto_away: boolean;
    manual_away: boolean;
    connection_count?: number;
  }> {
    return this.slackRequest(userId, 'users.getPresence', { user: slackUserId });
  }

  async setUserPresence(userId: string, presence: 'auto' | 'away'): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'users.setPresence', { presence });
  }

  async setUserStatus(
    userId: string,
    options: {
      status_text?: string;
      status_emoji?: string;
      status_expiration?: number;
    }
  ): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'users.profile.set', {
      profile: JSON.stringify(options),
    });
  }

  // ============ Channels API ============

  async listChannels(
    userId: string,
    options: {
      cursor?: string;
      limit?: number;
      exclude_archived?: boolean;
      types?: string;
    } = {}
  ): Promise<{ channels: SlackChannel[]; response_metadata?: { next_cursor: string } }> {
    return this.slackRequest(userId, 'conversations.list', {
      limit: (options.limit || 100).toString(),
      exclude_archived: (options.exclude_archived !== false).toString(),
      types: options.types || 'public_channel,private_channel',
      ...(options.cursor && { cursor: options.cursor }),
    });
  }

  async getChannel(userId: string, channelId: string): Promise<{ channel: SlackChannel }> {
    return this.slackRequest(userId, 'conversations.info', { channel: channelId });
  }

  async createChannel(
    userId: string,
    options: { name: string; is_private?: boolean; team_id?: string }
  ): Promise<{ channel: SlackChannel }> {
    return this.slackRequest(userId, 'conversations.create', {
      name: options.name,
      is_private: (options.is_private || false).toString(),
      ...(options.team_id && { team_id: options.team_id }),
    });
  }

  async archiveChannel(userId: string, channelId: string): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'conversations.archive', { channel: channelId });
  }

  async unarchiveChannel(userId: string, channelId: string): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'conversations.unarchive', { channel: channelId });
  }

  async renameChannel(
    userId: string,
    channelId: string,
    name: string
  ): Promise<{ channel: SlackChannel }> {
    return this.slackRequest(userId, 'conversations.rename', { channel: channelId, name });
  }

  async setChannelTopic(
    userId: string,
    channelId: string,
    topic: string
  ): Promise<{ channel: SlackChannel }> {
    return this.slackRequest(userId, 'conversations.setTopic', { channel: channelId, topic });
  }

  async setChannelPurpose(
    userId: string,
    channelId: string,
    purpose: string
  ): Promise<{ channel: SlackChannel }> {
    return this.slackRequest(userId, 'conversations.setPurpose', { channel: channelId, purpose });
  }

  async joinChannel(userId: string, channelId: string): Promise<{ channel: SlackChannel }> {
    return this.slackRequest(userId, 'conversations.join', { channel: channelId });
  }

  async leaveChannel(userId: string, channelId: string): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'conversations.leave', { channel: channelId });
  }

  async inviteToChannel(
    userId: string,
    channelId: string,
    users: string[]
  ): Promise<{ channel: SlackChannel }> {
    return this.slackRequest(userId, 'conversations.invite', {
      channel: channelId,
      users: users.join(','),
    });
  }

  async kickFromChannel(
    userId: string,
    channelId: string,
    slackUserId: string
  ): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'conversations.kick', {
      channel: channelId,
      user: slackUserId,
    });
  }

  async getChannelMembers(
    userId: string,
    channelId: string,
    options: { cursor?: string; limit?: number } = {}
  ): Promise<{ members: string[]; response_metadata?: { next_cursor: string } }> {
    return this.slackRequest(userId, 'conversations.members', {
      channel: channelId,
      limit: (options.limit || 100).toString(),
      ...(options.cursor && { cursor: options.cursor }),
    });
  }

  // ============ Messages API ============

  async getMessages(
    userId: string,
    channelId: string,
    options: {
      cursor?: string;
      limit?: number;
      oldest?: string;
      latest?: string;
      inclusive?: boolean;
    } = {}
  ): Promise<{
    messages: SlackMessage[];
    has_more: boolean;
    response_metadata?: { next_cursor: string };
  }> {
    return this.slackRequest(userId, 'conversations.history', {
      channel: channelId,
      limit: (options.limit || 100).toString(),
      ...(options.cursor && { cursor: options.cursor }),
      ...(options.oldest && { oldest: options.oldest }),
      ...(options.latest && { latest: options.latest }),
      ...(options.inclusive && { inclusive: 'true' }),
    });
  }

  async getThreadReplies(
    userId: string,
    channelId: string,
    threadTs: string,
    options: { cursor?: string; limit?: number } = {}
  ): Promise<{
    messages: SlackMessage[];
    has_more: boolean;
    response_metadata?: { next_cursor: string };
  }> {
    return this.slackRequest(userId, 'conversations.replies', {
      channel: channelId,
      ts: threadTs,
      limit: (options.limit || 100).toString(),
      ...(options.cursor && { cursor: options.cursor }),
    });
  }

  async postMessage(
    userId: string,
    options: {
      channel: string;
      text?: string;
      blocks?: any[];
      attachments?: any[];
      thread_ts?: string;
      reply_broadcast?: boolean;
      unfurl_links?: boolean;
      unfurl_media?: boolean;
      mrkdwn?: boolean;
    }
  ): Promise<{ message: SlackMessage; ts: string; channel: string }> {
    return this.slackRequest(userId, 'chat.postMessage', {
      channel: options.channel,
      ...(options.text && { text: options.text }),
      ...(options.blocks && { blocks: JSON.stringify(options.blocks) }),
      ...(options.attachments && { attachments: JSON.stringify(options.attachments) }),
      ...(options.thread_ts && { thread_ts: options.thread_ts }),
      ...(options.reply_broadcast && { reply_broadcast: 'true' }),
      ...(options.unfurl_links !== undefined && { unfurl_links: options.unfurl_links.toString() }),
      ...(options.unfurl_media !== undefined && { unfurl_media: options.unfurl_media.toString() }),
      ...(options.mrkdwn !== undefined && { mrkdwn: options.mrkdwn.toString() }),
    });
  }

  async updateMessage(
    userId: string,
    options: {
      channel: string;
      ts: string;
      text?: string;
      blocks?: any[];
      attachments?: any[];
    }
  ): Promise<{ message: SlackMessage; ts: string; channel: string }> {
    return this.slackRequest(userId, 'chat.update', {
      channel: options.channel,
      ts: options.ts,
      ...(options.text && { text: options.text }),
      ...(options.blocks && { blocks: JSON.stringify(options.blocks) }),
      ...(options.attachments && { attachments: JSON.stringify(options.attachments) }),
    });
  }

  async deleteMessage(
    userId: string,
    channelId: string,
    ts: string
  ): Promise<{ ok: boolean; channel: string; ts: string }> {
    return this.slackRequest(userId, 'chat.delete', { channel: channelId, ts });
  }

  async addReaction(
    userId: string,
    channelId: string,
    ts: string,
    emoji: string
  ): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'reactions.add', {
      channel: channelId,
      timestamp: ts,
      name: emoji,
    });
  }

  async removeReaction(
    userId: string,
    channelId: string,
    ts: string,
    emoji: string
  ): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'reactions.remove', {
      channel: channelId,
      timestamp: ts,
      name: emoji,
    });
  }

  async scheduleMessage(
    userId: string,
    options: {
      channel: string;
      text?: string;
      blocks?: any[];
      post_at: number;
      thread_ts?: string;
    }
  ): Promise<{ scheduled_message_id: string; post_at: number; channel: string }> {
    return this.slackRequest(userId, 'chat.scheduleMessage', {
      channel: options.channel,
      post_at: options.post_at.toString(),
      ...(options.text && { text: options.text }),
      ...(options.blocks && { blocks: JSON.stringify(options.blocks) }),
      ...(options.thread_ts && { thread_ts: options.thread_ts }),
    });
  }

  async deleteScheduledMessage(
    userId: string,
    channelId: string,
    scheduledMessageId: string
  ): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'chat.deleteScheduledMessage', {
      channel: channelId,
      scheduled_message_id: scheduledMessageId,
    });
  }

  // ============ Files API ============

  async listFiles(
    userId: string,
    options: {
      channel?: string;
      user?: string;
      types?: string;
      ts_from?: string;
      ts_to?: string;
      count?: number;
      page?: number;
    } = {}
  ): Promise<{ files: any[]; paging: { count: number; total: number; page: number; pages: number } }> {
    return this.slackRequest(userId, 'files.list', {
      count: (options.count || 100).toString(),
      ...(options.channel && { channel: options.channel }),
      ...(options.user && { user: options.user }),
      ...(options.types && { types: options.types }),
      ...(options.ts_from && { ts_from: options.ts_from }),
      ...(options.ts_to && { ts_to: options.ts_to }),
      ...(options.page && { page: options.page.toString() }),
    });
  }

  async getFile(userId: string, fileId: string): Promise<{ file: any }> {
    return this.slackRequest(userId, 'files.info', { file: fileId });
  }

  async deleteFile(userId: string, fileId: string): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'files.delete', { file: fileId });
  }

  async shareFile(
    userId: string,
    fileId: string,
    channelId: string
  ): Promise<{ ok: boolean; file: any }> {
    return this.slackRequest(userId, 'files.sharedPublicURL', { file: fileId });
  }

  // ============ Search API ============

  async searchMessages(
    userId: string,
    query: string,
    options: { count?: number; page?: number; sort?: 'score' | 'timestamp'; sort_dir?: 'asc' | 'desc' } = {}
  ): Promise<{
    messages: { matches: any[]; total: number; pagination: any };
    query: string;
  }> {
    return this.slackRequest(userId, 'search.messages', {
      query,
      count: (options.count || 20).toString(),
      ...(options.page && { page: options.page.toString() }),
      ...(options.sort && { sort: options.sort }),
      ...(options.sort_dir && { sort_dir: options.sort_dir }),
    });
  }

  async searchFiles(
    userId: string,
    query: string,
    options: { count?: number; page?: number; sort?: 'score' | 'timestamp'; sort_dir?: 'asc' | 'desc' } = {}
  ): Promise<{
    files: { matches: any[]; total: number; pagination: any };
    query: string;
  }> {
    return this.slackRequest(userId, 'search.files', {
      query,
      count: (options.count || 20).toString(),
      ...(options.page && { page: options.page.toString() }),
      ...(options.sort && { sort: options.sort }),
      ...(options.sort_dir && { sort_dir: options.sort_dir }),
    });
  }

  // ============ Team API ============

  async getTeamInfo(userId: string): Promise<{ team: SlackTeam }> {
    return this.slackRequest(userId, 'team.info');
  }

  // ============ Reminders API ============

  async addReminder(
    userId: string,
    options: { text: string; time: string | number; user?: string }
  ): Promise<{ ok: boolean; reminder: any }> {
    return this.slackRequest(userId, 'reminders.add', {
      text: options.text,
      time: options.time.toString(),
      ...(options.user && { user: options.user }),
    });
  }

  async listReminders(userId: string): Promise<{ ok: boolean; reminders: any[] }> {
    return this.slackRequest(userId, 'reminders.list');
  }

  async deleteReminder(userId: string, reminderId: string): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'reminders.delete', { reminder: reminderId });
  }

  async completeReminder(userId: string, reminderId: string): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'reminders.complete', { reminder: reminderId });
  }

  // ============ Pins API ============

  async pinMessage(userId: string, channelId: string, ts: string): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'pins.add', { channel: channelId, timestamp: ts });
  }

  async unpinMessage(userId: string, channelId: string, ts: string): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'pins.remove', { channel: channelId, timestamp: ts });
  }

  async listPins(userId: string, channelId: string): Promise<{ ok: boolean; items: any[] }> {
    return this.slackRequest(userId, 'pins.list', { channel: channelId });
  }

  // ============ Bookmarks API ============

  async listBookmarks(userId: string, channelId: string): Promise<{ ok: boolean; bookmarks: any[] }> {
    return this.slackRequest(userId, 'bookmarks.list', { channel_id: channelId });
  }

  async addBookmark(
    userId: string,
    options: {
      channel_id: string;
      title: string;
      type: 'link';
      link: string;
      emoji?: string;
    }
  ): Promise<{ ok: boolean; bookmark: any }> {
    return this.slackRequest(userId, 'bookmarks.add', options);
  }

  async removeBookmark(userId: string, channelId: string, bookmarkId: string): Promise<{ ok: boolean }> {
    return this.slackRequest(userId, 'bookmarks.remove', { channel_id: channelId, bookmark_id: bookmarkId });
  }
}

// ============================================================================
// DROPBOX SERVICE
// ============================================================================

export interface DropboxAccount {
  account_id: string;
  name: {
    given_name: string;
    surname: string;
    familiar_name: string;
    display_name: string;
    abbreviated_name: string;
  };
  email: string;
  email_verified: boolean;
  disabled: boolean;
  locale: string;
  referral_link: string;
  is_paired: boolean;
  account_type: {
    '.tag': 'basic' | 'pro' | 'business';
  };
  root_info: {
    '.tag': string;
    root_namespace_id: string;
    home_namespace_id: string;
  };
  country: string;
  team?: {
    id: string;
    name: string;
    sharing_policies: any;
    office_addin_policy: any;
  };
  team_member_id?: string;
}

export interface DropboxSpaceUsage {
  used: number;
  allocation: {
    '.tag': 'individual' | 'team';
    allocated: number;
    user_within_team_space_allocated?: number;
    user_within_team_space_limit_type?: any;
    user_within_team_space_used_cached?: number;
  };
}

export interface DropboxFileMetadata {
  '.tag': 'file';
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
  client_modified: string;
  server_modified: string;
  rev: string;
  size: number;
  is_downloadable: boolean;
  content_hash: string;
  sharing_info?: {
    read_only: boolean;
    parent_shared_folder_id: string;
    modified_by: string;
  };
}

export interface DropboxFolderMetadata {
  '.tag': 'folder';
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
  sharing_info?: {
    read_only: boolean;
    parent_shared_folder_id: string;
    traverse_only: boolean;
    no_access: boolean;
  };
}

export type DropboxMetadata = DropboxFileMetadata | DropboxFolderMetadata;

export interface DropboxListFolderResult {
  entries: DropboxMetadata[];
  cursor: string;
  has_more: boolean;
}

export interface DropboxSearchResult {
  matches: Array<{
    match_type: { '.tag': string };
    metadata: {
      '.tag': 'metadata';
      metadata: DropboxMetadata;
    };
  }>;
  more: boolean;
  start: number;
}

export interface DropboxSharedLink {
  '.tag': 'file' | 'folder';
  url: string;
  id: string;
  name: string;
  path_lower?: string;
  link_permissions: {
    resolved_visibility: { '.tag': string };
    requested_visibility: { '.tag': string };
    can_revoke: boolean;
  };
}

class DropboxService extends BaseIntegrationService {
  constructor() {
    super('dropbox', 'https://api.dropboxapi.com/2');
  }

  protected parsePaginatedResponse<T>(response: any): { items: T[]; nextCursor?: string } {
    return {
      items: response.entries || response.matches || [],
      nextCursor: response.has_more ? response.cursor : undefined,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getCurrentAccount(userId);
      return true;
    } catch {
      return false;
    }
  }

  private async dropboxRequest<T>(
    userId: string,
    endpoint: string,
    data: Record<string, any> = {},
    isContent = false
  ): Promise<T> {
    const baseUrl = isContent ? 'https://content.dropboxapi.com/2' : 'https://api.dropboxapi.com/2';

    // Override base URL for content requests
    const url = isContent ? endpoint : endpoint;

    return this.request(userId, url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============ Account API ============

  async getCurrentAccount(userId: string): Promise<DropboxAccount> {
    return this.dropboxRequest(userId, '/users/get_current_account');
  }

  async getAccount(userId: string, accountId: string): Promise<DropboxAccount> {
    return this.dropboxRequest(userId, '/users/get_account', { account_id: accountId });
  }

  async getSpaceUsage(userId: string): Promise<DropboxSpaceUsage> {
    return this.dropboxRequest(userId, '/users/get_space_usage');
  }

  // ============ Files API ============

  async listFolder(
    userId: string,
    path: string,
    options: {
      recursive?: boolean;
      include_media_info?: boolean;
      include_deleted?: boolean;
      include_has_explicit_shared_members?: boolean;
      include_mounted_folders?: boolean;
      include_non_downloadable_files?: boolean;
      limit?: number;
    } = {}
  ): Promise<DropboxListFolderResult> {
    return this.dropboxRequest(userId, '/files/list_folder', {
      path: path || '',
      recursive: options.recursive || false,
      include_media_info: options.include_media_info || false,
      include_deleted: options.include_deleted || false,
      include_has_explicit_shared_members: options.include_has_explicit_shared_members || false,
      include_mounted_folders: options.include_mounted_folders || true,
      include_non_downloadable_files: options.include_non_downloadable_files || true,
      ...(options.limit && { limit: options.limit }),
    });
  }

  async listFolderContinue(userId: string, cursor: string): Promise<DropboxListFolderResult> {
    return this.dropboxRequest(userId, '/files/list_folder/continue', { cursor });
  }

  async getMetadata(
    userId: string,
    path: string,
    options: {
      include_media_info?: boolean;
      include_deleted?: boolean;
      include_has_explicit_shared_members?: boolean;
    } = {}
  ): Promise<DropboxMetadata> {
    return this.dropboxRequest(userId, '/files/get_metadata', {
      path,
      include_media_info: options.include_media_info || false,
      include_deleted: options.include_deleted || false,
      include_has_explicit_shared_members: options.include_has_explicit_shared_members || false,
    });
  }

  async createFolder(
    userId: string,
    path: string,
    autorename = false
  ): Promise<{ metadata: DropboxFolderMetadata }> {
    return this.dropboxRequest(userId, '/files/create_folder_v2', { path, autorename });
  }

  async deleteFile(userId: string, path: string): Promise<{ metadata: DropboxMetadata }> {
    return this.dropboxRequest(userId, '/files/delete_v2', { path });
  }

  async deleteBatch(userId: string, paths: string[]): Promise<any> {
    return this.dropboxRequest(userId, '/files/delete_batch', {
      entries: paths.map(path => ({ path })),
    });
  }

  async permanentlyDelete(userId: string, path: string): Promise<void> {
    await this.dropboxRequest(userId, '/files/permanently_delete', { path });
  }

  async copyFile(
    userId: string,
    fromPath: string,
    toPath: string,
    options: { autorename?: boolean; allow_shared_folder?: boolean; allow_ownership_transfer?: boolean } = {}
  ): Promise<{ metadata: DropboxMetadata }> {
    return this.dropboxRequest(userId, '/files/copy_v2', {
      from_path: fromPath,
      to_path: toPath,
      autorename: options.autorename || false,
      allow_shared_folder: options.allow_shared_folder || false,
      allow_ownership_transfer: options.allow_ownership_transfer || false,
    });
  }

  async moveFile(
    userId: string,
    fromPath: string,
    toPath: string,
    options: { autorename?: boolean; allow_shared_folder?: boolean; allow_ownership_transfer?: boolean } = {}
  ): Promise<{ metadata: DropboxMetadata }> {
    return this.dropboxRequest(userId, '/files/move_v2', {
      from_path: fromPath,
      to_path: toPath,
      autorename: options.autorename || false,
      allow_shared_folder: options.allow_shared_folder || false,
      allow_ownership_transfer: options.allow_ownership_transfer || false,
    });
  }

  async search(
    userId: string,
    query: string,
    options: {
      path?: string;
      max_results?: number;
      order_by?: 'relevance' | 'last_modified_time';
      file_status?: 'active' | 'deleted';
      filename_only?: boolean;
      file_extensions?: string[];
      file_categories?: string[];
    } = {}
  ): Promise<{
    matches: Array<{ metadata: { metadata: DropboxMetadata } }>;
    more: boolean;
    cursor?: string;
  }> {
    return this.dropboxRequest(userId, '/files/search_v2', {
      query,
      options: {
        path: options.path,
        max_results: options.max_results || 100,
        order_by: options.order_by ? { '.tag': options.order_by } : undefined,
        file_status: options.file_status ? { '.tag': options.file_status } : undefined,
        filename_only: options.filename_only,
        file_extensions: options.file_extensions,
        file_categories: options.file_categories?.map(c => ({ '.tag': c })),
      },
    });
  }

  async searchContinue(userId: string, cursor: string): Promise<{
    matches: Array<{ metadata: { metadata: DropboxMetadata } }>;
    more: boolean;
    cursor?: string;
  }> {
    return this.dropboxRequest(userId, '/files/search/continue_v2', { cursor });
  }

  async getTemporaryLink(userId: string, path: string): Promise<{ metadata: DropboxFileMetadata; link: string }> {
    return this.dropboxRequest(userId, '/files/get_temporary_link', { path });
  }

  async getPreview(userId: string, path: string): Promise<{ link: string }> {
    return this.dropboxRequest(userId, '/files/get_preview', { path });
  }

  async getThumbnail(
    userId: string,
    path: string,
    options: { size?: 'w32h32' | 'w64h64' | 'w128h128' | 'w256h256' | 'w480h320' | 'w640h480' | 'w960h640' | 'w1024h768' | 'w2048h1536'; format?: 'jpeg' | 'png' } = {}
  ): Promise<{ link: string }> {
    return this.dropboxRequest(userId, '/files/get_thumbnail_v2', {
      resource: { '.tag': 'path', path },
      size: options.size ? { '.tag': options.size } : undefined,
      format: options.format ? { '.tag': options.format } : undefined,
    });
  }

  // ============ Revisions API ============

  async listRevisions(
    userId: string,
    path: string,
    options: { mode?: 'path' | 'id'; limit?: number } = {}
  ): Promise<{ entries: any[]; is_deleted: boolean }> {
    return this.dropboxRequest(userId, '/files/list_revisions', {
      path,
      mode: options.mode ? { '.tag': options.mode } : undefined,
      limit: options.limit || 10,
    });
  }

  async restoreFile(userId: string, path: string, rev: string): Promise<DropboxFileMetadata> {
    return this.dropboxRequest(userId, '/files/restore', { path, rev });
  }

  // ============ Sharing API ============

  async createSharedLink(
    userId: string,
    path: string,
    settings?: {
      requested_visibility?: 'public' | 'team_only' | 'password';
      link_password?: string;
      expires?: string;
      audience?: 'public' | 'team' | 'no_one';
    }
  ): Promise<DropboxSharedLink> {
    return this.dropboxRequest(userId, '/sharing/create_shared_link_with_settings', {
      path,
      settings: settings ? {
        requested_visibility: settings.requested_visibility ? { '.tag': settings.requested_visibility } : undefined,
        link_password: settings.link_password,
        expires: settings.expires,
        audience: settings.audience ? { '.tag': settings.audience } : undefined,
      } : undefined,
    });
  }

  async listSharedLinks(
    userId: string,
    options: { path?: string; cursor?: string; direct_only?: boolean } = {}
  ): Promise<{ links: DropboxSharedLink[]; has_more: boolean; cursor?: string }> {
    return this.dropboxRequest(userId, '/sharing/list_shared_links', {
      path: options.path,
      cursor: options.cursor,
      direct_only: options.direct_only,
    });
  }

  async modifySharedLinkSettings(
    userId: string,
    url: string,
    settings: {
      requested_visibility?: 'public' | 'team_only' | 'password';
      link_password?: string;
      expires?: string;
    },
    removeExpiration = false
  ): Promise<DropboxSharedLink> {
    return this.dropboxRequest(userId, '/sharing/modify_shared_link_settings', {
      url,
      settings: {
        requested_visibility: settings.requested_visibility ? { '.tag': settings.requested_visibility } : undefined,
        link_password: settings.link_password,
        expires: settings.expires,
      },
      remove_expiration: removeExpiration,
    });
  }

  async revokeSharedLink(userId: string, url: string): Promise<void> {
    await this.dropboxRequest(userId, '/sharing/revoke_shared_link', { url });
  }

  async getSharedLinkFile(
    userId: string,
    url: string,
    path?: string
  ): Promise<{ link: string; metadata: DropboxMetadata }> {
    return this.dropboxRequest(userId, '/sharing/get_shared_link_file', {
      url,
      path,
    });
  }

  // ============ Folder Sharing API ============

  async shareFolder(
    userId: string,
    path: string,
    options: {
      member_policy?: 'anyone' | 'team';
      acl_update_policy?: 'owner' | 'editors';
      shared_link_policy?: 'anyone' | 'members';
      force_async?: boolean;
    } = {}
  ): Promise<any> {
    return this.dropboxRequest(userId, '/sharing/share_folder', {
      path,
      member_policy: options.member_policy ? { '.tag': options.member_policy } : undefined,
      acl_update_policy: options.acl_update_policy ? { '.tag': options.acl_update_policy } : undefined,
      shared_link_policy: options.shared_link_policy ? { '.tag': options.shared_link_policy } : undefined,
      force_async: options.force_async || false,
    });
  }

  async listFolderMembers(
    userId: string,
    sharedFolderId: string,
    options: { actions?: string[]; limit?: number } = {}
  ): Promise<{ users: any[]; groups: any[]; invitees: any[]; cursor?: string }> {
    return this.dropboxRequest(userId, '/sharing/list_folder_members', {
      shared_folder_id: sharedFolderId,
      actions: options.actions?.map(a => ({ '.tag': a })),
      limit: options.limit || 1000,
    });
  }

  async addFolderMember(
    userId: string,
    sharedFolderId: string,
    members: Array<{
      member: { '.tag': 'email'; email: string } | { '.tag': 'dropbox_id'; dropbox_id: string };
      access_level: { '.tag': 'owner' | 'editor' | 'viewer' | 'viewer_no_comment' };
    }>,
    options: { quiet?: boolean; custom_message?: string } = {}
  ): Promise<void> {
    await this.dropboxRequest(userId, '/sharing/add_folder_member', {
      shared_folder_id: sharedFolderId,
      members,
      quiet: options.quiet || false,
      custom_message: options.custom_message,
    });
  }

  async removeFolderMember(
    userId: string,
    sharedFolderId: string,
    member: { '.tag': 'email'; email: string } | { '.tag': 'dropbox_id'; dropbox_id: string },
    leaveACopy = false
  ): Promise<any> {
    return this.dropboxRequest(userId, '/sharing/remove_folder_member', {
      shared_folder_id: sharedFolderId,
      member,
      leave_a_copy: leaveACopy,
    });
  }

  async unshareFolder(userId: string, sharedFolderId: string, leaveACopy = false): Promise<any> {
    return this.dropboxRequest(userId, '/sharing/unshare_folder', {
      shared_folder_id: sharedFolderId,
      leave_a_copy: leaveACopy,
    });
  }

  // ============ Paper API ============

  async listPaperDocs(
    userId: string,
    options: {
      filter_by?: 'docs_accessed' | 'docs_created';
      sort_by?: 'accessed' | 'modified' | 'created';
      sort_order?: 'ascending' | 'descending';
      limit?: number;
    } = {}
  ): Promise<{ doc_ids: string[]; cursor: { value: string; expiration: string }; has_more: boolean }> {
    return this.dropboxRequest(userId, '/paper/docs/list', {
      filter_by: options.filter_by ? { '.tag': options.filter_by } : undefined,
      sort_by: options.sort_by ? { '.tag': options.sort_by } : undefined,
      sort_order: options.sort_order ? { '.tag': options.sort_order } : undefined,
      limit: options.limit || 1000,
    });
  }

  async getPaperDocFolderInfo(
    userId: string,
    docId: string
  ): Promise<{ folder_sharing_policy_type: { '.tag': string }; folders?: any[] }> {
    return this.dropboxRequest(userId, '/paper/docs/get_folder_info', { doc_id: docId });
  }

  async archivePaperDoc(userId: string, docId: string): Promise<void> {
    await this.dropboxRequest(userId, '/paper/docs/archive', { doc_id: docId });
  }

  async permanentlyDeletePaperDoc(userId: string, docId: string): Promise<void> {
    await this.dropboxRequest(userId, '/paper/docs/permanently_delete', { doc_id: docId });
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCES
// ============================================================================

export const notionService = new NotionService();
export const slackService = new SlackService();
export const dropboxService = new DropboxService();
