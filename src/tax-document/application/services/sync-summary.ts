export interface SyncSummary {
  searchedEntities: number;
  delayedEntities: number;
  skippedDocuments: number;
  manifestedDocuments: number;
  downloadedDocuments: number;
  loadedDocuments: number;
  errors: string[];
}
