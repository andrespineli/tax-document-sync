import { randomUUID } from "node:crypto";
import type { PasswordHasher } from "@/shared/security/password-hasher";
import type { Users } from "../../domain/ports/outbound/users";
import type { SetupAdmin } from "../commands/setup-admin";

export class SetupAdminHandler {
  constructor(
    private readonly users: Users,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async handle(command: SetupAdmin): Promise<void> {
    if (await this.users.any()) {
      throw new Error("Admin user already exists");
    }

    if (!command.username.trim()) {
      throw new Error("Username is required");
    }

    if (command.password.length < 8) {
      throw new Error("Password must have at least 8 characters");
    }

    const password = await this.passwordHasher.hash(command.password);
    const now = new Date().toISOString();

    await this.users.save({
      id: randomUUID(),
      username: command.username.trim(),
      passwordHash: password.hash,
      passwordSalt: password.salt,
      createdAt: now,
      updatedAt: now,
    });
  }
}
