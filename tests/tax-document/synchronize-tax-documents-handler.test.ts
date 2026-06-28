import { describe, expect, it } from "vitest";
import { Creation } from "@/shared/building-blocks/domain/models/creation";
import { Id } from "@/shared/building-blocks/domain/models/id";
import type { Clock } from "@/shared/date/clock";
import type { Logger } from "@/shared/logger/logger";
import { Certificate } from "@/fiscal-entity/domain/models/certificate";
import { Cnpj } from "@/fiscal-entity/domain/models/cnpj";
import { FederalUnit } from "@/fiscal-entity/domain/models/federal-unit";
import { FiscalEntity } from "@/fiscal-entity/domain/models/fiscal-entity";
import { LegalName } from "@/fiscal-entity/domain/models/legal-name";
import { SyncSchedule } from "@/fiscal-entity/domain/models/sync-schedule";
import type { FiscalEntities } from "@/fiscal-entity/domain/ports/outbound/fiscal-entities";
import { SynchronizeTaxDocuments } from "@/tax-document/application/commands/synchronize-tax-documents";
import { SynchronizeTaxDocumentsHandler } from "@/tax-document/application/handlers/synchronize-tax-documents-handler";
import type { AccessKey } from "@/tax-document/domain/models/access-key";
import type { TaxDocument } from "@/tax-document/domain/models/tax-document";
import type { DocumentStorage } from "@/tax-document/domain/ports/outbound/document-storage";
import type {
  DownloadResponse,
  FiscalDocumentGateway,
  ManifestResponse,
  SearchResponse,
} from "@/tax-document/domain/ports/outbound/fiscal-document-gateway";
import type { TaxDocuments } from "@/tax-document/domain/ports/outbound/tax-documents";

const KEY = "12345678901234567890123456789012345678901234";
const NOW = new Date("2026-06-28T00:00:00.000Z");

describe("SynchronizeTaxDocumentsHandler", () => {
  it("manifests downloads and stores an authorized document", async () => {
    const fiscalEntities = new FakeFiscalEntities([entity()]);
    const taxDocuments = new FakeTaxDocuments();
    const gateway = new FakeGateway({
      search: {
        statusCode: "138",
        reason: "Documento(s) localizado(s)",
        lastSequenceNumber: 42,
        documents: [{
          key: KEY,
          statusCode: "1",
          xml: "<resNFe><chNFe>12345678901234567890123456789012345678901234</chNFe><cSitNFe>1</cSitNFe></resNFe>",
          nsu: "000000000000042",
        }],
      },
      manifest: { statusCode: "135", reason: "Evento registrado" },
      download: {
        statusCode: "138",
        reason: "Documento localizado",
        content: `<nfeProc><chNFe>${KEY}</chNFe></nfeProc>`,
      },
    });
    const storage = new FakeStorage();
    const handler = newHandler(fiscalEntities, taxDocuments, gateway, storage);

    const summary = await handler.handle(new SynchronizeTaxDocuments(NOW));

    expect(summary.manifestedDocuments).toBe(1);
    expect(summary.downloadedDocuments).toBe(1);
    expect(summary.loadedDocuments).toBe(1);
    expect(fiscalEntities.saved.at(-1)?.schedule.lastDfeSequenceNumber).toBe(42);
    expect(taxDocuments.saved.at(-1)?.status).toBe("LOADED");
    expect(storage.saved[0]?.content).toContain("<nfeProc>");
  });

  it("delays the entity for seventy minutes when SEFAZ asks to retry later", async () => {
    const fiscalEntities = new FakeFiscalEntities([entity()]);
    const handler = newHandler(
      fiscalEntities,
      new FakeTaxDocuments(),
      new FakeGateway({
        search: {
          statusCode: "656",
          reason: "Consumo indevido",
          lastSequenceNumber: 0,
          documents: [],
        },
      }),
      new FakeStorage(),
    );

    const summary = await handler.handle(new SynchronizeTaxDocuments(NOW));

    expect(summary.delayedEntities).toBe(1);
    expect(fiscalEntities.saved.at(-1)?.schedule.nextSearchAt?.toISOString())
      .toBe("2026-06-28T01:10:00.000Z");
  });

  it("skips documents that are not authorized", async () => {
    const taxDocuments = new FakeTaxDocuments();
    const handler = newHandler(
      new FakeFiscalEntities([entity()]),
      taxDocuments,
      new FakeGateway({
        search: {
          statusCode: "138",
          reason: "Documento(s) localizado(s)",
          lastSequenceNumber: 7,
          documents: [{
            key: KEY,
            statusCode: "2",
            xml: "<resNFe><cSitNFe>2</cSitNFe></resNFe>",
            nsu: "000000000000007",
          }],
        },
      }),
      new FakeStorage(),
    );

    const summary = await handler.handle(new SynchronizeTaxDocuments(NOW));

    expect(summary.skippedDocuments).toBe(1);
    expect(taxDocuments.saved).toHaveLength(0);
  });
});

