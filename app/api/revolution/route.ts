import { NextRequest, NextResponse } from 'next/server';
import { agentBuilder } from '@/server/services/AgentBuilderService';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/auth/session';
import { z } from 'zod';

// Input validation schema
const AgentCreationSchema = z.object({
  request: z.string().min(5, 'Request must be at least 5 characters long').max(1000, 'Request cannot exceed 1000 characters'),
  preferences: z.object({
    personality: z.enum(['professional', 'friendly', 'technical', 'creative']).optional(),
    learningMode: z.enum(['static', 'adaptive', 'evolutionary']).optional(),
    collaborationStyle: z.enum(['independent', 'team-oriented', 'hybrid']).optional()
  }).optional(),
  context: z.object({
    currentWorkflow: z.string().optional(),
    existingIntegrations: z.array(z.string()).optional(),
    industry: z.string().optional()
  }).optional()
});

// Response interfaces
interface AgentCreationResponse {
  success: boolean;
  agent?: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    blueprint: {
      name: string;
      title: string;
      description: string;
      purpose: string;
      skills: string[];
      integrations: string[];
      personality: any;
      reasoningStyle: string;
    };
    metadata: {
      processingTime: number;
      userId: string;
      requestComplexity: 'simple' | 'moderate' | 'complex';
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Intelligent request analyzer
class RequestAnalyzer {
  private static complexityKeywords = {
    simple: ['basic', 'simple', 'easy', 'quick', 'just', 'help', 'assist'],
    moderate: ['analyze', 'manage', 'track', 'monitor', 'organize', 'automate'],
    complex: ['integrate', 'orchestrate', 'coordinate', 'strategic', 'comprehensive', 'enterprise', 'scalable']
  };

  private static domainKeywords = {
    crm: ['customer', 'sales', 'lead', 'client', 'relationship', 'pipeline'],
    data: ['analytics', 'report', 'dashboard', 'metrics', 'insights', 'visualization'],
    communication: ['email', 'message', 'notification', 'chat', 'social', 'marketing'],
    automation: ['workflow', 'task', 'process', 'schedule', 'reminder', 'trigger'],
    technical: ['api', 'database', 'integration', 'system', 'code', 'development']
  };

  static analyzeRequest(request: string): {
    complexity: 'simple' | 'moderate' | 'complex';
    domains: string[];
    suggestedCapabilities: string[];
    estimatedProcessingTime: number;
  } {
    const lowerRequest = request.toLowerCase();
    
    // Determine complexity
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (this.complexityKeywords.complex.some(keyword => lowerRequest.includes(keyword))) {
      complexity = 'complex';
    } else if (this.complexityKeywords.moderate.some(keyword => lowerRequest.includes(keyword))) {
      complexity = 'moderate';
    }

    // Identify domains
    const domains = Object.entries(this.domainKeywords)
      .filter(([_, keywords]) => keywords.some(keyword => lowerRequest.includes(keyword)))
      .map(([domain]) => domain);

    // Suggest capabilities based on request
    const suggestedCapabilities = this.extractCapabilities(lowerRequest);

    // Estimate processing time based on complexity
    const baseTime = complexity === 'simple' ? 8000 : complexity === 'moderate' ? 12000 : 18000;
    const estimatedProcessingTime = baseTime + (domains.length * 2000);

    return {
      complexity,
      domains: domains.length > 0 ? domains : ['general'],
      suggestedCapabilities,
      estimatedProcessingTime
    };
  }

  private static extractCapabilities(request: string): string[] {
    const capabilities = [];
    
    if (request.includes('email') || request.includes('message')) capabilities.push('Email Management');
    if (request.includes('schedule') || request.includes('calendar')) capabilities.push('Calendar Integration');
    if (request.includes('report') || request.includes('analytics')) capabilities.push('Report Generation');
    if (request.includes('remind') || request.includes('alert')) capabilities.push('Notification System');
    if (request.includes('track') || request.includes('monitor')) capabilities.push('Data Tracking');
    if (request.includes('automate') || request.includes('workflow')) capabilities.push('Process Automation');
    
    return capabilities.length > 0 ? capabilities : ['Task Management'];
  }
}

// Rate limiting check
function checkRateLimit(userId: string): { allowed: boolean; remainingRequests: number; resetTime: number } {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + 60000 // 1 minute window
    });
    return { allowed: true, remainingRequests: 9, resetTime: now + 60000 };
  }
  
  if (userLimit.count >= 10) {
    return { allowed: false, remainingRequests: 0, resetTime: userLimit.resetTime };
  }
  
  userLimit.count++;
  return { allowed: true, remainingRequests: 10 - userLimit.count, resetTime: userLimit.resetTime };
}

