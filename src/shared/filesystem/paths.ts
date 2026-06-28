import { join } from "node:path";
import { homedir } from "node:os";

export class AppPaths {
  constructor(private readonly userDataPath?: string) {}

  databasePath(): string {
    return join(this.basePath(), "tax-document-sync.sqlite");
  }

  documentsPath(): string {
    return join(this.basePath(), "documents");
  }

  certificatesPath(): string {
    return join(this.basePath(), "certificates");
  }

  logsPath(): string {
    return join(this.basePath(), "logs");
  }

  rememberedSessionPath(): string {
    return join(this.basePath(), "session", "remembered-session.json");
  }

  private basePath(): string {
    return this.userDataPath ?? join(homedir(), ".tax-document-sync");
  }
}
