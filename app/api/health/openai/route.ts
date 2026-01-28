import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health/openai
 * Test OpenAI API connectivity and return detailed status
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        status: 'not-configured',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {
          configured: false,
          message: 'OpenAI API key not found in environment variables'
        },
        recommendations: [
          'Set OPENAI_API_KEY environment variable',
          'Verify API key format (should start with sk-)',
          'Check API key permissions and billing status'
        ]
      }, { status: 200 });
    }

    // Test OpenAI API connectivity
    const openai = new OpenAI({ apiKey });
    
    const connectivityTestStart = Date.now();
    
    // Test models list endpoint
    const models = await openai.models.list();
    const modelsListTime = Date.now() - connectivityTestStart;
    
    // Test a simple chat completion (lightweight test)
    const chatTestStart = Date.now();
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Say "health check test successful" if you receive this.' }
      ],
      max_tokens: 10,
    });
    const chatTestTime = Date.now() - chatTestStart;
    
    const responseTime = Date.now() - startTime;
    
    // Validate response
    const chatContent = chatResponse.choices[0]?.message?.content || '';
    const isValidResponse = chatContent.toLowerCase().includes('health check test successful');
    
    const recommendations: string[] = [];
    if (!isValidResponse) {
      recommendations.push('Check OpenAI API response format');
    }
    
    if (chatTestTime > 5000) {
      recommendations.push('Consider OpenAI API latency monitoring');
    }

    const healthData = {
      status: isValidResponse ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime,
      details: {
        configured: true,
        keyPreview: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`,
        modelsAvailable: models.data.length,
        sampleModels: models.data.slice(0, 5).map(m => m.id),
        tests: {
          modelsList: {
            status: 'passed',
            latency: modelsListTime,
            endpoint: 'GET /v1/models'
          },
          chatCompletion: {
            status: isValidResponse ? 'passed' : 'failed',
            latency: chatTestTime,
            endpoint: 'POST /v1/chat/completions',
            model: chatResponse.model,
            tokensUsed: chatResponse.usage?.total_tokens || 0,
            responseContent: chatContent.substring(0, 100)
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
        'Verify OpenAI API key is correct',
        'Check API key permissions and billing status',
        'Ensure API key format is valid (starts with sk-)'
      ];
    } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      errorType = 'rate-limiting';
      recommendations = [
        'Implement rate limiting for OpenAI requests',
        'Consider upgrading OpenAI plan for higher limits',
        'Add exponential backoff for retries'
      ];
    } else if (error.message?.includes('timeout')) {
      errorType = 'timeout';
      recommendations = [
        'Check network connectivity to OpenAI',
        'Increase timeout settings',
        'Consider OpenAI API latency monitoring'
      ];
    } else if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
      errorType = 'network';
      recommendations = [
        'Check internet connectivity',
        'Verify no firewall blocking OpenAI API',
        'Test OpenAI API from different network'
      ];
    } else {
      errorType = 'api-error';
      recommendations = [
        'Check OpenAI API documentation for error details',
        'Review OpenAI API status page',
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
        configured: !!process.env.OPENAI_API_KEY,
        apiKeyPreview: process.env.OPENAI_API_KEY ? 
          `${process.env.OPENAI_API_KEY.substring(0, 8)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}` : 
          'not-configured'
      },
      recommendations
    }, { status: 503 });
  }
}