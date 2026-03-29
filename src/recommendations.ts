import type { LLMEnhancerInput, EnhancedOutput } from './types';

declare var process: any;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

function getApiKey(): string | undefined {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_GEMINI_API_KEY) {
    return (import.meta as any).env.VITE_GEMINI_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_GEMINI_API_KEY) {
    return process.env.VITE_GEMINI_API_KEY;
  }
  return undefined;
}

function buildFallbackOutput(input: LLMEnhancerInput): EnhancedOutput {
  const llmCount = input.insights.filter((i: any) => i.category === 'llm' || !i.category).length || input.insights.length;
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
        issue: insight.rule || "Efficiency Warning",
        action: insight.suggestedFix || "Investigate the alert and optimize.",
        monthlySaving: saving,
        effort: "Medium" as "Medium" | "High" | "Low",
        confidence: "High" as "Medium" | "High" | "Low",
        evidence: insight.evidence || "Flagged by Rules Engine",
        category: (insight as any).category || "llm"
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

export async function generateAIRecommendations(input: LLMEnhancerInput): Promise<EnhancedOutput> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('[TokenSense] VITE_GEMINI_API_KEY is missing. Falling back to deterministic output.');
    return buildFallbackOutput(input);
  }

  const prompt = `
    You are TokenSense AI, an LLM Gateway router and cloud cost-optimization expert.
    Analyze the following monitoring alerts (insights) and their associated team metrics context.
    
    Insights: ${JSON.stringify(input.insights, null, 2)}
    Metrics: ${JSON.stringify(input.metrics, null, 2)}
    Cloud Resource Context: ${JSON.stringify(input.cloudMetrics, null, 2)}

    RESPONSE FORMAT:
    Output ONLY valid JSON. Do not wrap in markdown code blocks. Do not add any explanation before or after the JSON.
    {
      "executiveSummary": "...",
      "recommendations": [
        {
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
    response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
        }
      })
    });
  } catch (netErr: any) {
    console.error('[TokenSense] Network error fetching Gemini:', netErr);
    return buildFallbackOutput(input);
  }

  if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[TokenSense] Gemini API error: ${response.status} ${JSON.stringify(errorData)}`);
      return buildFallbackOutput(input);
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.error('[TokenSense] Empty or unexpected Gemini response:', JSON.stringify(data).slice(0, 400));
    return buildFallbackOutput(input);
  }

  text = text.replace(/^```(json)?\n/, '').replace(/\n```$/, '');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    console.error('[TokenSense] JSON.parse failed. Raw cleaned text:', text.slice(0, 500));
    return buildFallbackOutput(input);
  }

  return {
    executiveSummary: parsed.executiveSummary,
    recommendations: parsed.recommendations.map((aiRec: any, i: number) => ({
      recommendation: {
        team: aiRec.team,
        issue: aiRec.issue,
        action: aiRec.action,
        monthlySaving: aiRec.monthlySaving,
        effort: aiRec.effort,
        confidence: aiRec.confidence,
        evidence: input.insights[i]?.evidence || 'Flagged by monitoring system',
        category: aiRec.category
      },
      explanation: aiRec.explanation,
      whyItHappened: aiRec.whyItHappened
    }))
  };
}

