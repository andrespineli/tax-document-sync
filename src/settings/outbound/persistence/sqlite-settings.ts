import type { Database } from "@/shared/sqlite/database";
import type { AppSettings, Settings } from "../../domain/ports/outbound/settings";

interface RawSettings {
  storage_directory: string | null;
  sync_interval_minutes: number;
  notifications_enabled: number;
  theme: string;
}

export class SqliteSettings implements Settings {
  constructor(private readonly database: Database) {}

  async get(): Promise<AppSettings> {
    const row = this.database.prepare(`
      SELECT
        storage_directory,
        sync_interval_minutes,
        notifications_enabled,
        theme
      FROM settings
      WHERE id = 1
    `).get() as RawSettings | undefined;

    return {
      storageDirectory: row?.storage_directory ?? null,
      syncIntervalMinutes: row?.sync_interval_minutes ?? 5,
      notificationsEnabled: row?.notifications_enabled === undefined
        ? true
        : row.notifications_enabled === 1,
      theme: row?.theme === "dark" ? "dark" : "light",
    };
  }

  async save(settings: AppSettings): Promise<void> {
    const now = new Date().toISOString();
    this.database.prepare(`
      INSERT INTO settings (
        id, storage_directory, sync_interval_minutes, notifications_enabled,
        theme, created_at, updated_at
      )
      VALUES (
        1, @storageDirectory, @syncIntervalMinutes, @notificationsEnabled,
        @theme, @now, @now
      )
      ON CONFLICT(id) DO UPDATE SET
        storage_directory = excluded.storage_directory,
        sync_interval_minutes = excluded.sync_interval_minutes,
        notifications_enabled = excluded.notifications_enabled,
        theme = excluded.theme,
        updated_at = excluded.updated_at
    `).run({
      storageDirectory: settings.storageDirectory,
      syncIntervalMinutes: settings.syncIntervalMinutes,
      notificationsEnabled: settings.notificationsEnabled ? 1 : 0,
      theme: settings.theme,
      now,
    });
  }
}
