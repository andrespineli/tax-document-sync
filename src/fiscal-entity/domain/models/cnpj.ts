import type { ValueObject } from "@/shared/building-blocks/domain/models/value-object";
import { InvalidCnpj } from "../exceptions/invalid-cnpj";

export class Cnpj implements ValueObject {
  constructor(readonly value: string) {
    if (!/^\d{14}$/.test(value)) {
      throw new InvalidCnpj(value);
    }
  }

  static fromString(value: string): Cnpj {
    return new Cnpj(value.replace(/\D/g, ""));
  }

  equals(other: Cnpj): boolean {
    return this.value === other.value;
  }
}
