import type { Insight, Recommendation, TeamMetrics, CloudResourceMetrics, LLMEnhancerInput, EnhancedOutput } from './types';
import { PRICING, calculateCost, MODEL_DOWNGRADE_MAP } from './aggregator';
import type { Model } from './types';

export function generateRecommendations(
  insights: Insight[],
  metrics: TeamMetrics[],
  cloudMetrics: CloudResourceMetrics[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const metricsMap = new Map(metrics.map(m => [m.team, m]));
  const cloudMap = new Map(cloudMetrics.map(m => [`${m.team}::${m.resourceName}`, m]));

  for (const insight of insights) {
    const m = metricsMap.get(insight.team);

    if (insight.rule === 'MODEL_MISUSE' && m) {
      const currentCostPerCall = calculateCost('gpt-4o', m.averageInputTokens, m.averageOutputTokens);
      const downgrade: Model = MODEL_DOWNGRADE_MAP['gpt-4o'] ?? 'gpt-4o-mini';
      const newCostPerCall = calculateCost(downgrade, m.averageInputTokens, m.averageOutputTokens);
      recommendations.push({
        team: insight.team,
        issue: 'Model Misuse — Expensive model for simple tasks',
        action: `Switch to ${downgrade} for this workload.`,
        monthlySaving: (currentCostPerCall - newCostPerCall) * m.totalCalls,
        effort: 'Low',
        confidence: 'High',
        evidence: insight.evidence,
        category: 'llm'
      });
    } else if (insight.rule === 'MODEL_DOWNGRADE' && m) {
      const currentModel: Model = 'claude-3-opus';
      const downgrade: Model = MODEL_DOWNGRADE_MAP[currentModel] ?? 'claude-3-haiku';
      const currentCostPerCall = calculateCost(currentModel, m.averageInputTokens, m.averageOutputTokens);
      const newCostPerCall = calculateCost(downgrade, m.averageInputTokens, m.averageOutputTokens);
      recommendations.push({
        team: insight.team,
        issue: 'Model Downgrade — Premium model overkill',
        action: `Switch from ${currentModel} to ${downgrade}.`,
        monthlySaving: (currentCostPerCall - newCostPerCall) * m.totalCalls,
        effort: 'Low',
        confidence: 'High',
        evidence: insight.evidence,
        category: 'llm'
      });
    } else if (insight.rule === 'LONG_PROMPTS' && m) {
      const currentCostPerCall = calculateCost('gpt-4o', m.averageInputTokens, m.averageOutputTokens);
      const newCostPerCall = calculateCost('gpt-4o', m.averageInputTokens * 0.5, m.averageOutputTokens);
      recommendations.push({
        team: insight.team,
        issue: 'Long Prompts — Excessive context in requests',
        action: 'Summarize context or implement RAG to cut prompt size by 50%.',
        monthlySaving: (currentCostPerCall - newCostPerCall) * m.totalCalls,
        effort: 'Medium',
        confidence: 'Medium',
        evidence: insight.evidence,
        category: 'llm'
      });
    } else if (insight.rule === 'SPIKE' && m) {
      recommendations.push({
        team: insight.team,
        issue: 'Usage Spike — Anomalous burst detected',
        action: 'Investigate and fix looping scripts or batch job errors.',
        monthlySaving: m.cost * 0.5,
        effort: 'High',
        confidence: 'High',
        evidence: insight.evidence,
        category: 'llm'
      });
    } else if (insight.rule === 'CACHE_WASTE' && m) {
      const currentCostPerCall = calculateCost('gpt-4o', m.averageInputTokens, m.averageOutputTokens);
      recommendations.push({
        team: insight.team,
        issue: 'Cache Waste — Identical prompts sent repeatedly',
        action: 'Implement Redis or in-memory cache for repeated prompts.',
        monthlySaving: currentCostPerCall * Math.floor(m.totalCalls * 0.8),
        effort: 'Low',
        confidence: 'High',
        evidence: insight.evidence,
        category: 'llm'
      });
    } else if (insight.rule === 'RAM_OVER_PROVISION') {
      // Find the matching cloud metric to get the wasted cost
      const matchingCloud = cloudMetrics.find(
        cm => cm.team === insight.team && insight.evidence.includes(cm.resourceName)
      );
      recommendations.push({
        team: insight.team,
        issue: 'RAM Over-Provisioned — Paying for unused memory',
        action: insight.suggestedFix ?? 'Reduce RAM allocation to match actual usage.',
        monthlySaving: matchingCloud ? matchingCloud.wastedCost : 0,
        effort: 'Low',
        confidence: 'High',
        evidence: insight.evidence,
        category: 'cloud'
      });
    }
  }

  return recommendations;
}

export async function enhanceWithLLM(input: LLMEnhancerInput): Promise<EnhancedOutput> {
  return buildFallbackOutput(input);
}

function buildFallbackOutput(input: LLMEnhancerInput): EnhancedOutput {
  const llmRecs = input.recommendations.filter(r => r.category === 'llm');
  const cloudRecs = input.recommendations.filter(r => r.category === 'cloud');
  const llmSavings = llmRecs.reduce((s, r) => s + r.monthlySaving, 0);
  const cloudSavings = cloudRecs.reduce((s, r) => s + r.monthlySaving, 0);

  return {
    executiveSummary: `TokenSense detected ${input.recommendations.length} optimization opportunities:\n• ${llmRecs.length} LLM cost issues (potential saving: $${llmSavings.toFixed(2)}/mo)\n• ${cloudRecs.length} cloud resource issues (potential saving: $${cloudSavings.toFixed(2)}/mo)\nTotal potential monthly saving: $${input.totalMonthlySaving.toFixed(2)}.`,
    recommendations: input.recommendations.map(r => ({
      recommendation: r,
      explanation: `${r.action} Estimated saving: $${r.monthlySaving.toFixed(2)}/month.`,
      whyItHappened: r.category === 'llm'
        ? 'Team selected a model without considering task complexity.'
        : 'Resource allocation was set at deployment and never rightsized.'
    }))
  };
}
