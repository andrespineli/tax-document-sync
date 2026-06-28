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
