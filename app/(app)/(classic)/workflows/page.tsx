"use client";

import { useState } from "react";
import WorkflowWizard from "@/components/WorkflowWizard";
import { useWorkflows } from "@/store/workflows";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { useWorkflowRunner } from "@/components/WorkflowRunner";
import BindControl from "@/components/BindControl";
import { NoWorkflowsState } from "@/components/system/EmptyState";

export default function WorkflowsPage() {
  const [open, setOpen] = useState(false);
  const { items, toggle, remove } = useWorkflows();
  const { ask, dialog } = useConfirm();
  const { run } = useWorkflowRunner();

  return (
    <div className="space-y-6">
      {dialog}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 id="page-title" className="text-xl md:text-2xl font-semibold text-text">
            Workflows
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Automatisierungen verwalten und ausführen
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Workflow erstellen</Button>
      </div>

      {/* Workflows List */}
      {items.length === 0 ? (
        <NoWorkflowsState onCreate={() => setOpen(true)} />
      ) : (
        <div className="space-y-4">
          {items.map((w) => (
            <div key={w.id} className="panel p-5 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-text">{w.name}</h2>
                  <p className="mt-1 text-sm text-text-muted">{w.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => run(w.id)}>Ausführen</Button>
                  <Button variant="secondary" onClick={() => toggle(w.id)}>
                    {w.enabled ? "Deaktivieren" : "Aktivieren"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      ask({
                        title: "Workflow löschen?",
                        description: `„${w.name}" wird entfernt.`,
                        onConfirm: () => remove(w.id),
                      })
                    }
                  >
                    Löschen
                  </Button>
                </div>
              </div>

              <div className="mt-4 hairline-t pt-4">
                <div className="mb-3 space-y-1 text-sm text-text-muted">
                  <div>
                    <strong className="text-text">Triggers:</strong>{" "}
                    {w.triggers.join(", ")}
                  </div>
                  <div>
                    <strong className="text-text">Steps:</strong>{" "}
                    {w.steps.map((s) => `${s.kind}:${s.ref}`).join(", ")}
                  </div>
                </div>
                <BindControl parentId={w.id} type="workflow" />
              </div>
            </div>
          ))}
        </div>
      )}

      <WorkflowWizard open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
