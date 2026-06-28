import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SecretCodec } from "@/shared/security/secret-codec";

interface StoredToken {
  token: string;
}

export class RememberedSessionTokenStore {
  constructor(
    private readonly path: string,
    private readonly secretCodec: SecretCodec,
  ) {}

  save(token: string): void {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify({
      token: this.secretCodec.encrypt(token),
    }), "utf8");
  }

  read(): string | undefined {
    try {
      const stored = JSON.parse(readFileSync(this.path, "utf8")) as StoredToken;
      return this.secretCodec.decrypt(stored.token);
    } catch {
      this.clear();
      return undefined;
    }
  }

  clear(): void {
    rmSync(this.path, { force: true });
  }
}
