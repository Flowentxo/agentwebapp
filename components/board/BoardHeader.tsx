"use client";

import { Activity, AlertTriangle, CheckCircle, XCircle, Filter, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoardStats } from "@/types/board";

interface BoardHeaderProps {
  stats: BoardStats;
  onFilterClick: () => void;
  onAddClick: () => void;
  onRefreshClick: () => void;
  isRefreshing?: boolean;
}

export function BoardHeader({
  stats,
  onFilterClick,
  onAddClick,
  onRefreshClick,
  isRefreshing = false,
}: BoardHeaderProps) {
  const quickStats = [
    {
      label: "Aktive Agents",
      value: stats.activeAgents,
      icon: Activity,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Inaktive Agents",
      value: stats.inactiveAgents,
      icon: XCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted/500/10",
    },
    {
      label: "Incidents (24h)",
      value: stats.incidents24h,
      icon: AlertTriangle,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "Erfolgsquote",
      value: `${stats.successRate}%`,
      icon: CheckCircle,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 id="page-title" className="text-xl md:text-2xl font-semibold text-text">
            Operations Board
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Verwalten und überwachen Sie aktive Agents, Aufgaben und Status
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onFilterClick}
            className="bg-surface-1 hover:bg-card/10"
            aria-label="Filter öffnen"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button
            onClick={onAddClick}
            className="bg-accent/20 hover:bg-accent/30 text-accent"
            aria-label="Neuer Task oder Agent"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neu
          </Button>
          <Button
            onClick={onRefreshClick}
            disabled={isRefreshing}
            className="bg-surface-1 hover:bg-card/10"
            aria-label="Board aktualisieren"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="panel p-4 flex items-center gap-4"
              role="region"
              aria-label={`${stat.label}: ${stat.value}`}
            >
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-text-muted">{stat.label}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
