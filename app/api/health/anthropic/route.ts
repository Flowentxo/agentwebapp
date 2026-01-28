import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health/anthropic
 * Test Anthropic API connectivity and return detailed status
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        status: 'not-configured',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {
          configured: false,
          message: 'Anthropic API key not found in environment variables'
        },
        recommendations: [
          'Set ANTHROPIC_API_KEY environment variable',
          'Verify API key format',
          'Check API key permissions and billing status'
        ]
      }, { status: 200 });
    }

    // Test Anthropic API connectivity
    const anthropic = new Anthropic({ apiKey });
    
    const connectivityTestStart = Date.now();
    
    // Test a simple message creation (lightweight test)
    const messageResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [
        { role: 'user', content: 'Say "health check test successful" if you receive this.' }
      ],
    });
    const messageTestTime = Date.now() - connectivityTestStart;
    
    const responseTime = Date.now() - startTime;
    
    // Validate response
    const content = messageResponse.content[0].type === 'text' ? messageResponse.content[0].text : '';
    const isValidResponse = content.toLowerCase().includes('health check test successful');
    
    const recommendations: string[] = [];
    if (!isValidResponse) {
      recommendations.push('Check Anthropic API response format');
    }
    
    if (messageTestTime > 5000) {
      recommendations.push('Consider Anthropic API latency monitoring');
    }

    const healthData = {
      status: isValidResponse ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime,
      details: {
        configured: true,
        keyPreview: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`,
        model: messageResponse.model,
        tests: {
          messageCreation: {
            status: isValidResponse ? 'passed' : 'failed',
            latency: messageTestTime,
            endpoint: 'POST /v1/messages',
            model: messageResponse.model,
            inputTokens: messageResponse.usage?.input_tokens || 0,
            outputTokens: messageResponse.usage?.output_tokens || 0,
            totalTokens: (messageResponse.usage?.input_tokens || 0) + (messageResponse.usage?.output_tokens || 0),
            responseContent: content.substring(0, 100)
          }
        }
      },
      recommendations
    };

    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    return NextResponse.json(healthData, { status: statusCode });
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Determine error type and provide specific recommendations
    let errorType = 'unknown';
    let recommendations: string[] = [];
    
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorType = 'authentication';
      recommendations = [
        'Verify Anthropic API key is correct',
        'Check API key permissions and billing status',
        'Ensure API key format is valid'
      ];
    } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      errorType = 'rate-limiting';
      recommendations = [
        'Implement rate limiting for Anthropic requests',
        'Consider upgrading Anthropic plan for higher limits',
        'Add exponential backoff for retries'
      ];
    } else if (error.message?.includes('timeout')) {
      errorType = 'timeout';
      recommendations = [
        'Check network connectivity to Anthropic',
        'Increase timeout settings',
        'Consider Anthropic API latency monitoring'
      ];
    } else if (error.message?.includes('529') || error.message?.includes('overloaded')) {
      errorType = 'overloaded';
      recommendations = [
        'Anthropic API is currently overloaded',
        'Implement retry logic with exponential backoff',
        'Consider fallback to other AI providers'
      ];
    } else if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
      errorType = 'network';
      recommendations = [
        'Check internet connectivity',
        'Verify no firewall blocking Anthropic API',
        'Test Anthropic API from different network'
      ];
    } else {
      errorType = 'api-error';
      recommendations = [
        'Check Anthropic API documentation for error details',
        'Review Anthropic API status page',
        'Consider implementing retry logic with exponential backoff'
      ];
    }

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      error: {
        message: error.message,
        type: errorType
      },
      details: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        apiKeyPreview: process.env.ANTHROPIC_API_KEY ? 
          `${process.env.ANTHROPIC_API_KEY.substring(0, 8)}...${process.env.ANTHROPIC_API_KEY.substring(process.env.ANTHROPIC_API_KEY.length - 4)}` : 
          'not-configured'
      },
      recommendations
    }, { status: 503 });
  }
}