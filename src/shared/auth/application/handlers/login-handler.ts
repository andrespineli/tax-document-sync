import { randomBytes } from "node:crypto";
import type { PasswordHasher } from "@/shared/security/password-hasher";
import type { Users } from "../../domain/ports/outbound/users";
import type { Login } from "../commands/login";

export class LoginHandler {
  constructor(
    private readonly users: Users,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async handle(command: Login): Promise<{ token: string; userId: string; username: string }> {
    const user = await this.users.byUsername(command.username.trim());
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const valid = await this.passwordHasher.verify(
      command.password,
      user.passwordHash,
      user.passwordSalt,
    );

    if (!valid) {
      throw new Error("Invalid credentials");
    }

    return {
      token: randomBytes(32).toString("hex"),
      userId: user.id,
      username: user.username,
    };
  }
}
