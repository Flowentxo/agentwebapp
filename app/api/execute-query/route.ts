import { NextResponse } from 'next/server';
import { connectionStore } from '@/lib/studio/connection-store';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { connectionId, query, parameters } = body;

        if (!connectionId || !query) {
            return NextResponse.json(
                { error: 'Missing connectionId or query' },
                { status: 400 }
            );
        }

        const connection = await connectionStore.getById(connectionId);
        if (!connection) {
            return NextResponse.json(
                { error: 'Connection not found' },
                { status: 404 }
            );
        }

        // Simulate query execution
        // In a real app, this would use a DB driver to execute the query

        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

        // Mock results based on query type
        const isSelect = query.trim().toUpperCase().startsWith('SELECT');

        if (isSelect) {
            return NextResponse.json({
                success: true,
                data: [
                    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
                    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
                    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user' }
                ],
                rowCount: 3,
                durationMs: Math.round(Math.random() * 100),
                fromCache: false
            });
        } else {
            return NextResponse.json({
                success: true,
                data: [],
                rowCount: 1,
                durationMs: Math.round(Math.random() * 100),
                fromCache: false
            });
        }

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to execute query' },
            { status: 500 }
        );
    }
}