// Handle both GET (UI) and POST (API) requests to /revolution
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.info(`[REVOLUTION GET] Request from ${request.headers.get('x-forwarded-for') || 'unknown IP'}`);
    
    // Enhanced security headers for UI access
    const response = NextResponse.redirect(new URL('/revolution', request.url));
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    const processingTime = Date.now() - startTime;
    logger.info(`[REVOLUTION GET] UI served successfully in ${processingTime}ms`);
    
    return response;
    
  } catch (error: any) {
    logger.error('[REVOLUTION GET] Failed to serve UI:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'UI_SERVICE_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId = 'anonymous';
  
  try {
    // Extract user information
    const sessionData = await getSession();
    userId = sessionData?.user?.id || request.headers.get('x-user-id') || 'anonymous';
    
    logger.info(`[REVOLUTION POST] Agent creation request from user: ${userId}`);
    
    // Rate limiting check
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      logger.warn(`[REVOLUTION POST] Rate limit exceeded for user: ${userId}`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            details: {
              resetTime: new Date(rateLimit.resetTime).toISOString(),
              remainingRequests: rateLimit.remainingRequests
            }
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimit.remainingRequests.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString()
          }
        }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = AgentCreationSchema.safeParse(body);
    
    if (!validation.success) {
      logger.warn(`[REVOLUTION POST] Invalid request format from user: ${userId}`, validation.error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request format',
            details: validation.error.errors
          }
        },
        { status: 400 }
      );
    }
    
    const { request: agentRequest, preferences, context } = validation.data;
    
    // Analyze request complexity and domains
    const analysis = RequestAnalyzer.analyzeRequest(agentRequest);
    logger.info(`[REVOLUTION POST] Request analysis:`, {
      complexity: analysis.complexity,
      domains: analysis.domains,
      estimatedTime: analysis.estimatedProcessingTime
    });
    
    // Enhanced agent creation with context
    const enhancedRequest = `
Original Request: ${agentRequest}

Context Information:
- User Industry: ${context?.industry || 'Not specified'}
- Current Workflow: ${context?.currentWorkflow || 'Standard operations'}
- Existing Integrations: ${context?.existingIntegrations?.join(', ') || 'None specified'}

User Preferences:
- Personality: ${preferences?.personality || 'Adaptive based on request'}
- Learning Mode: ${preferences?.learningMode || 'Adaptive'}
- Collaboration Style: ${preferences?.collaborationStyle || 'Hybrid'}

Analysis Results:
- Complexity: ${analysis.complexity}
- Identified Domains: ${analysis.domains.join(', ')}
- Suggested Capabilities: ${analysis.suggestedCapabilities.join(', ')}

Please create a comprehensive agent that addresses the original request while incorporating the context and preferences above.
    `.trim();
    
    logger.info(`[REVOLUTION POST] Starting enhanced agent creation for user: ${userId}`);
    
    // Create agent with enhanced request
    const agentInstance = await agentBuilder.createAgent(userId, enhancedRequest);
    
    const processingTime = Date.now() - startTime;
    
    // Prepare comprehensive response
    const response: AgentCreationResponse = {
      success: true,
      agent: {
        id: agentInstance.id,
        name: 'Custom AI Agent',
        status: agentInstance.status,
        createdAt: agentInstance.createdAt?.toISOString() || new Date().toISOString(),
        blueprint: {
          name: 'Custom Agent',
          title: 'AI Assistant',
          description: agentRequest,
          purpose: `AI agent designed for: ${agentRequest}`,
          skills: analysis.suggestedCapabilities,
          integrations: context?.existingIntegrations || [],
          personality: {
            voice: preferences?.personality || 'adaptive',
            traits: ['Helpful', 'Efficient', 'Adaptive', 'Reliable']
          },
          reasoningStyle: 'balanced'
        },
        metadata: {
          processingTime,
          userId,
          requestComplexity: analysis.complexity
        }
      }
    };
    
    logger.info(`[REVOLUTION POST] Agent created successfully:`, {
      agentId: agentInstance.id,
      userId,
      processingTime,
      complexity: analysis.complexity,
      domains: analysis.domains
    });
    
    // Return success response with rate limit headers
    return NextResponse.json(response, {
      status: 201,
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': rateLimit.remainingRequests.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString(),
        'X-Processing-Time': processingTime.toString()
      }
    });
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    logger.error('[REVOLUTION POST] Agent creation failed:', {
      userId,
      error: error.message,
      stack: error.stack,
      processingTime
    });
    
    // Determine appropriate error response
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'An unexpected error occurred';
    
    if (error.message.includes('OpenAI')) {
      statusCode = 503;
      errorCode = 'AI_SERVICE_UNAVAILABLE';
      errorMessage = 'AI service temporarily unavailable';
    } else if (error.message.includes('database') || error.message.includes('connection')) {
      statusCode = 503;
      errorCode = 'DATABASE_ERROR';
      errorMessage = 'Database service unavailable';
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      errorMessage = 'Invalid request data';
    }
    
    const errorResponse: AgentCreationResponse = {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: {
          processingTime,
          userId,
          timestamp: new Date().toISOString()
        }
      }
    };
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}