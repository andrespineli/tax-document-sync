import type { FiscalEntity } from "@/fiscal-entity/domain/models/fiscal-entity";
import type { AccessKey } from "../../models/access-key";

export interface DocumentStorage {
  saveXml(
    fiscalEntity: FiscalEntity,
    accessKey: AccessKey,
    content: string,
  ): Promise<string>;
}
