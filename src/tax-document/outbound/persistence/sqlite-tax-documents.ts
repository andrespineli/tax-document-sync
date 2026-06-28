import { Creation } from "@/shared/building-blocks/domain/models/creation";
import { Id } from "@/shared/building-blocks/domain/models/id";
import type { Database } from "@/shared/sqlite/database";
import { Cnpj } from "@/fiscal-entity/domain/models/cnpj";
import { LegalName } from "@/fiscal-entity/domain/models/legal-name";
import { AccessKey } from "../../domain/models/access-key";
import { FiscalEntitySnapshot } from "../../domain/models/fiscal-entity-snapshot";
import { TaxDocument } from "../../domain/models/tax-document";
import type { TaxDocumentStatus } from "../../domain/models/tax-document-status";
import type { TaxDocumentType } from "../../domain/models/tax-document-type";
import type { TaxDocuments } from "../../domain/ports/outbound/tax-documents";

interface RawTaxDocument {
  id: string;
  fiscal_entity_id: string;
  company_name: string;
  company_document: string;
  access_key: string;
  type: string;
  status: string;
  content: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteTaxDocuments implements TaxDocuments {
  constructor(private readonly database: Database) {}

  async byKey(accessKey: AccessKey): Promise<TaxDocument | undefined> {
    const row = this.database.prepare(`
      SELECT * FROM tax_documents WHERE access_key = ?
    `).get(accessKey.value) as RawTaxDocument | undefined;

    return row ? this.toDomain(row) : undefined;
  }

  async save(taxDocument: TaxDocument): Promise<void> {
    this.database.prepare(`
      INSERT INTO tax_documents (
        id, fiscal_entity_id, company_name, company_document, access_key,
        type, status, content, file_path, created_at, updated_at
      )
      VALUES (
        @id, @fiscalEntityId, @companyName, @companyDocument, @accessKey,
        @type, @status, @content, @filePath, @createdAt, @updatedAt
      )
      ON CONFLICT(access_key) DO UPDATE SET
        status = excluded.status,
        content = excluded.content,
        file_path = excluded.file_path,
        updated_at = excluded.updated_at
    `).run({
      id: taxDocument.id.value,
      fiscalEntityId: taxDocument.fiscalEntity.id.value,
      companyName: taxDocument.fiscalEntity.legalName.value,
      companyDocument: taxDocument.fiscalEntity.cnpj.value,
      accessKey: taxDocument.accessKey.value,
      type: taxDocument.type,
      status: taxDocument.status,
      content: taxDocument.content,
      filePath: taxDocument.filePath,
      createdAt: taxDocument.creation.toISOString(),
      updatedAt: taxDocument.updatedAt.toISOString(),
    });
  }

  private toDomain(row: RawTaxDocument): TaxDocument {
    return TaxDocument.restore(
      Id.fromString(row.id),
      new FiscalEntitySnapshot(
        Id.fromString(row.fiscal_entity_id),
        new LegalName(row.company_name),
        Cnpj.fromString(row.company_document),
      ),
      AccessKey.fromString(row.access_key),
      row.type as TaxDocumentType,
      row.status as TaxDocumentStatus,
      row.content,
      row.file_path,
      Creation.fromDate(new Date(row.created_at)),
      new Date(row.updated_at),
    );
  }
}
