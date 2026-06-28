import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FiscalEntity } from "@/fiscal-entity/domain/models/fiscal-entity";
import type { Settings } from "@/settings/domain/ports/outbound/settings";
import type { AppPaths } from "@/shared/filesystem/paths";
import type { AccessKey } from "../../domain/models/access-key";
import type { DocumentStorage } from "../../domain/ports/outbound/document-storage";

export class LocalDocumentStorage implements DocumentStorage {
  constructor(
    private readonly settings: Settings,
    private readonly appPaths: AppPaths,
  ) {}

  async saveXml(
    fiscalEntity: FiscalEntity,
    accessKey: AccessKey,
    content: string,
  ): Promise<string> {
    const settings = await this.settings.get();
    const baseDirectory = settings.storageDirectory ?? this.appPaths.documentsPath();
    const companyDirectory = join(baseDirectory, fiscalEntity.cnpj.value);
    await mkdir(companyDirectory, { recursive: true });
    const filePath = join(companyDirectory, `${accessKey.value}.xml`);
    await writeFile(filePath, content, "utf8");
    return filePath;
  }
}
