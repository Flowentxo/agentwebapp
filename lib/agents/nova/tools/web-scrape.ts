/**
 * Web Scrape Tool
 *
 * Scrapt Inhalte von URLs und extrahiert Text, Links oder Bilder mit cheerio.
 */

import * as cheerio from 'cheerio';

export interface WebScrapeInput {
  url: string;
  selector?: string;
  extract?: 'text' | 'links' | 'images' | 'all';
}

export interface WebScrapeResult {
  url: string;
  title: string;
  content: string;
  links?: string[];
  images?: string[];
  word_count: number;
  formatted_output: string;
}

export const WEB_SCRAPE_TOOL = {
  name: 'web_scrape',
  description: 'Scrape den Inhalt einer Webseite: Text, Links oder Bilder extrahieren. Ideal fuer das Sammeln von Informationen von bestimmten URLs.',
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Die URL der zu scrapenden Webseite' },
      selector: { type: 'string', description: 'Optionaler CSS-Selektor fuer spezifische Elemente (z.B. "article", ".content", "#main")' },
      extract: {
        type: 'string',
        enum: ['text', 'links', 'images', 'all'],
        description: 'Was extrahiert werden soll (default: text)',
      },
    },
    required: ['url'],
  },
};

export async function webScrape(input: WebScrapeInput): Promise<WebScrapeResult> {
  const { url, selector, extract = 'text' } = input;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove non-content elements
    $('script, style, nav, footer, header, iframe, noscript, svg').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Kein Titel';

    // Determine root element
    const root = selector ? $(selector) : $('body');

    // Extract text content
    let content = '';
    if (extract === 'text' || extract === 'all') {
      content = root.text()
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      // Truncate to 5000 chars
      if (content.length > 5000) {
        content = content.substring(0, 5000) + '... [abgeschnitten]';
      }
    }

    // Extract links
    let links: string[] | undefined;
    if (extract === 'links' || extract === 'all') {
      links = [];
      root.find('a[href]').each((_i, el) => {
        let href = $(el).attr('href') || '';
        // Resolve relative URLs
        if (href.startsWith('/')) {
          try {
            const baseUrl = new URL(url);
            href = `${baseUrl.origin}${href}`;
          } catch {
            // Keep relative URL
          }
        }
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          links!.push(href);
        }
      });
      // Deduplicate
      links = Array.from(new Set(links)).slice(0, 50);
    }

    // Extract images
    let images: string[] | undefined;
    if (extract === 'images' || extract === 'all') {
      images = [];
      root.find('img[src]').each((_i, el) => {
        let src = $(el).attr('src') || '';
        // Resolve relative URLs
        if (src.startsWith('/')) {
          try {
            const baseUrl = new URL(url);
            src = `${baseUrl.origin}${src}`;
          } catch {
            // Keep relative URL
          }
        }
        if (src && !src.startsWith('data:')) {
          images!.push(src);
        }
      });
      // Deduplicate
      images = Array.from(new Set(images)).slice(0, 30);
    }

    const wordCount = content ? content.split(/\s+/).filter(w => w.length > 0).length : 0;

    const formatted = [
      `🌐 **Web-Scraping:** ${url}`,
      `**Titel:** ${title}`,
      `**Woerter:** ${wordCount}`,
      '',
      ...(content ? [
        '**Inhalt:**',
        content.substring(0, 2000) + (content.length > 2000 ? '...' : ''),
        '',
      ] : []),
      ...(links && links.length > 0 ? [
        `**Links (${links.length}):**`,
        ...links.slice(0, 10).map(l => `- ${l}`),
        links.length > 10 ? `- ... und ${links.length - 10} weitere` : '',
        '',
      ] : []),
      ...(images && images.length > 0 ? [
        `**Bilder (${images.length}):**`,
        ...images.slice(0, 10).map(img => `- ${img}`),
        images.length > 10 ? `- ... und ${images.length - 10} weitere` : '',
      ] : []),
    ].join('\n');

    return {
      url,
      title,
      content,
      links,
      images,
      word_count: wordCount,
      formatted_output: formatted,
    };
  } catch (error: any) {
    const formatted = `❌ Web-Scraping fehlgeschlagen fuer ${url}: ${error.message}`;

    return {
      url,
      title: '',
      content: '',
      word_count: 0,
      formatted_output: formatted,
    };
  }
}
