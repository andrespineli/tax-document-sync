import { Creation } from "@/shared/building-blocks/domain/models/creation";
import { Id } from "@/shared/building-blocks/domain/models/id";
import type { SecretCodec } from "@/shared/security/secret-codec";
import type { Database } from "@/shared/sqlite/database";
import { Certificate } from "../../domain/models/certificate";
import { Cnpj } from "../../domain/models/cnpj";
import { FederalUnit } from "../../domain/models/federal-unit";
import { FiscalEntity } from "../../domain/models/fiscal-entity";
import { LegalName } from "../../domain/models/legal-name";
import { SyncSchedule } from "../../domain/models/sync-schedule";
import type { FiscalEntities } from "../../domain/ports/outbound/fiscal-entities";

interface RawFiscalEntity {
  id: string;
  legal_name: string;
  cnpj: string;
  uf: string;
  certificate_content: string | null;
  certificate_password: string | null;
  last_dfe_sequence_number: number;
  next_search_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteFiscalEntities implements FiscalEntities {
  constructor(
    private readonly database: Database,
    private readonly secretCodec: SecretCodec,
  ) {}

  async of(id: Id): Promise<FiscalEntity | undefined> {
    const row = this.database.prepare(`
      SELECT * FROM fiscal_entities WHERE id = ?
    `).get(id.value) as RawFiscalEntity | undefined;

    return row ? this.toDomain(row) : undefined;
  }

  async byCnpj(cnpj: Cnpj): Promise<FiscalEntity | undefined> {
    const row = this.database.prepare(`
      SELECT * FROM fiscal_entities WHERE cnpj = ?
    `).get(cnpj.value) as RawFiscalEntity | undefined;

    return row ? this.toDomain(row) : undefined;
  }

  async eligibleForSynchronization(now: Date): Promise<FiscalEntity[]> {
    const rows = this.database.prepare(`
      SELECT * FROM fiscal_entities
      WHERE certificate_content IS NOT NULL
        AND certificate_password IS NOT NULL
        AND (next_search_at IS NULL OR next_search_at <= ?)
      ORDER BY legal_name ASC
    `).all(now.toISOString()) as RawFiscalEntity[];

    return rows.map((row) => this.toDomain(row));
  }

  async save(fiscalEntity: FiscalEntity): Promise<void> {
    const certificateContent = fiscalEntity.certificate
      ? this.secretCodec.encrypt(fiscalEntity.certificate.contentBase64)
      : null;
    const certificatePassword = fiscalEntity.certificate
      ? this.secretCodec.encrypt(fiscalEntity.certificate.password)
      : null;

    this.database.prepare(`
      INSERT INTO fiscal_entities (
        id, legal_name, cnpj, uf, certificate_content, certificate_password,
        last_dfe_sequence_number, next_search_at, created_at, updated_at
      )
      VALUES (
        @id, @legalName, @cnpj, @uf, @certificateContent, @certificatePassword,
        @lastDfeSequenceNumber, @nextSearchAt, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        legal_name = excluded.legal_name,
        uf = excluded.uf,
        certificate_content = COALESCE(excluded.certificate_content, fiscal_entities.certificate_content),
        certificate_password = COALESCE(excluded.certificate_password, fiscal_entities.certificate_password),
        last_dfe_sequence_number = excluded.last_dfe_sequence_number,
        next_search_at = excluded.next_search_at,
        updated_at = excluded.updated_at
    `).run({
      id: fiscalEntity.id.value,
      legalName: fiscalEntity.legalName.value,
      cnpj: fiscalEntity.cnpj.value,
      uf: fiscalEntity.federalUnit.value,
      certificateContent,
      certificatePassword,
      lastDfeSequenceNumber: fiscalEntity.schedule.lastDfeSequenceNumber,
      nextSearchAt: fiscalEntity.schedule.nextSearchAt?.toISOString() ?? null,
      createdAt: fiscalEntity.creation.toISOString(),
      updatedAt: fiscalEntity.updatedAt.toISOString(),
    });
  }

  async remove(id: Id): Promise<void> {
    this.database.prepare("DELETE FROM fiscal_entities WHERE id = ?").run(id.value);
  }

  private toDomain(row: RawFiscalEntity): FiscalEntity {
    const certificate = row.certificate_content && row.certificate_password
      ? new Certificate(
        this.secretCodec.decrypt(row.certificate_content),
        this.secretCodec.decrypt(row.certificate_password),
      )
      : null;

    return FiscalEntity.restore(
      Id.fromString(row.id),
      new LegalName(row.legal_name),
      Cnpj.fromString(row.cnpj),
      FederalUnit.fromString(row.uf),
      certificate,
      new SyncSchedule(
        row.last_dfe_sequence_number,
        row.next_search_at ? new Date(row.next_search_at) : null,
      ),
      Creation.fromDate(new Date(row.created_at)),
      new Date(row.updated_at),
    );
  }
}
