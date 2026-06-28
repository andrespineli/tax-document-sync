import DatabaseConstructor from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

export type Database = DatabaseConstructor.Database;

export class DatabaseFactory {
  open(path: string): Database {
    mkdirSync(dirname(path), { recursive: true });
    const database = new DatabaseConstructor(path);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    return database;
  }
}
