export interface AppSettingsRecord {
  storageDirectory: string;
  syncIntervalMinutes: number;
  notificationsEnabled: boolean;
  theme: "light" | "dark";
}
