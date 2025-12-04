import { API } from "@/app/http/axio";
import { ENDPOINTS } from "@/app/http/endpoints";
import { AppSetting, AppSettingUpdate } from "../types/app-settings";

export async function getAppSettingByKey(key: string): Promise<AppSetting> {
  try {
    const response = await API.get(ENDPOINTS.APP_SETTINGS.GET_BY_KEY(key));
    return response.data;
  } catch (error) {
    console.error("Error fetching app setting:", error);
    throw new Error(`Failed to fetch app setting for key: ${key}`);
  }
}

export async function updateAppSetting(settingId: number, data: AppSettingUpdate): Promise<AppSetting> {
  try {
    const response = await API.put(ENDPOINTS.APP_SETTINGS.UPDATE(settingId), data);
    return response.data;
  } catch (error) {
    console.error("Error updating app setting:", error);
    throw new Error("Failed to update app setting");
  }
}
