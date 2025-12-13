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
        console.log("data11", data?.value);
        
        setInstallationType(data.value.toLowerCase());
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
