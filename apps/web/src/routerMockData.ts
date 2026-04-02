import { ModelRegistry } from './router/modelRegistry';
import type { RequestLog, AggregatedMetrics, ModelConfig } from '@tokensense/types';
import type { TaskType, Complexity } from '@tokensense/types';

export interface RouterMockData {
  metrics: AggregatedMetrics;
  logs: RequestLog[];
  models: ModelConfig[];
  latencyStats: Record<string, { avg: number; p95: number; p99: number; count: number }>;
}

const TASK_TYPES: TaskType[] = ['code', 'chat', 'reasoning', 'summarization', 'extraction', 'classification'];
const COMPLEXITIES: Complexity[] = ['simple', 'moderate', 'complex'];


function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRouterMockData(): RouterMockData {
  const registry = new ModelRegistry();
  const models = registry.getAll();
  const logs: RequestLog[] = [];

  const latencyMap: Record<string, number[]> = {};

  for (let i = 0; i < 200; i++) {
    const taskType = randomChoice(TASK_TYPES);
    const complexity = randomChoice(COMPLEXITIES);
    const modelId = selectModelForTask(taskType, complexity);
    const model = registry.get(modelId)!;
    const cached = Math.random() < 0.15;
    const fallback = !cached && Math.random() < 0.05;

    const inputTokens = getInputTokens(complexity);
    const outputTokens = getOutputTokens(taskType, complexity);
    const cost = cached ? 0 : (inputTokens * model.costPerInputToken) + (outputTokens * model.costPerOutputToken);
    const latencyMs = cached ? Math.floor(Math.random() * 10 + 2) : Math.floor(model.avgLatencyMs * (0.7 + Math.random() * 0.6));

    if (!latencyMap[modelId]) latencyMap[modelId] = [];
    latencyMap[modelId].push(latencyMs);

    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString();

    logs.push({
      requestId: `ts_mock_${i}`,
      timestamp,
      prompt: `[mock ${taskType} prompt #${i}]`,
      taskType,
      complexity,
      model: modelId,
      provider: model.provider,
      inputTokens,
      outputTokens,
      cost,
      latencyMs,
      cached,
      fallback,
      success: Math.random() > 0.02,
      userId: `user_${Math.floor(Math.random() * 5) + 1}`,
    });
  }

  logs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const totalCost = logs.reduce((s, l) => s + l.cost, 0);
  const avgLatency = logs.reduce((s, l) => s + l.latencyMs, 0) / logs.length;
  const cachedCount = logs.filter(l => l.cached).length;
  const fallbackCount = logs.filter(l => l.fallback).length;

  const costByModel: Record<string, number> = {};
  const costByProvider: Record<string, number> = {};
  const requestsByTaskType: Record<string, number> = {};

  for (const log of logs) {
    costByModel[log.model] = (costByModel[log.model] ?? 0) + log.cost;
    costByProvider[log.provider] = (costByProvider[log.provider] ?? 0) + log.cost;
    requestsByTaskType[log.taskType] = (requestsByTaskType[log.taskType] ?? 0) + 1;
  }

  const dailyMap = new Map<string, { cost: number; requests: number }>();
  for (const log of logs) {
    const date = log.timestamp.split('T')[0];
    const entry = dailyMap.get(date) ?? { cost: 0, requests: 0 };
    entry.cost += log.cost;
    entry.requests++;
    dailyMap.set(date, entry);
  }

  const latencyStats: Record<string, { avg: number; p95: number; p99: number; count: number }> = {};
  for (const [model, values] of Object.entries(latencyMap)) {
    const sorted = [...values].sort((a, b) => a - b);
    latencyStats[model] = {
      avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
      count: sorted.length,
    };
  }

  return {
    metrics: {
      totalRequests: logs.length,
      totalCost: totalCost,
      avgLatencyMs: Math.round(avgLatency),
      cacheHitRate: cachedCount / logs.length,
      fallbackRate: fallbackCount / logs.length,
      costByModel,
      costByProvider,
      requestsByTaskType,
      dailyCosts: Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    },
    logs,
    models,
    latencyStats,
  };
}

function selectModelForTask(taskType: TaskType, complexity: Complexity): string {
  if (complexity === 'simple') {
    if (taskType === 'classification' || taskType === 'extraction') return 'gemini-2.0-flash';
    if (taskType === 'chat') return randomChoice(['gpt-4o-mini', 'claude-haiku-3-5']);
    return 'gpt-4o-mini';
  }
  if (complexity === 'complex') {
    if (taskType === 'code' || taskType === 'reasoning') return randomChoice(['gpt-4o', 'claude-sonnet-4-20250514']);
    return randomChoice(['gpt-4o', 'gemini-2.5-pro']);
  }
  return randomChoice(['gpt-4o-mini', 'claude-haiku-3-5', 'gemini-2.0-flash']);
}

function getInputTokens(complexity: Complexity): number {
  switch (complexity) {
    case 'simple': return 50 + Math.floor(Math.random() * 200);
    case 'moderate': return 300 + Math.floor(Math.random() * 700);
    case 'complex': return 1000 + Math.floor(Math.random() * 3000);
  }
}

function getOutputTokens(taskType: TaskType, complexity: Complexity): number {
  const base = complexity === 'simple' ? 30 : complexity === 'moderate' ? 150 : 500;
  const taskMultiplier = taskType === 'code' ? 2 : taskType === 'classification' ? 0.1 : 1;
  return Math.floor(base * taskMultiplier * (0.5 + Math.random()));
}
