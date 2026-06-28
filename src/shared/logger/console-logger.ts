import type { Logger } from "./logger";

export class ConsoleLogger implements Logger {
  debug(message: string, context: Record<string, unknown> = {}): void {
    console.debug(message, context);
  }

  info(message: string, context: Record<string, unknown> = {}): void {
    console.info(message, context);
  }

  error(message: string, context: Record<string, unknown> = {}): void {
    console.error(message, context);
  }
}
