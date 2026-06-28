import type { Database } from "@/shared/sqlite/database";
import type {
  RememberedSession,
  RememberedSessions,
} from "../../domain/ports/outbound/remembered-sessions";

interface RawRememberedSession {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  last_used_at: string;
}

export class SqliteRememberedSessions implements RememberedSessions {
  constructor(private readonly database: Database) {}

  async byTokenHash(tokenHash: string): Promise<RememberedSession | undefined> {
    const row = this.database.prepare(`
      SELECT * FROM remembered_sessions WHERE token_hash = ?
    `).get(tokenHash) as RawRememberedSession | undefined;

    return row ? this.toRecord(row) : undefined;
  }

  async save(session: RememberedSession): Promise<void> {
    this.database.prepare(`
      INSERT INTO remembered_sessions (
        id, user_id, token_hash, created_at, last_used_at
      )
      VALUES (
        @id, @userId, @tokenHash, @createdAt, @lastUsedAt
      )
      ON CONFLICT(token_hash) DO UPDATE SET
        last_used_at = excluded.last_used_at
    `).run(session);
  }

  async touch(tokenHash: string, usedAt: string): Promise<void> {
    this.database.prepare(`
      UPDATE remembered_sessions
      SET last_used_at = ?
      WHERE token_hash = ?
    `).run(usedAt, tokenHash);
  }

  async remove(tokenHash: string): Promise<void> {
    this.database.prepare(`
      DELETE FROM remembered_sessions WHERE token_hash = ?
    `).run(tokenHash);
  }

  private toRecord(row: RawRememberedSession): RememberedSession {
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    };
  }
}
