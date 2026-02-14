/**
 * Code Format Tool
 *
 * Formats code with consistent indentation, spacing, and style.
 */

export interface CodeFormatInput {
  code: string;
  language?: string;
  indent_size?: number;
  style?: 'standard' | 'compact' | 'expanded';
}

export interface CodeFormatResult {
  formatted_code: string;
  changes_made: string[];
  formatted_output: string;
}

export const CODE_FORMAT_TOOL = {
  name: 'code_format',
  description: 'Formatiere Code mit konsistenter Einrueckung und Stil. Unterstuetzt JavaScript, TypeScript, JSON, CSS, HTML.',
  input_schema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Der zu formatierende Code' },
      language: { type: 'string', description: 'Programmiersprache (auto-detect wenn nicht angegeben)' },
      indent_size: { type: 'number', description: 'Einrueckungsgroesse in Spaces (default: 2)' },
      style: {
        type: 'string',
        enum: ['standard', 'compact', 'expanded'],
        description: 'Formatierungsstil (default: standard)',
      },
    },
    required: ['code'],
  },
};

export async function formatCode(input: CodeFormatInput): Promise<CodeFormatResult> {
  const { code, language, indent_size = 2, style = 'standard' } = input;
  const changes: string[] = [];

  let formatted = code;

  // Normalize line endings
  if (formatted.includes('\r\n')) {
    formatted = formatted.replace(/\r\n/g, '\n');
    changes.push('Zeilenenden normalisiert (CRLF → LF)');
  }

  // Remove trailing whitespace
  const beforeTrailing = formatted;
  formatted = formatted.replace(/[ \t]+$/gm, '');
  if (formatted !== beforeTrailing) changes.push('Trailing Whitespace entfernt');

  // Fix indentation
  const lines = formatted.split('\n');
  let depth = 0;
  const indentedLines: string[] = [];
  const indent = ' '.repeat(indent_size);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { indentedLines.push(''); continue; }

    // Decrease depth for closing brackets
    if (/^[}\])]/.test(trimmed)) depth = Math.max(0, depth - 1);

    indentedLines.push(indent.repeat(depth) + trimmed);

    // Increase depth for opening brackets
    const opens = (trimmed.match(/[{[(]/g) || []).length;
    const closes = (trimmed.match(/[}\])]/g) || []).length;
    depth = Math.max(0, depth + opens - closes);
    // Adjust if closing bracket was at start
    if (/^[}\])]/.test(trimmed)) depth = Math.max(0, depth + 1 - 1);
  }

  const reindented = indentedLines.join('\n');
  if (reindented !== formatted) {
    formatted = reindented;
    changes.push(`Einrueckung auf ${indent_size} Spaces normalisiert`);
  }

  // Ensure single newline at end
  if (!formatted.endsWith('\n')) {
    formatted += '\n';
    changes.push('Newline am Dateiende hinzugefuegt');
  }

  // Remove multiple blank lines
  const beforeBlank = formatted;
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  if (formatted !== beforeBlank) changes.push('Mehrfache Leerzeilen reduziert');

  // Detect language for the output
  const detectedLang = language || (formatted.includes('interface ') || formatted.includes(': string') ? 'typescript' : 'javascript');

  const formattedOutput = [
    `✅ **Code formatiert** (${changes.length} Aenderungen)`,
    '',
    ...(changes.length > 0 ? changes.map(c => `- ${c}`) : ['Keine Aenderungen noetig']),
    '',
    `\`\`\`${detectedLang}`,
    formatted.trim(),
    '```',
  ].join('\n');

  return {
    formatted_code: formatted,
    changes_made: changes,
    formatted_output: formattedOutput,
  };
}
