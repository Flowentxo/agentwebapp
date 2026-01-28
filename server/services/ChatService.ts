import { logger } from '../utils/logger'
import { openAIService } from './OpenAIService'

interface ChatMessage {
  id: string
  agentId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface AgentPersonality {
  systemPrompt: string
  temperature: number
  maxTokens: number
}

export class ChatService {
  private chatHistories: Map<string, ChatMessage[]> = new Map()

  // Agent personality definitions matching Sintra.ai official agents
  private agentPersonalities: Record<string, AgentPersonality> = {
    'agent-001': { // Cassie - Customer Support (Multilingual: German & English)
      systemPrompt: `You are Cassie, a friendly and efficient multilingual customer support agent. You fluently speak both German and English.

LANGUAGE BEHAVIOR:
- Automatically detect the user's language (German or English) from their message
- Respond in the SAME language the user is using
- If user writes in German, respond in German
- If user writes in English, respond in English
- Be natural and conversational in both languages

YOUR ROLE:
- Assist customers with their inquiries professionally and empathetically
- Resolve issues quickly and efficiently
- Provide clear, helpful solutions
- Escalate complex issues when needed
- Always prioritize customer satisfaction

TONE:
- Friendly and warm
- Professional yet approachable
- Patient and understanding
- Concise but thorough

Remember: Match the user's language naturally without explicitly mentioning it.`,
      temperature: 0.7,
      maxTokens: 2000
    },
    'agent-002': { // Dexter - Data Analyst
      systemPrompt: `You are Dexter, an analytical and detail-oriented data analyst. Your expertise includes data processing, statistical analysis, visualization creation, and translating complex data into actionable business insights. You work with SQL, Python, and various BI tools. Be precise, data-driven, and clear in your explanations.`,
      temperature: 0.3,
      maxTokens: 4000
    },
    'agent-003': { // Buddy - Business Development
      systemPrompt: `You are Buddy, an outgoing and strategic business development agent. Your focus is on identifying growth opportunities, qualifying leads, building relationships, and creating partnership strategies. You excel at market research and competitive analysis. Be enthusiastic, strategic, and relationship-focused.`,
      temperature: 0.8,
      maxTokens: 2500
    },
    'agent-004': { // Penn - Copywriter
      systemPrompt: `You are Penn, a creative and persuasive copywriter. Your expertise includes writing engaging headlines, compelling ad copy, email campaigns, blog posts, and brand messaging. You understand tone, voice, and how to connect with different audiences. Be creative, compelling, and brand-conscious.`,
      temperature: 0.9,
      maxTokens: 3000
    },
    'agent-005': { // Soshie - Social Media
      systemPrompt: `You are Soshie, a social media savvy and engaging community manager. You create viral-worthy content, engage with followers, monitor trends, and build authentic connections. You understand each platform's unique culture and best practices. Be energetic, engaging, and trend-aware.`,
      temperature: 0.85,
      maxTokens: 2000
    },
    'agent-006': { // Emmie - Email Marketing
      systemPrompt: `You are Emmie, an email marketing specialist focused on creating high-converting campaigns. You excel at segmentation, personalization, subject line optimization, and analyzing email metrics to improve performance. Be strategic, conversion-focused, and data-informed.`,
      temperature: 0.75,
      maxTokens: 2500
    },
    'agent-007': { // Milli - Sales Manager
      systemPrompt: `You are Milli, a strategic sales manager with expertise in pipeline management, forecasting, and team performance optimization. You provide coaching insights, identify bottlenecks, and drive revenue growth through data-driven decisions. Be leadership-oriented, strategic, and results-focused.`,
      temperature: 0.6,
      maxTokens: 3000
    },
    'agent-008': { // Seomi - SEO Specialist
      systemPrompt: `You are Seomi, an SEO expert specializing in on-page optimization, keyword research, technical SEO, and content strategy. You stay current with search algorithm updates and best practices to maximize organic visibility. Be technical, optimization-focused, and current with trends.`,
      temperature: 0.5,
      maxTokens: 3500
    },
    'agent-009': { // Commet - E-Commerce
      systemPrompt: `You are Commet, an e-commerce specialist focused on optimizing online shopping experiences. Your expertise includes product catalog management, conversion optimization, inventory tracking, and customer journey enhancement. Be customer-centric, conversion-focused, and detail-oriented.`,
      temperature: 0.7,
      maxTokens: 2500
    },
    'agent-010': { // Vizzy - Virtual Assistant
      systemPrompt: `You are Vizzy, a helpful and organized virtual assistant. You manage calendars, set reminders, organize tasks, handle meeting coordination, and provide general administrative support to keep workflows running smoothly. Be organized, proactive, and efficiency-focused.`,
      temperature: 0.6,
      maxTokens: 2000
    },
    'agent-011': { // Gigi - Finance/Accounting
      systemPrompt: `You are Gigi, a meticulous finance and accounting professional. Your expertise includes financial reporting, bookkeeping, invoice management, budget analysis, and ensuring regulatory compliance. You work with precision and attention to detail. Be accurate, compliant, and detail-oriented.`,
      temperature: 0.2,
      maxTokens: 3000
    },
    'agent-012': { // Scouty - Research
      systemPrompt: `You are Scouty, a thorough and analytical research specialist. You excel at gathering information from multiple sources, conducting competitive analysis, identifying trends, and synthesizing findings into actionable insights. You help with market research, competitor intelligence, and strategic planning. Be thorough, analytical, and insight-driven.`,
      temperature: 0.4,
      maxTokens: 4000
    }
  }

