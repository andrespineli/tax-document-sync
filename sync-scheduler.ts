import { Notification, type BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";
import { SynchronizeTaxDocuments } from "@/tax-document/application/commands/synchronize-tax-documents";
import type { SynchronizeTaxDocumentsHandler } from "@/tax-document/application/handlers/synchronize-tax-documents-handler";
import type { SyncSummary } from "@/tax-document/application/services/sync-summary";
import type { Settings } from "@/settings/domain/ports/outbound/settings";
import type { Logger } from "@/shared/logger/logger";

type SyncTrigger = "manual" | "scheduled" | "scheduler_start";

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
    private readonly logger: Logger,
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
    await this.logger.info("SYNC_SCHEDULER_STARTED", {
      intervalMinutes,
      nextRunAt: this.status.nextRunAt,
    });
    await this.runNow("scheduler_start");
    return this.status;
  }

  stop(): SyncStatus {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.status.running = false;
    this.status.nextRunAt = null;
    void this.logger.info("SYNC_SCHEDULER_STOPPED");
    this.emit();
    return this.status;
  }

  async runNow(trigger: SyncTrigger = "manual"): Promise<SyncStatus> {
    const runId = randomUUID();

    if (this.status.inProgress) {
      await this.logger.warn("SYNC_RUN_SKIPPED_IN_PROGRESS", {
        runId,
        trigger,
      });
      return this.status;
    }

    this.status.inProgress = true;
    this.status.lastError = null;
    this.emit();
    await this.logger.info("SYNC_RUN_STARTED", {
      runId,
      trigger,
    });

    try {
      this.status.lastSummary = await this.handler.handle(
        new SynchronizeTaxDocuments(new Date(), runId),
      );
      this.status.lastRunAt = new Date().toISOString();
      await this.logger.info("SYNC_RUN_FINISHED", {
        runId,
        trigger,
        summary: this.status.lastSummary,
        lastRunAt: this.status.lastRunAt,
      });
      await this.notifyWhenDocumentsWereFound(this.status.lastSummary);
    } catch (error) {
      this.status.lastError = error instanceof Error ? error.message : String(error);
      await this.logger.error("SYNC_RUN_FAILED", {
        runId,
        trigger,
        error,
      });
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
      void this.runNow("scheduled");
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
