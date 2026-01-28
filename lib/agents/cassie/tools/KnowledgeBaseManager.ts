/**
 * PHASE 46-48: Knowledge Base Manager
 * Comprehensive knowledge base management for customer support
 */

import { getDb } from '@/lib/db';
import { sql, eq, and, or, desc, asc, ilike, gte, lte } from 'drizzle-orm';

// ============================================
// TYPES
// ============================================

export interface KnowledgeArticle {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  visibility: 'internal' | 'external' | 'both';
  author: string;
  views: number;
  helpful: number;
  notHelpful: number;
  relatedArticles: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface KnowledgeCategory {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string;
  parentId?: string;
  icon?: string;
  order: number;
  articleCount: number;
}

export interface SearchResult {
  article: KnowledgeArticle;
  score: number;
  highlights: {
    title?: string;
    content?: string;
  };
  matchedTerms: string[];
}

export interface KnowledgeSearchOptions {
  workspaceId: string;
  query: string;
  category?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'internal' | 'external' | 'both';
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'views' | 'helpful';
}

export interface ArticleAnalytics {
  articleId: string;
  totalViews: number;
  uniqueViews: number;
  helpfulRate: number;
  searchAppearances: number;
  clickThroughRate: number;
  avgTimeOnPage: number;
  bounceRate: number;
  linkedTickets: number;
  viewsByDay: Array<{ date: string; views: number }>;
}

export interface KnowledgeBaseStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalCategories: number;
  totalViews: number;
  avgHelpfulRate: number;
  topArticles: Array<{ id: string; title: string; views: number }>;
  recentlyUpdated: Array<{ id: string; title: string; updatedAt: Date }>;
  coverageGaps: string[];
}

// ============================================
// KNOWLEDGE BASE MANAGER CLASS
// ============================================

export class KnowledgeBaseManager {
  private embeddingCache: Map<string, number[]> = new Map();

  // ============================================
  // ARTICLE CRUD OPERATIONS
  // ============================================

