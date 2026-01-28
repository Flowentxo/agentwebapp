import { NextResponse } from 'next/server';
import { connectionStore } from '@/lib/studio/connection-store';

export async function GET() {
    try {
        const connections = await connectionStore.getAll();
        return NextResponse.json({ connections });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch connections' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Basic validation
        if (!body.name || !body.host || !body.database) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const newConnection = await connectionStore.create(body);
        return NextResponse.json(newConnection, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create connection' },
            { status: 500 }
        );
    }
}
