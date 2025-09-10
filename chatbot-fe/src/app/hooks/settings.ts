import { useEffect, useState, useCallback } from "react";
import { Setting } from "@/app/types/settings";
import { getSettings } from "@/app/actions/settings";
import { useSettingsStore } from "@/store/settings";

export const useSettings = () => {
  const { setSettingsByPage, getSettingsByPage } = useSettingsStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const oldSettings = getSettingsByPage(currentPage);
  const [settings, setSettings] = useState<Setting[]>(oldSettings);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(10);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSettings(currentPage, pageSize);
      setSettingsByPage(response.content, currentPage);
      setSettings(response.content);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(`Failed to fetch settings ${err}`);
      console.error("Failed to fetch settings", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, setSettingsByPage]);

  useEffect(() => {
    const oldSettings = getSettingsByPage(currentPage);
    console.log("oldSettings", oldSettings);
    if (oldSettings && oldSettings.length > 0) {
      setSettings(oldSettings);
      console.log("setSettings executed with:", oldSettings);
    } else {
      console.log(
        "setSettings not executed, oldSettings is empty or undefined."
      );
    }
    fetchSettings();
  }, [currentPage, fetchSettings, getSettingsByPage]);

  return {
    settings,
    loading,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    fetchSettings,
  };
};
