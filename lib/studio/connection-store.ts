import { DatabaseConnection } from '@/components/studio/ConnectionsManager';

// In a real app, this would be a database table
// For this demo, we'll use a global variable to store connections in memory
// Note: This will reset when the server restarts

let connections: DatabaseConnection[] = [];

export const connectionStore = {
    getAll: async () => {
        return connections;
    },

    getById: async (id: string) => {
        return connections.find(c => c.id === id);
    },

    create: async (connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newConnection: DatabaseConnection = {
            ...connection,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'disconnected'
        };
        connections.push(newConnection);
        return newConnection;
    },

    update: async (id: string, updates: Partial<DatabaseConnection>) => {
        const index = connections.findIndex(c => c.id === id);
        if (index === -1) return null;

        connections[index] = {
            ...connections[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        return connections[index];
    },

    delete: async (id: string) => {
        const index = connections.findIndex(c => c.id === id);
        if (index === -1) return false;

        connections.splice(index, 1);
        return true;
    }
};