  /**
   * Get articles with filtering and pagination
   */
  public async getArticles(options: {
    workspaceId: string;
    category?: string;
    status?: 'draft' | 'published' | 'archived';
    visibility?: 'internal' | 'external' | 'both';
    tags?: string[];
    limit?: number;
    offset?: number;
    sortBy?: 'date' | 'views' | 'helpful' | 'title';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ articles: KnowledgeArticle[]; total: number }> {
    const {
      workspaceId,
      category,
      status,
      visibility,
      tags,
      limit = 20,
      offset = 0,
      sortBy = 'date',
      sortOrder = 'desc',
    } = options;

    // Simulated database query - in production, use actual DB
    const articles = await this.fetchArticlesFromDB(workspaceId, {
      category,
      status,
      visibility,
      tags,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    return articles;
  }

  /**
   * Get single article by ID
   */
  public async getArticle(
    workspaceId: string,
    articleId: string
  ): Promise<KnowledgeArticle | null> {
    // Simulated fetch
    const articles = await this.fetchArticlesFromDB(workspaceId, {
      limit: 1,
    });

    return articles.articles.find((a) => a.id === articleId) || null;
  }

  /**
   * Create new article
   */
  public async createArticle(
    workspaceId: string,
    data: {
      title: string;
      content: string;
      category: string;
      tags?: string[];
      visibility?: 'internal' | 'external' | 'both';
      author: string;
      status?: 'draft' | 'published';
    }
  ): Promise<KnowledgeArticle> {
    const summary = this.generateSummary(data.content);

    const article: KnowledgeArticle = {
      id: crypto.randomUUID(),
      workspaceId,
      title: data.title,
      content: data.content,
      summary,
      category: data.category,
      tags: data.tags || [],
      status: data.status || 'draft',
      visibility: data.visibility || 'both',
      author: data.author,
      views: 0,
      helpful: 0,
      notHelpful: 0,
      relatedArticles: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: data.status === 'published' ? new Date() : undefined,
    };

    // In production: save to database
    // await db.insert(knowledgeArticles).values(article);

    // Generate and cache embedding for search
    await this.generateEmbedding(article.id, article.title + ' ' + article.content);

    // Auto-find related articles
    article.relatedArticles = await this.findRelatedArticles(workspaceId, article.id, article.content);

    return article;
  }

  /**
   * Update existing article
   */
  public async updateArticle(
    workspaceId: string,
    articleId: string,
    updates: Partial<{
      title: string;
      content: string;
      category: string;
      tags: string[];
      status: 'draft' | 'published' | 'archived';
      visibility: 'internal' | 'external' | 'both';
    }>
  ): Promise<KnowledgeArticle | null> {
    const article = await this.getArticle(workspaceId, articleId);
    if (!article) return null;

    const updatedArticle: KnowledgeArticle = {
      ...article,
      ...updates,
      summary: updates.content ? this.generateSummary(updates.content) : article.summary,
      updatedAt: new Date(),
      publishedAt:
        updates.status === 'published' && article.status !== 'published'
          ? new Date()
          : article.publishedAt,
    };

    // Update embedding if content changed
    if (updates.title || updates.content) {
      await this.generateEmbedding(
        articleId,
        (updates.title || article.title) + ' ' + (updates.content || article.content)
      );
      updatedArticle.relatedArticles = await this.findRelatedArticles(
        workspaceId,
        articleId,
        updates.content || article.content
      );
    }

    return updatedArticle;
  }

  /**
   * Delete article (soft delete - archive)
   */
  public async deleteArticle(
    workspaceId: string,
    articleId: string,
    hardDelete: boolean = false
  ): Promise<boolean> {
    if (hardDelete) {
      // Remove from database
      this.embeddingCache.delete(articleId);
      return true;
    }

    // Soft delete - archive
    await this.updateArticle(workspaceId, articleId, { status: 'archived' });
    return true;
  }

  // ============================================
  // SEARCH OPERATIONS
  // ============================================

  /**
   * Search knowledge base with semantic search
   */
  public async search(options: KnowledgeSearchOptions): Promise<{
    results: SearchResult[];
    total: number;
    suggestions: string[];
  }> {
    const {
      workspaceId,
      query,
      category,
      tags,
      status = 'published',
      visibility,
      limit = 10,
      offset = 0,
      sortBy = 'relevance',
    } = options;

    // Get all articles
    const { articles } = await this.getArticles({
      workspaceId,
      category,
      status,
      visibility,
      tags,
      limit: 1000, // Get all for search
    });

    // Score each article
    const scoredResults: SearchResult[] = [];
    const queryTerms = this.tokenize(query.toLowerCase());
    const queryEmbedding = await this.getQueryEmbedding(query);

    for (const article of articles) {
      const textScore = this.calculateTextScore(article, queryTerms);
      const semanticScore = await this.calculateSemanticScore(article.id, queryEmbedding);
      const popularityScore = this.calculatePopularityScore(article);

      const finalScore = textScore * 0.4 + semanticScore * 0.4 + popularityScore * 0.2;

      if (finalScore > 0.1) {
        scoredResults.push({
          article,
          score: finalScore,
          highlights: this.generateHighlights(article, queryTerms),
          matchedTerms: this.findMatchedTerms(article, queryTerms),
        });
      }
    }

    // Sort results
    scoredResults.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.article.updatedAt.getTime() - a.article.updatedAt.getTime();
        case 'views':
          return b.article.views - a.article.views;
        case 'helpful':
          return this.helpfulRate(b.article) - this.helpfulRate(a.article);
        default:
          return b.score - a.score;
      }
    });

    // Paginate
    const paginatedResults = scoredResults.slice(offset, offset + limit);

    // Generate search suggestions
    const suggestions = this.generateSearchSuggestions(query, articles);

    return {
      results: paginatedResults,
      total: scoredResults.length,
      suggestions,
    };
  }

  /**
   * Find article for ticket auto-resolution
   */
  public async findSolutionForTicket(
    workspaceId: string,
    ticketContent: string,
    category?: string
  ): Promise<{
    found: boolean;
    article?: KnowledgeArticle;
    confidence: number;
    excerpt?: string;
  }> {
    const results = await this.search({
      workspaceId,
      query: ticketContent,
      category,
      limit: 5,
    });

    if (results.results.length === 0) {
      return { found: false, confidence: 0 };
    }

    const topResult = results.results[0];

    if (topResult.score >= 0.7) {
      return {
        found: true,
        article: topResult.article,
        confidence: topResult.score,
        excerpt: this.extractRelevantExcerpt(topResult.article.content, ticketContent),
      };
    }

    return {
      found: false,
      confidence: topResult.score,
      article: topResult.article,
    };
  }

  // ============================================
  // CATEGORY MANAGEMENT
  // ============================================

