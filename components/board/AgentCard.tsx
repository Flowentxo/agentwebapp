"use client";

import { Edit, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BoardCard } from "@/types/board";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface AgentCardProps {
  card: BoardCard;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  isDragging?: boolean;
}

export function AgentCard({
  card,
  onClick,
  onEdit,
  onDelete,
  isDragging = false,
}: AgentCardProps) {
  const badgeVariant = {
    success: "success" as const,
    warning: "warning" as const,
    error: "error" as const,
  };

  const timeAgo = formatDistanceToNow(new Date(card.lastModified), {
    addSuffix: true,
    locale: de,
  });

  return (
    <div
      onClick={onClick}
      className={`panel p-4 cursor-pointer transition-all hover:ring-2 hover:ring-accent/40 focus-ring group ${
        isDragging ? "opacity-50 scale-95" : ""
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Agent Card: ${card.name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text truncate">{card.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={badgeVariant[card.statusBadge]} className="text-xs">
              {card.status}
            </Badge>
            {card.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs text-text-muted bg-card/5 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {card.tags.length > 2 && (
              <span className="text-xs text-text-muted">+{card.tags.length - 2}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            onClick={onEdit}
            className="h-7 w-7 p-0 bg-surface-1 hover:bg-card/10"
            aria-label="Agent bearbeiten"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            onClick={onDelete}
            className="h-7 w-7 p-0 bg-red-500/20 hover:bg-red-500/30 text-red-400"
            aria-label="Agent löschen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-text-muted line-clamp-2 mb-3">{card.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{timeAgo}</span>
        </div>
        <span className="mono">{card.owner}</span>
      </div>
    </div>
  );
}
