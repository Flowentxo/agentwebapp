
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AnalyticsUpdateEvent {
  dashboardId: string;
  data: {
    agentId: string;
    metrics: any;
    timestamp: string;
  };
}

let socket: Socket | null = null;

export function useAnalyticsSocket(dashboardId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 1. Initialize Socket Connection (Singleton-ish)
    if (!socket) {
      const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
      
      socket = io(`${SOCKET_URL}/v1`, {
        path: '/socket.io/',
        withCredentials: true,
        transports: ['websocket', 'polling'] 
      });

      socket.on('connect', () => {
        console.log('[AnalyticsSocket] Connected:', socket?.id);
      });

      socket.on('connect_error', (err) => {
        console.warn('[AnalyticsSocket] Connection Error:', err);
      });
    }

    // 2. Subscribe to Dashboad Room
    if (socket.connected) {
      socket.emit('subscribe:analytics', dashboardId);
    } else {
      socket.on('connect', () => {
        socket?.emit('subscribe:analytics', dashboardId);
      });
    }

    // 3. Listen for Updates
    const handleUpdate = (event: AnalyticsUpdateEvent) => {
      console.log('[AnalyticsSocket] Received Update:', event);
      
      // Optimistic UI Update via React Query
      queryClient.setQueryData(['analytics-dashboard', dashboardId], (oldData: any) => {
        if (!oldData) return oldData;
        
        // Example: Increment "Total Executions" if validation passes
        // Ideally, we'd deep merge or re-fetch. 
        // For MVP "Magic Moment", we show a toast and invalidate to re-fetch.
        
        return oldData;
      });

      // Trigger a soft re-fetch to get accurate aggregated data
      queryClient.invalidateQueries({ queryKey: ['analytics-dashboard', dashboardId] });
      
      // Notify User
      toast.success('New Agent Activity Detected', {
        description: `Agent ${event.data.agentId} just finished a task.`
      });
    };

    socket.on('analytics:update', handleUpdate);

    // 4. Cleanup
    return () => {
      socket?.emit('unsubscribe:analytics', dashboardId);
      socket?.off('analytics:update', handleUpdate);
    };
  }, [dashboardId, queryClient]);

  return socket;
}
