"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    console.log("[Modal] State changed - open:", open, "title:", title);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose, title]);

  if (typeof window === "undefined") {
    console.log("[Modal] Window is undefined, not rendering");
    return null;
  }

  if (!open) {
    console.log("[Modal] Modal is closed, not rendering");
    return null;
  }

  console.log("[Modal] ✅ Rendering modal:", title);

  return createPortal(
    <div
      data-overlay-root
      data-overlay-open="true"
      className="fixed inset-0 z-[9999] grid place-items-center p-4 pointer-events-auto"
      aria-hidden="false"
      style={{ zIndex: 9999 }}
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ zIndex: 9998 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="pointer-events-auto w-full max-w-lg rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/90 p-4 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 9999 }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button className="rounded-md p-1 hover:bg-card/10" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
