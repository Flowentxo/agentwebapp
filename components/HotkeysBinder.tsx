"use client";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useUI } from "@/store/ui";

export function HotkeysBinder() {
  const { toggleCommand } = useUI();

  useHotkeys(
    {
      "mod+k": (e) => {
        e.preventDefault();
        toggleCommand();
      },
    },
    [toggleCommand]
  );

  return null;
}
