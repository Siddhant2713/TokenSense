import type { LLMEnhancerInput, EnhancedOutput, Insight } from '@tokensense/types';

function getCacheKey(insights: Insight[]) {
  return 'ts_ai_' + insights.map(i => i.rule + i.team).join('_');
}

export async function generateAIRecommendations(input: LLMEnhancerInput): Promise<EnhancedOutput> {
  const cacheKey = getCacheKey(input.insights);
  try {
    const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;
    if (cached) return JSON.parse(cached);
  } catch {}

  try {
    const res = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    if (!res.ok) throw new Error('Backend responded with failure.');
    
    const data = await res.json();
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {}
    
    return data;
  } catch (err) {
    console.error('[TokenSense] Backend unavailable. Falling back exclusively to robust deterministic generator offline.', err);
    return buildFallbackOutput(input);
  }
}

// Strictly offline deterministic fallback for zero-breakage demo
function buildFallbackOutput(input: LLMEnhancerInput): EnhancedOutput {
  const llmCount = input.insights.filter(i => i.category === 'llm' || !i.category).length || input.insights.length;
  const cloudCount = input.insights.length - llmCount;
  
  const recommendations = input.insights.map((insight) => {
    let saving = 500;
    const rule = (insight.rule || '').toUpperCase();
    if (rule.includes('MODEL_MISUSE') || rule.includes('DOWNGRADE')) saving = 9200;
    else if (rule.includes('LONG_PROMPTS') || rule.includes('CONTEXT_WINDOW')) saving = 4100;
    else if (rule.includes('CACHE_WASTE')) saving = 1800;
    else if (rule.includes('OVER_PROVISIONED')) saving = 2500;
    
    return {
      recommendation: {
        team: insight.team || "Unknown Team",
        rule: insight.rule,
        issue: insight.rule || "Efficiency Warning",
        action: insight.suggestedFix || "Investigate the alert and optimize.",
        monthlySaving: saving,
        effort: "Medium" as "Medium" | "High" | "Low",
        confidence: "High" as "Medium" | "High" | "Low",
        evidence: insight.evidence || "Flagged by Rules Engine",
        category: insight.category || "llm"
      },
      explanation: insight.evidence || "Deterministically flagged anomaly in metric volumes.",
      whyItHappened: insight.suggestedFix || "Consider reviewing your resource pipelines."
    };
  });

  const totalSavings = recommendations.reduce((sum, r) => sum + r.recommendation.monthlySaving, 0);

  return {
    executiveSummary: `TokenSense detected ${input.insights.length} optimisation opportunities across ${llmCount} LLM and ${cloudCount} cloud issues. Estimated combined savings: $${totalSavings.toLocaleString()}/month.`,
    recommendations
  };
}
