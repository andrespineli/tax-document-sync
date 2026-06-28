import type { AccessKey } from "../../models/access-key";
import type { TaxDocument } from "../../models/tax-document";

export interface TaxDocuments {
  byKey(accessKey: AccessKey): Promise<TaxDocument | undefined>;
  save(taxDocument: TaxDocument): Promise<void>;
}
