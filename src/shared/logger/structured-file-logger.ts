import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Clock } from "@/shared/date/clock";
import type { LogDirectory } from "./log-directory";
import type { LogContext, LogLevel, Logger } from "./logger";

const REDACTED = "[REDACTED]";

export class StructuredFileLogger implements Logger {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly logDirectory: LogDirectory,
    private readonly clock: Clock,
  ) {}

  debug(event: string, context: LogContext = {}): Promise<void> {
    return this.write("debug", event, context);
  }

  info(event: string, context: LogContext = {}): Promise<void> {
    return this.write("info", event, context);
  }

  warn(event: string, context: LogContext = {}): Promise<void> {
    return this.write("warn", event, context);
  }

  error(event: string, context: LogContext = {}): Promise<void> {
    return this.write("error", event, context);
  }

  private async write(level: LogLevel, event: string, context: LogContext): Promise<void> {
    const timestamp = this.clock.now().toISOString();
    const entry = {
      timestamp,
      level,
      event,
      context: StructuredFileLogger.sanitize(context),
    };

    this.writeChain = this.writeChain
      .then(() => this.append(timestamp, entry))
      .catch((error: unknown) => {
        console.error("STRUCTURED_LOG_WRITE_FAILED", error);
      });

    await this.writeChain;
  }

  private async append(timestamp: string, entry: Record<string, unknown>): Promise<void> {
    const directory = await this.logDirectory.resolve();
    await mkdir(directory, { recursive: true });
    await appendFile(
      join(directory, `tax-document-sync-${timestamp.slice(0, 10)}.jsonl`),
      `${JSON.stringify(entry)}\n`,
      "utf8",
    );
  }

  private static sanitize(value: unknown, key = "", seen = new WeakSet<object>()): unknown {
    if (key && StructuredFileLogger.isSensitiveKey(key)) {
      return REDACTED;
    }

    if (value === null || value === undefined) {
      return value ?? null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack ?? null,
      };
    }

    if (typeof value !== "object") {
      return value;
    }

    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => StructuredFileLogger.sanitize(item, "", seen));
    }

    const result: Record<string, unknown> = {};
    for (const [property, propertyValue] of Object.entries(value)) {
      result[property] = StructuredFileLogger.sanitize(propertyValue, property, seen);
    }
    return result;
  }

  private static isSensitiveKey(key: string): boolean {
    const normalized = key.toLowerCase();
    return [
      "password",
      "secret",
      "token",
      "certificate",
      "certificatecontent",
      "certificatecontentbase64",
      "certificatepassword",
      "content",
      "xml",
    ].some((sensitiveKey) => normalized.includes(sensitiveKey));
  }
}
