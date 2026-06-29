export interface AuthState {
  hasAdmin: boolean;
}

export interface FiscalEntityRecord {
  id: string;
  legalName: string;
  cnpj: string;
  uf: string;
  hasCertificate: boolean;
  lastDfeSequenceNumber: number;
  nextSearchAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxDocumentRecord {
  id: string;
  fiscalEntityId: string;
  companyName: string;
  companyDocument: string;
  key: string;
  type: string;
  status: string;
  filePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettingsRecord {
  storageDirectory: string | null;
  logDirectory: string | null;
  syncIntervalMinutes: number;
  notificationsEnabled: boolean;
  theme: "light" | "dark";
}

export interface SyncSummary {
  searchedEntities: number;
  delayedEntities: number;
  skippedDocuments: number;
  manifestedDocuments: number;
  downloadedDocuments: number;
  loadedDocuments: number;
  errors: string[];
}

export interface SyncStatus {
  running: boolean;
  inProgress: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastSummary: SyncSummary | null;
  lastError: string | null;
}

export interface UpdateStatus {
  state: "disabled" | "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  currentVersion: string;
  latestVersion: string | null;
  error: string | null;
  progress: number | null;
}
