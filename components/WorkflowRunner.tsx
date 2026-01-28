"use client";
import { useNotify } from "@/hooks/useNotify";
import { useWorkflows } from "@/store/workflows";

export function useWorkflowRunner() {
  const notify = useNotify();
  const { items } = useWorkflows();

  function run(workflowId: string) {
    const wf = items.find((w) => w.id === workflowId);
    if (!wf) return;

    notify({ title: "Queued", description: `Workflow „${wf.name}"` });
    setTimeout(() => {
      notify({ title: "Running", variant: "warn", description: `${wf.triggers[0] ?? "manual"} → steps: ${wf.steps.length}` });
      const ok = Math.random() > 0.1; // 90% success
      setTimeout(() => {
        notify({
          title: ok ? "Completed" : "Failed",
          variant: ok ? "success" : "error",
          description: ok ? `„${wf.name}" finished` : `„${wf.name}" error at step 2`,
        });
      }, 1200);
    }, 600);
  }

  return { run };
}
