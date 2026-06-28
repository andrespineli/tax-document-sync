import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export class PasswordHasher {
  async hash(password: string): Promise<{ hash: string; salt: string }> {
    const salt = randomBytes(16).toString("hex");
    const key = await scryptAsync(password, salt, KEY_LENGTH) as Buffer;
    return { hash: key.toString("hex"), salt };
  }

  async verify(password: string, hash: string, salt: string): Promise<boolean> {
    const expected = Buffer.from(hash, "hex");
    const actual = await scryptAsync(password, salt, KEY_LENGTH) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
