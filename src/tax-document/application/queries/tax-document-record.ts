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
