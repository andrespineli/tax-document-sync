import { Notification, type BrowserWindow } from "electron";
import { SynchronizeTaxDocuments } from "@/tax-document/application/commands/synchronize-tax-documents";
import type { SynchronizeTaxDocumentsHandler } from "@/tax-document/application/handlers/synchronize-tax-documents-handler";
import type { SyncSummary } from "@/tax-document/application/services/sync-summary";
import type { Settings } from "@/settings/domain/ports/outbound/settings";

export interface SyncStatus {
  running: boolean;
  inProgress: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastSummary: SyncSummary | null;
  lastError: string | null;
}

export class SyncScheduler {
  private interval: NodeJS.Timeout | null = null;
  private window: BrowserWindow | null = null;
  private status: SyncStatus = {
    running: false,
    inProgress: false,
    lastRunAt: null,
    nextRunAt: null,
    lastSummary: null,
    lastError: null,
  };

  constructor(
    private readonly handler: SynchronizeTaxDocumentsHandler,
    private readonly settings: Settings,
  ) {}

  attach(window: BrowserWindow): void {
    this.window = window;
  }

  current(): SyncStatus {
    return this.status;
  }

  async start(): Promise<SyncStatus> {
    if (this.interval) {
      return this.status;
    }

    const intervalMinutes = (await this.settings.get()).syncIntervalMinutes;
    this.status.running = true;
    this.scheduleNext(intervalMinutes);
    await this.runNow();
    return this.status;
  }

  stop(): SyncStatus {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.status.running = false;
    this.status.nextRunAt = null;
    this.emit();
    return this.status;
  }

  async runNow(): Promise<SyncStatus> {
    if (this.status.inProgress) {
      return this.status;
    }

    this.status.inProgress = true;
    this.status.lastError = null;
    this.emit();

    try {
      this.status.lastSummary = await this.handler.handle(
        new SynchronizeTaxDocuments(new Date()),
      );
      this.status.lastRunAt = new Date().toISOString();
      await this.notifyWhenDocumentsWereFound(this.status.lastSummary);
    } catch (error) {
      this.status.lastError = error instanceof Error ? error.message : String(error);
    } finally {
      this.status.inProgress = false;
      this.emit();
    }

    return this.status;
  }

  private scheduleNext(intervalMinutes: number): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    const milliseconds = intervalMinutes * 60_000;
    this.status.nextRunAt = new Date(Date.now() + milliseconds).toISOString();
    this.interval = setInterval(() => {
      this.status.nextRunAt = new Date(Date.now() + milliseconds).toISOString();
      void this.runNow();
    }, milliseconds);
    this.emit();
  }

  private emit(): void {
    if (!this.window || this.window.isDestroyed() || this.window.webContents.isDestroyed()) {
      return;
    }

    this.window?.webContents.send("sync:status", this.status);
  }

  private async notifyWhenDocumentsWereFound(summary: SyncSummary): Promise<void> {
    const settings = await this.settings.get();
    if (!settings.notificationsEnabled || summary.loadedDocuments < 1) {
      return;
    }

    if (!Notification.isSupported()) {
      return;
    }

    const count = summary.loadedDocuments;
    const noun = count === 1 ? "documento fiscal" : "documentos fiscais";
    const suffix = count === 1 ? "" : "s";
    const found = count === 1 ? "encontrado" : "encontrados";

    new Notification({
      title: "Sincronizador de Documentos Fiscais",
      body: `${count} novo${suffix} ${noun} ${found}.`,
    }).show();
  }
}
