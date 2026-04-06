import type { LLMEnhancerInput, EnhancedOutput, Insight } from '@tokensense/types';
import { getApiConfig } from './utils/apiKeyManager';
function getCacheKey(insights: Insight[]) {
  return 'ts_ai_' + insights.map(i => i.rule + i.team).join('_');
}

export async function generateAIRecommendations(input: LLMEnhancerInput): Promise<EnhancedOutput> {
  const cacheKey = getCacheKey(input.insights);
  try {
    const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;
    if (cached) return JSON.parse(cached);
  } catch {}

  const config = getApiConfig();
  if (!config?.apiKey) {
    console.warn('[TokenSense] BYOK API Config is missing. Falling back to deterministic output.');
    return buildFallbackOutput(input);
  }

  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const OPENAI_API_URL = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const prompt = `
    You are TokenSense AI, an LLM Gateway router and cloud cost-optimization expert.
    Analyze the following monitoring alerts (insights) and their associated team metrics context.
    
    Insights: ${JSON.stringify(input.insights.map((ins, i) => ({ ...ins, _index: i })), null, 2)}
    Metrics: ${JSON.stringify(input.metrics, null, 2)}
    Cloud Resource Context: ${JSON.stringify(input.cloudMetrics, null, 2)}

    RESPONSE FORMAT:
    Output ONLY valid JSON.
    {
      "executiveSummary": "...",
      "recommendations": [
        {
          "_insightIndex": 0,
          "rule": "match rule from insight",
          "team": "match team from insight",
          "issue": "short title of issue",
          "action": "specific instruction to fix",
          "monthlySaving": 123.45,
          "effort": "Low|Medium|High",
          "confidence": "Low|Medium|High",
          "category": "llm|cloud",
          "explanation": "detailed explanation referencing data",
          "whyItHappened": "root cause analysis"
        }
      ]
    }
  `;

  let response;
  try {
    response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });
  } catch (netErr: any) {
    console.error('[TokenSense] Network error fetching custom API:', netErr);
    return buildFallbackOutput(input);
  }

  if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[TokenSense] API error: ${response.status} ${JSON.stringify(errorData)}`);
      return buildFallbackOutput(input);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content;
  if (!text) return buildFallbackOutput(input);

  text = text.replace(/^```(json)?\n/, '').replace(/\n```$/, '');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return buildFallbackOutput(input);
  }

  const result = {
    executiveSummary: parsed.executiveSummary,
    recommendations: parsed.recommendations.map((aiRec: any) => {
      const matchedInsight = input.insights[aiRec._insightIndex] 
        ?? input.insights.find(ins => ins.team === aiRec.team && ins.rule === aiRec.rule)
        ?? input.insights[0];

      // Resolve deterministically: AI response -> matched insight -> rule-based default
      const category: 'llm' | 'cloud' = 
        aiRec.category === 'llm' || aiRec.category === 'cloud'
          ? aiRec.category
          : matchedInsight?.category ??
            (['RAM_OVER_PROVISION'].includes(matchedInsight?.rule ?? '') ? 'cloud' : 'llm');

      return {
        recommendation: {
          team: aiRec.team,
          rule: matchedInsight?.rule,
          issue: aiRec.issue,
          action: aiRec.action,
          monthlySaving: aiRec.monthlySaving,
          effort: aiRec.effort,
          confidence: aiRec.confidence,
          evidence: matchedInsight?.evidence || 'Flagged by monitoring system',
          category,
        },
        explanation: aiRec.explanation,
        whyItHappened: aiRec.whyItHappened
      };
    })
  };

  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(cacheKey, JSON.stringify(result));
  } catch {}
  return result;
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
