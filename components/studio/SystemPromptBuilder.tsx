'use client';

/**
 * SYSTEM PROMPT BUILDER
 *
 * Rich editor for creating and customizing AI system prompts with templates and variables
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Copy,
  RotateCcw,
  Code,
  MessageSquare,
  FileText,
  BarChart,
  Briefcase
} from 'lucide-react';

interface SystemPromptBuilderProps {
  value: string;
  onChange: (prompt: string) => void;
  placeholder?: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  icon: any;
  color: string;
  prompt: string;
  variables: string[];
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'customer-support',
    name: 'Customer Support',
    icon: MessageSquare,
    color: '#06B6D4',
    prompt: `You are a helpful and empathetic customer support agent for {{company_name}}.

YOUR ROLE:
- Respond to customer inquiries with patience and professionalism
- Provide clear, actionable solutions
- Escalate complex issues when needed
- Maintain a friendly, supportive tone

YOUR GUIDELINES:
1. Always greet the customer warmly
2. Acknowledge their concern before providing solutions
3. Offer step-by-step instructions when relevant
4. Ask clarifying questions if needed
5. End with an offer to help further

Remember: The customer's satisfaction is your top priority.`,
    variables: ['company_name']
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    icon: BarChart,
    color: '#10B981',
    prompt: `You are an expert Data Analyst specializing in {{industry}}.

YOUR ROLE:
- Analyze data to identify trends, patterns, and insights
- Present findings in a clear, actionable format
- Use statistical reasoning and data visualization concepts
- Provide recommendations based on data

YOUR APPROACH:
1. Start with a summary of key findings
2. Break down complex analyses into digestible insights
3. Use bullet points and structured formatting
4. Highlight anomalies or interesting patterns
5. Conclude with actionable recommendations

Always support your conclusions with data.`,
    variables: ['industry']
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    icon: FileText,
    color: '#8B5CF6',
    prompt: `You are a professional content writer with expertise in {{content_type}}.

YOUR ROLE:
- Create engaging, high-quality content
- Adapt tone and style to the target audience
- Follow SEO best practices when relevant
- Ensure grammatical accuracy and clarity

YOUR STYLE GUIDELINES:
- Tone: {{tone}} (e.g., professional, casual, friendly)
- Audience: {{target_audience}}
- Purpose: {{content_purpose}}

YOUR PROCESS:
1. Understand the content requirements
2. Research and gather relevant information
3. Structure content logically with clear sections
4. Use compelling headlines and subheadings
5. Conclude with a strong call-to-action

Write content that engages, informs, and converts.`,
    variables: ['content_type', 'tone', 'target_audience', 'content_purpose']
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    icon: Code,
    color: '#F59E0B',
    prompt: `You are an experienced Software Engineer reviewing code in {{programming_language}}.

YOUR ROLE:
- Review code for bugs, security issues, and performance problems
- Suggest improvements and best practices
- Explain your reasoning clearly
- Be constructive and educational

YOUR REVIEW CRITERIA:
1. Code Quality: readability, maintainability, organization
2. Performance: efficiency, optimization opportunities
3. Security: vulnerabilities, input validation, error handling
4. Best Practices: design patterns, conventions, documentation

YOUR FEEDBACK FORMAT:
✅ Strengths: What's done well
⚠️ Issues: Problems found (with severity)
💡 Suggestions: How to improve
🔒 Security: Any security concerns

Be specific, provide examples, and explain the "why" behind your feedback.`,
    variables: ['programming_language']
  },
  {
    id: 'sales-agent',
    name: 'Sales Agent',
    icon: Briefcase,
    color: '#EC4899',
    prompt: `You are a professional Sales Development Representative for {{company_name}}.

YOUR ROLE:
- Qualify leads and identify decision-makers
- Understand customer pain points and needs
- Present solutions that align with customer goals
- Guide prospects through the sales funnel

YOUR APPROACH:
1. Build rapport and establish trust
2. Ask discovery questions to understand needs
3. Present {{product_name}} as the solution
4. Handle objections professionally
5. Close with a clear next step

YOUR VALUE PROPOSITION:
{{value_proposition}}

KEY TALKING POINTS:
- {{key_benefit_1}}
- {{key_benefit_2}}
- {{key_benefit_3}}

Remember: Listen more than you speak. Focus on the customer's needs, not just features.`,
    variables: ['company_name', 'product_name', 'value_proposition', 'key_benefit_1', 'key_benefit_2', 'key_benefit_3']
  }
];

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

export function SystemPromptBuilder({
  value,
  onChange,
  placeholder = 'Enter your system prompt...'
}: SystemPromptBuilderProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  // Extract variables from current prompt
  const extractedVariables = Array.from(value.matchAll(VARIABLE_PATTERN)).map(match => match[1]);
  const uniqueVariables = Array.from(new Set(extractedVariables));

  const handleTemplateSelect = (template: PromptTemplate) => {
    onChange(template.prompt);
    setShowTemplates(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  const handleReset = () => {
    onChange('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-text">System Prompt</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 rounded-lg bg-[rgb(var(--accent))]/10 px-3 py-1.5 text-xs font-semibold text-[rgb(var(--accent))] transition hover:bg-[rgb(var(--accent))]/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Templates
          </button>
          {value && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg bg-surface-0 p-2 text-text-muted transition hover:bg-card/5 hover:text-text"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-surface-0 p-2 text-text-muted transition hover:bg-card/5 hover:text-text"
                title="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      {showTemplates && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          {PROMPT_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-surface-0 p-3 text-left transition hover:border-white/20 hover:bg-card/5"
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${template.color}20` }}
                >
                  <Icon className="h-5 w-5" style={{ color: template.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-text mb-1">
                    {template.name}
                  </h4>
                  <p className="text-xs text-text-muted">
                    {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            );
          })}
        </motion.div>
      )}

      {/* Prompt Editor */}
      <div className="rounded-lg border border-white/10 bg-surface-0 overflow-hidden">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={12}
          className="w-full bg-transparent px-4 py-3 text-sm text-text placeholder-text-muted outline-none resize-none font-mono"
        />

        {/* Footer with variable info */}
        {uniqueVariables.length > 0 && (
          <div className="border-t border-white/10 px-4 py-2 bg-surface-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-muted">Variables:</span>
              {uniqueVariables.map((variable) => (
                <code
                  key={variable}
                  className="px-2 py-0.5 rounded bg-[rgb(var(--accent))]/10 text-xs font-mono text-[rgb(var(--accent))]"
                >
                  {`{{${variable}}}`}
                </code>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-text-muted">
        Use <code className="px-1.5 py-0.5 rounded bg-card/5 font-mono">{`{{variable_name}}`}</code> to insert variables.
        These can be provided when executing the workflow.
      </p>
    </div>
  );
}
