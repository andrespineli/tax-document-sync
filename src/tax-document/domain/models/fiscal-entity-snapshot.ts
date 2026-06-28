import type { Id } from "@/shared/building-blocks/domain/models/id";
import type { Cnpj } from "@/fiscal-entity/domain/models/cnpj";
import type { LegalName } from "@/fiscal-entity/domain/models/legal-name";

export class FiscalEntitySnapshot {
  constructor(
    readonly id: Id,
    readonly legalName: LegalName,
    readonly cnpj: Cnpj,
  ) {}
}
