import { useCallback } from "react";
import { BoardCard, BoardStatus } from "@/types/board";

export function useDragDrop(onStatusChange: (cardId: string, newStatus: BoardStatus) => Promise<void>) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStatus: BoardStatus) => {
      e.preventDefault();

      try {
        const cardData = e.dataTransfer.getData("application/json");
        if (!cardData) return;

        const card: BoardCard = JSON.parse(cardData);

        // Don't update if dropping in the same column
        if (card.status === targetStatus) return;

        await onStatusChange(card.id, targetStatus);
      } catch (err) {
        console.error("Failed to handle drop:", err);
      }
    },
    [onStatusChange]
  );

  return {
    handleDragOver,
    handleDrop,
  };
}
