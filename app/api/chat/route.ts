import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// ============================================================================
// AI CHAT ROUTE - Level 12: Real-World Integrations (Email & Slack)
// ============================================================================

// Level 12: Extended Agent capabilities interface
interface AgentCapabilities {
  internetAccess: boolean;
  longTermMemory: boolean;
  codeExecution: boolean;
  canSendEmail: boolean;      // Level 12: Email capability
  canPostToSlack: boolean;    // Level 12: Slack capability
}

// Level 12: Integration keys passed from frontend
interface IntegrationKeys {
  resendApiKey?: string;
  slackWebhookUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      systemPrompt,
      agentName,
      agentRole,
      context,        // Level 8: RAG context from knowledge base
      contextFiles,   // Level 8: List of file names used for context
      capabilities,   // Level 10+12: Agent capabilities for tool access
      integrationKeys // Level 12: API keys for integrations
    } = await req.json();

    // Get API key from request header
    const apiKey = req.headers.get('x-openai-api-key');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create OpenAI client with user's API key
    const openai = createOpenAI({
      apiKey,
      compatibility: 'strict',
    });

    // Build system message with optional RAG context injection
    const baseSystemPrompt = systemPrompt || buildDefaultSystemPrompt(agentName, agentRole);
    const systemMessage = context
      ? buildContextEnhancedPrompt(baseSystemPrompt, context, contextFiles)
      : baseSystemPrompt;

    // Log context usage for debugging
    if (context) {
      console.log(`[CHAT_API] RAG Context injected from ${contextFiles?.length || 0} files`);
    }

    // Level 12: Parse agent capabilities with new email/slack options
    const agentCapabilities: AgentCapabilities = {
      internetAccess: capabilities?.internetAccess ?? false,
      longTermMemory: capabilities?.longTermMemory ?? false,
      codeExecution: capabilities?.codeExecution ?? false,
      canSendEmail: capabilities?.canSendEmail ?? false,
      canPostToSlack: capabilities?.canPostToSlack ?? false,
    };

    // Level 12: Parse integration keys
    const keys: IntegrationKeys = integrationKeys || {};

    // Level 12: Build tools object based on agent capabilities
    const tools = buildAgentTools(agentCapabilities, keys);

    // Log tool availability
    const enabledTools: string[] = [];
    if (agentCapabilities.internetAccess) enabledTools.push('webSearch');
    if (agentCapabilities.canSendEmail && keys.resendApiKey) enabledTools.push('sendEmail');
    if (agentCapabilities.canPostToSlack && keys.slackWebhookUrl) enabledTools.push('sendSlackNotification');

    if (enabledTools.length > 0) {
      console.log(`[CHAT_API] Tools enabled for ${agentName}: ${enabledTools.join(', ')}`);
    }

    // Stream the response with optional tools
    const result = streamText({
      model: openai('gpt-4-turbo-preview'),
      system: systemMessage,
      messages,
      temperature: 0.7,
      maxTokens: 2000,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      maxSteps: 5, // Allow up to 5 tool calls in a conversation turn
    });

    // Return the stream
    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('[CHAT_API_ERROR]', error);

    // Handle specific OpenAI errors
    if (error?.message?.includes('API key')) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error?.message?.includes('rate limit')) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildDefaultSystemPrompt(agentName?: string, agentRole?: string): string {
  const name = agentName || 'AI Assistant';
  const role = agentRole || 'General Assistant';

  return `You are ${name}, a professional ${role} AI agent.

YOUR ROLE:
- Provide helpful, accurate, and actionable responses
- Format your responses using Markdown for better readability
- Use tables, lists, and code blocks when appropriate
- Be concise but thorough

RESPONSE FORMAT:
- Start with a brief summary or key insight
- Use headers (##) to organize sections
- Use bullet points for lists
- Include actionable recommendations when relevant
- End with next steps or follow-up questions if appropriate

AVAILABLE TOOLS:
- If you have access to email sending, use it when the user asks you to send emails
- If you have access to Slack, use it when the user asks you to post notifications
- If you have web search, use it to find current information

Remember: You are representing a professional AI agent system. Be helpful, accurate, and format your responses beautifully using Markdown.`;
}

/**
 * Level 8: Build context-enhanced system prompt with RAG context injection
 */
function buildContextEnhancedPrompt(
  basePrompt: string,
  context: string,
  contextFiles?: string[]
): string {
  const fileList = contextFiles?.length
    ? `\n\nDocuments referenced: ${contextFiles.join(', ')}`
    : '';

  return `${basePrompt}

=== USER KNOWLEDGE BASE CONTEXT ===
The following context has been extracted from the user's uploaded documents. Use this information to provide accurate, relevant answers. If the user's question relates to this context, reference it directly. If the context doesn't contain relevant information, acknowledge that and provide your best answer.
${fileList}

${context}

=== END OF CONTEXT ===

IMPORTANT INSTRUCTIONS FOR USING CONTEXT:
1. When the user asks about topics covered in the context, cite specific information from the documents
2. If you quote or reference specific data, mention which document it came from
3. If the context doesn't fully answer the question, say so and provide supplementary information
4. Prioritize accuracy - only state facts that are explicitly in the context or that you are confident about
5. Format your response with clear structure using Markdown`;
}

// ============================================================================
// LEVEL 10 + 12: AGENTIC TOOLS
// ============================================================================

/**
 * Build tools object based on agent capabilities
 */