function newHandler(
  fiscalEntities: FiscalEntities,
  taxDocuments: TaxDocuments,
  gateway: FiscalDocumentGateway,
  storage: DocumentStorage,
): SynchronizeTaxDocumentsHandler {
  return new SynchronizeTaxDocumentsHandler(
    fiscalEntities,
    taxDocuments,
    gateway,
    storage,
    new FixedClock(),
    new NoopLogger(),
  );
}

function entity(): FiscalEntity {
  return FiscalEntity.register(
    Id.fromString("fiscal-entity-1"),
    new LegalName("Empresa Teste"),
    Cnpj.fromString("12345678000190"),
    FederalUnit.fromString("SP"),
    new Certificate(Buffer.from("certificate").toString("base64"), "12345678"),
    new SyncSchedule(0, null),
    Creation.fromDate(NOW),
  );
}

class FakeFiscalEntities implements FiscalEntities {
  readonly saved: FiscalEntity[] = [];

  constructor(private entities: FiscalEntity[]) {}

  async of(id: Id): Promise<FiscalEntity | undefined> {
    return this.entities.find((entity) => entity.id.value === id.value);
  }

  async byCnpj(cnpj: Cnpj): Promise<FiscalEntity | undefined> {
    return this.entities.find((entity) => entity.cnpj.value === cnpj.value);
  }

  async eligibleForSynchronization(now: Date): Promise<FiscalEntity[]> {
    return this.entities.filter((entity) => entity.isSearchAllowed(now));
  }

  async save(fiscalEntity: FiscalEntity): Promise<void> {
    this.saved.push(fiscalEntity);
    this.entities = this.entities.map((entity) =>
      entity.id.value === fiscalEntity.id.value ? fiscalEntity : entity
    );
  }

  async remove(_id: Id): Promise<void> {}
}

class FakeTaxDocuments implements TaxDocuments {
  readonly saved: TaxDocument[] = [];
  private readonly documents = new Map<string, TaxDocument>();

  async byKey(accessKey: AccessKey): Promise<TaxDocument | undefined> {
    return this.documents.get(accessKey.value);
  }

  async save(taxDocument: TaxDocument): Promise<void> {
    this.saved.push(taxDocument);
    this.documents.set(taxDocument.accessKey.value, taxDocument);
  }
}

class FakeGateway implements FiscalDocumentGateway {
  constructor(private readonly responses: {
    search: SearchResponse;
    manifest?: ManifestResponse;
    download?: DownloadResponse;
  }) {}

  async search(): Promise<SearchResponse> {
    return this.responses.search;
  }

  async manifest(): Promise<ManifestResponse> {
    return this.responses.manifest ?? { statusCode: "135", reason: null };
  }

  async download(): Promise<DownloadResponse> {
    return this.responses.download ?? { statusCode: "138", reason: null, content: "<xml />" };
  }
}

class FakeStorage implements DocumentStorage {
  readonly saved: Array<{ content: string }> = [];

  async saveXml(_entity: FiscalEntity, accessKey: AccessKey, content: string): Promise<string> {
    this.saved.push({ content });
    return `/tmp/${accessKey.value}.xml`;
  }
}

class FixedClock implements Clock {
  now(): Date {
    return new Date(NOW);
  }
}

class NoopLogger implements Logger {
  debug(): void {}
  info(): void {}
  error(): void {}
}
