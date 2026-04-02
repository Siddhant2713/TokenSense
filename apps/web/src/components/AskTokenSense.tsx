import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import type { TeamMetrics, Insight } from "../types";
import './AskTokenSense.css';

const SUGGESTIONS = [
  "Which team should I fix first for maximum ROI?",
  "Explain the Payments MODEL_MISUSE issue for my CTO",
  "Write me a Redis caching wrapper for the Engineering cache waste",
  "What's my projected yearly spend if nothing changes?",
  "Compare our LLM costs to cloud costs — where's the bigger risk?",
];

// BUG-CHAT-03 FIX: Summarize context instead of dumping full JSON
function buildSummaryContext(teamMetrics: TeamMetrics[], insights: Insight[], totals: any): string {
  const teamSummary = teamMetrics
    .sort((a, b) => b.cost - a.cost)
    .map(t => {
      const topModel = Object.entries(t.modelsUsed)
        .sort(([,a],[,b]) => (b ?? 0) - (a ?? 0))[0]?.[0] ?? 'unknown';
      return `  - ${t.team}: $${t.cost.toFixed(2)}/mo, ${t.totalCalls.toLocaleString()} calls, primary model: ${topModel}, WoW: ${t.costVsLastWeek > 0 ? '+' : ''}${t.costVsLastWeek}%`;
    }).join('\n');

  const issueSummary = insights
    .map(i => `  - [${i.severity}] ${i.rule} on ${i.team}: ${i.evidence}`)
    .join('\n');

  return `LIVE DASHBOARD DATA (30-day window):

Total LLM Spend: $${totals?.totalLLMCost?.toFixed(2)}
Total Cloud Spend: $${totals?.totalCloudCost?.toFixed(2)}
Issues Detected: ${totals?.totalInsights}

Team Costs (sorted by spend):
${teamSummary}

Active Issues:
${issueSummary}`;
}

interface Props {
  teamMetrics: TeamMetrics[];
  insights: Insight[];
  totals: { totalLLMCost: number; totalCloudCost: number; totalInsights: number };
}

export default function AskTokenSense({ teamMetrics, insights, totals }: Props) {
  const systemPrompt = `You are TokenSense AI, an embedded LLM and cloud cost-optimization analyst.

${buildSummaryContext(teamMetrics, insights, totals)}

Rules:
- Be concise and direct. Engineers hate fluff.
- When quoting numbers, always cite which team or resource.
- Format code in markdown code blocks.
- For savings estimates, show monthly AND yearly figures.
- Never say "Great question!" or similar filler phrases.
- Keep responses under 200 words unless asked for code or detailed breakdown.`;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  async function send(text?: string) {
    const query = text || input.trim();
    if (!query || loading) return;
    setInput("");

    const userMsg = { role: "user", content: query };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    setStreamedText("");

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not set in your .env file.");

      // BUG-CHAT-01 FIX: use v1beta for gemini-2.0-flash
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: next.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      // BUG-CHAT-02 FIX: check res.ok and surface errors
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = (errorData as any)?.error?.message ?? `HTTP ${res.status}`;
        console.error("[TokenSense Chat] API error:", res.status, errorData);
        throw new Error(`Gemini API error: ${errMsg}`);
      }

      const data = await res.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ??
        "The model returned an empty response. Try rephrasing your question.";

      // Simulate streaming
      let i = 0;
      const interval = setInterval(() => {
        i += 4;
        setStreamedText(reply.slice(0, i));
        if (i >= reply.length) {
          clearInterval(interval);
          setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
          setStreamedText("");
          setLoading(false);
        }
      }, 8);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error occurred.";
      console.error("[TokenSense Chat] Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠ ${message}\n\nCheck your browser console for details and verify your VITE_GEMINI_API_KEY is set correctly.`,
        },
      ]);
      setLoading(false);
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const hasConversation = messages.length > 0 || loading;

  return (
    <>
      <div className="ts-root">
        {!open && (
          <button className="ts-fab" onClick={() => setOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Ask TokenSense AI
          </button>
        )}

        {open && (
          <div className="ts-drawer">
            <div className="ts-header">
              <div className="ts-brand">
                <div className="ts-brand-dot" />
                <span className="ts-brand-label">TokenSense AI</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {hasConversation && (
                  <button className="ts-clear" onClick={() => setMessages([])}>clear</button>
                )}
                <button className="ts-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            <div className="ts-context-bar">
              <div className="ts-ctx-item">
                <span className="ts-ctx-val">${totals?.totalLLMCost?.toFixed(2) ?? '0.00'}</span>
                <span className="ts-ctx-lbl">LLM spend</span>
              </div>
              <div className="ts-ctx-item">
                <span className="ts-ctx-val">${totals?.totalCloudCost?.toFixed(2) ?? '0.00'}</span>
                <span className="ts-ctx-lbl">Cloud spend</span>
              </div>
              <div className="ts-ctx-item">
                <span className="ts-ctx-val" style={{ color: "#ef4444" }}>{totals?.totalInsights ?? 0}</span>
                <span className="ts-ctx-lbl">Issues</span>
              </div>
              <div className="ts-ctx-item">
                <span className="ts-ctx-val" style={{ color: "#10b981" }}>Live</span>
                <span className="ts-ctx-lbl">Analysis</span>
              </div>
            </div>

            <div className="ts-body">
              {!hasConversation && (
                <div className="ts-empty">
                  <div className="ts-empty-label">Suggested</div>
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} className="ts-chip" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "ts-msg-user" : "ts-msg-ai"}>
                  {m.content}
                </div>
              ))}

              {loading && streamedText && (
                <div className="ts-msg-ai">{streamedText}</div>
              )}

              {loading && !streamedText && (
                <div className="ts-msg-ai" style={{ padding: "8px 14px" }}>
                  <div className="ts-typing">
                    <div className="ts-dot" />
                    <div className="ts-dot" />
                    <div className="ts-dot" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="ts-footer">
              <textarea
                ref={inputRef}
                className="ts-textarea"
                placeholder="Ask about your costs, models, or teams..."
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
              />
              <button className="ts-send" onClick={() => send()} disabled={!input.trim() || loading}>
                <svg viewBox="0 0 24 24">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
