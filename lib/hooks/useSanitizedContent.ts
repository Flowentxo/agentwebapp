/**
 * React Hook for Client-Side XSS Protection
 *
 * Uses DOMPurify to sanitize AI-generated content before rendering
 */

import { useMemo } from 'react'
import DOMPurify from 'isomorphic-dompurify'

export interface SanitizationOptions {
  /**
   * Allowed HTML tags
   */
  allowedTags?: string[]

  /**
   * Allowed attributes
   */
  allowedAttributes?: string[]

  /**
   * Allow links (a tags)
   */
  allowLinks?: boolean

  /**
   * Allow markdown formatting tags
   */
  allowMarkdown?: boolean

  /**
   * Strip all HTML (plain text only)
   */
  plainTextOnly?: boolean
}

const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'code', 'pre',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'hr', 'span', 'div'
  ],
  ALLOWED_ATTR: ['class', 'id'],
  FORBID_TAGS: [
    'script', 'iframe', 'object', 'embed', 'link',
    'style', 'form', 'input', 'button', 'select',
    'textarea', 'video', 'audio', 'base', 'meta'
  ],
  FORBID_ATTR: [
    'onerror', 'onload', 'onclick', 'onmouseover',
    'onmouseout', 'onfocus', 'onblur', 'onchange',
    'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress'
  ],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SAFE_FOR_TEMPLATES: true
}

/**
 * Hook to sanitize AI-generated content
 *
 * @param content - The content to sanitize
 * @param options - Sanitization options
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 *
 * @example
 * ```tsx
 * const sanitizedContent = useSanitizedContent(aiResponse)
 * return <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
 * ```
 */
export function useSanitizedContent(
  content: string | undefined | null,
  options: SanitizationOptions = {}
): string {
  return useMemo(() => {
    if (!content) return ''

    // Plain text mode - strip all HTML
    if (options.plainTextOnly) {
      return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      })
    }

    // Build configuration
    const config = { ...DEFAULT_CONFIG }

    // Add links if allowed
    if (options.allowLinks) {
      config.ALLOWED_TAGS.push('a')
      config.ALLOWED_ATTR.push('href', 'title', 'target', 'rel')
    }

    // Override tags if specified
    if (options.allowedTags) {
      config.ALLOWED_TAGS = options.allowedTags
    }

    // Override attributes if specified
    if (options.allowedAttributes) {
      config.ALLOWED_ATTR = options.allowedAttributes
    }

    // Sanitize
    return DOMPurify.sanitize(content, config)
  }, [content, options.allowLinks, options.plainTextOnly, options.allowedTags, options.allowedAttributes])
}

/**
 * Hook specifically for AI agent responses
 * Pre-configured for typical AI output (markdown-style)
 */
export function useSanitizedAIResponse(content: string | undefined | null): string {
  return useSanitizedContent(content, {
    allowLinks: true,
    allowMarkdown: true
  })
}

/**
 * Hook for user-submitted content (more restrictive)
 */
export function useSanitizedUserContent(content: string | undefined | null): string {
  return useSanitizedContent(content, {
    allowLinks: false,
    allowedTags: ['p', 'br', 'strong', 'em', 'u']
  })
}

/**
 * Plain text extraction (no HTML)
 */
export function usePlainText(content: string | undefined | null): string {
  return useSanitizedContent(content, {
    plainTextOnly: true
  })
}
