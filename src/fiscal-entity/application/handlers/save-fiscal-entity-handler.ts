import { Creation } from "@/shared/building-blocks/domain/models/creation";
import { Id } from "@/shared/building-blocks/domain/models/id";
import { Certificate } from "../../domain/models/certificate";
import { Cnpj } from "../../domain/models/cnpj";
import { FederalUnit } from "../../domain/models/federal-unit";
import { FiscalEntity } from "../../domain/models/fiscal-entity";
import { LegalName } from "../../domain/models/legal-name";
import { SyncSchedule } from "../../domain/models/sync-schedule";
import type { FiscalEntities } from "../../domain/ports/outbound/fiscal-entities";
import type { SaveFiscalEntity } from "../commands/save-fiscal-entity";

export class SaveFiscalEntityHandler {
  constructor(private readonly fiscalEntities: FiscalEntities) {}

  async handle(command: SaveFiscalEntity): Promise<{ fiscalEntityId: string }> {
    const cnpj = Cnpj.fromString(command.cnpj);
    const legalName = new LegalName(command.legalName);
    const federalUnit = FederalUnit.fromString(command.uf);
    const certificate = this.certificateFrom(command);
    const existing = command.id
      ? await this.fiscalEntities.of(Id.fromString(command.id))
      : await this.fiscalEntities.byCnpj(cnpj);

    if (existing) {
      const updated = existing.update(
        legalName,
        federalUnit,
        certificate,
        new Date(),
      );
      await this.fiscalEntities.save(updated);
      return { fiscalEntityId: existing.id.value };
    }

    if (!certificate) {
      throw new Error("Certificate is required for a new fiscal entity");
    }

    const fiscalEntity = FiscalEntity.register(
      Id.generate(),
      legalName,
      cnpj,
      federalUnit,
      certificate,
      new SyncSchedule(0, null),
      Creation.now(),
    );

    await this.fiscalEntities.save(fiscalEntity);
    return { fiscalEntityId: fiscalEntity.id.value };
  }

  private certificateFrom(command: SaveFiscalEntity): Certificate | null {
    if (!command.certificateContentBase64 && !command.certificatePassword) {
      return null;
    }

    return new Certificate(
      command.certificateContentBase64 ?? "",
      command.certificatePassword ?? "",
    );
  }
}
