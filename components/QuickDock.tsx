"use client";
import { Play, Square, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuickDock({
  onStartAll,
  onStopAll,
  onCreate,
}: {
  onStartAll: () => void;
  onStopAll: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3">
      <Button variant="secondary" className="rounded-full h-12 w-12" onClick={onStartAll} aria-label="Start all">
        <Play className="h-5 w-5" />
      </Button>
      <Button variant="secondary" className="rounded-full h-12 w-12" onClick={onStopAll} aria-label="Stop all">
        <Square className="h-5 w-5" />
      </Button>
      <Button className="rounded-full h-12 w-12" onClick={onCreate} aria-label="Create agent">
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
}
