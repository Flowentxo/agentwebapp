"use client";

import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BoardCard, BoardStatus } from "@/types/board";
import { AgentCard } from "./AgentCard";

interface StatusColumnProps {
  status: BoardStatus;
  title: string;
  cards: BoardCard[];
  onCardClick: (card: BoardCard) => void;
  onCardEdit: (card: BoardCard, e: React.MouseEvent) => void;
  onCardDelete: (card: BoardCard, e: React.MouseEvent) => void;
  onAddClick: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
}

const statusColors: Record<BoardStatus, string> = {
  active: "bg-green-500/10 text-green-400",
  pending: "bg-yellow-500/10 text-yellow-400",
  stopped: "bg-red-500/10 text-red-400",
  archived: "bg-muted/500/10 text-muted-foreground",
};

export function StatusColumn({
  status,
  title,
  cards,
  onCardClick,
  onCardEdit,
  onCardDelete,
  onAddClick,
  onDrop,
  onDragOver,
}: StatusColumnProps) {
  return (
    <div
      className="flex flex-col h-full"
      data-status={status}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-text">{title}</h2>
          <Badge className={statusColors[status]}>{cards.length}</Badge>
        </div>
        <Button
          onClick={onAddClick}
          className="h-7 w-7 p-0 bg-surface-1 hover:bg-card/10"
          aria-label={`Neuer Task in ${title}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Cards Container */}
      <div
        className="flex-1 space-y-3 min-h-[400px] p-2 rounded-xl bg-surface-0/50 border border-white/5"
        role="list"
        aria-label={`${title} column`}
      >
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="text-text-muted mb-3">
              <svg
                className="h-12 w-12 mx-auto mb-2 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm font-medium">Keine Einträge</p>
              <p className="text-xs mt-1">Ziehen Sie eine Karte hierher oder</p>
            </div>
            <Button
              onClick={onAddClick}
              className="bg-surface-1 hover:bg-card/10 text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neuen Task hinzufügen
            </Button>
          </div>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("application/json", JSON.stringify(card));
              }}
              role="listitem"
            >
              <AgentCard
                card={card}
                onClick={() => onCardClick(card)}
                onEdit={(e) => onCardEdit(card, e)}
                onDelete={(e) => onCardDelete(card, e)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
