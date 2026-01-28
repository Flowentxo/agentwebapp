import { NextResponse } from 'next/server';
import { connectionStore } from '@/lib/studio/connection-store';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const updatedConnection = await connectionStore.update(params.id, body);

        if (!updatedConnection) {
            return NextResponse.json(
                { error: 'Connection not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updatedConnection);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update connection' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const success = await connectionStore.delete(params.id);

        if (!success) {
            return NextResponse.json(
                { error: 'Connection not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to delete connection' },
            { status: 500 }
        );
    }
}
