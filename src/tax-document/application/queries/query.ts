import type { Database } from "@/shared/sqlite/database";
import type { TaxDocumentRecord } from "./tax-document-record";

interface RawTaxDocument {
  id: string;
  fiscal_entity_id: string;
  company_name: string;
  company_document: string;
  access_key: string;
  type: string;
  status: string;
  file_path: string | null;
  created_at: string;
  updated_at: string;
}

export class Query {
  constructor(private readonly database: Database) {}

  async execute(filters: {
    fiscalEntityId?: string;
    status?: string;
  } = {}): Promise<TaxDocumentRecord[]> {
    const where: string[] = [];
    const params: string[] = [];

    if (filters.fiscalEntityId) {
      where.push("fiscal_entity_id = ?");
      params.push(filters.fiscalEntityId);
    }

    if (filters.status) {
      where.push("status = ?");
      params.push(filters.status);
    }

    const rows = this.database.prepare(`
      SELECT id, fiscal_entity_id, company_name, company_document, access_key,
             type, status, file_path, created_at, updated_at
      FROM tax_documents
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC
    `).all(...params) as RawTaxDocument[];

    return rows.map((row) => ({
      id: row.id,
      fiscalEntityId: row.fiscal_entity_id,
      companyName: row.company_name,
      companyDocument: row.company_document,
      key: row.access_key,
      type: row.type,
      status: row.status,
      filePath: row.file_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
