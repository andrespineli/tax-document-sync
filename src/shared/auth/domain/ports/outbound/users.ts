export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Users {
  any(): Promise<boolean>;
  of(id: string): Promise<StoredUser | undefined>;
  byUsername(username: string): Promise<StoredUser | undefined>;
  save(user: StoredUser): Promise<void>;
}
