import { type BrowserWindow } from "electron";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;

export type UpdateState =
  | "disabled"
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateStatus {
  state: UpdateState;
  currentVersion: string;
  latestVersion: string | null;
  error: string | null;
  progress: number | null;
}

export class UpdateService {
  private window: BrowserWindow | null = null;
  private initialized = false;
  private status: UpdateStatus;

  constructor(
    currentVersion: string,
    private readonly packaged: boolean,
  ) {
    this.status = {
      state: packaged ? "idle" : "disabled",
      currentVersion,
      latestVersion: null,
      error: null,
      progress: null,
    };
  }

  attach(window: BrowserWindow): void {
    this.window = window;
  }

  initialize(): void {
    if (this.initialized || !this.packaged) {
      return;
    }

    this.initialized = true;
    autoUpdater.autoDownload = true;
    autoUpdater.on("checking-for-update", () => {
      this.setStatus({ state: "checking", error: null, progress: null });
    });
    autoUpdater.on("update-available", (info) => {
      this.setStatus({ state: "available", latestVersion: info.version, error: null });
    });
    autoUpdater.on("update-not-available", (info) => {
      this.setStatus({ state: "not-available", latestVersion: info.version, error: null });
    });
    autoUpdater.on("download-progress", (progress) => {
      this.setStatus({ state: "downloading", progress: Math.round(progress.percent) });
    });
    autoUpdater.on("update-downloaded", (info) => {
      this.setStatus({
        state: "downloaded",
        latestVersion: info.version,
        error: null,
        progress: 100,
      });
    });
    autoUpdater.on("error", (error) => {
      this.setStatus({
        state: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  current(): UpdateStatus {
    return this.status;
  }

  async check(): Promise<UpdateStatus> {
    if (!this.packaged) {
      this.setStatus({ state: "disabled", error: null, progress: null });
      return this.status;
    }

    try {
      this.initialize();
      await autoUpdater.checkForUpdates();
    } catch (error) {
      this.setStatus({
        state: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return this.status;
  }

  install(): UpdateStatus {
    if (this.status.state === "downloaded") {
      autoUpdater.quitAndInstall(false, true);
    }

    return this.status;
  }

  private setStatus(status: Partial<UpdateStatus>): void {
    this.status = { ...this.status, ...status };
    this.emit();
  }

  private emit(): void {
    if (!this.window || this.window.isDestroyed() || this.window.webContents.isDestroyed()) {
      return;
    }

    this.window.webContents.send("updates:status", this.status);
  }
}
