export interface AppSettings {
  storageDirectory: string | null;
  syncIntervalMinutes: number;
  notificationsEnabled: boolean;
  theme: "light" | "dark";
}

export interface Settings {
  get(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<void>;
}
