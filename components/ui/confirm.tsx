"use client";
import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean;
    title?: string;
    description?: string;
    onConfirm?: () => void;
  }>({ open: false });

  const ask = (opts: { title: string; description?: string; onConfirm: () => void }) =>
    setState({ open: true, ...opts });
  const close = () => setState((s) => ({ ...s, open: false }));

  const dialog = (
    <Modal open={state.open} onClose={close} title={state.title}>
      <p className="text-sm text-white/70">{state.description}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>Abbrechen</Button>
        <Button
          onClick={() => {
            state.onConfirm?.();
            close();
          }}
        >
          Bestätigen
        </Button>
      </div>
    </Modal>
  );

  return { ask, dialog };
}
