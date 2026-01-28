"use client";

import { useState, useRef } from "react";
import type { Automation } from "@/lib/automations/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Play } from "lucide-react";

export default function AutomationCard({
  item,
  onToggle,
  onRunNow,
  onDelete,
}: {
  item: Automation;
  onToggle: (enabled: boolean) => void;
  onRunNow: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const handleDeleteClick = () => {
    setConfirm(true);
    setTimeout(() => confirmBtnRef.current?.focus(), 100);
  };

  return (
    <Card
      data-testid="automation-card"
      className="edge transition-transform duration-200 hover:-translate-y-[2px] relative"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-[15px] font-semibold text-white/90">
              {item.title}
            </h3>
            <p className="text-[13px] text-white/60">
              Agent: <span className="text-white/80">{item.action.agentId}</span>
            </p>
            <p className="text-[13px] text-white/60">
              Schedule:{" "}
              <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[12px] text-white/70">
                {item.schedule}
              </code>
            </p>
            <p className="text-[12px] text-white/50">
              Last run:{" "}
              {item.lastRunAt
                ? new Date(item.lastRunAt).toLocaleString()
                : "—"}
            </p>

            {/* Enabled Toggle (not a primary CTA) */}
            <div className="flex items-center gap-2">
              <input
                id={`enabled-${item.id}`}
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => onToggle(e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-white/20 bg-black/30 accent-[hsl(var(--primary))]"
              />
              <label
                htmlFor={`enabled-${item.id}`}
                className="text-[13px] text-white/70"
              >
                Enabled
              </label>
            </div>
          </div>

          {/* PRIMARY CTA: Run now */}
          <button
            data-testid="primary-cta"
            className="flex items-center gap-1.5 shrink-0 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-[13px] font-medium text-white hover:brightness-110 transition"
            aria-label={`Run automation ${item.title} now`}
            onClick={onRunNow}
          >
            <Play className="h-3.5 w-3.5" />
            Run now
          </button>
        </div>
      </CardHeader>

      {/* Delete (secondary action, not primary CTA) */}
      {!confirm && (
        <CardContent className="border-t border-white/10 pt-3">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleDeleteClick();
            }}
            className="text-[13px] text-white/60 hover:text-white hover:underline transition"
            aria-label={`Delete automation ${item.title}`}
          >
            Delete automation
          </a>
        </CardContent>
      )}

      {/* Delete Confirmation */}
      {confirm && (
        <CardContent className="border-t border-white/10 pt-3">
          <div role="alert" aria-live="assertive" className="space-y-3">
            <p className="text-[13px] text-white/70">
              Delete "{item.title}"? This cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <button
                ref={confirmBtnRef}
                onClick={onDelete}
                data-testid="confirm-delete"
                className="rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-red-600 transition"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="rounded-lg border border-white/10 bg-card/5 px-3 py-1.5 text-[12px] text-white/70 hover:bg-card/10 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
