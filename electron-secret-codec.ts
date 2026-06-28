import { safeStorage } from "electron";
import { PlainSecretCodec } from "@/shared/security/plain-secret-codec";
import type { SecretCodec } from "@/shared/security/secret-codec";

export class ElectronSecretCodec implements SecretCodec {
  private readonly fallback = new PlainSecretCodec();

  encrypt(value: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      return this.fallback.encrypt(value);
    }

    return `safe:${safeStorage.encryptString(value).toString("base64")}`;
  }

  decrypt(value: string): string {
    if (!value.startsWith("safe:")) {
      return this.fallback.decrypt(value);
    }

    return safeStorage.decryptString(Buffer.from(value.slice("safe:".length), "base64"));
  }
}
