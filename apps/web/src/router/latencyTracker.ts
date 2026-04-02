export class LatencyTracker {
  private measurements: Map<string, number[]> = new Map();

  record(model: string, latencyMs: number): void {
    const existing = this.measurements.get(model) ?? [];
    existing.push(latencyMs);
    if (existing.length > 1000) existing.shift();
    this.measurements.set(model, existing);
  }

  getAverage(model: string): number {
    const data = this.measurements.get(model);
    if (!data || data.length === 0) return 0;
    return Math.round(data.reduce((a, b) => a + b, 0) / data.length);
  }

  getP95(model: string): number {
    const data = this.measurements.get(model);
    if (!data || data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[idx] ?? sorted[sorted.length - 1];
  }

  getP99(model: string): number {
    const data = this.measurements.get(model);
    if (!data || data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.99);
    return sorted[idx] ?? sorted[sorted.length - 1];
  }

  getAllStats(): Record<string, { avg: number; p95: number; p99: number; count: number }> {
    const result: Record<string, { avg: number; p95: number; p99: number; count: number }> = {};
    for (const model of this.measurements.keys()) {
      result[model] = {
        avg: this.getAverage(model),
        p95: this.getP95(model),
        p99: this.getP99(model),
        count: this.measurements.get(model)?.length ?? 0,
      };
    }
    return result;
  }

  measure<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
    const start = performance.now();
    return fn().then(result => ({
      result,
      latencyMs: Math.round(performance.now() - start),
    }));
  }
}
