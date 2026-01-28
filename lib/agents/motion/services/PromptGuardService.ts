/**
 * PromptGuardService - Enterprise Prompt Injection Protection
 *
 * Provides comprehensive protection against prompt injection attacks
 * for the Motion AI system
 *
 * Features:
 * - Pattern-based injection detection
 * - Context boundary enforcement
 * - System prompt protection
 * - Input sanitization for AI prompts
 * - Role confusion prevention
 * - Jailbreak attempt detection
 * - Instruction override detection
 * - Output validation
 * - Threat scoring
 * - Audit logging
 */

import { EventEmitter } from 'events';
import { logger, LoggerInstance } from './LoggingService';

// ============================================
// TYPES & INTERFACES
// ============================================

export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface PromptAnalysis {
  isSafe: boolean;
  threatLevel: ThreatLevel;
  score: number; // 0-100, higher is more dangerous
  threats: PromptThreat[];
  sanitizedInput?: string;
  recommendations: string[];
}

export interface PromptThreat {
  type: ThreatType;
  pattern: string;
  match: string;
  position: number;
  severity: ThreatLevel;
  description: string;
}

export type ThreatType =
  | 'system_prompt_override'
  | 'role_confusion'
  | 'instruction_injection'
  | 'context_manipulation'
  | 'jailbreak_attempt'
  | 'data_exfiltration'
  | 'prompt_leaking'
  | 'delimiter_injection'
  | 'encoding_attack'
  | 'indirect_injection';

export interface GuardConfig {
  // Detection settings
  enablePatternDetection: boolean;
  enableHeuristicAnalysis: boolean;
  enableContextValidation: boolean;

  // Thresholds
  blockThreshold: number; // Score above which to block
  warnThreshold: number; // Score above which to warn

  // Actions
  sanitizeInputs: boolean;
  logAllAttempts: boolean;
  blockOnHighThreat: boolean;

  // Custom patterns
  customBlockPatterns: RegExp[];
  customAllowPatterns: RegExp[];

  // Allowlist
  trustedDomains: string[];
  trustedUsers: string[];
}

// ============================================
// THREAT PATTERNS
// ============================================

