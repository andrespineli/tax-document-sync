import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DatabaseFactory, type Database } from "@/shared/sqlite/database";
import { MigrationRunner } from "@/shared/sqlite/migration-runner";

describe("MigrationRunner", () => {
  it("runs SQL migrations for an empty database", () => {
    const database = openTempDatabase();

    new MigrationRunner(database, migrationsDirectory()).run();

    expect(tableExists(database, "users")).toBe(true);
    expect(tableExists(database, "remembered_sessions")).toBe(true);
    expect(columnExists(database, "settings", "notifications_enabled")).toBe(true);
    expect(columnExists(database, "settings", "log_directory")).toBe(true);
    expect(appliedMigrationCount(database)).toBe(4);
    database.close();
  });

  it("baselines a legacy database and runs pending migrations", () => {
    const database = openTempDatabase();
    database.exec(readFileSync(join(migrationsDirectory(), "V1__initial_schema.sql"), "utf8"));

    new MigrationRunner(database, migrationsDirectory()).run();

    expect(columnExists(database, "settings", "notifications_enabled")).toBe(true);
    expect(columnExists(database, "settings", "theme")).toBe(true);
    expect(columnExists(database, "settings", "log_directory")).toBe(true);
    expect(tableExists(database, "remembered_sessions")).toBe(true);
    expect(appliedMigrationCount(database)).toBe(4);
    database.close();
  });

  it("rejects a changed migration checksum", () => {
    const database = openTempDatabase();
    const directory = copyMigrationsToTemp();
    new MigrationRunner(database, directory).run();

    writeFileSync(
      join(directory, "V2__settings_preferences.sql"),
      "-- changed\nALTER TABLE settings ADD COLUMN changed_column TEXT;\n",
      "utf8",
    );

    expect(() => new MigrationRunner(database, directory).run())
      .toThrow("checksum changed");
    database.close();
  });
});

function migrationsDirectory(): string {
  return join(process.cwd(), "db", "migrations");
}

function openTempDatabase(): Database {
  const directory = mkdtempSync(join(tmpdir(), "tax-document-sync-"));
  return new DatabaseFactory().open(join(directory, "test.sqlite"));
}

function copyMigrationsToTemp(): string {
  const target = mkdtempSync(join(tmpdir(), "tax-document-migrations-"));
  mkdirSync(target, { recursive: true });

  for (const file of [
    "V1__initial_schema.sql",
    "V2__settings_preferences.sql",
    "V3__remembered_sessions.sql",
    "V4__log_directory_settings.sql",
  ]) {
    copyFileSync(join(migrationsDirectory(), file), join(target, file));
  }

  return target;
}

function tableExists(database: Database, table: string): boolean {
  const row = database.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?
  `).get(table);
  return row !== undefined;
}

function columnExists(database: Database, table: string, column: string): boolean {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function appliedMigrationCount(database: Database): number {
  const row = database.prepare(`
    SELECT COUNT(*) AS count FROM flyway_schema_history WHERE success = 1
  `).get() as { count: number };
  return row.count;
}
