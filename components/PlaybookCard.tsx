"use client";
import * as React from "react";
import { Playbook } from "@/types/playbook";
import { usePlaybooks } from "@/store/playbooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";

type Props = {
  playbook: Playbook;
};

export default function PlaybookCard({ playbook }: Props) {
  const { toggleStep, reset, remove } = usePlaybooks();
  const { ask, dialog } = useConfirm();

  const exportMd = () => {
    const blob = new Blob([playbook.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${playbook.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="col-span-12 lg:col-span-6 elev-1">
      {dialog}
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{playbook.title}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportMd}>
            Export .md
          </Button>
          <Button variant="outline" size="sm" onClick={() => reset(playbook.id)}>
            Reset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              ask({
                title: "Delete playbook?",
                description: `„${playbook.title}" wird gelöscht.`,
                onConfirm: () => remove(playbook.id),
              })
            }
          >
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md border border-white/10 bg-card/5 p-3 text-xs text-white/70 whitespace-pre-wrap">
          {playbook.markdown}
        </div>
        <div className="space-y-2">
          {playbook.steps.map((step) => (
            <label
              key={step.id}
              className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-card/5"
            >
              <input
                type="checkbox"
                checked={step.done ?? false}
                onChange={() => toggleStep(playbook.id, step.id)}
                className="h-4 w-4 rounded border-white/20 bg-card/10 text-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <span className={step.done ? "text-white/40 line-through" : "text-white/80"}>
                {step.text}
              </span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
