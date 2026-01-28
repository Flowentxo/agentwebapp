import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// ============================================================================
// API KEY VALIDATION ROUTE
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Basic format validation
    if (!apiKey.startsWith('sk-') || apiKey.length < 40) {
      return NextResponse.json(
        { valid: false, error: 'Invalid API key format' },
        { status: 400 }
      );
    }

    // Test the API key with a minimal request
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        return NextResponse.json({ valid: true });
      }

      if (response.status === 401) {
        return NextResponse.json(
          { valid: false, error: 'Invalid API key' },
          { status: 401 }
        );
      }

      if (response.status === 429) {
        // Rate limited but key is valid
        return NextResponse.json({ valid: true, warning: 'Rate limited' });
      }

      return NextResponse.json(
        { valid: false, error: 'Could not validate API key' },
        { status: response.status }
      );
    } catch (fetchError) {
      // Network error - assume format is valid
      return NextResponse.json({ valid: true, warning: 'Could not verify with OpenAI' });
    }
  } catch (error) {
    console.error('[VALIDATE_KEY_ERROR]', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}
