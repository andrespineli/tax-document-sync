import type { LogContext, Logger } from "./logger";

export class ConsoleLogger implements Logger {
  async debug(event: string, context: LogContext = {}): Promise<void> {
    console.debug(event, context);
  }

  async info(event: string, context: LogContext = {}): Promise<void> {
    console.info(event, context);
  }

  async warn(event: string, context: LogContext = {}): Promise<void> {
    console.warn(event, context);
  }

  async error(event: string, context: LogContext = {}): Promise<void> {
    console.error(event, context);
  }
}
