// lib/demo/context.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { installDemoFetchInterceptor, uninstallDemoFetchInterceptor } from "./fetch-interceptor";
import { disconnectDemoSocket } from "./mock-socket";

interface DemoContextType {
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
}

const DemoContext = createContext<DemoContextType>({
  isDemoMode: false,
  enterDemoMode: () => {},
  exitDemoMode: () => {},
});

const DEMO_KEY = "sicita_demo_mode";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(DEMO_KEY);
      if (stored === "true") {
        setIsDemoMode(true);
        installDemoFetchInterceptor();
      }
    }
  }, []);

  const enterDemoMode = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_KEY, "true");
    }
    installDemoFetchInterceptor();
    setIsDemoMode(true);
  }, []);

  const exitDemoMode = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(DEMO_KEY);
    }
    uninstallDemoFetchInterceptor();
    disconnectDemoSocket();
    setIsDemoMode(false);
  }, []);

  return (
    <DemoContext.Provider value={{ isDemoMode, enterDemoMode, exitDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
