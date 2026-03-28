import type { Log, TeamMetrics, Insight, CloudResourceMetrics } from './types';
import { MODEL_DOWNGRADE_MAP } from './aggregator';

// ─── LLM Rules ──────────────────────────────────────────────────

export function detectModelMisuse(metrics: TeamMetrics[]): Insight[] {
  const insights: Insight[] = [];
  for (const m of metrics) {
    if ((m.modelsUsed['gpt-4o'] ?? 0) > 0 && m.averageOutputTokens < 100) {
      const downgrade = MODEL_DOWNGRADE_MAP['gpt-4o'] ?? 'gpt-4o-mini';
      insights.push({
        team: m.team,
        rule: 'MODEL_MISUSE',
        severity: 'High',
        evidence: `${m.modelsUsed['gpt-4o']} calls to gpt-4o with avg output of only ${Math.round(m.averageOutputTokens)} tokens — task is too simple for this model.`,
        suggestedFix: `Switch to ${downgrade} for this workload.`
      });
    }
    if ((m.modelsUsed['claude-3-opus'] ?? 0) > 0 && m.averageOutputTokens < 100) {
      const downgrade = MODEL_DOWNGRADE_MAP['claude-3-opus'] ?? 'claude-3-haiku';
      insights.push({
        team: m.team,
        rule: 'MODEL_DOWNGRADE',
        severity: 'High',
        evidence: `${m.modelsUsed['claude-3-opus']} calls to claude-3-opus with avg output of only ${Math.round(m.averageOutputTokens)} tokens.`,
        suggestedFix: `Switch to ${downgrade} for ~97% cost reduction.`
      });
    }
  }
  return insights;
}

export function detectLongPrompts(metrics: TeamMetrics[]): Insight[] {
  const insights: Insight[] = [];
  for (const m of metrics) {
    if (m.averageInputTokens > 2000) {
      insights.push({
        team: m.team,
        rule: 'LONG_PROMPTS',
        severity: 'High',
        evidence: `Average input prompt length is ${Math.round(m.averageInputTokens)} tokens.`,
        suggestedFix: 'Summarize context before sending or use RAG to reduce prompt size by 50%.'
      });
    }
  }
  return insights;
}

export function detectSpike(logs: Log[]): Insight[] {
  const insights: Insight[] = [];
  const teamDailyCounts = new Map<string, Map<string, number>>();

  for (const log of logs) {
    const day = log.timestamp.split('T')[0] ?? '';
    if (!teamDailyCounts.has(log.team)) teamDailyCounts.set(log.team, new Map());
    const dayMap = teamDailyCounts.get(log.team)!;
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }

  for (const [team, dayMap] of teamDailyCounts.entries()) {
    const counts = Array.from(dayMap.values());
    if (counts.length < 2) continue;

    const maxCount = Math.max(...counts);
    const sum = counts.reduce((a, b) => a + b, 0);
    const avgWithoutMax = (sum - maxCount) / (counts.length - 1);

    if (avgWithoutMax > 0 && maxCount > avgWithoutMax * 3) {
      insights.push({
        team,
        rule: 'SPIKE',
        severity: 'High',
        evidence: `Usage spiked to ${maxCount} calls on peak day, over 3x the normal daily average of ${Math.round(avgWithoutMax)} calls.`,
        suggestedFix: 'Investigate potential looping scripts, batch job errors, or runaway retry logic.'
      });
    }
  }
  return insights;
}

export function detectCacheWaste(logs: Log[]): Insight[] {
  const insights: Insight[] = [];
  const teamHashCounts = new Map<string, Map<string, number>>();

  for (const log of logs) {
    if (!teamHashCounts.has(log.team)) teamHashCounts.set(log.team, new Map());
    const hashMap = teamHashCounts.get(log.team)!;
    hashMap.set(log.promptHash, (hashMap.get(log.promptHash) ?? 0) + 1);
  }

  for (const [team, hashMap] of teamHashCounts.entries()) {
    let maxRepeats = 0;
    for (const count of hashMap.values()) {
      if (count > maxRepeats) maxRepeats = count;
    }

    if (maxRepeats >= 50) {
      insights.push({
        team,
        rule: 'CACHE_WASTE',
        severity: 'High',
        evidence: `Found identical prompt hash sent ${maxRepeats} times.`,
        suggestedFix: 'Enable OpenAI/Anthropic Prompt Caching for 50-90% savings on input tokens.'
      });
    }
  }
  return insights;
}

export function detectPerformanceIssues(metrics: TeamMetrics[]): Insight[] {
  const insights: Insight[] = [];
  for (const m of metrics) {
    // High Latency Rule
    if (m.avgTTFT && m.avgTTFT > 600) {
      insights.push({
        team: m.team,
        rule: 'MODEL_MISUSE',
        severity: 'Medium',
        evidence: `Average TTFT is ${m.avgTTFT}ms — extremely slow response for typical users.`,
        suggestedFix: 'Switch to a faster region or a lighter model (gpt-4o-mini) to improve UX and reduce cost.'
      });
    }
    
    // Batch Opportunity Rule
    if (m.batchUtilization !== undefined && m.batchUtilization < 0.1 && m.totalCalls > 100) {
      insights.push({
        team: m.team,
        rule: 'MODEL_DOWNGRADE',
        severity: 'Medium',
        evidence: `${m.totalCalls} individual calls detected with <10% batching.`,
        suggestedFix: 'Use OpenAI Batch API for non-urgent tasks to achieve a 50% flat discount.'
      });
    }
  }
  return insights;
}

// ─── Cloud Resource Rules ────────────────────────────────────────

export function detectRAMOverProvision(cloudMetrics: CloudResourceMetrics[]): Insight[] {
  const insights: Insight[] = [];
  for (const m of cloudMetrics) {
    if (m.avgAllocatedRAM_MB > 0 && m.ramUtilization < 40) {
      const suggestedRAM = Math.max(32, Math.ceil(m.avgUsedRAM_MB * 1.5));
      insights.push({
        team: m.team,
        rule: 'RAM_OVER_PROVISION',
        severity: m.ramUtilization < 20 ? 'High' : 'Medium',
        evidence: `${m.provider} ${m.service} "${m.resourceName}" is allocating ${m.avgAllocatedRAM_MB}MB RAM but only using ${m.avgUsedRAM_MB}MB (${m.ramUtilization}% utilization). Wasted cost: $${m.wastedCost.toFixed(2)}.`,
        suggestedFix: `Downgrade allocation to ${suggestedRAM}MB to save ~$${m.wastedCost.toFixed(2)}.`
      });
    }
  }
  return insights;
}

// ─── Run All Rules ──────────────────────────────────────────────

export function runAllRules(logs: Log[], metrics: TeamMetrics[], cloudMetrics: CloudResourceMetrics[]): Insight[] {
  return [
    ...detectModelMisuse(metrics),
    ...detectLongPrompts(metrics),
    ...detectSpike(logs),
    ...detectCacheWaste(logs),
    ...detectPerformanceIssues(metrics),
    ...detectRAMOverProvision(cloudMetrics),
  ];
}
