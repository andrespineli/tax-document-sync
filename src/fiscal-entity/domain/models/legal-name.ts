import type { ValueObject } from "@/shared/building-blocks/domain/models/value-object";

export class LegalName implements ValueObject {
  constructor(readonly value: string) {
    if (!value.trim()) {
      throw new Error("Legal name cannot be empty");
    }
  }

  equals(other: LegalName): boolean {
    return this.value === other.value;
  }
}
