"use client";

import { useState, useEffect } from "react";
import { getAppSettingByKey } from "../actions/app-settings";

export function useInstallationType() {
  const [installationType, setInstallationType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInstallationType = async () => {
      try {
        const data = await getAppSettingByKey("INSTALLED_FOR");
        const rawValue = String(data?.value || "")
          .trim()
          .toLowerCase();
        // Normalize common aliases so sidebar gating stays predictable.
        if (["clinic", "medical", "healthcare", "hospital"].includes(rawValue)) {
          setInstallationType("clinic");
        } else if (["restaurant", "food", "dining", "hotel"].includes(rawValue)) {
          setInstallationType("restaurant");
        } else {
          setInstallationType(rawValue);
        }
      } catch (error) {
        console.error("Error fetching installation type:", error);
        setInstallationType("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstallationType();
  }, []);

  return { installationType, isLoading };
}
