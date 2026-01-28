"use client";
import * as React from "react";

export function useHotkeys(
  mapping: Record<string, (e: KeyboardEvent) => void>,
  deps: React.DependencyList = []
) {
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      for (const combo in mapping) {
        const parts = combo.split("+").map((p) => p.trim().toLowerCase());
        const wantsMod = parts.includes("mod");
        const wantsShift = parts.includes("shift");
        const key = parts.find(
          (p) => p !== "mod" && p !== "shift" && p !== "ctrl" && p !== "meta"
        );

        const modMatch = wantsMod ? modKey : !e.metaKey && !e.ctrlKey;
        const shiftMatch = wantsShift ? e.shiftKey : !e.shiftKey;
        const keyMatch = key ? e.key.toLowerCase() === key : true;

        if (modMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          mapping[combo](e);
          return;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
