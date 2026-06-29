import { app } from "electron";
import { join } from "node:path";
import { SaveFiscalEntityHandler } from "@/fiscal-entity/application/handlers/save-fiscal-entity-handler";
import { Query as FiscalEntityQuery } from "@/fiscal-entity/application/queries/query";
import { SqliteFiscalEntities } from "@/fiscal-entity/outbound/persistence/sqlite-fiscal-entities";
import { SaveSettingsHandler } from "@/settings/application/handlers/save-settings-handler";
import { Query as SettingsQuery } from "@/settings/application/queries/query";
import { SqliteSettings } from "@/settings/outbound/persistence/sqlite-settings";
import { LoginHandler } from "@/shared/auth/application/handlers/login-handler";
import { SetupAdminHandler } from "@/shared/auth/application/handlers/setup-admin-handler";
import { Query as AuthStateQuery } from "@/shared/auth/application/queries/query";
import { SqliteRememberedSessions } from "@/shared/auth/outbound/persistence/sqlite-remembered-sessions";
import { SqliteUsers } from "@/shared/auth/outbound/persistence/sqlite-users";
import { AppPaths } from "@/shared/filesystem/paths";
import { StructuredFileLogger } from "@/shared/logger/structured-file-logger";
import { PasswordHasher } from "@/shared/security/password-hasher";
import { RememberedSessionManager } from "@/shared/session/remembered-session-manager";
import { RememberedSessionTokenStore } from "@/shared/session/remembered-session-token-store";
import { SessionStore } from "@/shared/session/session-store";
import { SessionTokenHasher } from "@/shared/session/session-token-hasher";
import { DatabaseFactory } from "@/shared/sqlite/database";
import { MigrationRunner } from "@/shared/sqlite/migration-runner";
import { SystemClock } from "@/shared/date/system-clock";
import { SynchronizeTaxDocumentsHandler } from "@/tax-document/application/handlers/synchronize-tax-documents-handler";
import { Query as TaxDocumentQuery } from "@/tax-document/application/queries/query";
import { NodeMdeFiscalDocumentGateway } from "@/tax-document/outbound/fiscal/node-mde-fiscal-document-gateway";
import { SqliteTaxDocuments } from "@/tax-document/outbound/persistence/sqlite-tax-documents";
import { LocalDocumentStorage } from "@/tax-document/outbound/storage/local-document-storage";
import { ElectronSecretCodec } from "./electron-secret-codec";
import { SyncScheduler } from "./sync-scheduler";
import { UpdateService } from "./update-service";
import { SettingsLogDirectory } from "./settings-log-directory";

export class Dependencies {
  readonly appPaths = new AppPaths(app.getPath("userData"));
  readonly database = new DatabaseFactory().open(this.appPaths.databasePath());
  readonly sessionStore = new SessionStore();
  readonly secretCodec = new ElectronSecretCodec();
  readonly sessionTokenHasher = new SessionTokenHasher();
  readonly rememberedSessionTokenStore = new RememberedSessionTokenStore(
    this.appPaths.rememberedSessionPath(),
    this.secretCodec,
  );

  readonly users = new SqliteUsers(this.database);
  readonly rememberedSessions = new SqliteRememberedSessions(this.database);
  readonly rememberedSessionManager = new RememberedSessionManager(
    this.users,
    this.rememberedSessions,
    this.rememberedSessionTokenStore,
    this.sessionTokenHasher,
  );
  readonly settings = new SqliteSettings(this.database);
  readonly logger = new StructuredFileLogger(
    new SettingsLogDirectory(this.settings, this.appPaths),
    new SystemClock(),
  );
  readonly fiscalEntities = new SqliteFiscalEntities(
    this.database,
    this.secretCodec,
  );
  readonly taxDocuments = new SqliteTaxDocuments(this.database);

  readonly authStateQuery = new AuthStateQuery(this.users);
  readonly setupAdminHandler = new SetupAdminHandler(
    this.users,
    new PasswordHasher(),
  );
  readonly loginHandler = new LoginHandler(this.users, new PasswordHasher());

  readonly saveSettingsHandler = new SaveSettingsHandler(this.settings);
  readonly settingsQuery = new SettingsQuery(this.settings, this.appPaths);

  readonly saveFiscalEntityHandler = new SaveFiscalEntityHandler(
    this.fiscalEntities,
  );
  readonly fiscalEntityQuery = new FiscalEntityQuery(this.database);

  readonly taxDocumentQuery = new TaxDocumentQuery(this.database);
  readonly synchronizeTaxDocumentsHandler = new SynchronizeTaxDocumentsHandler(
    this.fiscalEntities,
    this.taxDocuments,
    new NodeMdeFiscalDocumentGateway(),
    new LocalDocumentStorage(this.settings, this.appPaths),
    new SystemClock(),
    this.logger,
  );
  readonly syncScheduler = new SyncScheduler(
    this.synchronizeTaxDocumentsHandler,
    this.settings,
    this.logger,
  );
  readonly updateService = new UpdateService(app.getVersion(), app.isPackaged);

  initialize(): void {
    new MigrationRunner(this.database, this.migrationsDirectory()).run();
  }

  private migrationsDirectory(): string {
    return app.isPackaged
      ? join(process.resourcesPath, "db", "migrations")
      : join(process.cwd(), "db", "migrations");
  }
}
