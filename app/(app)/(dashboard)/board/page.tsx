"use client";

import { useState, useEffect } from "react";
import { BoardHeader } from "@/components/board/BoardHeader";
import { StatusColumn } from "@/components/board/StatusColumn";
import { InspectorDrawer } from "@/components/board/InspectorDrawer";
import { TeamActivity } from "@/components/board/TeamActivity";
import { ViewSwitch } from "@/components/board/ViewSwitch";
import { useBoardData } from "@/hooks/useBoardData";
import { useDragDrop } from "@/hooks/useDragDrop";
import { BoardCard, BoardStatus, ViewMode } from "@/types/board";
import { LoadingState } from "@/components/system/LoadingState";
import { ConnectionErrorState } from "@/components/system/EmptyState";

export default function BoardPage() {
  const { data, loading, error, refetch, updateCardStatus, deleteCard } = useBoardData();
  const [selectedCard, setSelectedCard] = useState<BoardCard | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("status");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("board.viewMode");
    if (saved === "status" || saved === "tags") {
      setViewMode(saved);
    }
  }, []);

  // Save view mode to localStorage
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("board.viewMode", mode);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const { handleDragOver, handleDrop } = useDragDrop(updateCardStatus);

  if (loading) {
    return <LoadingState message="Lade Board-Daten..." size="lg" fullScreen />;
  }

  if (error || !data) {
    return <ConnectionErrorState onRetry={refetch} />;
  }

  const statusColumns: Array<{ status: BoardStatus; title: string }> = [
    { status: "active", title: "Active" },
    { status: "pending", title: "Pending" },
    { status: "stopped", title: "Stopped" },
    { status: "archived", title: "Archived" },
  ];

  // Group cards by status
  const cardsByStatus = statusColumns.reduce((acc, { status }) => {
    acc[status] = data.cards.filter((card) => card.status === status);
    return acc;
  }, {} as Record<BoardStatus, BoardCard[]>);

  // Group cards by tags
  const allTags = Array.from(new Set(data.cards.flatMap((card) => card.tags)));
  const cardsByTag = allTags.reduce((acc, tag) => {
    acc[tag] = data.cards.filter((card) => card.tags.includes(tag));
    return acc;
  }, {} as Record<string, BoardCard[]>);

  // Get activity for selected card
  const selectedCardActivity = selectedCard
    ? data.activity.filter((a) => a.target === selectedCard.name)
    : [];

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 space-y-8">
      {/* Header with Stats */}
      <BoardHeader
        stats={data.stats}
        onFilterClick={() => console.log("Filter clicked")}
        onAddClick={() => console.log("Add clicked")}
        onRefreshClick={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* View Switch */}
      <div className="flex items-center justify-between">
        <ViewSwitch currentView={viewMode} onViewChange={handleViewChange} />
        <p className="text-sm text-text-muted">
          {viewMode === "status"
            ? "Ziehen Sie Karten zwischen Spalten zum Statuswechsel"
            : "Gruppiert nach Tags"}
        </p>
      </div>

      {/* Kanban Board - Status View */}
      {viewMode === "status" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {statusColumns.map(({ status, title }) => (
            <StatusColumn
              key={status}
              status={status}
              title={title}
              cards={cardsByStatus[status] || []}
              onCardClick={setSelectedCard}
              onCardEdit={(card, e) => {
                e.stopPropagation();
                setSelectedCard(card);
              }}
              onCardDelete={async (card, e) => {
                e.stopPropagation();
                if (confirm(`"${card.name}" wirklich löschen?`)) {
                  await deleteCard(card.id);
                }
              }}
              onAddClick={() => console.log(`Add to ${status}`)}
              onDrop={(e) => handleDrop(e, status)}
              onDragOver={handleDragOver}
            />
          ))}
        </div>
      )}

      {/* Kanban Board - Tags View */}
      {viewMode === "tags" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {allTags.slice(0, 8).map((tag) => (
            <div key={tag} className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="font-semibold text-text flex items-center gap-2">
                  <span className="text-accent">#</span>
                  {tag}
                </h2>
                <div className="text-xs text-text-muted bg-card/5 px-2 py-1 rounded">
                  {cardsByTag[tag]?.length || 0}
                </div>
              </div>

              <div className="flex-1 space-y-3 min-h-[400px] p-2 rounded-xl bg-surface-0/50 border border-white/5">
                {(cardsByTag[tag] || []).length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center p-6">
                    <p className="text-sm text-text-muted">Keine Karten mit diesem Tag</p>
                  </div>
                ) : (
                  (cardsByTag[tag] || []).map((card) => (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCard(card)}
                      className="panel p-4 cursor-pointer hover:ring-2 hover:ring-accent/40"
                    >
                      <h3 className="font-semibold text-text truncate mb-2">{card.name}</h3>
                      <p className="text-xs text-text-muted capitalize">{card.status}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          {allTags.length === 0 && (
            <div className="col-span-full panel p-8 text-center">
              <p className="text-text-muted">
                Keine Tags gefunden. Fügen Sie Tags zu Ihren Karten hinzu.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Team Activity */}
      <TeamActivity
        activities={data.activity}
        onFilterChange={(filter) => console.log("Filter changed:", filter)}
      />

      {/* Inspector Drawer */}
      <InspectorDrawer
        card={selectedCard}
        activity={selectedCardActivity}
        onClose={() => setSelectedCard(null)}
        onStatusChange={async (newStatus) => {
          if (selectedCard) {
            await updateCardStatus(selectedCard.id, newStatus as BoardStatus);
            setSelectedCard({ ...selectedCard, status: newStatus as BoardStatus });
          }
        }}
        onArchive={async () => {
          if (selectedCard) {
            await updateCardStatus(selectedCard.id, "archived");
            setSelectedCard(null);
          }
        }}
        onDelete={async () => {
          if (selectedCard && confirm(`"${selectedCard.name}" wirklich löschen?`)) {
            await deleteCard(selectedCard.id);
            setSelectedCard(null);
          }
        }}
      />
    </div>
  );
}
