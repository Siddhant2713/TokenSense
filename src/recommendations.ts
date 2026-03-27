import { Insight, Recommendation, TeamMetrics, LLMEnhancerInput, EnhancedOutput } from './types';
import { PRICING, calculateCost } from './aggregator';

export function generateRecommendations(insights: Insight[], metrics: TeamMetrics[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const metricsMap = new Map(metrics.map(m => [m.team, m]));

    for (const insight of insights) {
        const m = metricsMap.get(insight.team);
        if (!m) continue;

        let action = '';
        let monthlySaving = 0;
        let effort: 'Low' | 'Medium' | 'High' = 'Low';
        let confidence: 'High' | 'Medium' | 'Low' = 'High';
        let issue = '';

        // Calculate current cost assuming gpt-4o for simplicity of the rules
        const currentCostPerCall = calculateCost('gpt-4o', m.averageInputTokens, m.averageOutputTokens);

        if (insight.rule === 'MODEL_MISUSE') {
            issue = 'Model Misuse';
            action = 'Switch to gpt-3.5-turbo for simple tasks.';
            const newCostPerCall = calculateCost('gpt-3.5-turbo', m.averageInputTokens, m.averageOutputTokens);
            monthlySaving = (currentCostPerCall - newCostPerCall) * m.totalCalls;
            effort = 'Low';
            confidence = 'High';
        } else if (insight.rule === 'LONG_PROMPTS') {
            issue = 'Long Prompts';
            action = 'Summarize context before sending or reduce prompt size by 50%.';
            const newCostPerCall = calculateCost('gpt-4o', m.averageInputTokens * 0.5, m.averageOutputTokens);
            monthlySaving = (currentCostPerCall - newCostPerCall) * m.totalCalls;
            effort = 'Medium';
            confidence = 'Medium';
        } else if (insight.rule === 'SPIKE') {
            issue = 'Spike in Usage';
            action = 'Investigate potential looping scripts or batch job errors.';
            // Estimate: assuming spike accounts for 50% of the cost
            monthlySaving = m.cost * 0.5;
            effort = 'High';
            confidence = 'High';
        } else if (insight.rule === 'CACHE_WASTE') {
            issue = 'Cache Waste';
            action = 'Implement a simple cache wrapper for repeated identical prompts.';
            monthlySaving = currentCostPerCall * Math.floor(m.totalCalls * 0.8); // Assumes ~80% caching hit rate
            effort = 'Low';
            confidence = 'High';
        }

        recommendations.push({
            team: insight.team,
            issue,
            action,
            monthlySaving,
            effort,
            confidence,
            evidence: insight.evidence
        });
    }

    return recommendations;
}

export async function enhanceWithLLM(input: LLMEnhancerInput): Promise<EnhancedOutput> {
    // LLM API intentionally left out for MVP, falling back to structured output
    return buildFallbackOutput(input);
}

function buildFallbackOutput(input: LLMEnhancerInput): EnhancedOutput {
    return {
        executiveSummary: `${input.recommendations.length} waste patterns detected. Total potential monthly saving: $${input.totalMonthlySaving.toFixed(2)}.`,
        recommendations: input.recommendations.map(r => ({
            recommendation: r,
            explanation: `${r.action} Estimated saving: $${r.monthlySaving.toFixed(2)}/month.`,
            whyItHappened: 'Analysis unavailable — LLM service unreachable.'
        }))
    };
}
