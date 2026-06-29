import { Creation } from "@/shared/building-blocks/domain/models/creation";
import { Id } from "@/shared/building-blocks/domain/models/id";
import type { Clock } from "@/shared/date/clock";
import type { Logger } from "@/shared/logger/logger";
import type { FiscalEntity } from "@/fiscal-entity/domain/models/fiscal-entity";
import { FiscalEntitySnapshot } from "../../domain/models/fiscal-entity-snapshot";
import { AccessKey } from "../../domain/models/access-key";
import { TaxDocument } from "../../domain/models/tax-document";
import type { DocumentStorage } from "../../domain/ports/outbound/document-storage";
import type { FiscalDocumentGateway } from "../../domain/ports/outbound/fiscal-document-gateway";
import type { TaxDocuments } from "../../domain/ports/outbound/tax-documents";
import type { FiscalEntities } from "@/fiscal-entity/domain/ports/outbound/fiscal-entities";
import type { SynchronizeTaxDocuments } from "../commands/synchronize-tax-documents";
import type { SyncSummary } from "../services/sync-summary";

const FOUND_RECIPIENT_DOCUMENT_STATUS_CODE = "138";
const AUTHORIZED_NFE_STATUS_CODE = "1";
const UNDUE_CONSUMPTION_STATUS_CODE = "656";
const NOT_FOUND_DOCUMENT_STATUS_CODE = "137";
const LINKED_EVENT_STATUS_CODE = "135";
const ALREADY_MANIFESTED_STATUS_CODE = "573";
const EVENT_PRESENTED_AFTER_DEADLINE_CODE = "596";
const RETRY_DELAY_MINUTES = 70;

const WAIT_FOR_RETRY_STATUS_CODES = new Set([
  UNDUE_CONSUMPTION_STATUS_CODE,
  NOT_FOUND_DOCUMENT_STATUS_CODE,
]);

const ACCEPTED_MANIFEST_STATUS_CODES = new Set([
  LINKED_EVENT_STATUS_CODE,
  ALREADY_MANIFESTED_STATUS_CODE,
  EVENT_PRESENTED_AFTER_DEADLINE_CODE,
]);