const INJECTION_PATTERNS: Array<{
  pattern: RegExp;
  type: ThreatType;
  severity: ThreatLevel;
  description: string;
}> = [
  // System prompt override attempts
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|guidelines?)/i,
    type: 'system_prompt_override',
    severity: 'critical',
    description: 'Attempt to override system instructions',
  },
  {
    pattern: /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions?|programming|training)/i,
    type: 'system_prompt_override',
    severity: 'critical',
    description: 'Attempt to disregard system programming',
  },
  {
    pattern: /forget\s+(everything|all|your\s+instructions?)/i,
    type: 'system_prompt_override',
    severity: 'critical',
    description: 'Attempt to reset AI memory/instructions',
  },
  {
    pattern: /you\s+are\s+now\s+(?:a|an|the)\s+(?:new|different)/i,
    type: 'system_prompt_override',
    severity: 'high',
    description: 'Attempt to redefine AI identity',
  },

  // Role confusion attacks
  {
    pattern: /\[?system\]?[\s:]+/i,
    type: 'role_confusion',
    severity: 'high',
    description: 'Attempt to inject system-level messages',
  },
  {
    pattern: /\[?assistant\]?[\s:]+/i,
    type: 'role_confusion',
    severity: 'medium',
    description: 'Attempt to inject assistant responses',
  },
  {
    pattern: /###\s*(system|instruction|prompt)/i,
    type: 'role_confusion',
    severity: 'high',
    description: 'Markdown-style system injection',
  },
  {
    pattern: /<\|?(?:im_start|im_end|system|user|assistant)\|?>/i,
    type: 'role_confusion',
    severity: 'critical',
    description: 'Chat ML delimiter injection',
  },

  // Instruction injection
  {
    pattern: /(?:new\s+)?instruction[s]?\s*[:=]/i,
    type: 'instruction_injection',
    severity: 'high',
    description: 'Direct instruction injection attempt',
  },
  {
    pattern: /override\s+(?:the\s+)?(?:default|current|existing)\s+(?:behavior|settings?|rules?)/i,
    type: 'instruction_injection',
    severity: 'high',
    description: 'Attempt to override default behavior',
  },
  {
    pattern: /(?:execute|run|perform)\s+(?:the\s+)?following\s+(?:command|code|script)/i,
    type: 'instruction_injection',
    severity: 'medium',
    description: 'Command execution attempt',
  },

  // Jailbreak attempts
  {
    pattern: /(?:dan|dude|jailbreak|developer|admin)\s*mode/i,
    type: 'jailbreak_attempt',
    severity: 'critical',
    description: 'Known jailbreak mode attempt',
  },
  {
    pattern: /pretend\s+(?:you\s+)?(?:are|to\s+be|you're)\s+(?:a|an)\s+(?:ai|bot|assistant)\s+(?:without|with\s+no)\s+(?:restrictions?|limits?|rules?)/i,
    type: 'jailbreak_attempt',
    severity: 'critical',
    description: 'Restriction removal attempt via roleplay',
  },
  {
    pattern: /act\s+as\s+(?:if\s+)?(?:you\s+)?(?:have|had|don't\s+have)\s+(?:no\s+)?(?:ethical|moral|safety)\s+(?:guidelines?|restrictions?|constraints?)/i,
    type: 'jailbreak_attempt',
    severity: 'critical',
    description: 'Ethics bypass attempt',
  },
  {
    pattern: /roleplay\s+as\s+(?:an?\s+)?(?:evil|malicious|unrestricted|uncensored)/i,
    type: 'jailbreak_attempt',
    severity: 'high',
    description: 'Malicious roleplay attempt',
  },

  // Data exfiltration
  {
    pattern: /(?:reveal|show|tell|give|expose|leak)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?|rules?|guidelines?)/i,
    type: 'prompt_leaking',
    severity: 'high',
    description: 'System prompt extraction attempt',
  },
  {
    pattern: /what\s+(?:are|were)\s+(?:your|the)\s+(?:original|initial|first|system)\s+(?:instructions?|prompts?)/i,
    type: 'prompt_leaking',
    severity: 'medium',
    description: 'System prompt inquiry',
  },
  {
    pattern: /(?:print|output|display|echo)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?)/i,
    type: 'prompt_leaking',
    severity: 'high',
    description: 'Prompt printing attempt',
  },

  // Context manipulation
  {
    pattern: /---+\s*(?:end|ignore|stop)\s*---+/i,
    type: 'context_manipulation',
    severity: 'medium',
    description: 'Context boundary manipulation',
  },
  {
    pattern: /```(?:system|prompt|instruction)/i,
    type: 'context_manipulation',
    severity: 'medium',
    description: 'Code block context manipulation',
  },
  {
    pattern: /\[\[(?:ignore|skip|bypass)\]\]/i,
    type: 'context_manipulation',
    severity: 'medium',
    description: 'Bracket-based bypass attempt',
  },

  // Encoding attacks
  {
    pattern: /(?:base64|rot13|hex|unicode)[\s:]+(?:decode|encoded?)/i,
    type: 'encoding_attack',
    severity: 'medium',
    description: 'Encoding-based obfuscation attempt',
  },
  {
    pattern: /\\u[0-9a-f]{4}/i,
    type: 'encoding_attack',
    severity: 'low',
    description: 'Unicode escape sequence detected',
  },

  // Delimiter injection
  {
    pattern: /\x00|\x1a|\x1b/,
    type: 'delimiter_injection',
    severity: 'high',
    description: 'Null byte or control character injection',
  },
];

// Suspicious phrases that increase threat score
const SUSPICIOUS_PHRASES = [
  { pattern: /(?:bypass|circumvent|avoid|evade)\s+(?:the\s+)?(?:filters?|restrictions?|safety)/i, weight: 15 },
  { pattern: /(?:trick|fool|deceive|manipulate)\s+(?:the\s+)?(?:ai|bot|assistant|you)/i, weight: 20 },
  { pattern: /(?:hypothetically|theoretically|in\s+theory)/i, weight: 5 },
  { pattern: /(?:for\s+(?:educational|research|testing)\s+purposes?)/i, weight: 10 },
  { pattern: /(?:pretend|imagine|suppose)\s+(?:that\s+)?(?:you\s+)?(?:are|were|can)/i, weight: 10 },
  { pattern: /(?:don't|do\s+not)\s+(?:tell\s+anyone|mention|reveal)/i, weight: 15 },
  { pattern: /(?:secret|hidden|confidential)\s+(?:mode|feature|command)/i, weight: 20 },
];

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_GUARD_CONFIG: GuardConfig = {
  enablePatternDetection: true,
  enableHeuristicAnalysis: true,
  enableContextValidation: true,
  blockThreshold: 70,
  warnThreshold: 40,
  sanitizeInputs: true,
  logAllAttempts: true,
  blockOnHighThreat: true,
  customBlockPatterns: [],
  customAllowPatterns: [],
  trustedDomains: [],
  trustedUsers: [],
};

// ============================================
// PROMPT GUARD SERVICE
// ============================================

export class PromptGuardService extends EventEmitter {
  private static instance: PromptGuardService;
  private config: GuardConfig;
  private log: LoggerInstance;

  // Statistics
  private stats = {
    totalChecks: 0,
    blocked: 0,
    warned: 0,
    passed: 0,
    threatsByType: new Map<ThreatType, number>(),
  };

  private constructor(config: Partial<GuardConfig> = {}) {
    super();
    this.config = { ...DEFAULT_GUARD_CONFIG, ...config };
    this.log = logger.createLogger({
      service: 'prompt-guard',
      component: 'security',
    });
    this.log.info('PromptGuardService initialized');
  }

  public static getInstance(config?: Partial<GuardConfig>): PromptGuardService {
    if (!PromptGuardService.instance) {
      PromptGuardService.instance = new PromptGuardService(config);
    }
    return PromptGuardService.instance;
  }

  // ============================================
  // MAIN ANALYSIS
  // ============================================

  /**
   * Analyze a prompt for potential injection attacks
   */
  analyzePrompt(input: string, context?: { userId?: string; agentId?: string }): PromptAnalysis {
    this.stats.totalChecks++;
    const threats: PromptThreat[] = [];
    let score = 0;
    const recommendations: string[] = [];

    // Check for trusted user bypass
    if (context?.userId && this.config.trustedUsers.includes(context.userId)) {
      return {
        isSafe: true,
        threatLevel: 'none',
        score: 0,
        threats: [],
        sanitizedInput: input,
        recommendations: ['User is on trusted list'],
      };
    }

    // Pattern-based detection
    if (this.config.enablePatternDetection) {
      const patternThreats = this.detectPatterns(input);
      threats.push(...patternThreats);
      score += this.calculatePatternScore(patternThreats);
    }

    // Heuristic analysis
    if (this.config.enableHeuristicAnalysis) {
      const heuristicScore = this.analyzeHeuristics(input);
      score += heuristicScore;
    }

    // Context validation
    if (this.config.enableContextValidation) {
      const contextThreats = this.validateContext(input);
      threats.push(...contextThreats);
      score += this.calculatePatternScore(contextThreats);
    }

    // Custom patterns
    const customThreats = this.checkCustomPatterns(input);
    threats.push(...customThreats);
    score += this.calculatePatternScore(customThreats);

    // Cap score at 100
    score = Math.min(100, score);

    // Determine threat level
    const threatLevel = this.getThreatLevel(score);
    const isSafe = score < this.config.blockThreshold;

    // Generate recommendations
    if (threats.length > 0) {
      recommendations.push(...this.generateRecommendations(threats));
    }

    // Sanitize input if enabled
    let sanitizedInput = input;
    if (this.config.sanitizeInputs && !isSafe) {
      sanitizedInput = this.sanitizeInput(input, threats);
    }

    // Update statistics
    if (!isSafe) {
      this.stats.blocked++;
    } else if (score >= this.config.warnThreshold) {
      this.stats.warned++;
    } else {
      this.stats.passed++;
    }

    // Update threat type statistics
    for (const threat of threats) {
      const count = this.stats.threatsByType.get(threat.type) || 0;
      this.stats.threatsByType.set(threat.type, count + 1);
    }

    const analysis: PromptAnalysis = {
      isSafe,
      threatLevel,
      score,
      threats,
      sanitizedInput,
      recommendations,
    };

    // Emit events
    if (!isSafe) {
      this.emit('blocked', { input, analysis, context });
      this.log.warn('Prompt blocked', {
        score,
        threatCount: threats.length,
        threatLevel,
        userId: context?.userId,
        agentId: context?.agentId,
      });
    } else if (score >= this.config.warnThreshold) {
      this.emit('warned', { input, analysis, context });
      this.log.info('Prompt warning', {
        score,
        threatCount: threats.length,
        threatLevel,
      });
    }

    // Log all attempts if configured
    if (this.config.logAllAttempts && threats.length > 0) {
      this.log.debug('Prompt analysis', {
        inputLength: input.length,
        score,
        threatCount: threats.length,
        threatTypes: threats.map(t => t.type),
      });
    }

    return analysis;
  }

  /**
   * Check if a prompt is safe (quick check)
   */
  isSafe(input: string, context?: { userId?: string; agentId?: string }): boolean {
    const analysis = this.analyzePrompt(input, context);
    return analysis.isSafe;
  }

  /**
   * Validate and sanitize a prompt, throwing if unsafe
   */
  validateOrThrow(input: string, context?: { userId?: string; agentId?: string }): string {
    const analysis = this.analyzePrompt(input, context);

    if (!analysis.isSafe && this.config.blockOnHighThreat) {
      throw new PromptInjectionError(
        'Prompt rejected due to potential security threat',
        analysis
      );
    }

    return analysis.sanitizedInput || input;
  }

  // ============================================
  // PATTERN DETECTION
  // ============================================

  /**
   * Detect known injection patterns
   */
  private detectPatterns(input: string): PromptThreat[] {
    const threats: PromptThreat[] = [];

    for (const { pattern, type, severity, description } of INJECTION_PATTERNS) {
      const matches = input.matchAll(new RegExp(pattern, 'gi'));

      for (const match of matches) {
        threats.push({
          type,
          pattern: pattern.source,
          match: match[0],
          position: match.index || 0,
          severity,
          description,
        });
      }
    }

    return threats;
  }

  /**
   * Check custom block/allow patterns
   */
  private checkCustomPatterns(input: string): PromptThreat[] {
    const threats: PromptThreat[] = [];

    // Check if allowed by custom pattern
    for (const pattern of this.config.customAllowPatterns) {
      if (pattern.test(input)) {
        return []; // Allow if matches allow pattern
      }
    }

    // Check block patterns
    for (const pattern of this.config.customBlockPatterns) {
      const match = input.match(pattern);
      if (match) {
        threats.push({
          type: 'instruction_injection',
          pattern: pattern.source,
          match: match[0],
          position: match.index || 0,
          severity: 'high',
          description: 'Matched custom block pattern',
        });
      }
    }

    return threats;
  }

  // ============================================
  // HEURISTIC ANALYSIS
  // ============================================

  /**
   * Analyze input using heuristics
   */
  private analyzeHeuristics(input: string): number {
    let score = 0;

    // Check suspicious phrases
    for (const { pattern, weight } of SUSPICIOUS_PHRASES) {
      if (pattern.test(input)) {
        score += weight;
      }
    }

    // Check for excessive capitalization
    const upperRatio = this.getUppercaseRatio(input);
    if (upperRatio > 0.5 && input.length > 20) {
      score += 5;
    }

    // Check for excessive special characters
    const specialRatio = this.getSpecialCharRatio(input);
    if (specialRatio > 0.3) {
      score += 10;
    }

    // Check for very long inputs (potential payload)
    if (input.length > 5000) {
      score += 5;
    }

    // Check for repeated patterns
    if (this.hasRepeatedPatterns(input)) {
      score += 10;
    }

    return score;
  }

  /**
   * Get ratio of uppercase characters
   */
  private getUppercaseRatio(input: string): number {
    const letters = input.match(/[a-zA-Z]/g) || [];
    if (letters.length === 0) return 0;
    const uppercase = letters.filter(c => c === c.toUpperCase()).length;
    return uppercase / letters.length;
  }

  /**
   * Get ratio of special characters
   */
  private getSpecialCharRatio(input: string): number {
    if (input.length === 0) return 0;
    const special = (input.match(/[^a-zA-Z0-9\s]/g) || []).length;
    return special / input.length;
  }

  /**
   * Check for suspicious repeated patterns
   */
  private hasRepeatedPatterns(input: string): boolean {
    // Check for repeated delimiters
    if (/(.{3,})\1{3,}/.test(input)) {
      return true;
    }
    // Check for repeated instructions
    if (/\b(\w{4,})\s+\1\s+\1\b/.test(input)) {
      return true;
    }
    return false;
  }

  // ============================================
  // CONTEXT VALIDATION
  // ============================================

  /**
   * Validate context boundaries
   */
  private validateContext(input: string): PromptThreat[] {
    const threats: PromptThreat[] = [];

    // Check for context boundary markers
    const boundaryPatterns = [
      { pattern: /^```[\s\S]*```$/m, description: 'Full input wrapped in code blocks' },
      { pattern: /"""[\s\S]*"""/m, description: 'Triple-quoted string manipulation' },
      { pattern: /<\/?(?:system|prompt|instruction|context)>/gi, description: 'HTML-like context tags' },
    ];

    for (const { pattern, description } of boundaryPatterns) {
      const match = input.match(pattern);
      if (match) {
        threats.push({
          type: 'context_manipulation',
          pattern: pattern.source,
          match: match[0].substring(0, 100),
          position: match.index || 0,
          severity: 'medium',
          description,
        });
      }
    }

    return threats;
  }

  // ============================================
  // SCORING & CLASSIFICATION
  // ============================================

  /**
   * Calculate score from pattern threats
   */
  private calculatePatternScore(threats: PromptThreat[]): number {
    const severityScores: Record<ThreatLevel, number> = {
      none: 0,
      low: 5,
      medium: 15,
      high: 30,
      critical: 50,
    };

    return threats.reduce((sum, threat) => sum + severityScores[threat.severity], 0);
  }

  /**
   * Get threat level from score
   */
  private getThreatLevel(score: number): ThreatLevel {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    if (score >= 10) return 'low';
    return 'none';
  }

  // ============================================
  // SANITIZATION
  // ============================================

  /**
   * Sanitize input to remove dangerous patterns
   */
  sanitizeInput(input: string, threats?: PromptThreat[]): string {
    let sanitized = input;

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Remove known dangerous patterns
    const dangerousPatterns = [
      /<\|?(?:im_start|im_end|system|user|assistant)\|?>/gi,
      /\[\[(?:ignore|skip|bypass)\]\]/gi,
      /---+\s*(?:end|ignore|stop)\s*---+/gi,
    ];

    for (const pattern of dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Escape markdown-like control sequences
    sanitized = sanitized.replace(/```(?=system|prompt|instruction)/gi, '\\`\\`\\`');

    // Normalize excessive whitespace
    sanitized = sanitized.replace(/\s{10,}/g, ' ');

    return sanitized.trim();
  }

  /**
   * Create safe prompt wrapper
   */
  wrapPrompt(userInput: string, systemContext?: string): string {
    const sanitized = this.sanitizeInput(userInput);

    // Add clear boundary markers
    const wrapped = `
[USER INPUT START]
${sanitized}
[USER INPUT END]
`;

    if (systemContext) {
      return `${systemContext}

${wrapped}`;
    }

    return wrapped;
  }

  // ============================================
  // RECOMMENDATIONS
  // ============================================

  /**
   * Generate recommendations based on threats
   */
  private generateRecommendations(threats: PromptThreat[]): string[] {
    const recommendations: string[] = [];
    const threatTypes = new Set(threats.map(t => t.type));

    if (threatTypes.has('system_prompt_override')) {
      recommendations.push('Implement strict system prompt isolation');
    }

    if (threatTypes.has('role_confusion')) {
      recommendations.push('Use clear role delimiters in conversation flow');
    }

    if (threatTypes.has('jailbreak_attempt')) {
      recommendations.push('Block request and log for security review');
    }

    if (threatTypes.has('prompt_leaking')) {
      recommendations.push('Avoid storing sensitive information in system prompts');
    }

    if (threatTypes.has('encoding_attack')) {
      recommendations.push('Normalize and decode input before processing');
    }

    return recommendations;
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Update configuration
   */
  configure(config: Partial<GuardConfig>): void {
    this.config = { ...this.config, ...config };
    this.log.info('PromptGuard configuration updated', config);
  }

  /**
   * Get current configuration
   */
  getConfig(): GuardConfig {
    return { ...this.config };
  }

  /**
   * Add a custom block pattern
   */
  addBlockPattern(pattern: RegExp): void {
    this.config.customBlockPatterns.push(pattern);
  }

  /**
   * Add a custom allow pattern
   */
  addAllowPattern(pattern: RegExp): void {
    this.config.customAllowPatterns.push(pattern);
  }

  /**
   * Add trusted user
   */
  addTrustedUser(userId: string): void {
    if (!this.config.trustedUsers.includes(userId)) {
      this.config.trustedUsers.push(userId);
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get service statistics
   */
  getStats(): {
    totalChecks: number;
    blocked: number;
    warned: number;
    passed: number;
    blockRate: number;
    threatsByType: Record<ThreatType, number>;
  } {
    const threatsByType: Record<ThreatType, number> = {} as Record<ThreatType, number>;
    for (const [type, count] of this.stats.threatsByType) {
      threatsByType[type] = count;
    }

    return {
      totalChecks: this.stats.totalChecks,
      blocked: this.stats.blocked,
      warned: this.stats.warned,
      passed: this.stats.passed,
      blockRate: this.stats.totalChecks > 0
        ? (this.stats.blocked / this.stats.totalChecks) * 100
        : 0,
      threatsByType,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalChecks: 0,
      blocked: 0,
      warned: 0,
      passed: 0,
      threatsByType: new Map(),
    };
  }
}

// ============================================
// ERROR CLASS
// ============================================

export class PromptInjectionError extends Error {
  public readonly analysis: PromptAnalysis;

  constructor(message: string, analysis: PromptAnalysis) {
    super(message);
    this.name = 'PromptInjectionError';
    this.analysis = analysis;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const promptGuard = PromptGuardService.getInstance();

export default PromptGuardService;