  /**
   * Get all categories
   */
  public async getCategories(workspaceId: string): Promise<KnowledgeCategory[]> {
    // Simulated categories
    return [
      {
        id: 'cat-1',
        workspaceId,
        name: 'Getting Started',
        slug: 'getting-started',
        description: 'Basic guides for new users',
        order: 1,
        articleCount: 15,
      },
      {
        id: 'cat-2',
        workspaceId,
        name: 'Account & Billing',
        slug: 'account-billing',
        description: 'Account management and billing information',
        order: 2,
        articleCount: 12,
      },
      {
        id: 'cat-3',
        workspaceId,
        name: 'Technical Support',
        slug: 'technical-support',
        description: 'Technical troubleshooting guides',
        order: 3,
        articleCount: 28,
      },
      {
        id: 'cat-4',
        workspaceId,
        name: 'Features & Integrations',
        slug: 'features-integrations',
        description: 'Feature guides and integration setup',
        order: 4,
        articleCount: 22,
      },
      {
        id: 'cat-5',
        workspaceId,
        name: 'API Documentation',
        slug: 'api-docs',
        description: 'API reference and developer guides',
        order: 5,
        articleCount: 18,
      },
    ];
  }

  /**
   * Create category
   */
  public async createCategory(
    workspaceId: string,
    data: {
      name: string;
      description: string;
      parentId?: string;
      icon?: string;
    }
  ): Promise<KnowledgeCategory> {
    const categories = await this.getCategories(workspaceId);

    return {
      id: crypto.randomUUID(),
      workspaceId,
      name: data.name,
      slug: this.slugify(data.name),
      description: data.description,
      parentId: data.parentId,
      icon: data.icon,
      order: categories.length + 1,
      articleCount: 0,
    };
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Get article analytics
   */
  public async getArticleAnalytics(
    workspaceId: string,
    articleId: string,
    days: number = 30
  ): Promise<ArticleAnalytics> {
    const article = await this.getArticle(workspaceId, articleId);
    if (!article) {
      throw new Error('Article not found');
    }

    // Simulated analytics
    const viewsByDay: Array<{ date: string; views: number }> = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      viewsByDay.push({
        date: date.toISOString().slice(0, 10),
        views: Math.floor(Math.random() * 50) + 5,
      });
    }

    const totalViews = viewsByDay.reduce((sum, d) => sum + d.views, 0);

    return {
      articleId,
      totalViews,
      uniqueViews: Math.floor(totalViews * 0.7),
      helpfulRate: this.helpfulRate(article),
      searchAppearances: Math.floor(totalViews * 1.5),
      clickThroughRate: 0.35 + Math.random() * 0.3,
      avgTimeOnPage: 120 + Math.random() * 180,
      bounceRate: 0.2 + Math.random() * 0.3,
      linkedTickets: Math.floor(Math.random() * 20),
      viewsByDay,
    };
  }

  /**
   * Get knowledge base statistics
   */
  public async getStats(workspaceId: string): Promise<KnowledgeBaseStats> {
    const { articles, total } = await this.getArticles({
      workspaceId,
      limit: 1000,
    });

    const publishedArticles = articles.filter((a) => a.status === 'published').length;
    const draftArticles = articles.filter((a) => a.status === 'draft').length;
    const categories = await this.getCategories(workspaceId);

    const totalViews = articles.reduce((sum, a) => sum + a.views, 0);
    const avgHelpfulRate =
      articles.length > 0
        ? articles.reduce((sum, a) => sum + this.helpfulRate(a), 0) / articles.length
        : 0;

    const topArticles = [...articles]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map((a) => ({ id: a.id, title: a.title, views: a.views }));

    const recentlyUpdated = [...articles]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .map((a) => ({ id: a.id, title: a.title, updatedAt: a.updatedAt }));

    // Identify coverage gaps (categories with few articles)
    const coverageGaps = categories
      .filter((c) => c.articleCount < 5)
      .map((c) => `${c.name} (${c.articleCount} articles)`);

    return {
      totalArticles: total,
      publishedArticles,
      draftArticles,
      totalCategories: categories.length,
      totalViews,
      avgHelpfulRate,
      topArticles,
      recentlyUpdated,
      coverageGaps,
    };
  }

  /**
   * Record article feedback
   */
  public async recordFeedback(
    workspaceId: string,
    articleId: string,
    helpful: boolean,
    feedback?: string
  ): Promise<void> {
    const article = await this.getArticle(workspaceId, articleId);
    if (!article) return;

    if (helpful) {
      article.helpful++;
    } else {
      article.notHelpful++;
    }

    // Store detailed feedback for analysis
    if (feedback) {
      // In production: save to feedback table
      console.log(`[KB_FEEDBACK] Article ${articleId}: ${helpful ? 'helpful' : 'not helpful'} - ${feedback}`);
    }
  }

