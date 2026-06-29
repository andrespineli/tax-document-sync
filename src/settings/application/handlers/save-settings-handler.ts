import type { Settings } from "../../domain/ports/outbound/settings";
import type { SaveSettings } from "../commands/save-settings";

export class SaveSettingsHandler {
  constructor(private readonly settings: Settings) {}

  async handle(command: SaveSettings): Promise<void> {
    if (!Number.isInteger(command.syncIntervalMinutes) || command.syncIntervalMinutes < 1) {
      throw new Error("Sync interval must be at least 1 minute");
    }

    if (!["light", "dark"].includes(command.theme)) {
      throw new Error("Theme must be light or dark");
    }

    await this.settings.save({
      storageDirectory: command.storageDirectory?.trim() || null,
      logDirectory: command.logDirectory?.trim() || null,
      syncIntervalMinutes: command.syncIntervalMinutes,
      notificationsEnabled: command.notificationsEnabled,
      theme: command.theme,
    });
  }
}
