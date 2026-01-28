/**
 * XSS PROTECTION
 *
 * Sanitizes AI-generated content and user inputs to prevent XSS attacks
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize AI-generated HTML content
 * Use this for rendering AI responses that may contain HTML
 */
export function sanitizeAIResponse(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Configure DOMPurify with strict settings
  const config = {
    // Allowed tags (safe subset)
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'code', 'pre',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'hr', 'a', 'span', 'div'
    ],

    // Allowed attributes
    ALLOWED_ATTR: ['class', 'id', 'href', 'title', 'target'],

    // Forbidden tags (even if whitelisted)
    FORBID_TAGS: [
      'script', 'iframe', 'object', 'embed', 'link',
      'style', 'form', 'input', 'button', 'select',
      'textarea', 'video', 'audio', 'base', 'meta'
    ],

    // Forbidden attributes (event handlers)
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover',
      'onmouseout', 'onfocus', 'onblur', 'onchange',
      'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress'
    ],

    // Additional security options
    ALLOW_DATA_ATTR: false, // Block data-* attributes
    ALLOW_UNKNOWN_PROTOCOLS: false, // Block javascript:, data:, etc.
    SAFE_FOR_TEMPLATES: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
  };

  return DOMPurify.sanitize(content, config);
}

/**
 * Sanitize user input (more restrictive)
 * Use this for user-submitted content like comments, feedback
 */
export function sanitizeUserInput(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Very restrictive config for user input
  const config = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
    ALLOWED_ATTR: [],
    FORBID_TAGS: [
      'script', 'iframe', 'object', 'embed', 'link', 'style',
      'form', 'input', 'button', 'a', 'img', 'video', 'audio'
    ],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'href', 'src'],
    ALLOW_DATA_ATTR: false,
  };

  return DOMPurify.sanitize(content, config);
}

/**
 * Strip all HTML tags (plain text only)
 * Use this when you only want the text content
 */
export function stripHTML(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}

/**
 * Sanitize for markdown rendering
 * Use this before passing to a markdown renderer
 */
export function sanitizeMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove potentially dangerous markdown patterns
  let sanitized = content;

  // Remove HTML in markdown
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/\[([^\]]+)\]\(javascript:[^\)]*\)/gi, '[$1](#)');
  sanitized = sanitized.replace(/\[([^\]]+)\]\(data:[^\)]*\)/gi, '[$1](#)');

  // Remove inline HTML event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  return sanitized;
}

/**
 * Sanitize URL to prevent javascript: and data: injection
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
  ];

  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      console.warn('[XSS_PROTECTION] Blocked dangerous URL protocol:', protocol);
      return '#';
    }
  }

  // Only allow http, https, mailto, tel
  if (!trimmed.match(/^(https?:\/\/|mailto:|tel:)/)) {
    return '#';
  }

  return url;
}

/**
 * Escape HTML entities
 * Use this for displaying user input as plain text
 */
export function escapeHTML(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'/]/g, (char) => entityMap[char]);
}

/**
 * Validate and sanitize JSON to prevent prototype pollution
 */
export function sanitizeJSON(jsonString: string): any {
  try {
    const parsed = JSON.parse(jsonString);

    // Remove dangerous keys
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

    function removeDangerousKeys(obj: any): any {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(removeDangerousKeys);
      }

      const cleaned: any = {};
      for (const key in obj) {
        if (!dangerousKeys.includes(key)) {
          cleaned[key] = removeDangerousKeys(obj[key]);
        }
      }

      return cleaned;
    }

    return removeDangerousKeys(parsed);
  } catch (error) {
    console.error('[XSS_PROTECTION] Invalid JSON:', error);
    return null;
  }
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed';
  }

  // Remove path separators and special characters
  let sanitized = filename.replace(/[\/\\:*?"<>|]/g, '_');

  // Remove leading dots to prevent hidden files
  sanitized = sanitized.replace(/^\.+/, '');

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  // Ensure it's not empty
  if (!sanitized) {
    sanitized = 'unnamed';
  }

  return sanitized;
}

/**
 * Check if content contains potential XSS patterns
 * Returns true if suspicious content is detected
 */
export function detectXSS(content: string): {
  isSuspicious: boolean;
  patterns: string[];
} {
  if (!content || typeof content !== 'string') {
    return { isSuspicious: false, patterns: [] };
  }

  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /onclick\s*=/gi,
    /<iframe[^>]*>/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
  ];

  const detectedPatterns: string[] = [];

  for (const pattern of xssPatterns) {
    if (pattern.test(content)) {
      detectedPatterns.push(pattern.source);
    }
  }

  return {
    isSuspicious: detectedPatterns.length > 0,
    patterns: detectedPatterns
  };
}

/**
 * Content Security Policy (CSP) headers configuration
 */
export const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"], // TODO: Remove unsafe-inline in production
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  fontSrc: ["'self'", 'data:'],
  connectSrc: ["'self'", 'http://localhost:4000', 'https://api.openai.com'],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: [],
};

/**
 * Generate CSP header string
 */
export function generateCSPHeader(): string {
  const directives = Object.entries(CSP_DIRECTIVES)
    .map(([key, values]) => {
      const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return values.length > 0
        ? `${directive} ${values.join(' ')}`
        : directive;
    })
    .join('; ');

  return directives;
}
