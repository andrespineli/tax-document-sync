import { Aggregate } from "@/shared/building-blocks/domain/models/aggregate";
import type { Creation } from "@/shared/building-blocks/domain/models/creation";
import type { Id } from "@/shared/building-blocks/domain/models/id";
import type { Certificate } from "./certificate";
import type { Cnpj } from "./cnpj";
import type { FederalUnit } from "./federal-unit";
import type { LegalName } from "./legal-name";
import type { SyncSchedule } from "./sync-schedule";

export class FiscalEntity extends Aggregate {
  private constructor(
    id: Id,
    readonly legalName: LegalName,
    readonly cnpj: Cnpj,
    readonly federalUnit: FederalUnit,
    readonly certificate: Certificate | null,
    readonly schedule: SyncSchedule,
    creation: Creation,
    readonly updatedAt: Date,
    version = 0,
  ) {
    super(id, creation, version);
  }

  static register(
    id: Id,
    legalName: LegalName,
    cnpj: Cnpj,
    federalUnit: FederalUnit,
    certificate: Certificate,
    schedule: SyncSchedule,
    creation: Creation,
  ): FiscalEntity {
    return new FiscalEntity(
      id,
      legalName,
      cnpj,
      federalUnit,
      certificate,
      schedule,
      creation,
      creation.value,
    );
  }

  static restore(
    id: Id,
    legalName: LegalName,
    cnpj: Cnpj,
    federalUnit: FederalUnit,
    certificate: Certificate | null,
    schedule: SyncSchedule,
    creation: Creation,
    updatedAt: Date,
    version = 0,
  ): FiscalEntity {
    return new FiscalEntity(
      id,
      legalName,
      cnpj,
      federalUnit,
      certificate,
      schedule,
      creation,
      updatedAt,
      version,
    );
  }

  update(
    legalName: LegalName,
    federalUnit: FederalUnit,
    certificate: Certificate | null,
    updatedAt: Date,
  ): FiscalEntity {
    return new FiscalEntity(
      this.id as Id,
      legalName,
      this.cnpj,
      federalUnit,
      certificate ?? this.certificate,
      this.schedule,
      this.creation,
      updatedAt,
      this.version + 1,
    );
  }

  updateLastDfeSequenceNumber(value: number, updatedAt: Date): FiscalEntity {
    return new FiscalEntity(
      this.id as Id,
      this.legalName,
      this.cnpj,
      this.federalUnit,
      this.certificate,
      this.schedule.updateLastDfeSequenceNumber(value),
      this.creation,
      updatedAt,
      this.version + 1,
    );
  }

  defineNextSearchAfter(minutes: number, now: Date): FiscalEntity {
    return new FiscalEntity(
      this.id as Id,
      this.legalName,
      this.cnpj,
      this.federalUnit,
      this.certificate,
      this.schedule.retryAfter(minutes, now),
      this.creation,
      now,
      this.version + 1,
    );
  }

  isSearchAllowed(now: Date): boolean {
    return this.certificate !== null && this.schedule.isSearchAllowed(now);
  }
}
