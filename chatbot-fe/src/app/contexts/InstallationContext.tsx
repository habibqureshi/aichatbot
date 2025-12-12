"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useInstallationType } from "@/app/hooks/useInstallationType";

interface InstallationContextType {
  installationType: string;
  isLoading: boolean;
  clearInstallation: () => void;
}

const InstallationContext = createContext<InstallationContextType | undefined>(undefined);

const STORAGE_KEY = "installation_type";

export function InstallationProvider({ children }: { children: ReactNode }) {
  const { installationType: hookInstallationType, isLoading: hookIsLoading } = useInstallationType();
  const [installationType, setInstallationType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const clearInstallation = () => {
    localStorage.removeItem(STORAGE_KEY);
    setInstallationType("");
  };

  useEffect(() => {
    if (!hookIsLoading) {
      // Always use the latest from hook and update localStorage
      setInstallationType(hookInstallationType);
      localStorage.setItem(STORAGE_KEY, hookInstallationType);
      setIsLoading(false);
    }
  }, [hookInstallationType, hookIsLoading]);

  return (
    <InstallationContext.Provider value={{ installationType, isLoading, clearInstallation }}>
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
