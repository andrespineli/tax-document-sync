import { createHash } from "node:crypto";

export class SessionTokenHasher {
  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
