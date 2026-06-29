export class SaveSettings {
  constructor(
    readonly storageDirectory: string | null,
    readonly logDirectory: string | null,
    readonly syncIntervalMinutes: number,
    readonly notificationsEnabled: boolean,
    readonly theme: "light" | "dark",
  ) {}
}
