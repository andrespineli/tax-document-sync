import type { SecretCodec } from "./secret-codec";

export class PlainSecretCodec implements SecretCodec {
  encrypt(value: string): string {
    return `plain:${Buffer.from(value, "utf8").toString("base64")}`;
  }

  decrypt(value: string): string {
    if (!value.startsWith("plain:")) {
      return value;
    }

    return Buffer.from(value.slice("plain:".length), "base64").toString("utf8");
  }
}
