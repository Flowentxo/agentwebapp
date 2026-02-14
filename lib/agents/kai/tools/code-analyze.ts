/**
 * Code Analyze Tool
 *
 * Static code analysis: complexity, patterns, potential issues, and security checks.
 */

export interface CodeAnalyzeInput {
  code: string;
  language?: string;
  focus?: 'complexity' | 'security' | 'performance' | 'all';
}

export interface CodeAnalyzeResult {
  lines_of_code: number;
  complexity: { score: number; level: 'low' | 'medium' | 'high' | 'very_high'; explanation: string };
  issues: Array<{ severity: 'info' | 'warning' | 'error'; message: string; line?: number }>;
  patterns: string[];
  suggestions: string[];
  formatted_output: string;
}

export const CODE_ANALYZE_TOOL = {
  name: 'code_analyze',
  description: 'Analysiere Code statisch: Komplexitaet, Sicherheitsprobleme, Performance-Patterns und Verbesserungsvorschlaege. Keine Ausfuehrung, nur Analyse.',
  input_schema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Der zu analysierende Code' },
      language: { type: 'string', description: 'Programmiersprache (wird auto-detected wenn nicht angegeben)' },
      focus: {
        type: 'string',
        enum: ['complexity', 'security', 'performance', 'all'],
        description: 'Analysefokus (default: all)',
      },
    },
    required: ['code'],
  },
};

export async function analyzeCode(input: CodeAnalyzeInput): Promise<CodeAnalyzeResult> {
  const { code, language, focus = 'all' } = input;
  const lines = code.split('\n');
  const loc = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;
  const issues: CodeAnalyzeResult['issues'] = [];
  const patterns: string[] = [];
  const suggestions: string[] = [];

  // Complexity analysis
  let complexityScore = 0;
  const controlFlowKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try', '&&', '||', '?'];
  for (const keyword of controlFlowKeywords) {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const matches = code.match(regex);
    if (matches) complexityScore += matches.length;
  }

  // Nesting depth
  let maxDepth = 0;
  let currentDepth = 0;
  for (const char of code) {
    if (char === '{') { currentDepth++; maxDepth = Math.max(maxDepth, currentDepth); }
    if (char === '}') currentDepth--;
  }
  complexityScore += maxDepth * 2;

  const level: CodeAnalyzeResult['complexity']['level'] =
    complexityScore <= 5 ? 'low' : complexityScore <= 15 ? 'medium' : complexityScore <= 30 ? 'high' : 'very_high';

  // Security checks
  if (focus === 'security' || focus === 'all') {
    const securityPatterns: [RegExp, string][] = [
      [/eval\s*\(/, 'eval() ist ein Sicherheitsrisiko - verwende Alternativen'],
      [/innerHTML\s*=/, 'innerHTML kann zu XSS fuehren - verwende textContent oder sanitize'],
      [/document\.write/, 'document.write ist unsicher und veraltet'],
      [/new Function\s*\(/, 'new Function() ist aehnlich unsicher wie eval()'],
      [/\bexec\s*\(/, 'exec() kann Shell-Injection ermoeglichen'],
      [/password|secret|api.?key/i, 'Moeglicherweise hartcodierte Credentials gefunden'],
      [/http:\/\//, 'Unsicheres HTTP statt HTTPS verwendet'],
      [/\.env/, 'Direkter Zugriff auf .env Dateien - verwende Umgebungsvariablen'],
    ];
    for (const [pattern, message] of securityPatterns) {
      if (pattern.test(code)) {
        issues.push({ severity: 'warning', message });
      }
    }
  }

  // Performance checks
  if (focus === 'performance' || focus === 'all') {
    if (/for\s*\(.*\.length/.test(code)) {
      suggestions.push('Array.length in for-Schleife cachen fuer bessere Performance');
    }
    if (/\+\s*=\s*.*string/i.test(code) || /"".*\+/.test(code)) {
      suggestions.push('Fuer viele String-Konkatenationen Array.join() oder Template Literals verwenden');
    }
    if (/\.forEach/.test(code)) {
      patterns.push('forEach-Pattern erkannt');
    }
    if (/async.*await.*for/.test(code)) {
      suggestions.push('Sequential await in Schleifen - pruefe ob Promise.all() moeglich ist');
    }
  }

  // Pattern detection
  if (/class\s+\w+/.test(code)) patterns.push('Klassen-basiertes OOP');
  if (/=>\s*{/.test(code) || /=>\s*[^{]/.test(code)) patterns.push('Arrow Functions');
  if (/async\s+function|async\s*\(/.test(code)) patterns.push('Async/Await');
  if (/\.then\s*\(/.test(code)) patterns.push('Promise Chaining');
  if (/import\s+{/.test(code) || /import\s+\w+/.test(code)) patterns.push('ES Modules');
  if (/interface\s+\w+|type\s+\w+\s*=/.test(code)) patterns.push('TypeScript Types');
  if (/useState|useEffect|useCallback/.test(code)) patterns.push('React Hooks');

  // General issues
  if (maxDepth > 4) issues.push({ severity: 'warning', message: `Hohe Verschachtelungstiefe (${maxDepth}) - refactoring empfohlen` });
  if (loc > 100) suggestions.push('Funktion ist lang - in kleinere Funktionen aufteilen');
  if (/console\.log/.test(code)) issues.push({ severity: 'info', message: 'console.log gefunden - vor Production entfernen' });
  if (/TODO|FIXME|HACK/i.test(code)) issues.push({ severity: 'info', message: 'TODO/FIXME Kommentar gefunden' });
  if (/var\s+/.test(code)) suggestions.push('var durch let/const ersetzen (Block-Scoping)');
  if (/==(?!=)/.test(code)) suggestions.push('== durch === ersetzen (strikte Vergleiche)');

  const formatted = [
    `📊 **Code-Analyse** (${loc} Zeilen, ${language || 'auto-detected'})`,
    '',
    `**Komplexitaet:** ${level.toUpperCase()} (Score: ${complexityScore}, Max-Tiefe: ${maxDepth})`,
    '',
    ...(patterns.length > 0 ? [`**Patterns:** ${patterns.join(', ')}`, ''] : []),
    ...(issues.length > 0 ? [
      '**Issues:**',
      ...issues.map(i => `- ${i.severity === 'error' ? '🔴' : i.severity === 'warning' ? '🟡' : 'ℹ️'} ${i.message}`),
      '',
    ] : ['**Issues:** Keine gefunden ✅', '']),
    ...(suggestions.length > 0 ? [
      '**Vorschlaege:**',
      ...suggestions.map(s => `- 💡 ${s}`),
    ] : []),
  ].join('\n');

  return {
    lines_of_code: loc,
    complexity: { score: complexityScore, level, explanation: `Score ${complexityScore} basierend auf Control-Flow und Verschachtelung` },
    issues,
    patterns,
    suggestions,
    formatted_output: formatted,
  };
}
