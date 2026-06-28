import type { Id } from "@/shared/building-blocks/domain/models/id";
import type { Cnpj } from "../../models/cnpj";
import type { FiscalEntity } from "../../models/fiscal-entity";

export interface FiscalEntities {
  of(id: Id): Promise<FiscalEntity | undefined>;
  byCnpj(cnpj: Cnpj): Promise<FiscalEntity | undefined>;
  eligibleForSynchronization(now: Date): Promise<FiscalEntity[]>;
  save(fiscalEntity: FiscalEntity): Promise<void>;
  remove(id: Id): Promise<void>;
}
