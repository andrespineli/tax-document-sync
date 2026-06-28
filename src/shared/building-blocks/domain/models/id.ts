import { randomUUID } from "node:crypto";
import type { ValueObject } from "./value-object";

export class Id implements ValueObject {
  constructor(readonly value: string) {
    if (!value.trim()) {
      throw new Error("Id cannot be empty");
    }
  }

  static generate(): Id {
    return new Id(randomUUID());
  }

  static fromString(value: string): Id {
    return new Id(value);
  }

  equals(other: Id): boolean {
    return this.value === other.value;
  }
}
