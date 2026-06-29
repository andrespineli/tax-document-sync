import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Clock } from "@/shared/date/clock";
import type { LogDirectory } from "@/shared/logger/log-directory";
import { StructuredFileLogger } from "@/shared/logger/structured-file-logger";

const NOW = new Date("2026-06-29T14:35:12.000Z");

describe("StructuredFileLogger", () => {
  it("writes JSON lines to a daily log file and redacts sensitive fields", async () => {
    const directory = await mkdtemp(join(tmpdir(), "tax-document-logs-"));
    const logger = new StructuredFileLogger(
      new FixedLogDirectory(directory),
      new FixedClock(),
    );

    await logger.info("TAX_DOCUMENT_DOWNLOAD_FINISHED", {
      key: "123",
      content: "<xml />",
      certificatePassword: "secret",
      nested: {
        token: "session-token",
        safe: "value",
      },
    });

    const content = await readFile(
      join(directory, "tax-document-sync-2026-06-29.jsonl"),
      "utf8",
    );
    const entry = JSON.parse(content.trim()) as {
      timestamp: string;
      level: string;
      event: string;
      context: {
        key: string;
        content: string;
        certificatePassword: string;
        nested: {
          token: string;
          safe: string;
        };
      };
    };

    expect(entry.timestamp).toBe(NOW.toISOString());
    expect(entry.level).toBe("info");
    expect(entry.event).toBe("TAX_DOCUMENT_DOWNLOAD_FINISHED");
    expect(entry.context.key).toBe("123");
    expect(entry.context.content).toBe("[REDACTED]");
    expect(entry.context.certificatePassword).toBe("[REDACTED]");
    expect(entry.context.nested.token).toBe("[REDACTED]");
    expect(entry.context.nested.safe).toBe("value");
  });
});

class FixedLogDirectory implements LogDirectory {
  constructor(private readonly directory: string) {}

  async resolve(): Promise<string> {
    return this.directory;
  }
}

class FixedClock implements Clock {
  now(): Date {
    return new Date(NOW);
  }
}
