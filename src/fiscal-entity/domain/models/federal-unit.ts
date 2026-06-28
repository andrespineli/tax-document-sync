import type { ValueObject } from "@/shared/building-blocks/domain/models/value-object";
import { InvalidFederalUnit } from "../exceptions/invalid-federal-unit";

const VALID_UNITS = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

export class FederalUnit implements ValueObject {
  constructor(readonly value: string) {
    if (!VALID_UNITS.has(value)) {
      throw new InvalidFederalUnit(value);
    }
  }

  static fromString(value: string): FederalUnit {
    return new FederalUnit(value.trim().toUpperCase());
  }

  equals(other: FederalUnit): boolean {
    return this.value === other.value;
  }
}
