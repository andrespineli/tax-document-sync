import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  RememberedSession,
  RememberedSessions,
} from "@/shared/auth/domain/ports/outbound/remembered-sessions";
import type { StoredUser, Users } from "@/shared/auth/domain/ports/outbound/users";
import { PlainSecretCodec } from "@/shared/security/plain-secret-codec";
import { RememberedSessionManager } from "@/shared/session/remembered-session-manager";
import { RememberedSessionTokenStore } from "@/shared/session/remembered-session-token-store";
import { SessionTokenHasher } from "@/shared/session/session-token-hasher";

describe("RememberedSessionManager", () => {
  it("remembers and resumes a user without storing a password", async () => {
    const users = new FakeUsers([user()]);
    const sessions = new FakeRememberedSessions();
    const store = tokenStore();
    const manager = new RememberedSessionManager(users, sessions, store, new SessionTokenHasher());

    await manager.remember("user-1");
    const resumed = await manager.resume();

    expect(resumed?.username).toBe("admin");
    expect(store.read()).toBeDefined();
    expect([...sessions.records.values()][0]?.lastUsedAt).toBeDefined();
  });

  it("clears remembered sessions on logout", async () => {
    const sessions = new FakeRememberedSessions();
    const store = tokenStore();
    const manager = new RememberedSessionManager(
      new FakeUsers([user()]),
      sessions,
      store,
      new SessionTokenHasher(),
    );

    await manager.remember("user-1");
    await manager.clear();

    expect(store.read()).toBeUndefined();
    expect(sessions.records.size).toBe(0);
  });

  it("drops an invalid remembered token", async () => {
    const store = tokenStore();
    store.save("invalid-token");
    const manager = new RememberedSessionManager(
      new FakeUsers([user()]),
      new FakeRememberedSessions(),
      store,
      new SessionTokenHasher(),
    );

    const resumed = await manager.resume();

    expect(resumed).toBeUndefined();
    expect(store.read()).toBeUndefined();
  });
});

function tokenStore(): RememberedSessionTokenStore {
  const directory = mkdtempSync(join(tmpdir(), "remembered-session-"));
  return new RememberedSessionTokenStore(
    join(directory, "session.json"),
    new PlainSecretCodec(),
  );
}

function user(): StoredUser {
  return {
    id: "user-1",
    username: "admin",
    passwordHash: "hash",
    passwordSalt: "salt",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

class FakeUsers implements Users {
  constructor(private readonly users: StoredUser[]) {}

  async any(): Promise<boolean> {
    return this.users.length > 0;
  }

  async of(id: string): Promise<StoredUser | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async byUsername(username: string): Promise<StoredUser | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async save(): Promise<void> {}
}

class FakeRememberedSessions implements RememberedSessions {
  readonly records = new Map<string, RememberedSession>();

  async byTokenHash(tokenHash: string): Promise<RememberedSession | undefined> {
    return this.records.get(tokenHash);
  }

  async save(session: RememberedSession): Promise<void> {
    this.records.set(session.tokenHash, session);
  }

  async touch(tokenHash: string, usedAt: string): Promise<void> {
    const session = this.records.get(tokenHash);
    if (session) {
      this.records.set(tokenHash, { ...session, lastUsedAt: usedAt });
    }
  }

  async remove(tokenHash: string): Promise<void> {
    this.records.delete(tokenHash);
  }
}
