export type LogContext = Record<string, unknown>;
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(event: string, context?: LogContext): Promise<void>;
  info(event: string, context?: LogContext): Promise<void>;
  warn(event: string, context?: LogContext): Promise<void>;
  error(event: string, context?: LogContext): Promise<void>;
}