  async sendMessage(
    agentId: string,
    message: string,
    history: ChatMessage[] = [],
    userId: string
  ): Promise<any> {
    const historyKey = `${userId}-${agentId}`

    // Get or initialize chat history
    if (!this.chatHistories.has(historyKey)) {
      this.chatHistories.set(historyKey, [])
    }

    const personality = this.agentPersonalities[agentId] || {
      systemPrompt: 'You are a helpful AI assistant.',
      temperature: 0.7,
      maxTokens: 2000
    }

    try {
      // Prepare conversation context for OpenAI
      const conversationHistory = this.chatHistories.get(historyKey) || []
      const recentMessages = conversationHistory.slice(-10) // Last 10 messages for context

      const openAIMessages = [
        { role: 'system' as const, content: personality.systemPrompt },
        ...recentMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user' as const, content: message }
      ]

      // Define Tools - All Google Services
      const tools = [
        {
          type: 'function',
          function: {
            name: 'send_email',
            description: 'Send an email using the user\'s connected Gmail account',
            parameters: {
              type: 'object',
              properties: {
                to: { type: 'string', description: 'Recipient email address' },
                subject: { type: 'string', description: 'Email subject' },
                body: { type: 'string', description: 'Email body (HTML supported)' }
              },
              required: ['to', 'subject', 'body']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'create_calendar_event',
            description: 'Create a calendar event in Google Calendar',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Event title' },
                description: { type: 'string', description: 'Event description' },
                location: { type: 'string', description: 'Event location' },
                startTime: { type: 'string', description: 'Event start time (ISO 8601 format)' },
                endTime: { type: 'string', description: 'Event end time (ISO 8601 format)' },
                attendees: { type: 'array', items: { type: 'string' }, description: 'List of attendee email addresses' }
              },
              required: ['title', 'startTime', 'endTime']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'list_calendar_events',
            description: 'List upcoming events from Google Calendar',
            parameters: {
              type: 'object',
              properties: {
                daysAhead: { type: 'number', description: 'Number of days ahead to fetch events (default: 7)' }
              },
              required: []
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'search_drive_files',
            description: 'Search for files in Google Drive',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query for file names' }
              },
              required: ['query']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'create_task',
            description: 'Create a task in Google Tasks',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Task title' },
                notes: { type: 'string', description: 'Task notes/description' },
                due: { type: 'string', description: 'Due date (ISO 8601 format)' }
              },
              required: ['title']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'list_tasks',
            description: 'List all tasks from Google Tasks',
            parameters: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'read_spreadsheet',
            description: 'Read data from a Google Sheets spreadsheet',
            parameters: {
              type: 'object',
              properties: {
                spreadsheetId: { type: 'string', description: 'The ID of the spreadsheet (from the URL)' },
                range: { type: 'string', description: 'The range to read, e.g., "Sheet1!A1:D10"' }
              },
              required: ['spreadsheetId', 'range']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'search_contacts',
            description: 'Search for contacts in Google Contacts',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query (name, email, etc.)' }
              },
              required: ['query']
            }
          }
        }
      ];

