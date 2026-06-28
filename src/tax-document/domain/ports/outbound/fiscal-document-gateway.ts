import type { FiscalEntity } from "@/fiscal-entity/domain/models/fiscal-entity";

export interface DistributedDocumentSummary {
  key: string;
  statusCode: string;
  xml: string;
  nsu: string | null;
}

export interface SearchResponse {
  statusCode: string;
  reason: string | null;
  lastSequenceNumber: number;
  documents: DistributedDocumentSummary[];
}

export interface ManifestResponse {
  statusCode: string;
  reason: string | null;
}

export interface DownloadResponse {
  statusCode: string;
  reason: string | null;
  content: string | null;
}

export interface FiscalDocumentGateway {
  search(
    fiscalEntity: FiscalEntity,
    lastSequenceNumber: number,
  ): Promise<SearchResponse>;

  manifest(
    fiscalEntity: FiscalEntity,
    key: string,
  ): Promise<ManifestResponse>;

  download(
    fiscalEntity: FiscalEntity,
    key: string,
  ): Promise<DownloadResponse>;
}
