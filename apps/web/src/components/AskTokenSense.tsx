import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import type { TeamMetrics, Insight } from '@tokensense/types';
import { getApiConfig, saveApiConfig, clearApiConfig } from '../utils/apiKeyManager';
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
  const [configMode, setConfigMode] = useState(false);
  const [cfgKey, setCfgKey] = useState("");
  const [cfgBaseUrl, setCfgBaseUrl] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      const cfg = getApiConfig();
      if (!cfg?.apiKey) setConfigMode(true);
      else if (inputRef.current && !configMode) inputRef.current.focus();
    }
  }, [open, configMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  function handleSaveConfig() {
    if (!cfgKey.trim()) return;
    saveApiConfig({ apiKey: cfgKey.trim(), baseUrl: cfgBaseUrl.trim() });
    setConfigMode(false);
  }

  function handleClearConfig() {
    clearApiConfig();
    setCfgKey("");
    setCfgBaseUrl("");
    setConfigMode(true);
  }

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
      const config = getApiConfig();
      if (!config?.apiKey) {
        throw new Error("No API Key configured. Please open settings.");
      }

      const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
      const OPENAI_API_URL = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

      const serverRes = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: 'system', content: systemPrompt }, ...next],
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (!serverRes.ok) {
        const errJson = await serverRes.json().catch(() => ({}));
        throw new Error(`API returned ${serverRes.status} ${JSON.stringify(errJson)}`);
      }

      const data = await serverRes.json();
      const reply = data.choices?.[0]?.message?.content;
      
      if (!reply) throw new Error("Empty reply from server");
      
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
      
    } catch (serverErr: any) {
      console.error("[TokenSense Chat] API Error:", serverErr);
      const message = serverErr instanceof Error ? serverErr.message : "Unknown error occurred.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠ Unable to reach provider.\n\nError: ${message}\nPlease verify your settings and Base URL.`,
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
                {!configMode && (
                  <button className="ts-clear" onClick={() => {
                    const cfg = getApiConfig();
                    setCfgKey(cfg?.apiKey || "");
                    setCfgBaseUrl(cfg?.baseUrl || "");
                    setConfigMode(true);
                  }}>⚙️</button>
                )}
                {hasConversation && !configMode && (
                  <button className="ts-clear" onClick={() => setMessages([])}>clear</button>
                )}
                <button className="ts-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            {configMode ? (
              <div className="ts-body" style={{ padding: "20px" }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#f8fafc" }}>Configure TokenSense AI</h3>
                <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#94a3b8" }}>
                  TokenSense operates directly from your browser to ensure absolute security. Provide your API Key and an optional Base URL to connect to any Universal gateway. Your key never leaves your browser.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: "#f8fafc" }}>API Key (Required)</label>
                  <input 
                    type="password" 
                    value={cfgKey} 
                    onChange={e => setCfgKey(e.target.value)} 
                    placeholder="sk-..."
                    style={{ width: "100%", padding: 8, background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: 4 }}
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: "#f8fafc" }}>Base URL (Optional)</label>
                  <input 
                    type="text" 
                    value={cfgBaseUrl} 
                    onChange={e => setCfgBaseUrl(e.target.value)} 
                    placeholder="https://api.openai.com/v1"
                    style={{ width: "100%", padding: 8, background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: 4 }}
                  />
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Leave blank to default to generic OpenAI.</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleSaveConfig} disabled={!cfgKey.trim()} style={{ background: "#3b82f6", color: "white", padding: "6px 12px", border: "none", borderRadius: 4, cursor: "pointer", opacity: cfgKey.trim() ? 1 : 0.5 }}>Save & Start</button>
                  {getApiConfig()?.apiKey && <button onClick={() => setConfigMode(false)} style={{ background: "transparent", color: "#94a3b8", padding: "6px 12px", border: "1px solid #334155", borderRadius: 4, cursor: "pointer" }}>Cancel</button>}
                  <div style={{ flex: 1 }} />
                  {getApiConfig()?.apiKey && <button onClick={handleClearConfig} style={{ background: "transparent", color: "#ef4444", padding: "6px 12px", border: "1px solid #ef4444", borderRadius: 4, cursor: "pointer" }}>Clear Config</button>}
                </div>
              </div>
            ) : (
              <>
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
            </>
          )}
          </div>
        )}
      </div>
    </>
  );
}
