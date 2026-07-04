type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  action: string;
  message: string;
  data?: unknown;
  error?: string;
}

export class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  debug(action: string, message: string, data?: unknown) {
    this.log("debug", action, message, data);
  }

  info(action: string, message: string, data?: unknown) {
    this.log("info", action, message, data);
  }

  warn(action: string, message: string, data?: unknown) {
    this.log("warn", action, message, data);
  }

  error(action: string, message: string, err?: unknown, data?: unknown) {
    this.log("error", action, message, {
      ...(data as Record<string, unknown>),
      error: err instanceof Error ? err.message : String(err),
    });
  }

  private log(level: LogLevel, action: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      action,
      message,
      data,
    };

    const prefix = `[${entry.module}:${entry.action}]`;

    if (level === "error") {
      console.error(prefix, message, data ?? "");
    } else if (level === "warn") {
      console.warn(prefix, message, data ?? "");
    } else {
      console.log(prefix, message, data ?? "");
    }

    // In production, also write to AgentLog for critical errors
    if (level === "error" && typeof globalThis !== "undefined") {
      // Async fire-and-forget — don't block
      import("../lib/prisma")
        .then(({ prisma }) => {
          prisma.agentLog
            .create({
              data: {
                agentType: "SCHEDULER" as any,
                action,
                status: "FAILED" as any,
                error: message,
                output: { data, timestamp: entry.timestamp } as any,
              },
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
  }
}

export const appLogger = new Logger("app");
