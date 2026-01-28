import { useState, useEffect, useCallback } from "react";
import { BoardData, BoardCard, BoardStatus } from "@/types/board";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export function useBoardData() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [boardRes, activityRes] = await Promise.all([
        fetch(`${API_BASE}/api/board`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/board/activity?since=24h`, { credentials: 'include' }),
      ]);

      if (!boardRes.ok || !activityRes.ok) {
        throw new Error("Failed to fetch board data");
      }

      const boardData = await boardRes.json();
      const activityData = await activityRes.json();

      setData({
        cards: boardData.cards || [],
        stats: boardData.stats || {
          activeAgents: 0,
          inactiveAgents: 0,
          incidents24h: 0,
          successRate: 0,
        },
        activity: activityData.activities || [],
      });
    } catch (err) {
      console.error("Failed to fetch board data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateCardStatus = useCallback(
    async (cardId: string, newStatus: BoardStatus) => {
      try {
        const res = await fetch(`${API_BASE}/api/board/${cardId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) {
          throw new Error("Failed to update card status");
        }

        // Optimistically update local state
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            cards: prev.cards.map((card) =>
              card.id === cardId ? { ...card, status: newStatus } : card
            ),
          };
        });

        // Refresh to get updated activity log
        await fetchData();
      } catch (err) {
        console.error("Failed to update card status:", err);
        throw err;
      }
    },
    [fetchData]
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      try {
        const res = await fetch(`${API_BASE}/api/board/${cardId}`, {
          method: "DELETE",
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error("Failed to delete card");
        }

        // Optimistically update local state
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            cards: prev.cards.filter((card) => card.id !== cardId),
          };
        });

        await fetchData();
      } catch (err) {
        console.error("Failed to delete card:", err);
        throw err;
      }
    },
    [fetchData]
  );

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    updateCardStatus,
    deleteCard,
  };
}
