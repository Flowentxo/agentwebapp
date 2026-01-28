"use client";
import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWorkflows } from "@/store/workflows";
import { useToast } from "@/components/ui/toast";

type Step = 1 | 2 | 3;

export default function WorkflowWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const add = useWorkflows((s) => s.add);
  const { push } = useToast();

  const [step, setStep] = React.useState<Step>(1);
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [triggers, setTriggers] = React.useState("cron:0 8 * * *, webhook:/support");
  const [steps, setSteps] = React.useState("agent:Dexter, tool:GenerateSummary");

  const canNext1 = name.trim().length >= 2;
  const canNext2 = triggers.trim().length > 0;
  const canSubmit = steps.trim().length > 0;

  const reset = () => {
    setStep(1);
    setName("");
    setDesc("");
    setTriggers("cron:0 8 * * *, webhook:/support");
    setSteps("agent:Dexter, tool:GenerateSummary");
  };

  const submit = () => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    add({
      id,
      name: name.trim(),
      description: desc.trim() || "—",
      triggers: triggers.split(",").map((s) => s.trim()).filter(Boolean),
      steps: steps.split(",").map((s) => {
        const [kind, ...rest] = s.split(":");
        return { kind: (kind?.trim() || "agent") as any, ref: rest.join(":").trim() };
      }),
      enabled: true,
    });
    push({ title: "Workflow created", variant: "success", description: `„${name}" wurde angelegt.` });
    onClose();
    reset();
  };

  const close = () => {
    onClose();
    reset();
  };

  return (
    <Modal open={open} onClose={close} title="Create Workflow">
      <div className="text-xs text-white/60">Step {step} / 3</div>

      {step === 1 && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-white/60">Name</label>
            <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Daily Support Digest" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Description</label>
            <Input value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Short description" />
          </div>
          <div className="flex justify-end gap-2">
            <Button disabled={!canNext1} onClick={()=>setStep(2)}>Weiter</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-white/60">Triggers (comma separated)</label>
            <Input value={triggers} onChange={(e)=>setTriggers(e.target.value)} />
            <p className="mt-1 text-[11px] text-white/45">Beispiele: <code>cron:0 8 * * *</code>, <code>webhook:/support</code></p>
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={()=>setStep(1)}>Zurück</Button>
            <Button disabled={!canNext2} onClick={()=>setStep(3)}>Weiter</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-white/60">Steps (comma separated)</label>
            <Input value={steps} onChange={(e)=>setSteps(e.target.value)} />
            <p className="mt-1 text-[11px] text-white/45">Format: <code>agent:Dexter</code>, <code>tool:GenerateSummary</code>, <code>branch:if x then y</code></p>
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={()=>setStep(2)}>Zurück</Button>
            <Button disabled={!canSubmit} onClick={submit}>Erstellen</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
