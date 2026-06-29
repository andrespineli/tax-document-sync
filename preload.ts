import { contextBridge, ipcRenderer } from "electron";
import type { SyncStatus } from "@main/sync-scheduler";
import type { UpdateStatus } from "@main/update-service";

let token: string | undefined;

async function invoke<T>(channel: string, payload: unknown = {}): Promise<T> {
  return ipcRenderer.invoke(channel, { token, payload }) as Promise<T>;
}

const api = {
  auth: {
    state: () => ipcRenderer.invoke("auth:state") as Promise<{ hasAdmin: boolean }>,
    setup: (payload: { username: string; password: string }) =>
      ipcRenderer.invoke("auth:setup", payload) as Promise<{ hasAdmin: boolean }>,
    login: async (payload: { username: string; password: string; remember: boolean }) => {
      const session = await ipcRenderer.invoke("auth:login", payload) as {
        token: string;
        username: string;
      };
      token = session.token;
      return { username: session.username };
    },
    resume: async () => {
      const session = await ipcRenderer.invoke("auth:resume") as {
        token: string;
        username: string;
      } | null;
      token = session?.token;
      return session ? { username: session.username } : null;
    },
    logout: async () => {
      await ipcRenderer.invoke("auth:logout", token);
      token = undefined;
    },
  },
  settings: {
    get: () => invoke("settings:get"),
    save: (payload: {
      storageDirectory: string | null;
      logDirectory: string | null;
      syncIntervalMinutes: number;
      notificationsEnabled: boolean;
      theme: "light" | "dark";
    }) =>
      invoke("settings:save", payload),
    chooseDirectory: () => invoke<string | null>("settings:chooseDirectory"),
  },
  certificates: {
    pick: () => invoke<string | null>("certificate:pick"),
  },
  fiscalEntities: {
    list: () => invoke("fiscalEntity:list"),
    save: (payload: {
      id?: string;
      legalName: string;
      cnpj: string;
      uf: string;
      certificatePath?: string;
      certificatePassword?: string;
    }) => invoke("fiscalEntity:save", payload),
  },
  taxDocuments: {
    list: (payload: { fiscalEntityId?: string; status?: string } = {}) =>
      invoke("taxDocument:list", payload),
    open: (filePath: string) => invoke("taxDocument:open", { filePath }),
  },
  sync: {
    status: () => invoke<SyncStatus>("sync:status"),
    runNow: () => invoke<SyncStatus>("sync:runNow"),
    start: () => invoke<SyncStatus>("sync:start"),
    stop: () => invoke<SyncStatus>("sync:stop"),
    onStatus: (callback: (status: SyncStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: SyncStatus) => {
        callback(status);
      };
      ipcRenderer.on("sync:status", listener);
      return () => {
        ipcRenderer.removeListener("sync:status", listener);
      };
    },
  },
  updates: {
    status: () => invoke<UpdateStatus>("updates:status"),
    check: () => invoke<UpdateStatus>("updates:check"),
    install: () => invoke<UpdateStatus>("updates:install"),
    onStatus: (callback: (status: UpdateStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => {
        callback(status);
      };
      ipcRenderer.on("updates:status", listener);
      return () => {
        ipcRenderer.removeListener("updates:status", listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld("taxDocumentSync", api);

export type TaxDocumentSyncApi = typeof api;
