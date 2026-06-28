import type { Database } from "@/shared/sqlite/database";
import type { FiscalEntityRecord } from "./fiscal-entity-record";

interface RawFiscalEntity {
  id: string;
  legal_name: string;
  cnpj: string;
  uf: string;
  certificate_content: string | null;
  last_dfe_sequence_number: number;
  next_search_at: string | null;
  created_at: string;
  updated_at: string;
}

export class Query {
  constructor(private readonly database: Database) {}

  async execute(): Promise<FiscalEntityRecord[]> {
    const rows = this.database.prepare(`
      SELECT id, legal_name, cnpj, uf, certificate_content, last_dfe_sequence_number,
             next_search_at, created_at, updated_at
      FROM fiscal_entities
      ORDER BY legal_name ASC
    `).all() as RawFiscalEntity[];

    return rows.map((row) => ({
      id: row.id,
      legalName: row.legal_name,
      cnpj: row.cnpj,
      uf: row.uf,
      hasCertificate: row.certificate_content !== null,
      lastDfeSequenceNumber: row.last_dfe_sequence_number,
      nextSearchAt: row.next_search_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
