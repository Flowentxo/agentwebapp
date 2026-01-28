'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getLS, setLS } from '@/lib/utils/storage';

interface ShellContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const ShellContext = createContext<ShellContextValue | undefined>(undefined);

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShell must be used within ShellProvider');
  }
  return context;
}

interface ShellProviderProps {
  children: ReactNode;
}

export function ShellProvider({ children }: ShellProviderProps) {
  // Sidebar overlay open state (mobile only)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sidebar collapsed state (desktop) - persisted in localStorage
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    return getLS('ui.sidebarCollapsed', false);
  });

  // Persist collapsed state to localStorage
  useEffect(() => {
    setLS('ui.sidebarCollapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
  };

  return (
    <ShellContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}
