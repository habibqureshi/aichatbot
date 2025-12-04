export interface AppSetting {
  id: number;
  key: string;
  value: string;
}

export interface AppSettingUpdate {
  key: string;
  value: string;
}

export type AppSettingKey = "GREETING" | "MENU" | "INSTALLED_FOR";

export interface MenuItems {
  items: string[];
}
