export interface AppSettingsRecord {
  storageDirectory: string;
  logDirectory: string;
  syncIntervalMinutes: number;
  notificationsEnabled: boolean;
  theme: "light" | "dark";
}
