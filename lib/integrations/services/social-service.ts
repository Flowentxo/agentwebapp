/**
 * Social Media Integration Services
 * Handles LinkedIn, Twitter, Facebook, Instagram, TikTok, YouTube
 */

import { BaseIntegrationService, PaginatedResponse, ApiError } from './base-service';

// ============================================
// LINKEDIN TYPES
// ============================================
export interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  localizedHeadline?: string;
  profilePicture?: {
    displayImage: string;
  };
  vanityName?: string;
}

export interface LinkedInPost {
  id: string;
  author: string;
  commentary?: string;
  content?: {
    article?: {
      source: string;
      title: string;
      description?: string;
      thumbnail?: string;
    };
    media?: {
      id: string;
      title?: string;
    };
  };
  visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN';
  lifecycleState: 'PUBLISHED' | 'DRAFT';
  created: { time: number };
  lastModified: { time: number };
}

export interface CreateLinkedInPostOptions {
  text: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  articleUrl?: string;
  articleTitle?: string;
  articleDescription?: string;
}

// ============================================
// TWITTER TYPES
// ============================================
export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  created_at?: string;
  description?: string;
  profile_image_url?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

export interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
  };
  entities?: {
    urls?: Array<{ url: string; expanded_url: string; display_url: string }>;
    mentions?: Array<{ username: string; id: string }>;
    hashtags?: Array<{ tag: string }>;
  };
  attachments?: {
    media_keys?: string[];
  };
}

export interface CreateTweetOptions {
  text: string;
  reply_to?: string;
  quote_tweet_id?: string;
  media_ids?: string[];
  poll?: {
    options: string[];
    duration_minutes: number;
  };
}

// ============================================
// FACEBOOK TYPES
// ============================================
export interface FacebookUser {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
      width: number;
      height: number;
    };
  };
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  category_list?: Array<{ id: string; name: string }>;
  tasks?: string[];
  picture?: {
    data: { url: string };
  };
  followers_count?: number;
  fan_count?: number;
}

export interface FacebookPost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  updated_time?: string;
  full_picture?: string;
  permalink_url?: string;
  shares?: { count: number };
  reactions?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
}

export interface CreateFacebookPostOptions {
  message: string;
  link?: string;
  pageId: string;
  pageAccessToken: string;
  scheduled_publish_time?: number;
  published?: boolean;
}

// ============================================
// INSTAGRAM TYPES
// ============================================
export interface InstagramUser {
  id: string;
  username: string;
  account_type?: 'BUSINESS' | 'MEDIA_CREATOR' | 'PERSONAL';
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  username: string;
  like_count?: number;
  comments_count?: number;
  children?: {
    data: Array<{
      id: string;
      media_type: string;
      media_url: string;
    }>;
  };
}

export interface InstagramInsights {
  name: string;
  period: string;
  values: Array<{
    value: number;
    end_time?: string;
  }>;
  title: string;
  description: string;
  id: string;
}

