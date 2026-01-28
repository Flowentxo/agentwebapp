"use client";

import * as React from "react";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface SheetContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface SheetTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface SheetDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Sheet Content Container */}
      {children}
    </>
  );
}

export function SheetContent({ children, className = "" }: SheetContentProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      id="agent-details"
      className={`
        fixed inset-y-0 right-0 z-50 w-full max-w-2xl
        overflow-y-auto bg-surface-1 border-l border-white/10
        shadow-2xl
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function SheetHeader({ children, className = "" }: SheetHeaderProps) {
  return (
    <div className={`sticky top-0 z-10 border-b border-white/10 bg-surface-2/95 backdrop-blur px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

export function SheetTitle({ children, className = "" }: SheetTitleProps) {
  return (
    <h2 className={`text-xl font-semibold text-text ${className}`}>
      {children}
    </h2>
  );
}

export function SheetDescription({ children, className = "" }: SheetDescriptionProps) {
  return (
    <p className={`mt-1 text-sm text-text-muted ${className}`}>
      {children}
    </p>
  );
}

export function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="absolute right-6 top-4 rounded-lg p-2 text-text-muted transition-colors hover:bg-card/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Schließen"
    >
      <X className="h-5 w-5" />
    </button>
  );
}