      // Call OpenAI Service (GPT-4o Mini) with Tools
      let response = await openAIService.generateChatCompletion(openAIMessages, {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: personality.temperature,
        maxTokens: personality.maxTokens,
        tools: tools,
        toolChoice: 'auto'
      })

      // Handle Tool Calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Add assistant's tool-call message to history
        openAIMessages.push({
          role: 'assistant',
          content: response.message,
          tool_calls: response.toolCalls
        } as any);

        // Execute each tool call
        for (const toolCall of response.toolCalls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            let result: any = { success: false, error: 'Unknown tool' };

            switch (toolCall.function.name) {
              case 'send_email': {
                logger.info(`[CHAT_SERVICE] Agent ${agentId} sending email to ${args.to}`);
                const { gmailOAuthService } = await import('./GmailOAuthService');
                result = await gmailOAuthService.sendEmail(userId, {
                  to: args.to,
                  subject: args.subject,
                  body: args.body
                });
                break;
              }

              case 'create_calendar_event': {
                logger.info(`[CHAT_SERVICE] Agent ${agentId} creating calendar event: ${args.title}`);
                const { googleCalendarService } = await import('./GoogleCalendarService');
                result = await googleCalendarService.createEvent(userId, {
                  title: args.title,
                  description: args.description,
                  location: args.location,
                  startTime: args.startTime,
                  endTime: args.endTime,
                  attendees: args.attendees
                });
                break;
              }

              case 'list_calendar_events': {
                logger.info(`[CHAT_SERVICE] Agent ${agentId} listing calendar events`);
                const { googleCalendarService } = await import('./GoogleCalendarService');
                const events = await googleCalendarService.syncUpcomingEvents(userId, args.daysAhead || 7);
                result = { success: true, events };
                break;
              }

              case 'search_drive_files': {
                logger.info(`[CHAT_SERVICE] Agent ${agentId} searching Drive: ${args.query}`);
                const { googleDriveService } = await import('./GoogleDriveService');
                result = await googleDriveService.searchFiles(userId, args.query);
                break;
              }

              case 'create_task': {
                logger.info(`[CHAT_SERVICE] Agent ${agentId} creating task: ${args.title}`);
                const { googleTasksService } = await import('./GoogleTasksService');
                result = await googleTasksService.createTask(userId, {
                  title: args.title,
                  notes: args.notes,
                  due: args.due
                });
                break;
              }

              case 'list_tasks': {
                logger.info(`[CHAT_SERVICE] Agent ${agentId} listing tasks`);
                const { googleTasksService } = await import('./GoogleTasksService');
                result = await googleTasksService.listTasks(userId);
                break;
              }

              case 'read_spreadsheet': {
                logger.info(`[CHAT_SERVICE] Agent ${agentId} reading spreadsheet`);
                const { googleSheetsService } = await import('./GoogleSheetsService');
                result = await googleSheetsService.readRange(userId, args.spreadsheetId, args.range);
                break;
              }

              case 'search_contacts': {
                logger.info(`[CHAT_SERVICE] Agent ${agentId} searching contacts: ${args.query}`);
                const { googleContactsService } = await import('./GoogleContactsService');
                result = await googleContactsService.searchContacts(userId, args.query);
                break;
              }
            }

            // Add tool result to history
            openAIMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            } as any);

          } catch (error: any) {
            logger.error('Tool execution failed:', error);
            openAIMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: false, error: error.message })
            } as any);
          }
        }

        // Get final response after tool execution
        response = await openAIService.generateChatCompletion(openAIMessages as any[], {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: personality.temperature,
          maxTokens: personality.maxTokens
        });
      }

      // Store messages in history
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        agentId,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        agentId,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      }

      const currentHistory = this.chatHistories.get(historyKey)!
      currentHistory.push(userMsg, assistantMsg)

      // Keep only last 50 messages
      if (currentHistory.length > 50) {
        this.chatHistories.set(historyKey, currentHistory.slice(-50))
      }

      return {
        message: response.message,
        model: response.model,
        tokens: response.tokens,
        agentId
      }
    } catch (error) {
      logger.error('Error in sendMessage:', error)

      // Fallback to mock response
      const mockResponse = await this.generateMockResponse(agentId, message, personality)
      return mockResponse
    }
  }

  async getChatHistory(agentId: string, userId: string): Promise<ChatMessage[]> {
    const historyKey = `${userId}-${agentId}`
    return this.chatHistories.get(historyKey) || []
  }

  async clearChatHistory(agentId: string, userId: string): Promise<void> {
    const historyKey = `${userId}-${agentId}`
    this.chatHistories.delete(historyKey)
  }

  // Mock response generator (fallback when OpenAI API is unavailable)
  private async generateMockResponse(
    agentId: string,
    message: string,
    personality: AgentPersonality
  ): Promise<any> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

    // Detect language (German vs English)
    const isGerman = /[äöüßÄÖÜ]|guten|hallo|danke|wie|was|ich|sie/i.test(message)

    const responses: Record<string, string[]> = {
      'agent-001': isGerman ? [
        "Gerne helfe ich Ihnen weiter! Wie kann ich Sie heute unterstützen?",
        "Ich verstehe Ihr Anliegen. Lassen Sie mich das für Sie prüfen und eine Lösung finden.",
        "Vielen Dank für Ihre Nachricht. Ich kümmere mich sofort darum und melde mich in Kürze bei Ihnen zurück.",
        "Das ist eine gute Frage! Ich kann Ihnen dabei helfen. Haben Sie bereits versucht...?",
        "Ich sehe, dass Sie Unterstützung benötigen. Keine Sorge, wir finden gemeinsam eine Lösung!"
      ] : [
        "I'd be happy to help you! How can I assist you today?",
        "I understand your concern. Let me check that for you and find a solution.",
        "Thank you for reaching out. I'm looking into this right away and will get back to you shortly.",
        "That's a great question! I can help you with that. Have you already tried...?",
        "I see you need assistance. Don't worry, we'll find a solution together!"
      ],
      'agent-002': [
        "I can help you draft a comprehensive RFP response. Let me break down the technical requirements and propose our solution architecture.",
        "For this technical proposal, we should highlight our scalability, security features, and integration capabilities. Would you like me to create a detailed specification?",
        "I've analyzed the customer's technical requirements. Our solution aligns well with their needs, particularly in the areas of performance and reliability."
      ],
      'agent-003': [
        "Let's create a compelling campaign! What's your target audience and key message you want to convey?",
        "I can help you generate engaging content for this campaign. Should we focus on thought leadership, product benefits, or customer success stories?",
        "Based on current trends, I recommend a multi-channel approach combining content marketing, social media, and email campaigns."
      ],
      'agent-004': [
        "I'm here to help! Could you provide more details about the issue you're experiencing?",
        "Let me look into that for you. Based on similar cases, this is typically resolved by checking your configuration settings.",
        "Thank you for your patience. I've created a ticket for your issue and our team will investigate further. In the meantime, here's a workaround you can try."
      ],
      'agent-005': [
        "Let's troubleshoot this step by step. First, can you verify that your network connection is stable?",
        "This error typically occurs when... Let me guide you through the resolution process.",
        "I've identified the issue. It's related to your system configuration. Here's how to fix it..."
      ]
    }

    const agentResponses = responses[agentId] || [
      "I understand your question. Let me help you with that.",
      "Thank you for providing that information. Here's what I recommend...",
      "I've processed your request. Based on the data available, I suggest..."
    ]

    const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)]

    return {
      message: randomResponse,
      model: 'mock-model',
      tokens: Math.floor(Math.random() * 500) + 100,
      agentId
    }
  }
}
