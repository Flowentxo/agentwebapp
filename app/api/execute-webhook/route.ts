import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url, method, headers, payload, auth } = body;

        if (!url || !method) {
            return NextResponse.json(
                { error: 'Missing url or method' },
                { status: 400 }
            );
        }

        // Simulate webhook execution
        // In a real app, this would use fetch to call the external URL

        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 800));

        // Mock success
        return NextResponse.json({
            success: true,
            statusCode: 200,
            data: {
                message: 'Webhook received successfully',
                receivedData: payload,
                timestamp: new Date().toISOString()
            },
            durationMs: Math.round(Math.random() * 500),
            retryCount: 0
        });

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to execute webhook' },
            { status: 500 }
        );
    }
}
