"use client";
import { useToast } from "@/components/ui/toast";
import { useNotifications } from "@/store/notifications";

export function useNotify() {
  const { push } = useToast();
  const add = useNotifications((s) => s.add);
  return (opts: { title: string; description?: string; variant?: "default"|"success"|"warn"|"error" }) => {
    push(opts);
    add(opts);
  };
}
