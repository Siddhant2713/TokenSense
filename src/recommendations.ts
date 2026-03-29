import type { LLMEnhancerInput, EnhancedOutput } from './types';

declare var process: any;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

function getApiKey(): string | undefined {
  // Vite environment
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_GEMINI_API_KEY) {
    return (import.meta as any).env.VITE_GEMINI_API_KEY;
  }
  // Node environment (CLI)
  if (typeof process !== 'undefined' && process.env && process.env.VITE_GEMINI_API_KEY) {
    return process.env.VITE_GEMINI_API_KEY;
  }
  return undefined;
}

export async function generateAIRecommendations(input: LLMEnhancerInput): Promise<EnhancedOutput> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is missing. TokenSense AI Analyst requires an API key.');
  }

  const prompt = `
    You are TokenSense AI, an LLM Gateway router and cloud cost-optimization expert.
    Analyze the following monitoring alerts (insights) and their associated team metrics context.
    
    1. Provide a professional "Executive Summary" (2-3 sentences max) summarizing total potential savings and key focus areas.
    2. For EACH insight in the exact order provided, generate a highly specific recommendation.
    Use the latency, token counts, and RAM data to justify your recommendations.

    DATA:
    Insights (Flags from rules engine):
    ${JSON.stringify(input.insights, null, 2)}
    
    LLM Router Metrics Context:
    ${JSON.stringify(input.metrics, null, 2)}
    
    Cloud Resource Context:
    ${JSON.stringify(input.cloudMetrics, null, 2)}

    RESPONSE FORMAT (ONLY OUTPUT VALID JSON, NO MARKDOWN BLOCKS):
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

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
          temperature: 0.1
      }
    })
  });

  if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  // Clean JSON block formatting if it returns markdown backticks
  text = text.replace(/^\\`\\`\\`(json)?\\n/, '').replace(/\\n\\`\\`\\`$/, '');

  const parsed = JSON.parse(text);

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

