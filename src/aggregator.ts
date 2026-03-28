import type { Log, TeamMetrics, Model, CloudResourceLog, CloudResourceMetrics, DailyCost } from './types';

// ─── LLM Pricing (per token) ────────────────────────────────────
export const PRICING: Record<Model, { input: number; output: number }> = {
  'gpt-4o':          { input: 0.000005,   output: 0.000015  },
  'gpt-4o-mini':     { input: 0.00000015, output: 0.0000006 },
  'gpt-3.5-turbo':   { input: 0.0000005,  output: 0.0000015 },
  'claude-3-opus':   { input: 0.000015,   output: 0.000075  },
  'claude-3-haiku':  { input: 0.00000025, output: 0.00000125},
  'gemini-1.5-pro':  { input: 0.0000035,  output: 0.0000105 },
  'gemini-1.5-flash':{ input: 0.000000075,output: 0.0000003 },
};

// Which cheap model to recommend for each expensive one
export const MODEL_DOWNGRADE_MAP: Partial<Record<Model, Model>> = {
  'gpt-4o':         'gpt-4o-mini',
  'claude-3-opus':  'claude-3-haiku',
  'gemini-1.5-pro': 'gemini-1.5-flash',
};

export function calculateCost(model: Model, inputTokens: number, outputTokens: number): number {
  const rates = PRICING[model];
  if (!rates) return 0;
  return (inputTokens * rates.input) + (outputTokens * rates.output);
}

// ─── LLM Aggregation ────────────────────────────────────────────
export function aggregateLogs(logs: Log[]): TeamMetrics[] {
  const map = new Map<string, TeamMetrics>();
  const teamWeeklyCosts = new Map<string, { thisWeek: number; lastWeek: number }>();

  const now = Date.now();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  for (const log of logs) {
    if (!map.has(log.team)) {
      map.set(log.team, {
        team: log.team,
        totalCalls: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        averageInputTokens: 0,
        averageOutputTokens: 0,
        cost: 0,
        costVsLastWeek: 0,
        modelsUsed: {}
      });
      teamWeeklyCosts.set(log.team, { thisWeek: 0, lastWeek: 0 });
    }

    const m = map.get(log.team)!;
    const cw = teamWeeklyCosts.get(log.team)!;

    m.totalCalls++;
    m.totalInputTokens += log.inputTokens;
    m.totalOutputTokens += log.outputTokens;

    m.modelsUsed[log.model] = (m.modelsUsed[log.model] ?? 0) + 1;

    const c = calculateCost(log.model, log.inputTokens, log.outputTokens);
    m.cost += c;

    const logTime = new Date(log.timestamp).getTime();
    if (now - logTime <= ONE_WEEK_MS) {
      cw.thisWeek += c;
    } else if (now - logTime <= 2 * ONE_WEEK_MS) {
      cw.lastWeek += c;
    }
  }

  for (const [team, m] of map.entries()) {
    if (m.totalCalls > 0) {
      m.averageInputTokens = m.totalInputTokens / m.totalCalls;
      m.averageOutputTokens = m.totalOutputTokens / m.totalCalls;
    }
    const cw = teamWeeklyCosts.get(team)!;
    if (cw.lastWeek > 0) {
      m.costVsLastWeek = Math.round(((cw.thisWeek - cw.lastWeek) / cw.lastWeek) * 100);
    } else {
      m.costVsLastWeek = 0;
    }
  }

  return Array.from(map.values());
}

// ─── Cloud Resource Aggregation ──────────────────────────────────
export function aggregateCloudLogs(logs: CloudResourceLog[]): CloudResourceMetrics[] {
  const key = (l: CloudResourceLog) => `${l.team}::${l.provider}::${l.service}::${l.resourceName}`;
  const map = new Map<string, { logs: CloudResourceLog[] }>();

  for (const log of logs) {
    const k = key(log);
    if (!map.has(k)) map.set(k, { logs: [] });
    map.get(k)!.logs.push(log);
  }

  const results: CloudResourceMetrics[] = [];

  for (const [, bucket] of map.entries()) {
    const first = bucket.logs[0]!;
    const n = bucket.logs.length;

    const totalRequests = bucket.logs.reduce((s, l) => s + l.requests, 0);
    const avgAllocated = bucket.logs.reduce((s, l) => s + l.allocatedRAM_MB, 0) / n;
    const avgUsed = bucket.logs.reduce((s, l) => s + l.usedRAM_MB, 0) / n;
    const avgExec = bucket.logs.reduce((s, l) => s + l.executionTimeMs, 0) / n;
    const totalCost = bucket.logs.reduce((s, l) => s + l.cost, 0);

    const ramUtil = avgAllocated > 0 ? (avgUsed / avgAllocated) * 100 : 100;
    // wastage estimate: if using < 40% of allocated RAM, that delta is waste
    const wastedFraction = ramUtil < 40 ? (1 - ramUtil / 100) * 0.7 : 0;
    const wastedCost = totalCost * wastedFraction;

    results.push({
      team: first.team,
      provider: first.provider,
      service: first.service,
      resourceName: first.resourceName,
      totalRequests,
      avgAllocatedRAM_MB: Math.round(avgAllocated),
      avgUsedRAM_MB: Math.round(avgUsed),
      ramUtilization: Math.round(ramUtil),
      avgExecutionTimeMs: Math.round(avgExec),
      totalCost: parseFloat(totalCost.toFixed(2)),
      wastedCost: parseFloat(wastedCost.toFixed(2)),
    });
  }

  return results;
}

// ─── Daily Cost for Chart ────────────────────────────────────────
export function computeDailyCosts(llmLogs: Log[], cloudLogs: CloudResourceLog[]): DailyCost[] {
  const map = new Map<string, DailyCost>();

  for (const log of llmLogs) {
    const date = log.timestamp.split('T')[0]!;
    if (!map.has(date)) map.set(date, { date, llmCost: 0, cloudCost: 0, totalCost: 0 });
    const entry = map.get(date)!;
    entry.llmCost += calculateCost(log.model, log.inputTokens, log.outputTokens);
  }

  for (const log of cloudLogs) {
    const date = log.timestamp.split('T')[0]!;
    if (!map.has(date)) map.set(date, { date, llmCost: 0, cloudCost: 0, totalCost: 0 });
    const entry = map.get(date)!;
    entry.cloudCost += log.cost;
  }

  for (const entry of map.values()) {
    entry.totalCost = entry.llmCost + entry.cloudCost;
    entry.llmCost = parseFloat(entry.llmCost.toFixed(2));
    entry.cloudCost = parseFloat(entry.cloudCost.toFixed(2));
    entry.totalCost = parseFloat(entry.totalCost.toFixed(2));
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
