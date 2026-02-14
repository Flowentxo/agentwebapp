/**
 * Web Search Tool
 *
 * Fuehrt Web-Suchen ueber DuckDuckGo durch und parst die Ergebnisse mit cheerio.
 */

import * as cheerio from 'cheerio';

export interface WebSearchInput {
  query: string;
  num_results?: number;
  language?: string;
}

export interface WebSearchResult {
  results: Array<{ title: string; url: string; snippet: string; reachable?: boolean; statusCode?: number }>;
  query: string;
  formatted_output: string;
}

export const WEB_SEARCH_TOOL = {
  name: 'web_search',
  description: 'Fuehre eine Web-Suche durch und erhalte aktuelle Ergebnisse. Ideal fuer Recherche, Faktencheck und das Finden aktueller Informationen zu beliebigen Themen.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Der Suchbegriff / die Suchanfrage' },
      num_results: { type: 'number', description: 'Anzahl der gewuenschten Ergebnisse (default: 5, max: 10)' },
      language: { type: 'string', description: 'Sprache der Suche, z.B. "de" oder "en" (default: "de")' },
    },
    required: ['query'],
  },
};

export async function webSearch(input: WebSearchInput): Promise<WebSearchResult> {
  const { query, num_results = 5, language = 'de' } = input;
  const maxResults = Math.min(num_results, 10);

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${language}-${language}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': `${language},en;q=0.5`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: Array<{ title: string; url: string; snippet: string; reachable?: boolean; statusCode?: number }> = [];

    $('.result').each((_index, element) => {
      if (results.length >= maxResults) return false;

      const titleEl = $(element).find('.result__a');
      const snippetEl = $(element).find('.result__snippet');

      const title = titleEl.text().trim();
      let url = titleEl.attr('href') || '';
      const snippet = snippetEl.text().trim();

      // DuckDuckGo wraps URLs in redirect links - extract actual URL
      if (url.includes('uddg=')) {
        try {
          const urlParams = new URLSearchParams(url.split('?')[1]);
          url = decodeURIComponent(urlParams.get('uddg') || url);
        } catch {
          // Keep original URL if parsing fails
        }
      }

      if (title && url) {
        results.push({ title, url, snippet });
      }
    });

    // Validate URL reachability (parallel, 3s timeout)
    const validationResults = await Promise.allSettled(
      results.map(async (r) => {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 3000);
          const res = await fetch(r.url, {
            method: 'HEAD',
            signal: ctrl.signal,
            redirect: 'follow',
          });
          clearTimeout(tid);
          return { reachable: res.ok, statusCode: res.status };
        } catch {
          return { reachable: false, statusCode: 0 };
        }
      })
    );

    // Annotate results with reachability status
    results.forEach((r, i) => {
      const v = validationResults[i];
      if (v.status === 'fulfilled') {
        r.reachable = v.value.reachable;
        r.statusCode = v.value.statusCode;
      } else {
        r.reachable = false;
        r.statusCode = 0;
      }
    });

    const formatted = [
      `🔍 **Web-Suche:** "${query}"`,
      `**${results.length} Ergebnisse gefunden**`,
      '',
      ...results.map((r, i) => {
        const statusTag = r.reachable === false ? ' [LINK DEFEKT]' : '';
        return [
          `**${i + 1}. ${r.title}**${statusTag}`,
          `   ${r.url}`,
          r.snippet ? `   ${r.snippet}` : '',
          '',
        ].join('\n');
      }),
    ].join('\n');

    return {
      results,
      query,
      formatted_output: formatted,
    };
  } catch (error: any) {
    const formatted = `❌ Web-Suche fehlgeschlagen: ${error.message}`;

    return {
      results: [],
      query,
      formatted_output: formatted,
    };
  }
}
