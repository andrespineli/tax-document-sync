import type { ValueObject } from "@/shared/building-blocks/domain/models/value-object";
import { InvalidAccessKey } from "../exceptions/invalid-access-key";

export class AccessKey implements ValueObject {
  constructor(readonly value: string) {
    if (!/^\d{44}$/.test(value)) {
      throw new InvalidAccessKey(value);
    }
  }

  static fromString(value: string): AccessKey {
    return new AccessKey(value.replace(/\D/g, ""));
  }

  equals(other: AccessKey): boolean {
    return this.value === other.value;
  }
}
