import type { AppPaths } from "@/shared/filesystem/paths";
import { join } from "node:path";
import type { Settings } from "../../domain/ports/outbound/settings";
import type { AppSettingsRecord } from "./app-settings-record";

export class Query {
  constructor(
    private readonly settings: Settings,
    private readonly appPaths: AppPaths,
  ) {}

  async execute(): Promise<AppSettingsRecord> {
    const settings = await this.settings.get();
    const storageDirectory = settings.storageDirectory ?? this.appPaths.documentsPath();
    return {
      storageDirectory,
      logDirectory: settings.logDirectory ?? join(storageDirectory, "logs"),
      syncIntervalMinutes: settings.syncIntervalMinutes,
      notificationsEnabled: settings.notificationsEnabled,
      theme: settings.theme,
    };
  }
}
