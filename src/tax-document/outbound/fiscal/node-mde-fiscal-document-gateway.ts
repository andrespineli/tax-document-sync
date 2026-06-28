import { DistribuicaoDFe, RecepcaoEvento } from "node-mde";
import type { FiscalEntity } from "@/fiscal-entity/domain/models/fiscal-entity";
import type {
  DownloadResponse,
  FiscalDocumentGateway,
  ManifestResponse,
  SearchResponse,
} from "../../domain/ports/outbound/fiscal-document-gateway";
import { NodeMdeResponseNormalizer } from "./node-mde-response-normalizer";
import { UfCodes } from "./uf-codes";

type Environment = "1" | "2";

export class NodeMdeFiscalDocumentGateway implements FiscalDocumentGateway {
  private readonly normalizer = new NodeMdeResponseNormalizer();

  constructor(private readonly environment: Environment = "1") {}

  async search(
    fiscalEntity: FiscalEntity,
    lastSequenceNumber: number,
  ): Promise<SearchResponse> {
    const distribution = this.distributionFor(fiscalEntity);
    const response = await distribution.consultaUltNSU(
      String(lastSequenceNumber).padStart(15, "0"),
    );
    return this.normalizer.normalizeSearch(response);
  }

  async manifest(
    fiscalEntity: FiscalEntity,
    key: string,
  ): Promise<ManifestResponse> {
    const reception = this.receptionFor(fiscalEntity);
    const response = await reception.enviarEvento({
      idLote: String(Date.now()).slice(-15),
      lote: [{
        chNFe: key,
        tipoEvento: 210210,
      }],
    });
    return this.normalizer.normalizeManifest(response);
  }

  async download(
    fiscalEntity: FiscalEntity,
    key: string,
  ): Promise<DownloadResponse> {
    const distribution = this.distributionFor(fiscalEntity);
    const response = await distribution.consultaChNFe(key);
    return this.normalizer.normalizeDownload(response);
  }

  private distributionFor(fiscalEntity: FiscalEntity): DistribuicaoDFe {
    return new DistribuicaoDFe({
      pfx: this.certificateBuffer(fiscalEntity),
      passphrase: fiscalEntity.certificate?.password,
      cnpj: fiscalEntity.cnpj.value,
      cUFAutor: String(UfCodes.of(fiscalEntity.federalUnit.value)) as never,
      tpAmb: this.environment,
    });
  }

  private receptionFor(fiscalEntity: FiscalEntity): RecepcaoEvento {
    return new RecepcaoEvento({
      pfx: this.certificateBuffer(fiscalEntity),
      passphrase: fiscalEntity.certificate?.password,
      cnpj: fiscalEntity.cnpj.value,
      tpAmb: this.environment,
      timezone: "America/Sao_Paulo",
    });
  }

  private certificateBuffer(fiscalEntity: FiscalEntity): Buffer {
    if (!fiscalEntity.certificate) {
      throw new Error("Fiscal entity has no certificate");
    }

    return Buffer.from(fiscalEntity.certificate.contentBase64, "base64");
  }
}
