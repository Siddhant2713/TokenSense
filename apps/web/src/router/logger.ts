import type { RequestLog } from '@tokensense/types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export class Logger {
  private entries: LogEntry[] = [];
  private level: LogLevel;
  private maxEntries: number;

  private static readonly LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(level: LogLevel = 'info', maxEntries = 10000) {
    this.level = level;
    this.maxEntries = maxEntries;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }

  logRequest(log: RequestLog): void {
    this.info('request_completed', {
      requestId: log.requestId,
      model: log.model,
      provider: log.provider,
      taskType: log.taskType,
      complexity: log.complexity,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      cost: log.cost,
      latencyMs: log.latencyMs,
      cached: log.cached,
      fallback: log.fallback,
      success: log.success,
      ...(log.error && { error: log.error }),
    });
  }

  getEntries(level?: LogLevel): LogEntry[] {
    if (!level) return [...this.entries];
    const minLevel = Logger.LEVELS[level];
    return this.entries.filter(e => Logger.LEVELS[e.level] >= minLevel);
  }

  getRecentEntries(count: number): LogEntry[] {
    return this.entries.slice(-count);
  }

  clear(): void {
    this.entries = [];
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (Logger.LEVELS[level] < Logger.LEVELS[this.level]) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-Math.floor(this.maxEntries * 0.8));
    }
  }
}
