import type { Users } from "../../domain/ports/outbound/users";
import type { AuthStateRecord } from "./auth-state-record";

export class Query {
  constructor(private readonly users: Users) {}

  async execute(): Promise<AuthStateRecord> {
    return { hasAdmin: await this.users.any() };
  }
}
