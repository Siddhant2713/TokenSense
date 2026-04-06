import type { LLMEnhancerInput, EnhancedOutput } from '@tokensense/types';

// ─── BYOK Server-Key Tier ─────────────────────────────────────────────────────
// This endpoint is the OPTIONAL server-key tier for self-hosted deployments.
// In pure BYOK mode (no OPENAI_API_KEY on server) it returns deterministic output.
// When a server operator sets OPENAI_API_KEY, this processes AI calls server-side,
// so users do not need to supply their own keys.
// ──────────────────────────────────────────────────────────────────────────────

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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
        team: insight.team ?? 'Unknown Team',
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
    executiveSummary: `TokenSense detected ${input.insights.length} optimisation opportunities across ${llmCount} LLM and ${cloudCount} cloud issues. Estimated savings: $${totalSavings.toLocaleString()}/month.`,
    recommendations,
  };
}

export async function generateAIRecommendations(
  input: LLMEnhancerInput
): Promise<EnhancedOutput> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.info(
      '[TokenSense Server] No OPENAI_API_KEY configured — deterministic mode. ' +
        'Set it in apps/server/.env to enable server-side AI (optional in BYOK deployments).'
    );
    return buildFallbackOutput(input);
  }

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
      "_insightIndex": 0,
      "rule": "...",
      "team": "...",
      "issue": "...",
      "action": "...",
      "monthlySaving": 123.45,
      "effort": "Low|Medium|High",
      "confidence": "Low|Medium|High",
      "category": "llm|cloud",
      "explanation": "...",
      "whyItHappened": "..."
    }
  ]
}`.trim();

  let response: Response;
  try {
    response = await fetch(OPENAI_API_URL, {
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
  } catch (netErr) {
    console.error('[TokenSense Server] Network error calling OpenAI:', netErr);
    return buildFallbackOutput(input);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.error(`[TokenSense Server] OpenAI error ${response.status}:`, body);
    return buildFallbackOutput(input);
  }

  const data = await response.json();
  const text: string = data.choices?.[0]?.message?.content ?? '';

  if (!text) {
    console.error('[TokenSense Server] Empty response from OpenAI.');
    return buildFallbackOutput(input);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, ''));
  } catch {
    console.error('[TokenSense Server] Failed to parse AI JSON response.');
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
