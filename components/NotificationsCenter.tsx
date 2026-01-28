"use client";
import * as React from "react";
import { useNotifications } from "@/store/notifications";
import { Button } from "@/components/ui/button";

export default function NotificationsCenter() {
  const items = useNotifications((s) => s.items);
  const markRead = useNotifications((s) => s.markRead);
  const clear = useNotifications((s) => s.clear);

  return (
    <div className="absolute right-0 mt-2 w-[420px] max-w-[90vw] rounded-2xl border border-white/10 bg-[hsl(var(--card))]/95 p-2 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="text-sm font-semibold">Notifications</div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => markRead()}>Mark all read</Button>
          <Button size="sm" variant="ghost" onClick={clear}>Clear</Button>
        </div>
      </div>
      <div className="max-h-[50vh] overflow-auto">
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-white/60">Nothing here yet.</div>
        ) : (
          items.map((n) => (
            <div key={n.id} className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-card/5">
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${n.variant==="success"?"bg-emerald-400":n.variant==="warn"?"bg-amber-400":n.variant==="error"?"bg-rose-500":"bg-card/50"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm">{n.title}</div>
                {n.description && <div className="text-xs text-white/70">{n.description}</div>}
                <div className="mt-0.5 text-[10px] text-white/40">{new Date(n.ts).toLocaleString()}</div>
              </div>
              {!n.read && (
                <button className="rounded-md px-2 py-1 text-[10px] hover:bg-card/10" onClick={() => markRead(n.id)}>Mark read</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
