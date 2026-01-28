"use client";

import { FileText, Clock, AlertCircle, Tag, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KnowledgeStats, KnowledgeEntry } from "@/types/knowledge";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface KnowledgeDashboardProps {
  stats: KnowledgeStats;
  recentEntries: KnowledgeEntry[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function KnowledgeDashboard({
  stats,
  recentEntries,
  onView,
  onEdit,
  onDelete,
}: KnowledgeDashboardProps) {
  const kpiCards = [
    {
      label: "Gesamt-Einträge",
      value: stats.totalEntries,
      icon: FileText,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "Letzte Änderungen (24h)",
      value: stats.recentChanges24h,
      icon: Clock,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Genehmigungen ausstehend",
      value: stats.pendingApprovals,
      icon: AlertCircle,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "Beliebteste Tags",
      value: stats.popularTags.length > 0 ? stats.popularTags[0].tag : "—",
      icon: Tag,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: "default" as const, label: "Entwurf" },
      in_review: { variant: "warning" as const, label: "In Prüfung" },
      published: { variant: "success" as const, label: "Veröffentlicht" },
      archived: { variant: "error" as const, label: "Archiviert" },
    };
    return variants[status as keyof typeof variants] || variants.draft;
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="panel p-5" role="region" aria-label={kpi.label}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${kpi.bgColor}`}>
                  <Icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-muted truncate">{kpi.label}</p>
                  <p className="text-2xl font-bold text-text truncate">{kpi.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Entries Table */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-text">Zuletzt geändert</h2>
            <p className="text-sm text-text-muted mt-1">
              Die neuesten Änderungen an Wissenseinträgen
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Titel
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Autor
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Aktualisiert
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-text-muted">
                    Keine Einträge vorhanden
                  </td>
                </tr>
              ) : (
                recentEntries.map((entry) => {
                  const badge = getStatusBadge(entry.status);
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-white/5 hover:bg-card/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-text">{entry.title}</span>
                          {entry.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {entry.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs text-text-muted bg-card/5 px-2 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {entry.tags.length > 2 && (
                                <span className="text-xs text-text-muted">
                                  +{entry.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-text mono">{entry.author}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-text-muted">
                          {formatDistanceToNow(new Date(entry.updatedAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => onView(entry.id)}
                            className="h-8 w-8 p-0 bg-surface-1 hover:bg-card/10"
                            aria-label="Anzeigen"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => onEdit(entry.id)}
                            className="h-8 w-8 p-0 bg-surface-1 hover:bg-card/10"
                            aria-label="Bearbeiten"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => onDelete(entry.id)}
                            className="h-8 w-8 p-0 bg-red-500/20 hover:bg-red-500/30 text-red-400"
                            aria-label="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
