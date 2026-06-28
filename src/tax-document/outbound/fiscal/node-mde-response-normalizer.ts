import type {
  DistributedDocumentSummary,
  DownloadResponse,
  ManifestResponse,
  SearchResponse,
} from "../../domain/ports/outbound/fiscal-document-gateway";

interface NodeMdeDocZip {
  xml: string;
  json?: unknown;
  nsu?: string;
  schema?: string;
}

interface NodeMdeDistributionResponse {
  data?: {
    cStat?: string;
    xMotivo?: string;
    ultNSU?: string;
    docZip?: NodeMdeDocZip[] | NodeMdeDocZip;
  };
  error?: string;
}

interface NodeMdeEventResponse {
  data?: {
    cStat?: string;
    xMotivo?: string;
    infEvento?: NodeMdeEvent[] | NodeMdeEvent;
  };
  error?: string;
}

interface NodeMdeEvent {
  cStat?: string;
  xMotivo?: string;
}

export class NodeMdeResponseNormalizer {
  normalizeSearch(response: NodeMdeDistributionResponse): SearchResponse {
    if (response.error) {
      throw new Error(response.error);
    }

    const data = response.data ?? {};
    const entries = this.arrayOf(data.docZip);

    return {
      statusCode: data.cStat ?? "",
      reason: data.xMotivo ?? null,
      lastSequenceNumber: this.toNumber(data.ultNSU),
      documents: entries.flatMap((entry) => this.toSummary(entry)),
    };
  }

  normalizeDownload(response: NodeMdeDistributionResponse): DownloadResponse {
    const search = this.normalizeSearch(response);
    const document = search.documents.find((entry) => entry.xml.includes("<nfeProc")) ??
      search.documents[0];

    return {
      statusCode: search.statusCode,
      reason: search.reason,
      content: document?.xml ?? null,
    };
  }

  normalizeManifest(response: NodeMdeEventResponse): ManifestResponse {
    if (response.error) {
      throw new Error(response.error);
    }

    const event = this.arrayOf(response.data?.infEvento)[0];
    return {
      statusCode: event?.cStat ?? response.data?.cStat ?? "",
      reason: event?.xMotivo ?? response.data?.xMotivo ?? null,
    };
  }

  private toSummary(entry: NodeMdeDocZip | undefined): DistributedDocumentSummary[] {
    if (!entry?.xml) {
      return [];
    }

    const json = entry.json;
    const key = this.findString(json, "chNFe") ?? this.accessKeyFromXml(entry.xml);
    const statusCode = this.findString(json, "cSitNFe") ??
      this.findString(json, "cStat") ??
      "";

    if (!key) {
      return [];
    }

    return [{
      key,
      statusCode,
      xml: entry.xml,
      nsu: entry.nsu ?? null,
    }];
  }

  private accessKeyFromXml(xml: string): string | undefined {
    const chNFe = xml.match(/<chNFe>(\d{44})<\/chNFe>/)?.[1];
    if (chNFe) {
      return chNFe;
    }

    return xml.match(/Id=["']NFe(\d{44})["']/)?.[1];
  }

  private findString(value: unknown, key: string): string | undefined {
    const found = this.find(value, key);
    if (typeof found === "string") {
      return found;
    }
    if (typeof found === "number") {
      return String(found);
    }
    return undefined;
  }

  private find(value: unknown, key: string): unknown {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return (value as Record<string, unknown>)[key];
    }

    for (const child of Object.values(value as Record<string, unknown>)) {
      const found = this.find(child, key);
      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  private arrayOf<T>(value: T | T[] | undefined): T[] {
    if (!value) {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }

  private toNumber(value: string | undefined): number {
    const normalized = value ? Number.parseInt(value, 10) : 0;
    return Number.isFinite(normalized) ? normalized : 0;
  }
}
