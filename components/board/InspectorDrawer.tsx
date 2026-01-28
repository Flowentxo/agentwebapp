"use client";

import { useState } from "react";
import { X, Activity, BarChart3, User, Clock, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BoardCard, ActivityEntry } from "@/types/board";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface InspectorDrawerProps {
  card: BoardCard | null;
  activity: ActivityEntry[];
  onClose: () => void;
  onStatusChange: (newStatus: string) => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function InspectorDrawer({
  card,
  activity,
  onClose,
  onStatusChange,
  onArchive,
  onDelete,
}: InspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!card) return null;

  const badgeVariant = {
    success: "success" as const,
    warning: "warning" as const,
    error: "error" as const,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-surface-0 border-l border-white/10 z-50 overflow-y-auto animate-in slide-in-from-right"
        role="dialog"
        aria-labelledby="drawer-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface-0 border-b border-white/10 p-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 id="drawer-title" className="text-lg font-semibold text-text truncate">
                {card.name}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={badgeVariant[card.statusBadge]}>
                  {card.status}
                </Badge>
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-text-muted bg-card/5 px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <Button
              onClick={onClose}
              className="h-8 w-8 p-0 bg-surface-1 hover:bg-card/10"
              aria-label="Drawer schließen"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview" current={activeTab} onClick={setActiveTab}>
                Übersicht
              </TabsTrigger>
              <TabsTrigger value="activity" current={activeTab} onClick={setActiveTab}>
                Aktivität
              </TabsTrigger>
              <TabsTrigger value="metrics" current={activeTab} onClick={setActiveTab}>
                Metriken
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent when="overview" current={activeTab}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-muted">Beschreibung</label>
                  <p className="mt-1 text-text">{card.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-muted flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Owner
                    </label>
                    <p className="mt-1 text-text mono">{card.owner}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-text-muted flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Letzte Änderung
                    </label>
                    <p className="mt-1 text-text">
                      {formatDistanceToNow(new Date(card.lastModified), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-muted">Status ändern</label>
                  <div className="flex gap-2 mt-2">
                    {["active", "pending", "stopped", "archived"].map((status) => (
                      <Button
                        key={status}
                        onClick={() => onStatusChange(status)}
                        disabled={card.status === status}
                        className={`flex-1 text-sm ${
                          card.status === status
                            ? "bg-accent/20 text-accent"
                            : "bg-surface-1 hover:bg-card/10"
                        }`}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent when="activity" current={activeTab}>
              <div className="space-y-3">
                {activity.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-8">
                    Keine Aktivitäten vorhanden
                  </p>
                ) : (
                  activity.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 bg-surface-1 rounded-lg"
                    >
                      <Activity className="h-4 w-4 text-accent mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text">
                          <span className="font-medium">{entry.user}</span> {entry.action}
                        </p>
                        {entry.fromStatus && entry.toStatus && (
                          <p className="text-xs text-text-muted mt-1">
                            {entry.fromStatus} → {entry.toStatus}
                          </p>
                        )}
                        <p className="text-xs text-text-muted mt-1">
                          {formatDistanceToNow(new Date(entry.timestamp), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent when="metrics" current={activeTab}>
              {card.metrics ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="panel p-4">
                    <div className="flex items-center gap-2 text-text-muted mb-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-sm">Erfolgsrate</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">
                      {card.metrics.successRate}%
                    </p>
                  </div>

                  <div className="panel p-4">
                    <div className="flex items-center gap-2 text-text-muted mb-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-sm">Fehlerquote</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">
                      {card.metrics.errorRate}%
                    </p>
                  </div>

                  <div className="panel p-4">
                    <div className="flex items-center gap-2 text-text-muted mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Laufzeit</span>
                    </div>
                    <p className="text-2xl font-bold text-text">
                      {card.metrics.runtime}ms
                    </p>
                  </div>

                  <div className="panel p-4">
                    <div className="flex items-center gap-2 text-text-muted mb-2">
                      <Activity className="h-4 w-4" />
                      <span className="text-sm">Requests</span>
                    </div>
                    <p className="text-2xl font-bold text-text">
                      {card.metrics.requests.toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-muted text-center py-8">
                  Keine Metriken verfügbar
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-surface-0 border-t border-white/10 p-6">
          <div className="flex items-center gap-3">
            <Button
              onClick={onArchive}
              className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archivieren
            </Button>
            <Button
              onClick={onDelete}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
