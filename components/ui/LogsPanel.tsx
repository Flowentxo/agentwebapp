"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { LogEntry } from "@/lib/agents/types";

interface LogsPanelProps {
  logs: LogEntry[];
  autoScroll?: boolean;
}

export function LogsPanel({ logs, autoScroll = true }: LogsPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleCopy = async () => {
    const text = logs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy logs:", err);
    }
  };

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return "text-red-400";
      case "warn":
        return "text-yellow-400";
      case "info":
      default:
        return "text-blue-400";
    }
  };

  return (
    <div
      data-testid="logs-panel"
      className="relative rounded-xl border border-border bg-input overflow-hidden"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 backdrop-blur-sm px-4 py-2">
        <h3 className="text-[13px] font-semibold text-white/90">Logs</h3>
        <button
          onClick={handleCopy}
          aria-label="Copy logs to clipboard"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-card/5 px-2.5 py-1 text-[12px] text-white/70 hover:bg-card/10 hover:text-white transition"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Logs Content */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-1 font-mono text-[12px]">
        {logs.length === 0 ? (
          <p className="text-white/40 italic">No logs yet...</p>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-white/30 tabular-nums shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`uppercase font-bold shrink-0 ${getLevelColor(log.level)}`}>
                [{log.level}]
              </span>
              <span className="text-white/70">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
