"use client";
import * as React from "react";
import { downloadJSON } from "@/lib/download";

type Entry = { ts: number; title: string; description?: string; variant?: string };

export default function SessionRecorder() {
  const [items, setItems] = React.useState<Entry[]>([]);

  React.useEffect(() => {
    const on = (e: any) => setItems((s) => [e.detail as Entry, ...s].slice(0, 100));
    document.addEventListener("sintra:notify", on as any);
    return () => document.removeEventListener("sintra:notify", on as any);
  }, []);

  const exportLogs = () => downloadJSON(`session-${Date.now()}.json`, items);

  return (
    <div className="fixed left-6 bottom-6 z-overlay w-[320px] max-w-[85vw] pointer-events-none">
      <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[hsl(var(--card))]/90 p-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Session Recorder</div>
          <button className="text-xs rounded-md px-2 py-1 hover:bg-card/10" onClick={exportLogs}>Export</button>
        </div>
      <div className="mt-2 max-h-[220px] overflow-auto text-xs">
        {items.length === 0 ? <div className="text-white/60">Actions will appear here…</div> :
          items.map((e, i) => (
            <div key={i} className="flex items-start gap-2 py-1">
              <span className={`mt-1 h-2 w-2 rounded-full ${e.variant==="success"?"bg-emerald-400":e.variant==="warn"?"bg-amber-400":e.variant==="error"?"bg-rose-500":"bg-card/50"}`} />
              <div className="min-w-0">
                <div className="text-white/80">{e.title}</div>
                {e.description && <div className="text-white/60">{e.description}</div>}
                <div className="text-[10px] text-white/40">{new Date(e.ts).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
      </div>
      </div>
    </div>
  );
}
