"use client";

import { useState } from "react";
import { Clock, User, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityEntry } from "@/types/board";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface TeamActivityProps {
  activities: ActivityEntry[];
  onFilterChange?: (filter: { timeRange: string; user: string }) => void;
}

export function TeamActivity({ activities, onFilterChange }: TeamActivityProps) {
  const [timeRange, setTimeRange] = useState("24h");
  const [selectedUser, setSelectedUser] = useState("all");

  // Get unique users from activities
  const uniqueUsers = Array.from(new Set(activities.map((a) => a.user)));

  const handleFilterChange = (key: string, value: string) => {
    const newTimeRange = key === "timeRange" ? value : timeRange;
    const newUser = key === "user" ? value : selectedUser;

    if (key === "timeRange") setTimeRange(value);
    if (key === "user") setSelectedUser(value);

    onFilterChange?.({ timeRange: newTimeRange, user: newUser });
  };

  // Filter activities based on selected user
  const filteredActivities =
    selectedUser === "all"
      ? activities
      : activities.filter((a) => a.user === selectedUser);

  return (
    <div className="panel p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Team-Aktivität</h2>
          <p className="text-sm text-text-muted mt-1">
            Letzte Änderungen und Statusübergänge
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => handleFilterChange("timeRange", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Letzte Stunde</SelectItem>
              <SelectItem value="24h">Letzte 24h</SelectItem>
              <SelectItem value="7d">Letzte 7 Tage</SelectItem>
              <SelectItem value="30d">Letzte 30 Tage</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedUser} onValueChange={(v) => handleFilterChange("user", v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alle Benutzer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Benutzer</SelectItem>
              {uniqueUsers.map((user) => (
                <SelectItem key={user} value={user}>
                  {user}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="hairline-b" />

      {/* Activity Timeline */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <Filter className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Keine Aktivitäten im ausgewählten Zeitraum</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-3 bg-surface-1 rounded-lg hover:bg-card/5 transition-colors"
            >
              {/* Icon */}
              <div className="p-2 rounded-lg bg-accent/10">
                <User className="h-4 w-4 text-accent" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text">
                  <span className="font-medium">{activity.user}</span>{" "}
                  <span className="text-text-muted">{activity.action}</span>{" "}
                  <span className="font-medium">({activity.target})</span>
                </p>

                {activity.fromStatus && activity.toStatus && (
                  <p className="text-xs text-text-muted mt-1">
                    Status: <span className="mono">{activity.fromStatus}</span> →{" "}
                    <span className="mono">{activity.toStatus}</span>
                  </p>
                )}

                <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Show More Button */}
      {filteredActivities.length > 10 && (
        <div className="text-center">
          <Button className="bg-surface-1 hover:bg-card/10 text-sm">
            Mehr anzeigen
          </Button>
        </div>
      )}
    </div>
  );
}
