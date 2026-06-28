import type { Database } from "@/shared/sqlite/database";
import type { StoredUser, Users } from "../../domain/ports/outbound/users";

interface RawUser {
  id: string;
  username: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
}

export class SqliteUsers implements Users {
  constructor(private readonly database: Database) {}

  async any(): Promise<boolean> {
    const row = this.database.prepare("SELECT id FROM users LIMIT 1").get();
    return row !== undefined;
  }

  async of(id: string): Promise<StoredUser | undefined> {
    const row = this.database.prepare(`
      SELECT * FROM users WHERE id = ?
    `).get(id) as RawUser | undefined;

    return row ? this.toRecord(row) : undefined;
  }

  async byUsername(username: string): Promise<StoredUser | undefined> {
    const row = this.database.prepare(`
      SELECT * FROM users WHERE username = ?
    `).get(username) as RawUser | undefined;

    return row ? this.toRecord(row) : undefined;
  }

  async save(user: StoredUser): Promise<void> {
    this.database.prepare(`
      INSERT INTO users (
        id, username, password_hash, password_salt, created_at, updated_at
      )
      VALUES (
        @id, @username, @passwordHash, @passwordSalt, @createdAt, @updatedAt
      )
    `).run(user);
  }

  private toRecord(row: RawUser): StoredUser {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      passwordSalt: row.password_salt,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
