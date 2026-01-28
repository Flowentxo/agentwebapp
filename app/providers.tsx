"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { GlobalShortcutsProvider } from "@/components/shell/GlobalShortcutsProvider";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { ToastProvider } from "@/components/ui/toast";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="flowent-theme">
        <ToastProvider>
          <GlobalShortcutsProvider>
            {children}
          </GlobalShortcutsProvider>
        </ToastProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(24, 24, 27, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              backdropFilter: 'blur(12px)',
            },
            classNames: {
              success: 'text-green-400',
              error: 'text-red-400',
              warning: 'text-amber-400',
              info: 'text-blue-400',
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
