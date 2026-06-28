import { randomBytes, randomUUID } from "node:crypto";
import type { RememberedSessions } from "@/shared/auth/domain/ports/outbound/remembered-sessions";
import type { Users } from "@/shared/auth/domain/ports/outbound/users";
import type { RememberedSessionTokenStore } from "./remembered-session-token-store";
import type { SessionTokenHasher } from "./session-token-hasher";

export interface ResumedRememberedSession {
  userId: string;
  username: string;
}

export class RememberedSessionManager {
  constructor(
    private readonly users: Users,
    private readonly rememberedSessions: RememberedSessions,
    private readonly tokenStore: RememberedSessionTokenStore,
    private readonly tokenHasher: SessionTokenHasher,
  ) {}

  async remember(userId: string): Promise<void> {
    const token = randomBytes(32).toString("hex");
    const tokenHash = this.tokenHasher.hash(token);
    const now = new Date().toISOString();

    await this.rememberedSessions.save({
      id: randomUUID(),
      userId,
      tokenHash,
      createdAt: now,
      lastUsedAt: now,
    });
    this.tokenStore.save(token);
  }

  async resume(): Promise<ResumedRememberedSession | undefined> {
    const token = this.tokenStore.read();
    if (!token) {
      return undefined;
    }

    const tokenHash = this.tokenHasher.hash(token);
    const session = await this.rememberedSessions.byTokenHash(tokenHash);
    if (!session) {
      this.tokenStore.clear();
      return undefined;
    }

    const user = await this.users.of(session.userId);
    if (!user) {
      await this.clear(tokenHash);
      return undefined;
    }

    await this.rememberedSessions.touch(tokenHash, new Date().toISOString());
    return {
      userId: user.id,
      username: user.username,
    };
  }

  async clear(knownTokenHash?: string): Promise<void> {
    const tokenHash = knownTokenHash ?? this.currentTokenHash();
    if (tokenHash) {
      await this.rememberedSessions.remove(tokenHash);
    }

    this.tokenStore.clear();
  }

  private currentTokenHash(): string | undefined {
    const token = this.tokenStore.read();
    return token ? this.tokenHasher.hash(token) : undefined;
  }
}
