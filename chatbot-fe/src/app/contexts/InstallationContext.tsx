"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useInstallationType } from "@/app/hooks/useInstallationType";

interface InstallationContextType {
  installationType: string;
  isLoading: boolean;
}

const InstallationContext = createContext<InstallationContextType | undefined>(undefined);

const STORAGE_KEY = "installation_type";

export function InstallationProvider({ children }: { children: ReactNode }) {
  const { installationType: hookInstallationType, isLoading: hookIsLoading } = useInstallationType();
  const [installationType, setInstallationType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to get from localStorage first
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (storedValue) {
      setInstallationType(storedValue);
      setIsLoading(false);
    } else if (!hookIsLoading) {
      // If no stored value and hook has finished loading, use hook value and save to localStorage
      setInstallationType(hookInstallationType);
      localStorage.setItem(STORAGE_KEY, hookInstallationType);
      setIsLoading(false);
    }
  }, [hookInstallationType, hookIsLoading]);

  return (
    <InstallationContext.Provider value={{ installationType, isLoading }}>
      {children}
    </InstallationContext.Provider>
  );
}

export function useInstallation() {
  const context = useContext(InstallationContext);
  if (context === undefined) {
    throw new Error("useInstallation must be used within an InstallationProvider");
  }
  return context;
}
