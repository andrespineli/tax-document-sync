import { dialog, ipcMain, shell } from "electron";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { SaveFiscalEntity } from "@/fiscal-entity/application/commands/save-fiscal-entity";
import { SaveSettings } from "@/settings/application/commands/save-settings";
import { Login } from "@/shared/auth/application/commands/login";
import { SetupAdmin } from "@/shared/auth/application/commands/setup-admin";
import type { Dependencies } from "./dependencies";

interface AuthenticatedRequest<T> {
  token?: string;
  payload: T;
}

export class Ipc {
  constructor(private readonly dependencies: Dependencies) {}

  register(): void {
    ipcMain.handle("auth:state", async () => this.dependencies.authStateQuery.execute());

    ipcMain.handle("auth:setup", async (_event, payload: {
      username: string;
      password: string;
    }) => {
      await this.dependencies.setupAdminHandler.handle(
        new SetupAdmin(payload.username, payload.password),
      );
      return this.dependencies.authStateQuery.execute();
    });

    ipcMain.handle("auth:login", async (_event, payload: {
      username: string;
      password: string;
      remember: boolean;
    }) => {
      const session = await this.dependencies.loginHandler.handle(
        new Login(payload.username, payload.password),
      );
      this.dependencies.sessionStore.start(session.token, session.username);

      if (payload.remember) {
        await this.dependencies.rememberedSessionManager.remember(session.userId);
      } else {
        await this.dependencies.rememberedSessionManager.clear();
      }

      await this.dependencies.syncScheduler.start();
      return session;
    });

    ipcMain.handle("auth:resume", async () => {
      const rememberedSession = await this.dependencies.rememberedSessionManager.resume();
      if (!rememberedSession) {
        return null;
      }

      const token = randomBytes(32).toString("hex");
      this.dependencies.sessionStore.start(token, rememberedSession.username);
      await this.dependencies.syncScheduler.start();
      return { token, username: rememberedSession.username };
    });

    ipcMain.handle("auth:logout", async (_event, token: string | undefined) => {
      this.dependencies.sessionStore.require(token);
      this.dependencies.sessionStore.end();
      await this.dependencies.rememberedSessionManager.clear();
      this.dependencies.syncScheduler.stop();
      return {};
    });

    ipcMain.handle("settings:get", async (_event, request: AuthenticatedRequest<unknown>) => {
      this.dependencies.sessionStore.require(request.token);
      return this.dependencies.settingsQuery.execute();
    });

    ipcMain.handle("settings:save", async (_event, request: AuthenticatedRequest<{
      storageDirectory: string | null;
      logDirectory: string | null;
      syncIntervalMinutes: number;
      notificationsEnabled: boolean;
      theme: "light" | "dark";
    }>) => {
      this.dependencies.sessionStore.require(request.token);
      await this.dependencies.saveSettingsHandler.handle(
        new SaveSettings(
          request.payload.storageDirectory,
          request.payload.logDirectory,
          request.payload.syncIntervalMinutes,
          request.payload.notificationsEnabled,
          request.payload.theme,
        ),
      );
      return this.dependencies.settingsQuery.execute();
    });

    ipcMain.handle("settings:chooseDirectory", async (_event, request: AuthenticatedRequest<unknown>) => {
      this.dependencies.sessionStore.require(request.token);
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
      });
      return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle("certificate:pick", async (_event, request: AuthenticatedRequest<unknown>) => {
      this.dependencies.sessionStore.require(request.token);
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Certificado A1", extensions: ["pfx", "p12"] }],
      });
      return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle("fiscalEntity:list", async (_event, request: AuthenticatedRequest<unknown>) => {
      this.dependencies.sessionStore.require(request.token);
      return this.dependencies.fiscalEntityQuery.execute();
    });

    ipcMain.handle("fiscalEntity:save", async (_event, request: AuthenticatedRequest<{
      id?: string;
      legalName: string;
      cnpj: string;
      uf: string;
      certificatePath?: string;
      certificatePassword?: string;
    }>) => {
      this.dependencies.sessionStore.require(request.token);
      const certificateContentBase64 = request.payload.certificatePath
        ? (await readFile(request.payload.certificatePath)).toString("base64")
        : undefined;

      const result = await this.dependencies.saveFiscalEntityHandler.handle(
        new SaveFiscalEntity(
          request.payload.id,
          request.payload.legalName,
          request.payload.cnpj,
          request.payload.uf,
          certificateContentBase64,
          request.payload.certificatePassword,
        ),
      );

      await this.dependencies.syncScheduler.start();
      return result;
    });

    ipcMain.handle("taxDocument:list", async (_event, request: AuthenticatedRequest<{
      fiscalEntityId?: string;
      status?: string;
    }>) => {
      this.dependencies.sessionStore.require(request.token);
      return this.dependencies.taxDocumentQuery.execute(request.payload);
    });

    ipcMain.handle("taxDocument:open", async (_event, request: AuthenticatedRequest<{
      filePath: string;
    }>) => {
      this.dependencies.sessionStore.require(request.token);
      return shell.openPath(request.payload.filePath);
    });

    ipcMain.handle("sync:status", async (_event, request: AuthenticatedRequest<unknown>) => {
      this.dependencies.sessionStore.require(request.token);
      return this.dependencies.syncScheduler.current();
    });

    ipcMain.handle("sync:runNow", async (_event, request: AuthenticatedRequest<unknown>) => {
      this.dependencies.sessionStore.require(request.token);
      return this.dependencies.syncScheduler.runNow();
    });

    ipcMain.handle("sync:start", async (_event, request: AuthenticatedRequest<unknown>) => {
      this.dependencies.sessionStore.require(request.token);
      return this.dependencies.syncScheduler.start();
    });

    ipcMain.handle("sync:stop", async (_event, request: AuthenticatedRequest<unknown>) => {
      this.dependencies.sessionStore.require(request.token);
      return this.dependencies.syncScheduler.stop();
    });

    ipcMain.handle("updates:status", async (_event, request: AuthenticatedRequest<unknown>) => {
      this.dependencies.sessionStore.require(request.token);
      return this.dependencies.updateService.current();
    });

    ipcMain.handle("updates:check", async (_event, request: AuthenticatedRequest<unknown>) => {
      this.dependencies.sessionStore.require(request.token);
      return this.dependencies.updateService.check();
    });

    ipcMain.handle("updates:install", async (_event, request: AuthenticatedRequest<unknown>) => {
      this.dependencies.sessionStore.require(request.token);
      return this.dependencies.updateService.install();
    });
  }

}
