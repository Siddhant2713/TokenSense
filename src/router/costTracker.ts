import type { RequestLog, AggregatedMetrics } from './types';

export class CostTracker {
  private logs: RequestLog[] = [];
  private dailyBudgets: Map<string, number> = new Map();

  record(log: RequestLog): void {
    this.logs.push(log);

    const date = log.timestamp.split('T')[0];
    const key = `${log.userId ?? 'global'}::${date}`;
    this.dailyBudgets.set(key, (this.dailyBudgets.get(key) ?? 0) + log.cost);
  }

  getDailySpend(userId?: string, date?: string): number {
    const d = date ?? new Date().toISOString().split('T')[0];
    const key = `${userId ?? 'global'}::${d}`;
    return this.dailyBudgets.get(key) ?? 0;
  }

  getTotalCost(): number {
    return this.logs.reduce((sum, l) => sum + l.cost, 0);
  }

  getCostByModel(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const log of this.logs) {
      result[log.model] = (result[log.model] ?? 0) + log.cost;
    }
    return result;
  }

  getCostByProvider(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const log of this.logs) {
      result[log.provider] = (result[log.provider] ?? 0) + log.cost;
    }
    return result;
  }

  getRequestsByTaskType(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const log of this.logs) {
      result[log.taskType] = (result[log.taskType] ?? 0) + 1;
    }
    return result;
  }

  getMetrics(): AggregatedMetrics {
    const total = this.logs.length;
    const cached = this.logs.filter(l => l.cached).length;
    const fallbacks = this.logs.filter(l => l.fallback).length;
    const avgLatency = total > 0
      ? this.logs.reduce((s, l) => s + l.latencyMs, 0) / total
      : 0;

    const dailyMap = new Map<string, { cost: number; requests: number }>();
    for (const log of this.logs) {
      const date = log.timestamp.split('T')[0];
      const entry = dailyMap.get(date) ?? { cost: 0, requests: 0 };
      entry.cost += log.cost;
      entry.requests++;
      dailyMap.set(date, entry);
    }

    return {
      totalRequests: total,
      totalCost: this.getTotalCost(),
      avgLatencyMs: Math.round(avgLatency),
      cacheHitRate: total > 0 ? cached / total : 0,
      fallbackRate: total > 0 ? fallbacks / total : 0,
      costByModel: this.getCostByModel(),
      costByProvider: this.getCostByProvider(),
      requestsByTaskType: this.getRequestsByTaskType(),
      dailyCosts: Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  getLogs(): RequestLog[] {
    return [...this.logs];
  }

  getRecentLogs(count: number): RequestLog[] {
    return this.logs.slice(-count);
  }

  clear(): void {
    this.logs = [];
    this.dailyBudgets.clear();
  }
}
