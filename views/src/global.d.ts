import type { TaxDocumentSyncApi } from "@main/preload";

declare global {
  interface Window {
    taxDocumentSync: TaxDocumentSyncApi;
  }
}