function buildAgentTools(
  capabilities: AgentCapabilities,
  integrationKeys: IntegrationKeys
): Record<string, ReturnType<typeof tool>> {
  const tools: Record<string, ReturnType<typeof tool>> = {};

  // ============================================================================
  // Web Search Tool - Level 10
  // ============================================================================
  if (capabilities.internetAccess) {
    tools.webSearch = tool({
      description: 'Search the web for current information. Use this when you need up-to-date information, news, or facts that may have changed since your training.',
      parameters: z.object({
        query: z.string().describe('The search query to look up on the web'),
      }),
      execute: async ({ query }) => {
        console.log(`[WEB_SEARCH] Searching for: ${query}`);

        // Check for Tavily API key
        const tavilyApiKey = process.env.TAVILY_API_KEY;

        if (!tavilyApiKey) {
          // Return mock results if no API key is configured
          console.log('[WEB_SEARCH] No Tavily API key - using mock results');
          return {
            success: true,
            query,
            results: [
              {
                title: `Mock Result for "${query}"`,
                url: 'https://example.com/mock-result',
                content: `This is a mock search result for "${query}". Configure TAVILY_API_KEY in your environment to enable real web search.`,
                score: 0.95,
              },
              {
                title: `Additional Info on "${query}"`,
                url: 'https://example.com/mock-result-2',
                content: `More mock information about "${query}". Real search results would appear here with actual web data.`,
                score: 0.87,
              },
            ],
            source: 'mock',
          };
        }

        try {
          // Real Tavily API call
          const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: tavilyApiKey,
              query,
              search_depth: 'basic',
              include_answer: true,
              include_raw_content: false,
              max_results: 5,
            }),
          });

          if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status}`);
          }

          const data = await response.json();

          return {
            success: true,
            query,
            answer: data.answer,
            results: data.results?.map((r: any) => ({
              title: r.title,
              url: r.url,
              content: r.content,
              score: r.score,
            })) || [],
            source: 'tavily',
          };
        } catch (error: any) {
          console.error('[WEB_SEARCH_ERROR]', error);
          return {
            success: false,
            query,
            error: error.message || 'Failed to perform web search',
            results: [],
          };
        }
      },
    });
  }

  // ============================================================================
  // Send Email Tool - Level 12
  // ============================================================================
  if (capabilities.canSendEmail && integrationKeys.resendApiKey) {
    tools.sendEmail = tool({
      description: 'Send an email to a recipient. Use this when the user asks you to send, compose, or deliver an email to someone. The email will be sent via the Resend service.',
      parameters: z.object({
        to: z.string().email().describe('The recipient email address'),
        subject: z.string().describe('The email subject line'),
        body: z.string().describe('The email body content. Can include basic HTML formatting like <p>, <b>, <i>, <ul>, <li>, <br>.'),
      }),
      execute: async ({ to, subject, body }) => {
        console.log(`[SEND_EMAIL] Sending email to: ${to}`);
        console.log(`[SEND_EMAIL] Subject: ${subject}`);

        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${integrationKeys.resendApiKey}`,
            },
            body: JSON.stringify({
              from: 'Flowent AI <noreply@flowent.ai>', // Default sender
              to: [to],
              subject,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  ${body}
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                  <p style="font-size: 12px; color: #6b7280;">
                    This email was sent by an AI agent via Flowent AI.
                  </p>
                </div>
              `,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Resend API error: ${response.status}`);
          }

          const data = await response.json();

          console.log(`[SEND_EMAIL] Email sent successfully. ID: ${data.id}`);

          return {
            success: true,
            messageId: data.id,
            to,
            subject,
            status: 'sent',
            sentAt: new Date().toISOString(),
          };
        } catch (error: any) {
          console.error('[SEND_EMAIL_ERROR]', error);
          return {
            success: false,
            to,
            subject,
            error: error.message || 'Failed to send email',
            status: 'failed',
          };
        }
      },
    });
  }

  // ============================================================================
  // Send Slack Notification Tool - Level 12
  // ============================================================================
  if (capabilities.canPostToSlack && integrationKeys.slackWebhookUrl) {
    tools.sendSlackNotification = tool({
      description: 'Send a notification message to Slack. Use this when the user asks you to post to Slack, notify a team, or send a Slack message.',
      parameters: z.object({
        message: z.string().describe('The message content to send to Slack. Supports Slack markdown like *bold*, _italic_, `code`, and bullet points.'),
        channel: z.string().optional().describe('Optional: Override the default channel. Only works if the webhook supports it.'),
      }),
      execute: async ({ message, channel }) => {
        console.log(`[SEND_SLACK] Posting to Slack: ${message.slice(0, 50)}...`);

        try {
          const payload: Record<string, unknown> = {
            text: message,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: message,
                },
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `🤖 Sent by Flowent AI Agent • ${new Date().toLocaleString()}`,
                  },
                ],
              },
            ],
          };

          if (channel) {
            payload.channel = channel;
          }

          const response = await fetch(integrationKeys.slackWebhookUrl!, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          // Slack webhooks return 'ok' as text on success
          const responseText = await response.text();

          if (!response.ok || responseText !== 'ok') {
            throw new Error(`Slack Webhook error: ${responseText || response.status}`);
          }

          console.log('[SEND_SLACK] Message posted successfully');

          return {
            success: true,
            message: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
            channel: channel || 'default',
            status: 'sent',
            sentAt: new Date().toISOString(),
          };
        } catch (error: any) {
          console.error('[SEND_SLACK_ERROR]', error);
          return {
            success: false,
            message: message.slice(0, 100),
            error: error.message || 'Failed to send Slack notification',
            status: 'failed',
          };
        }
      },
    });
  }

  return tools;
}
