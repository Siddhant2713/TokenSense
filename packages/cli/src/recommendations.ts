import type { LLMEnhancerInput, EnhancedOutput } from '@tokensense/types';

const SERVER_URL = process.env.TOKENSENSE_SERVER_URL ?? 'http://localhost:3001';

export async function generateAIRecommendations(
  input: LLMEnhancerInput
): Promise<EnhancedOutput> {
  // Step 1 — Try the running server (handles both server-key and future relay modes)
  try {
    const res = await fetch(`${SERVER_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      console.info(`[CLI] AI analysis via server at ${SERVER_URL}`);
      return res.json() as Promise<EnhancedOutput>;
    }
  } catch {
    // Server not reachable — try direct key next
  }

  // Step 2 — Direct call with operator's env key (BYOK-CLI mode)
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    console.info('[CLI] Server unreachable. Using OPENAI_API_KEY from environment.');
    return callOpenAI(input, apiKey);
  }

  // Step 3 — Deterministic fallback
  console.warn(
    '[CLI] No server reachable and no OPENAI_API_KEY set. ' +
      'Using deterministic recommendations. ' +
      'Tip: start the server or set OPENAI_API_KEY for AI-enhanced output.'
  );
  return buildFallbackOutput(input);
}

async function callOpenAI(
  input: LLMEnhancerInput,
  apiKey: string
): Promise<EnhancedOutput> {
  const prompt = `
You are TokenSense AI, an LLM cost-optimization expert.
Analyze the monitoring alerts and team metrics below.

Insights: ${JSON.stringify(input.insights.map((ins, i) => ({ ...ins, _index: i })), null, 2)}
Metrics: ${JSON.stringify(input.metrics, null, 2)}
Cloud Resources: ${JSON.stringify(input.cloudMetrics, null, 2)}

Output ONLY valid JSON. No markdown fences.
{
  "executiveSummary": "...",
  "recommendations": [
    {
      "_insightIndex": 0, "rule": "...", "team": "...", "issue": "...",
      "action": "...", "monthlySaving": 0, "effort": "Medium",
      "confidence": "High", "category": "llm|cloud",
      "explanation": "...", "whyItHappened": "..."
    }
  ]
}`.trim();

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (err) {
    console.error('[CLI] Network error calling OpenAI:', err);
    return buildFallbackOutput(input);
  }

  if (!response.ok) {
    console.error(`[CLI] OpenAI returned ${response.status}`);
    return buildFallbackOutput(input);
  }

  const data = await response.json();
  const text: string = data.choices?.[0]?.message?.content ?? '';
  if (!text) return buildFallbackOutput(input);

  let parsed: any;
  try {
    parsed = JSON.parse(text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, ''));
  } catch {
    return buildFallbackOutput(input);
  }

  return {
    executiveSummary: parsed.executiveSummary,
    recommendations: (parsed.recommendations ?? []).map((aiRec: any) => {
      const matched =
        input.insights[aiRec._insightIndex] ??
        input.insights.find(i => i.team === aiRec.team && i.rule === aiRec.rule) ??
        input.insights[0];
      return {
        recommendation: {
          team: aiRec.team,
          rule: matched?.rule,
          issue: aiRec.issue,
          action: aiRec.action,
          monthlySaving: aiRec.monthlySaving,
          effort: aiRec.effort,
          confidence: aiRec.confidence,
          evidence: matched?.evidence ?? 'Flagged by monitoring system',
          category: aiRec.category,
        },
        explanation: aiRec.explanation,
        whyItHappened: aiRec.whyItHappened,
      };
    }),
  };
}

function buildFallbackOutput(input: LLMEnhancerInput): EnhancedOutput {
  const llmCount =
    input.insights.filter(i => i.category === 'llm' || !i.category).length ||
    input.insights.length;
  const cloudCount = input.insights.length - llmCount;

  const recommendations = input.insights.map(insight => {
    let saving = 500;
    const rule = (insight.rule ?? '').toUpperCase();
    if (rule.includes('MODEL_MISUSE') || rule.includes('DOWNGRADE')) saving = 9200;
    else if (rule.includes('LONG_PROMPTS')) saving = 4100;
    else if (rule.includes('CACHE_WASTE')) saving = 1800;
    else if (rule.includes('OVER_PROVISIONED')) saving = 2500;
    return {
      recommendation: {
        team: insight.team ?? 'Unknown',
        rule: insight.rule,
        issue: insight.rule ?? 'Efficiency Warning',
        action: insight.suggestedFix ?? 'Investigate and optimize.',
        monthlySaving: saving,
        effort: 'Medium' as const,
        confidence: 'High' as const,
        evidence: insight.evidence ?? 'Flagged by Rules Engine',
        category: insight.category ?? 'llm',
      },
      explanation: insight.evidence ?? 'Deterministically flagged anomaly.',
      whyItHappened: insight.suggestedFix ?? 'Review resource pipelines.',
    };
  });

  const totalSavings = recommendations.reduce(
    (sum, r) => sum + r.recommendation.monthlySaving,
    0
  );

  return {
    executiveSummary: `TokenSense detected ${input.insights.length} issues. Estimated savings: $${totalSavings.toLocaleString()}/month.`,
    recommendations,
  };
}