  /**
   * Record article view
   */
  public async recordView(
    workspaceId: string,
    articleId: string,
    userId?: string
  ): Promise<void> {
    const article = await this.getArticle(workspaceId, articleId);
    if (article) {
      article.views++;
      // In production: save to views table with userId for unique counting
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async fetchArticlesFromDB(
    workspaceId: string,
    options: {
      category?: string;
      status?: 'draft' | 'published' | 'archived';
      visibility?: 'internal' | 'external' | 'both';
      tags?: string[];
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<{ articles: KnowledgeArticle[]; total: number }> {
    // Simulated articles for demo
    const demoArticles: KnowledgeArticle[] = [
      {
        id: 'kb-1',
        workspaceId,
        title: 'How to Reset Your Password',
        content: `
# Password Reset Guide

If you've forgotten your password, follow these steps:

1. Go to the login page
2. Click "Forgot Password"
3. Enter your email address
4. Check your inbox for the reset link
5. Click the link and create a new password

## Password Requirements
- At least 8 characters
- One uppercase letter
- One number
- One special character

## Still having trouble?
Contact our support team at support@example.com
        `,
        summary: 'Step-by-step guide to reset your account password',
        category: 'Account & Billing',
        tags: ['password', 'account', 'security', 'login'],
        status: 'published',
        visibility: 'both',
        author: 'System',
        views: 1250,
        helpful: 892,
        notHelpful: 45,
        relatedArticles: ['kb-2', 'kb-3'],
        metadata: {},
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-06-20'),
        publishedAt: new Date('2024-01-15'),
      },
      {
        id: 'kb-2',
        workspaceId,
        title: 'Setting Up Two-Factor Authentication',
        content: `
# Enable 2FA for Enhanced Security

Two-factor authentication adds an extra layer of security to your account.

## Setup Steps

1. Navigate to Settings > Security
2. Click "Enable 2FA"
3. Choose your method:
   - Authenticator App (recommended)
   - SMS
4. Follow the on-screen instructions
5. Save your backup codes

## Recommended Apps
- Google Authenticator
- Authy
- Microsoft Authenticator

## Backup Codes
Store your backup codes in a safe place. You'll need them if you lose access to your 2FA device.
        `,
        summary: 'Guide to enabling two-factor authentication for your account',
        category: 'Account & Billing',
        tags: ['2fa', 'security', 'authentication', 'account'],
        status: 'published',
        visibility: 'both',
        author: 'System',
        views: 856,
        helpful: 723,
        notHelpful: 28,
        relatedArticles: ['kb-1'],
        metadata: {},
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-05-15'),
        publishedAt: new Date('2024-02-10'),
      },
      {
        id: 'kb-3',
        workspaceId,
        title: 'Troubleshooting Login Issues',
        content: `
# Can't Log In? Try These Solutions

## Common Issues

### 1. Incorrect Password
- Check caps lock
- Try the password reset option
- Clear browser cache

### 2. Account Locked
After 5 failed attempts, your account is temporarily locked.
- Wait 30 minutes, or
- Contact support for immediate unlock

### 3. Browser Issues
- Clear cookies and cache
- Try incognito/private mode
- Try a different browser

### 4. 2FA Problems
- Ensure your device time is synced
- Use a backup code
- Contact support for reset

## Still Need Help?
Open a support ticket with details about your issue.
        `,
        summary: 'Solutions for common login problems',
        category: 'Account & Billing',
        tags: ['login', 'troubleshooting', 'account', 'access'],
        status: 'published',
        visibility: 'both',
        author: 'System',
        views: 2103,
        helpful: 1876,
        notHelpful: 89,
        relatedArticles: ['kb-1', 'kb-2'],
        metadata: {},
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-07-01'),
        publishedAt: new Date('2024-01-20'),
      },
    ];

    let filtered = demoArticles.filter((a) => a.workspaceId === workspaceId);

    if (options.category) {
      filtered = filtered.filter((a) => a.category === options.category);
    }
    if (options.status) {
      filtered = filtered.filter((a) => a.status === options.status);
    }
    if (options.visibility) {
      filtered = filtered.filter((a) => a.visibility === options.visibility || a.visibility === 'both');
    }
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter((a) => options.tags!.some((t) => a.tags.includes(t)));
    }

    return {
      articles: filtered.slice(options.offset || 0, (options.offset || 0) + (options.limit || 20)),
      total: filtered.length,
    };
  }

  private generateSummary(content: string): string {
    // Extract first meaningful paragraph
    const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    return lines.slice(0, 2).join(' ').slice(0, 200) + '...';
  }

  private async generateEmbedding(id: string, text: string): Promise<number[]> {
    // Simplified embedding simulation
    // In production: use OpenAI embeddings or similar
    const words = this.tokenize(text);
    const embedding = new Array(384).fill(0);

    words.forEach((word, i) => {
      const hash = this.simpleHash(word);
      embedding[hash % 384] += 1 / (i + 1);
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalized = embedding.map((v) => v / (magnitude || 1));

    this.embeddingCache.set(id, normalized);
    return normalized;
  }

  private async getQueryEmbedding(query: string): Promise<number[]> {
    return this.generateEmbedding('query', query);
  }

  private async calculateSemanticScore(articleId: string, queryEmbedding: number[]): Promise<number> {
    const articleEmbedding = this.embeddingCache.get(articleId);
    if (!articleEmbedding) return 0;

    // Cosine similarity
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < queryEmbedding.length; i++) {
      dotProduct += queryEmbedding[i] * articleEmbedding[i];
      normA += queryEmbedding[i] * queryEmbedding[i];
      normB += articleEmbedding[i] * articleEmbedding[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }

  private calculateTextScore(article: KnowledgeArticle, queryTerms: string[]): number {
    const titleTerms = this.tokenize(article.title.toLowerCase());
    const contentTerms = this.tokenize(article.content.toLowerCase());
    const tagTerms = article.tags.map((t) => t.toLowerCase());

    let score = 0;
    let matchCount = 0;

    for (const term of queryTerms) {
      // Title match (highest weight)
      if (titleTerms.includes(term)) {
        score += 0.4;
        matchCount++;
      }
      // Tag match (high weight)
      if (tagTerms.includes(term)) {
        score += 0.3;
        matchCount++;
      }
      // Content match
      if (contentTerms.includes(term)) {
        score += 0.2;
        matchCount++;
      }
    }

    // Normalize by query length
    return score / queryTerms.length;
  }

  private calculatePopularityScore(article: KnowledgeArticle): number {
    const viewScore = Math.min(article.views / 1000, 1);
    const helpfulScore = this.helpfulRate(article);
    return viewScore * 0.5 + helpfulScore * 0.5;
  }

  private helpfulRate(article: KnowledgeArticle): number {
    const total = article.helpful + article.notHelpful;
    return total > 0 ? article.helpful / total : 0.5;
  }

  private generateHighlights(
    article: KnowledgeArticle,
    queryTerms: string[]
  ): { title?: string; content?: string } {
    const highlights: { title?: string; content?: string } = {};

    // Highlight in title
    let highlightedTitle = article.title;
    for (const term of queryTerms) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedTitle = highlightedTitle.replace(regex, '**$1**');
    }
    if (highlightedTitle !== article.title) {
      highlights.title = highlightedTitle;
    }

    // Find and highlight content excerpt
    const sentences = article.content.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (queryTerms.some((term) => sentence.toLowerCase().includes(term))) {
        let highlighted = sentence.trim();
        for (const term of queryTerms) {
          const regex = new RegExp(`(${term})`, 'gi');
          highlighted = highlighted.replace(regex, '**$1**');
        }
        highlights.content = highlighted.slice(0, 200) + '...';
        break;
      }
    }

    return highlights;
  }

  private findMatchedTerms(article: KnowledgeArticle, queryTerms: string[]): string[] {
    const fullText = `${article.title} ${article.content} ${article.tags.join(' ')}`.toLowerCase();
    return queryTerms.filter((term) => fullText.includes(term));
  }

  private generateSearchSuggestions(query: string, articles: KnowledgeArticle[]): string[] {
    const suggestions: string[] = [];
    const queryWords = this.tokenize(query.toLowerCase());

    // Suggest based on popular tags
    const tagCounts = new Map<string, number>();
    for (const article of articles) {
      for (const tag of article.tags) {
        if (!queryWords.includes(tag.toLowerCase())) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + article.views);
        }
      }
    }

    const sortedTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => `${query} ${tag}`);

    suggestions.push(...sortedTags);

    return suggestions;
  }

  private async findRelatedArticles(
    workspaceId: string,
    excludeId: string,
    content: string
  ): Promise<string[]> {
    const results = await this.search({
      workspaceId,
      query: content.slice(0, 500),
      limit: 5,
    });

    return results.results
      .filter((r) => r.article.id !== excludeId)
      .slice(0, 3)
      .map((r) => r.article.id);
  }

  private extractRelevantExcerpt(content: string, query: string): string {
    const queryTerms = this.tokenize(query.toLowerCase());
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      if (queryTerms.some((term) => sentence.toLowerCase().includes(term))) {
        return sentence.trim().slice(0, 300) + '...';
      }
    }

    return content.slice(0, 300) + '...';
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

// Export singleton instance
export const knowledgeBaseManager = new KnowledgeBaseManager();
