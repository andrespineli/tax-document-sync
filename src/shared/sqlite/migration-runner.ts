import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Database } from "./database";

interface Migration {
  version: number;
  description: string;
  script: string;
  checksum: string;
  sql: string;
}

interface AppliedMigration {
  installed_rank: number;
  version: string;
  description: string;
  script: string;
  checksum: string;
  success: number;
}

interface TableInfo {
  name: string;
}

export class MigrationRunner {
  constructor(
    private readonly database: Database,
    private readonly migrationsDirectory: string,
  ) {}

  run(): void {
    this.ensureHistoryTable();
    const migrations = this.loadMigrations();
    this.baselineLegacyDatabaseIfNeeded(migrations);
    this.validateAppliedMigrations(migrations);
    this.runPendingMigrations(migrations);
  }

  private ensureHistoryTable(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS flyway_schema_history (
        installed_rank INTEGER PRIMARY KEY,
        version TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        script TEXT NOT NULL,
        checksum TEXT NOT NULL,
        installed_by TEXT NOT NULL,
        installed_on TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER NOT NULL,
        success INTEGER NOT NULL
      );
    `);
  }

  private loadMigrations(): Migration[] {
    return readdirSync(this.migrationsDirectory)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => this.readMigration(file))
      .sort((left, right) => left.version - right.version);
  }

  private readMigration(file: string): Migration {
    const match = /^V(\d+)__(.+)\.sql$/.exec(file);
    if (!match) {
      throw new Error(`Invalid migration file name: ${file}`);
    }

    const sql = readFileSync(join(this.migrationsDirectory, file), "utf8");
    return {
      version: Number(match[1]),
      description: match[2].replaceAll("_", " "),
      script: basename(file),
      checksum: createHash("sha256").update(sql).digest("hex"),
      sql,
    };
  }

  private baselineLegacyDatabaseIfNeeded(migrations: Migration[]): void {
    if (this.appliedMigrations().length > 0 || !this.hasAnyApplicationTable()) {
      return;
    }

    this.assertLegacyCoreTables();
    this.recordBaseline(migrations, 1);

    if (this.columnExists("settings", "notifications_enabled")
      && this.columnExists("settings", "theme")) {
      this.recordBaseline(migrations, 2);
    }

    if (this.tableExists("remembered_sessions")) {
      this.recordBaseline(migrations, 3);
    }
  }

  private validateAppliedMigrations(migrations: Migration[]): void {
    const byVersion = new Map(migrations.map((migration) => [
      String(migration.version),
      migration,
    ]));

    for (const applied of this.appliedMigrations()) {
      const migration = byVersion.get(applied.version);
      if (!migration) {
        throw new Error(`Applied migration V${applied.version} is missing from db/migrations`);
      }

      if (migration.checksum !== applied.checksum) {
        throw new Error(`Applied migration ${migration.script} checksum changed`);
      }
    }
  }

  private runPendingMigrations(migrations: Migration[]): void {
    const appliedVersions = new Set(this.appliedMigrations().map((migration) => migration.version));

    for (const migration of migrations) {
      if (appliedVersions.has(String(migration.version))) {
        continue;
      }

      this.runMigration(migration);
    }
  }

  private runMigration(migration: Migration): void {
    const startedAt = Date.now();
    const transaction = this.database.transaction(() => {
      this.database.exec(migration.sql);
      this.recordMigration(migration, Date.now() - startedAt);
    });
    transaction();
  }

  private recordBaseline(migrations: Migration[], version: number): void {
    const migration = migrations.find((migration) => migration.version === version);
    if (!migration) {
      throw new Error(`Cannot baseline missing migration V${version}`);
    }

    this.recordMigration(migration, 0);
  }

  private recordMigration(migration: Migration, executionTime: number): void {
    this.database.prepare(`
      INSERT INTO flyway_schema_history (
        installed_rank, version, description, type, script, checksum,
        installed_by, execution_time, success
      )
      VALUES (
        @installedRank, @version, @description, 'SQL', @script, @checksum,
        'app', @executionTime, 1
      )
    `).run({
      installedRank: this.nextInstalledRank(),
      version: String(migration.version),
      description: migration.description,
      script: migration.script,
      checksum: migration.checksum,
      executionTime,
    });
  }

  private nextInstalledRank(): number {
    const row = this.database.prepare(`
      SELECT COALESCE(MAX(installed_rank), 0) + 1 AS next_rank
      FROM flyway_schema_history
    `).get() as { next_rank: number };
    return row.next_rank;
  }

  private appliedMigrations(): AppliedMigration[] {
    return this.database.prepare(`
      SELECT installed_rank, version, description, script, checksum, success
      FROM flyway_schema_history
      WHERE success = 1
      ORDER BY installed_rank ASC
    `).all() as AppliedMigration[];
  }

  private hasAnyApplicationTable(): boolean {
    return [
      "schema_migrations",
      "users",
      "settings",
      "fiscal_entities",
      "tax_documents",
      "remembered_sessions",
    ].some((table) => this.tableExists(table));
  }

  private assertLegacyCoreTables(): void {
    const missing = [
      "users",
      "settings",
      "fiscal_entities",
      "tax_documents",
    ].filter((table) => !this.tableExists(table));

    if (missing.length > 0) {
      throw new Error(`Legacy database is missing baseline tables: ${missing.join(", ")}`);
    }
  }

  private tableExists(table: string): boolean {
    const row = this.database.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?
    `).get(table);
    return row !== undefined;
  }

  private columnExists(table: string, column: string): boolean {
    const rows = this.database.prepare(`PRAGMA table_info(${table})`).all() as TableInfo[];
    return rows.some((row) => row.name === column);
  }
}
