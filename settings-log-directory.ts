import { join } from "node:path";
import type { Settings } from "@/settings/domain/ports/outbound/settings";
import type { AppPaths } from "@/shared/filesystem/paths";
import type { LogDirectory } from "@/shared/logger/log-directory";

export class SettingsLogDirectory implements LogDirectory {
  constructor(
    private readonly settings: Settings,
    private readonly appPaths: AppPaths,
  ) {}

  async resolve(): Promise<string> {
    const settings = await this.settings.get();
    if (settings.logDirectory) {
      return settings.logDirectory;
    }

    const storageDirectory = settings.storageDirectory ?? this.appPaths.documentsPath();
    return join(storageDirectory, "logs");
  }
}