export class SynchronizeTaxDocumentsHandler {
  constructor(
    private readonly fiscalEntities: FiscalEntities,
    private readonly taxDocuments: TaxDocuments,
    private readonly fiscalDocumentGateway: FiscalDocumentGateway,
    private readonly documentStorage: DocumentStorage,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  async handle(command: SynchronizeTaxDocuments): Promise<SyncSummary> {
    const summary: SyncSummary = {
      searchedEntities: 0,
      delayedEntities: 0,
      skippedDocuments: 0,
      manifestedDocuments: 0,
      downloadedDocuments: 0,
      loadedDocuments: 0,
      errors: [],
    };

    const now = this.clock.now();
    const entities = await this.fiscalEntities.eligibleForSynchronization(now);
    await this.logger.info("SYNC_ELIGIBLE_ENTITIES_FOUND", {
      runId: command.runId,
      requestedAt: command.requestedAt.toISOString(),
      eligibleEntities: entities.length,
    });

    for (const fiscalEntity of entities) {
      summary.searchedEntities += 1;

      try {
        await this.logger.info("SYNC_ENTITY_STARTED", {
          runId: command.runId,
          fiscalEntityId: fiscalEntity.id.value,
          cnpj: fiscalEntity.cnpj.value,
          legalName: fiscalEntity.legalName.value,
          lastDfeSequenceNumber: fiscalEntity.schedule.lastDfeSequenceNumber,
        });
        await this.synchronizeEntity(command.runId, fiscalEntity, summary);
        await this.logger.info("SYNC_ENTITY_FINISHED", {
          runId: command.runId,
          fiscalEntityId: fiscalEntity.id.value,
          cnpj: fiscalEntity.cnpj.value,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        summary.errors.push(`${fiscalEntity.cnpj.value}: ${message}`);
        await this.logger.error("SYNC_ENTITY_FAILED", {
          runId: command.runId,
          fiscalEntityId: fiscalEntity.id.value,
          cnpj: fiscalEntity.cnpj.value,
          error,
        });
      }
    }

    return summary;
  }

  private async synchronizeEntity(
    runId: string,
    fiscalEntity: FiscalEntity,
    summary: SyncSummary,
  ): Promise<void> {
    await this.logger.info("FISCAL_DOCUMENT_SEARCH_STARTED", {
      runId,
      fiscalEntityId: fiscalEntity.id.value,
      cnpj: fiscalEntity.cnpj.value,
      lastDfeSequenceNumber: fiscalEntity.schedule.lastDfeSequenceNumber,
    });

    const response = await this.fiscalDocumentGateway.search(
      fiscalEntity,
      fiscalEntity.schedule.lastDfeSequenceNumber,
    );

    await this.logger.info("FISCAL_DOCUMENT_SEARCH_FINISHED", {
      runId,
      fiscalEntityId: fiscalEntity.id.value,
      cnpj: fiscalEntity.cnpj.value,
      statusCode: response.statusCode,
      reason: response.reason,
      lastSequenceNumber: response.lastSequenceNumber,
      documentsCount: response.documents.length,
      documents: response.documents.map((document) => ({
        key: document.key,
        statusCode: document.statusCode,
        nsu: document.nsu,
      })),
    });

    if (response.statusCode !== FOUND_RECIPIENT_DOCUMENT_STATUS_CODE) {
      if (WAIT_FOR_RETRY_STATUS_CODES.has(response.statusCode)) {
        const delayed = fiscalEntity.defineNextSearchAfter(
          RETRY_DELAY_MINUTES,
          this.clock.now(),
        );
        await this.fiscalEntities.save(delayed);
        await this.logger.warn("FISCAL_ENTITY_DELAYED", {
          runId,
          fiscalEntityId: fiscalEntity.id.value,
          cnpj: fiscalEntity.cnpj.value,
          statusCode: response.statusCode,
          reason: response.reason,
          nextSearchAt: delayed.schedule.nextSearchAt?.toISOString() ?? null,
        });
        summary.delayedEntities += 1;
        return;
      }

      throw new Error(`Failure to find tax documents: ${response.statusCode}`);
    }

    for (const document of response.documents) {
      if (document.statusCode !== AUTHORIZED_NFE_STATUS_CODE) {
        summary.skippedDocuments += 1;
        await this.logger.warn("TAX_DOCUMENT_SKIPPED_UNAUTHORIZED", {
          runId,
          fiscalEntityId: fiscalEntity.id.value,
          cnpj: fiscalEntity.cnpj.value,
          key: document.key,
          statusCode: document.statusCode,
          nsu: document.nsu,
        });
        continue;
      }

      await this.processAuthorizedDocument(runId, fiscalEntity, document.key, summary);
    }

    const updated = fiscalEntity.updateLastDfeSequenceNumber(
      response.lastSequenceNumber,
      this.clock.now(),
    );
    await this.fiscalEntities.save(updated);
    await this.logger.info("FISCAL_ENTITY_SEQUENCE_UPDATED", {
      runId,
      fiscalEntityId: fiscalEntity.id.value,
      cnpj: fiscalEntity.cnpj.value,
      lastDfeSequenceNumber: response.lastSequenceNumber,
    });
  }

  private async processAuthorizedDocument(
    runId: string,
    fiscalEntity: FiscalEntity,
    key: string,
    summary: SyncSummary,
  ): Promise<void> {
    const accessKey = AccessKey.fromString(key);
    const existing = await this.taxDocuments.byKey(accessKey);

    if (!existing) {
      await this.logger.info("TAX_DOCUMENT_NEW_AUTHORIZED", {
        runId,
        fiscalEntityId: fiscalEntity.id.value,
        cnpj: fiscalEntity.cnpj.value,
        key: accessKey.value,
      });
      const manifested = await this.manifest(runId, fiscalEntity, accessKey);
      summary.manifestedDocuments += 1;
      await this.downloadAndStore(runId, fiscalEntity, manifested, summary);
      return;
    }

    if (existing.isManifested()) {
      await this.logger.info("TAX_DOCUMENT_MANIFESTED_PENDING_DOWNLOAD", {
        runId,
        fiscalEntityId: fiscalEntity.id.value,
        cnpj: fiscalEntity.cnpj.value,
        key: accessKey.value,
      });
      await this.downloadAndStore(runId, fiscalEntity, existing, summary);
      return;
    }

    await this.logger.debug("TAX_DOCUMENT_ALREADY_PROCESSED", {
      runId,
      fiscalEntityId: fiscalEntity.id.value,
      cnpj: fiscalEntity.cnpj.value,
      key: accessKey.value,
      status: existing.status,
    });
  }

  private async manifest(
    runId: string,
    fiscalEntity: FiscalEntity,
    accessKey: AccessKey,
  ): Promise<TaxDocument> {
    await this.logger.info("TAX_DOCUMENT_MANIFEST_STARTED", {
      runId,
      fiscalEntityId: fiscalEntity.id.value,
      cnpj: fiscalEntity.cnpj.value,
      key: accessKey.value,
    });

    const response = await this.fiscalDocumentGateway.manifest(
      fiscalEntity,
      accessKey.value,
    );

    await this.logger.info("TAX_DOCUMENT_MANIFEST_FINISHED", {
      runId,
      fiscalEntityId: fiscalEntity.id.value,
      cnpj: fiscalEntity.cnpj.value,
      key: accessKey.value,
      statusCode: response.statusCode,
      reason: response.reason,
      accepted: ACCEPTED_MANIFEST_STATUS_CODES.has(response.statusCode),
    });

    if (!ACCEPTED_MANIFEST_STATUS_CODES.has(response.statusCode)) {
      throw new Error(`Failure to manifest tax document: ${response.statusCode}`);
    }

    const document = TaxDocument.manifest(
      Id.generate(),
      new FiscalEntitySnapshot(
        fiscalEntity.id as Id,
        fiscalEntity.legalName,
        fiscalEntity.cnpj,
      ),
      accessKey,
      Creation.now(),
    );
    await this.taxDocuments.save(document);
    return document;
  }

  private async downloadAndStore(
    runId: string,
    fiscalEntity: FiscalEntity,
    document: TaxDocument,
    summary: SyncSummary,
  ): Promise<void> {
    await this.logger.info("TAX_DOCUMENT_DOWNLOAD_STARTED", {
      runId,
      fiscalEntityId: fiscalEntity.id.value,
      cnpj: fiscalEntity.cnpj.value,
      key: document.accessKey.value,
    });

    const response = await this.fiscalDocumentGateway.download(
      fiscalEntity,
      document.accessKey.value,
    );

    await this.logger.info("TAX_DOCUMENT_DOWNLOAD_FINISHED", {
      runId,
      fiscalEntityId: fiscalEntity.id.value,
      cnpj: fiscalEntity.cnpj.value,
      key: document.accessKey.value,
      statusCode: response.statusCode,
      reason: response.reason,
      contentBytes: response.content ? Buffer.byteLength(response.content, "utf8") : 0,
    });

    if (response.statusCode !== FOUND_RECIPIENT_DOCUMENT_STATUS_CODE || !response.content) {
      throw new Error(`Failure to find document to download: ${response.statusCode}`);
    }

    const downloaded = document.downloaded(response.content, this.clock.now());
    await this.taxDocuments.save(downloaded);
    summary.downloadedDocuments += 1;

    const filePath = await this.documentStorage.saveXml(
      fiscalEntity,
      document.accessKey,
      response.content,
    );
    await this.logger.info("TAX_DOCUMENT_STORED", {
      runId,
      fiscalEntityId: fiscalEntity.id.value,
      cnpj: fiscalEntity.cnpj.value,
      key: document.accessKey.value,
      filePath,
    });

    const loaded = downloaded.loaded(filePath, this.clock.now());
    await this.taxDocuments.save(loaded);
    summary.loadedDocuments += 1;
  }
}
