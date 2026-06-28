export interface RememberedSession {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface RememberedSessions {
  byTokenHash(tokenHash: string): Promise<RememberedSession | undefined>;
  save(session: RememberedSession): Promise<void>;
  touch(tokenHash: string, usedAt: string): Promise<void>;
  remove(tokenHash: string): Promise<void>;
}
