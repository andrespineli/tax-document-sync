import { Aggregate } from "@/shared/building-blocks/domain/models/aggregate";
import type { Creation } from "@/shared/building-blocks/domain/models/creation";
import type { Id } from "@/shared/building-blocks/domain/models/id";
import type { AccessKey } from "./access-key";
import type { FiscalEntitySnapshot } from "./fiscal-entity-snapshot";
import { TaxDocumentStatus } from "./tax-document-status";
import { TaxDocumentType } from "./tax-document-type";

export class TaxDocument extends Aggregate {
  private constructor(
    id: Id,
    readonly fiscalEntity: FiscalEntitySnapshot,
    readonly accessKey: AccessKey,
    readonly type: TaxDocumentType,
    readonly status: TaxDocumentStatus,
    readonly content: string | null,
    readonly filePath: string | null,
    creation: Creation,
    readonly updatedAt: Date,
    version = 0,
  ) {
    super(id, creation, version);
  }

  static manifest(
    id: Id,
    fiscalEntity: FiscalEntitySnapshot,
    accessKey: AccessKey,
    creation: Creation,
  ): TaxDocument {
    return new TaxDocument(
      id,
      fiscalEntity,
      accessKey,
      TaxDocumentType.INVOICE,
      TaxDocumentStatus.MANIFESTED,
      null,
      null,
      creation,
      creation.value,
    );
  }

  static restore(
    id: Id,
    fiscalEntity: FiscalEntitySnapshot,
    accessKey: AccessKey,
    type: TaxDocumentType,
    status: TaxDocumentStatus,
    content: string | null,
    filePath: string | null,
    creation: Creation,
    updatedAt: Date,
    version = 0,
  ): TaxDocument {
    return new TaxDocument(
      id,
      fiscalEntity,
      accessKey,
      type,
      status,
      content,
      filePath,
      creation,
      updatedAt,
      version,
    );
  }

  isManifested(): boolean {
    return this.status === TaxDocumentStatus.MANIFESTED;
  }

  downloaded(content: string, updatedAt: Date): TaxDocument {
    return new TaxDocument(
      this.id as Id,
      this.fiscalEntity,
      this.accessKey,
      this.type,
      TaxDocumentStatus.DOWNLOADED,
      content,
      this.filePath,
      this.creation,
      updatedAt,
      this.version + 1,
    );
  }

  loaded(filePath: string, updatedAt: Date): TaxDocument {
    return new TaxDocument(
      this.id as Id,
      this.fiscalEntity,
      this.accessKey,
      this.type,
      TaxDocumentStatus.LOADED,
      this.content,
      filePath,
      this.creation,
      updatedAt,
      this.version + 1,
    );
  }
}
