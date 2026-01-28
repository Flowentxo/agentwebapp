import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import type { Root, Heading, Paragraph, Text } from 'mdast';

export interface ChunkConfig {
  maxTokens: number;
  overlap: number;
  preserveHeadings: boolean;
}

export interface Chunk {
  idx: number;
  text: string;
  tokens: number;
  meta: {
    heading?: string;
    section?: string;
    startOffset?: number;
    endOffset?: number;
  };
}

const DEFAULT_CONFIG: ChunkConfig = {
  maxTokens: 1000,
  overlap: 150,
  preserveHeadings: true,
};

/**
 * Simple token counter (approximation: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Extract markdown structure with headings
 */
async function parseMarkdown(markdown: string): Promise<{
  sections: Array<{ heading: string; content: string; level: number }>;
}> {
  const processor = unified().use(remarkParse);
  const tree = processor.parse(markdown) as Root;

  const sections: Array<{ heading: string; content: string; level: number }> = [];
  let currentHeading = '';
  let currentLevel = 0;
  let currentContent: string[] = [];

  function extractText(node: any): string {
    if (node.type === 'text') return node.value;
    if (node.children) {
      return node.children.map(extractText).join('');
    }
    return '';
  }

  function flushSection() {
    if (currentContent.length > 0) {
      sections.push({
        heading: currentHeading || 'Introduction',
        content: currentContent.join('\n\n'),
        level: currentLevel,
      });
      currentContent = [];
    }
  }

  for (const node of tree.children) {
    if (node.type === 'heading') {
      flushSection();
      currentHeading = extractText(node);
      currentLevel = (node as Heading).depth;
    } else {
      const text = extractText(node);
      if (text.trim()) {
        currentContent.push(text);
      }
    }
  }

  flushSection();

  return { sections };
}

/**
 * Split text into sentences (simple heuristic)
 */
function splitIntoSentences(text: string): string[] {
  return text
    .split(/([.!?]+\s+)/)
    .reduce((acc: string[], part, i, arr) => {
      if (i % 2 === 0 && part.trim()) {
        const sentence = part + (arr[i + 1] || '');
        acc.push(sentence.trim());
      }
      return acc;
    }, []);
}

/**
 * Create chunks with overlap
 */
function createChunksFromSection(
  section: { heading: string; content: string; level: number },
  config: ChunkConfig,
  startIdx: number
): Chunk[] {
  const sentences = splitIntoSentences(section.content);
  const chunks: Chunk[] = [];

  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkIdx = startIdx;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    // If single sentence exceeds max, split it
    if (sentenceTokens > config.maxTokens) {
      if (currentChunk.length > 0) {
        chunks.push({
          idx: chunkIdx++,
          text: currentChunk.join(' '),
          tokens: currentTokens,
          meta: {
            heading: section.heading,
            section: section.heading,
          },
        });
        currentChunk = [];
        currentTokens = 0;
      }

      // Split long sentence by words
      const words = sentence.split(/\s+/);
      let wordChunk: string[] = [];
      let wordTokens = 0;

      for (const word of words) {
        const wt = estimateTokens(word);
        if (wordTokens + wt > config.maxTokens && wordChunk.length > 0) {
          chunks.push({
            idx: chunkIdx++,
            text: wordChunk.join(' '),
            tokens: wordTokens,
            meta: {
              heading: section.heading,
              section: section.heading,
            },
          });
          wordChunk = [];
          wordTokens = 0;
        }
        wordChunk.push(word);
        wordTokens += wt;
      }

      if (wordChunk.length > 0) {
        chunks.push({
          idx: chunkIdx++,
          text: wordChunk.join(' '),
          tokens: wordTokens,
          meta: {
            heading: section.heading,
            section: section.heading,
          },
        });
      }

      continue;
    }

    // Normal case: add sentence to current chunk
    if (currentTokens + sentenceTokens > config.maxTokens && currentChunk.length > 0) {
      chunks.push({
        idx: chunkIdx++,
        text: currentChunk.join(' '),
        tokens: currentTokens,
        meta: {
          heading: section.heading,
          section: section.heading,
        },
      });

      // Overlap: keep last N tokens
      const overlapText = currentChunk.join(' ');
      const overlapSentences = splitIntoSentences(overlapText);
      currentChunk = [];
      currentTokens = 0;

      let overlapTokens = 0;
      for (let i = overlapSentences.length - 1; i >= 0; i--) {
        const st = estimateTokens(overlapSentences[i]);
        if (overlapTokens + st <= config.overlap) {
          currentChunk.unshift(overlapSentences[i]);
          overlapTokens += st;
        } else {
          break;
        }
      }
      currentTokens = overlapTokens;
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;
  }

  // Flush remaining
  if (currentChunk.length > 0) {
    chunks.push({
      idx: chunkIdx++,
      text: currentChunk.join(' '),
      tokens: currentTokens,
      meta: {
        heading: section.heading,
        section: section.heading,
      },
    });
  }

  return chunks;
}

/**
 * Main chunking function
 */
export async function chunkMarkdown(
  markdown: string,
  config: Partial<ChunkConfig> = {}
): Promise<Chunk[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!markdown || markdown.trim().length === 0) {
    return [];
  }

  const { sections } = await parseMarkdown(markdown);
  const allChunks: Chunk[] = [];
  let globalIdx = 0;

  for (const section of sections) {
    const sectionChunks = createChunksFromSection(section, finalConfig, globalIdx);
    allChunks.push(...sectionChunks);
    globalIdx = allChunks.length;
  }

  return allChunks;
}

/**
 * Chunk plain text (no markdown structure)
 */
export function chunkPlainText(
  text: string,
  config: Partial<ChunkConfig> = {}
): Chunk[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const sentences = splitIntoSentences(text);
  const chunks: Chunk[] = [];

  let currentChunk: string[] = [];
  let currentTokens = 0;
  let idx = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > finalConfig.maxTokens && currentChunk.length > 0) {
      chunks.push({
        idx: idx++,
        text: currentChunk.join(' '),
        tokens: currentTokens,
        meta: {},
      });

      // Overlap
      const overlapText = currentChunk.join(' ');
      const overlapSentences = splitIntoSentences(overlapText);
      currentChunk = [];
      currentTokens = 0;

      let overlapTokens = 0;
      for (let i = overlapSentences.length - 1; i >= 0; i--) {
        const st = estimateTokens(overlapSentences[i]);
        if (overlapTokens + st <= finalConfig.overlap) {
          currentChunk.unshift(overlapSentences[i]);
          overlapTokens += st;
        } else {
          break;
        }
      }
      currentTokens = overlapTokens;
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push({
      idx: idx++,
      text: currentChunk.join(' '),
      tokens: currentTokens,
      meta: {},
    });
  }

  return chunks;
}