// ============================================
// TIKTOK TYPES
// ============================================
export interface TikTokUser {
  open_id: string;
  union_id?: string;
  avatar_url: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface TikTokVideo {
  id: string;
  create_time: number;
  cover_image_url: string;
  share_url: string;
  video_description?: string;
  duration: number;
  height: number;
  width: number;
  title?: string;
  embed_html?: string;
  embed_link?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
}

// ============================================
// LINKEDIN SERVICE
// ============================================
export class LinkedInService extends BaseIntegrationService {
  constructor() {
    super('linkedin');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;
    return {
      items: (response.elements || []) as T[],
      nextCursor: undefined,
      hasMore: false,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getProfile(userId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<LinkedInProfile> {
    const response = await this.request<LinkedInProfile>(
      userId,
      '/userinfo'
    );
    return response.data;
  }

  /**
   * Get profile picture
   */
  async getProfilePicture(userId: string): Promise<string | null> {
    const profile = await this.getProfile(userId);
    return profile.profilePicture?.displayImage || null;
  }

  /**
   * Create a text post
   */
  async createPost(userId: string, options: CreateLinkedInPostOptions): Promise<string> {
    // Get the user's URN
    const profile = await this.getProfile(userId);
    const authorUrn = `urn:li:person:${profile.id}`;

    const postBody: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: options.text,
          },
          shareMediaCategory: options.articleUrl ? 'ARTICLE' : 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': options.visibility || 'PUBLIC',
      },
    };

    // Add article if provided
    if (options.articleUrl) {
      (postBody.specificContent as Record<string, unknown>)['com.linkedin.ugc.ShareContent'] = {
        ...(postBody.specificContent as Record<string, unknown>)['com.linkedin.ugc.ShareContent'],
        media: [
          {
            status: 'READY',
            originalUrl: options.articleUrl,
            title: { text: options.articleTitle || '' },
            description: { text: options.articleDescription || '' },
          },
        ],
      };
    }

    const response = await this.request<{ id: string }>(
      userId,
      '/ugcPosts',
      {
        method: 'POST',
        body: postBody,
        headers: {
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    return response.data.id;
  }

  /**
   * Get organization posts (for company pages)
   */
  async getOrganizationPosts(
    userId: string,
    organizationId: string,
    count: number = 10
  ): Promise<LinkedInPost[]> {
    const response = await this.request<{ elements: LinkedInPost[] }>(
      userId,
      '/ugcPosts',
      {
        params: {
          q: 'authors',
          authors: `List(urn:li:organization:${organizationId})`,
          count,
        },
        headers: {
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );
    return response.data.elements || [];
  }
}

// ============================================
// TWITTER SERVICE
// ============================================
export class TwitterService extends BaseIntegrationService {
  constructor() {
    super('twitter');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;
    const meta = response.meta as Record<string, unknown> | undefined;

    return {
      items: (response.data || []) as T[],
      nextCursor: meta?.next_token as string | undefined,
      hasMore: !!meta?.next_token,
      total: meta?.result_count as number | undefined,
    };
  }

  protected getCursorParam(cursor: string): Record<string, string> {
    return { pagination_token: cursor };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getMe(userId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get authenticated user
   */
  async getMe(userId: string): Promise<TwitterUser> {
    const response = await this.request<{ data: TwitterUser }>(
      userId,
      '/users/me',
      {
        params: {
          'user.fields': 'created_at,description,profile_image_url,public_metrics,verified',
        },
      }
    );
    return response.data.data;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(userId: string, username: string): Promise<TwitterUser> {
    const response = await this.request<{ data: TwitterUser }>(
      userId,
      `/users/by/username/${username}`,
      {
        params: {
          'user.fields': 'created_at,description,profile_image_url,public_metrics,verified',
        },
      }
    );
    return response.data.data;
  }

  /**
   * Create a tweet
   */
  async createTweet(userId: string, options: CreateTweetOptions): Promise<Tweet> {
    const body: Record<string, unknown> = {
      text: options.text,
    };

    if (options.reply_to) {
      body.reply = { in_reply_to_tweet_id: options.reply_to };
    }

    if (options.quote_tweet_id) {
      body.quote_tweet_id = options.quote_tweet_id;
    }

    if (options.media_ids && options.media_ids.length > 0) {
      body.media = { media_ids: options.media_ids };
    }

    if (options.poll) {
      body.poll = options.poll;
    }

    const response = await this.request<{ data: Tweet }>(
      userId,
      '/tweets',
      {
        method: 'POST',
        body,
      }
    );

    return response.data.data;
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(userId: string, tweetId: string): Promise<void> {
    await this.request(
      userId,
      `/tweets/${tweetId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Get user's tweets
   */
  async getUserTweets(
    userId: string,
    twitterUserId: string,
    maxResults: number = 10
  ): Promise<Tweet[]> {
    const response = await this.request<{ data: Tweet[] }>(
      userId,
      `/users/${twitterUserId}/tweets`,
      {
        params: {
          max_results: maxResults,
          'tweet.fields': 'created_at,public_metrics,entities,attachments',
        },
      }
    );
    return response.data.data || [];
  }

  /**
   * Get tweet by ID
   */
  async getTweet(userId: string, tweetId: string): Promise<Tweet> {
    const response = await this.request<{ data: Tweet }>(
      userId,
      `/tweets/${tweetId}`,
      {
        params: {
          'tweet.fields': 'created_at,public_metrics,entities,attachments,conversation_id',
        },
      }
    );
    return response.data.data;
  }

  /**
   * Like a tweet
   */
  async likeTweet(userId: string, tweetId: string): Promise<void> {
    const me = await this.getMe(userId);
    await this.request(
      userId,
      `/users/${me.id}/likes`,
      {
        method: 'POST',
        body: { tweet_id: tweetId },
      }
    );
  }

  /**
   * Retweet
   */
  async retweet(userId: string, tweetId: string): Promise<void> {
    const me = await this.getMe(userId);
    await this.request(
      userId,
      `/users/${me.id}/retweets`,
      {
        method: 'POST',
        body: { tweet_id: tweetId },
      }
    );
  }

  /**
   * Search tweets
   */
  async searchTweets(
    userId: string,
    query: string,
    maxResults: number = 10
  ): Promise<Tweet[]> {
    const response = await this.request<{ data: Tweet[] }>(
      userId,
      '/tweets/search/recent',
      {
        params: {
          query,
          max_results: maxResults,
          'tweet.fields': 'created_at,public_metrics,entities,author_id',
        },
      }
    );
    return response.data.data || [];
  }
}

// ============================================
// FACEBOOK SERVICE
// ============================================
export class FacebookService extends BaseIntegrationService {
  constructor() {
    super('facebook');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;
    const paging = response.paging as Record<string, unknown> | undefined;

    return {
      items: (response.data || []) as T[],
      nextCursor: paging?.cursors?.after as string | undefined,
      hasMore: !!paging?.next,
    };
  }

  protected getCursorParam(cursor: string): Record<string, string> {
    return { after: cursor };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getMe(userId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get authenticated user
   */
  async getMe(userId: string): Promise<FacebookUser> {
    const response = await this.request<FacebookUser>(
      userId,
      '/me',
      {
        params: {
          fields: 'id,name,email,picture',
        },
      }
    );
    return response.data;
  }

  /**
   * Get pages managed by user
   */
  async getPages(userId: string): Promise<FacebookPage[]> {
    const response = await this.request<{ data: FacebookPage[] }>(
      userId,
      '/me/accounts',
      {
        params: {
          fields: 'id,name,access_token,category,category_list,tasks,picture,followers_count,fan_count',
        },
      }
    );
    return response.data.data || [];
  }

  /**
   * Get page posts
   */
  async getPagePosts(
    userId: string,
    pageId: string,
    limit: number = 25
  ): Promise<FacebookPost[]> {
    const response = await this.request<{ data: FacebookPost[] }>(
      userId,
      `/${pageId}/posts`,
      {
        params: {
          fields: 'id,message,story,created_time,updated_time,full_picture,permalink_url,shares,reactions.summary(true),comments.summary(true)',
          limit,
        },
      }
    );
    return response.data.data || [];
  }

  /**
   * Create page post
   */
  async createPagePost(userId: string, options: CreateFacebookPostOptions): Promise<string> {
    // Use page access token for posting
    const { token } = await this.getAccessToken(userId);

    const body: Record<string, unknown> = {
      message: options.message,
      access_token: options.pageAccessToken,
    };

    if (options.link) {
      body.link = options.link;
    }

    if (options.scheduled_publish_time) {
      body.scheduled_publish_time = options.scheduled_publish_time;
      body.published = false;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${options.pageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new ApiError('Failed to create post', response.status, error, 'facebook');
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Get page insights
   */
  async getPageInsights(
    userId: string,
    pageId: string,
    metrics: string[] = ['page_impressions', 'page_engaged_users', 'page_fans'],
    period: 'day' | 'week' | 'days_28' = 'week'
  ): Promise<Array<{ name: string; values: Array<{ value: number; end_time: string }> }>> {
    const response = await this.request<{
      data: Array<{ name: string; values: Array<{ value: number; end_time: string }> }>;
    }>(
      userId,
      `/${pageId}/insights`,
      {
        params: {
          metric: metrics.join(','),
          period,
        },
      }
    );
    return response.data.data || [];
  }
}

// ============================================
// INSTAGRAM SERVICE
// ============================================
export class InstagramService extends BaseIntegrationService {
  constructor() {
    super('instagram');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;
    const paging = response.paging as Record<string, unknown> | undefined;

    return {
      items: (response.data || []) as T[],
      nextCursor: paging?.cursors?.after as string | undefined,
      hasMore: !!paging?.next,
    };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getProfile(userId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Instagram Business/Creator account profile
   */
  async getProfile(userId: string): Promise<InstagramUser> {
    const response = await this.request<InstagramUser>(
      userId,
      '/me',
      {
        params: {
          fields: 'id,username,account_type,media_count,followers_count,follows_count,profile_picture_url,biography,website',
        },
      }
    );
    return response.data;
  }

  /**
   * Get user media
   */
  async getMedia(userId: string, limit: number = 25): Promise<InstagramMedia[]> {
    const response = await this.request<{ data: InstagramMedia[] }>(
      userId,
      '/me/media',
      {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count,children{id,media_type,media_url}',
          limit,
        },
      }
    );
    return response.data.data || [];
  }

  /**
   * Get single media item
   */
  async getMediaItem(userId: string, mediaId: string): Promise<InstagramMedia> {
    const response = await this.request<InstagramMedia>(
      userId,
      `/${mediaId}`,
      {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count',
        },
      }
    );
    return response.data;
  }

  /**
   * Get media insights (requires Business/Creator account)
   */
  async getMediaInsights(
    userId: string,
    mediaId: string,
    metrics: string[] = ['impressions', 'reach', 'engagement']
  ): Promise<InstagramInsights[]> {
    const response = await this.request<{ data: InstagramInsights[] }>(
      userId,
      `/${mediaId}/insights`,
      {
        params: {
          metric: metrics.join(','),
        },
      }
    );
    return response.data.data || [];
  }

  /**
   * Get account insights
   */
  async getAccountInsights(
    userId: string,
    metrics: string[] = ['impressions', 'reach', 'profile_views'],
    period: 'day' | 'week' | 'days_28' = 'week'
  ): Promise<InstagramInsights[]> {
    const response = await this.request<{ data: InstagramInsights[] }>(
      userId,
      '/me/insights',
      {
        params: {
          metric: metrics.join(','),
          period,
        },
      }
    );
    return response.data.data || [];
  }

  /**
   * Search hashtag
   */
  async searchHashtag(userId: string, hashtag: string): Promise<string> {
    const response = await this.request<{ data: Array<{ id: string }> }>(
      userId,
      '/ig_hashtag_search',
      {
        params: {
          q: hashtag,
        },
      }
    );
    return response.data.data?.[0]?.id || '';
  }
}

// ============================================
// TIKTOK SERVICE
// ============================================
export class TikTokService extends BaseIntegrationService {
  constructor() {
    super('tiktok');
  }

  protected parsePaginatedResponse<T>(data: unknown): PaginatedResponse<T> {
    const response = data as Record<string, unknown>;
    const dataObj = response.data as Record<string, unknown> | undefined;

    return {
      items: (dataObj?.videos || dataObj?.user || []) as T[],
      nextCursor: dataObj?.cursor as string | undefined,
      hasMore: dataObj?.has_more as boolean || false,
    };
  }

  protected getCursorParam(cursor: string): Record<string, string> {
    return { cursor };
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getProfile(userId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<TikTokUser> {
    const response = await this.request<{ data: { user: TikTokUser } }>(
      userId,
      '/user/info/',
      {
        params: {
          fields: 'open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count',
        },
      }
    );
    return response.data.data.user;
  }

  /**
   * Get user videos
   */
  async getVideos(
    userId: string,
    maxCount: number = 20
  ): Promise<TikTokVideo[]> {
    const response = await this.request<{ data: { videos: TikTokVideo[] } }>(
      userId,
      '/video/list/',
      {
        method: 'POST',
        body: {
          max_count: maxCount,
        },
        params: {
          fields: 'id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,embed_html,embed_link,like_count,comment_count,share_count,view_count',
        },
      }
    );
    return response.data.data.videos || [];
  }

  /**
   * Get video by ID
   */
  async getVideo(userId: string, videoId: string): Promise<TikTokVideo> {
    const response = await this.request<{ data: { videos: TikTokVideo[] } }>(
      userId,
      '/video/query/',
      {
        method: 'POST',
        body: {
          filters: {
            video_ids: [videoId],
          },
        },
        params: {
          fields: 'id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,embed_html,embed_link,like_count,comment_count,share_count,view_count',
        },
      }
    );
    return response.data.data.videos?.[0];
  }
}

// Export singleton instances
export const linkedInService = new LinkedInService();
export const twitterService = new TwitterService();
export const facebookService = new FacebookService();
export const instagramService = new InstagramService();
export const tiktokService = new TikTokService();
