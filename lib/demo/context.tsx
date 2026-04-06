// lib/demo/context.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { installDemoFetchInterceptor, uninstallDemoFetchInterceptor } from "./fetch-interceptor";
import { disconnectDemoSocket } from "./mock-socket";

interface DemoContextType {
  isDemoMode: boolean;
  isHydrated: boolean; // Flag to indicate if we've checked localStorage
  enterDemoMode: () => void;
  exitDemoMode: () => void;
}

const DemoContext = createContext<DemoContextType>({
  isDemoMode: false,
  isHydrated: false,
  enterDemoMode: () => {},
  exitDemoMode: () => {},
});

const DEMO_KEY = "sicita_demo_mode";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Check localStorage after hydration and install interceptor if in demo mode
  useEffect(() => {
    const stored = localStorage.getItem(DEMO_KEY);
    const isDemo = stored === "true";
    
    if (isDemo) {
      setIsDemoMode(true);
      installDemoFetchInterceptor();
    }
    setIsHydrated(true);
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
    <DemoContext.Provider value={{ isDemoMode, isHydrated, enterDemoMode, exitDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
