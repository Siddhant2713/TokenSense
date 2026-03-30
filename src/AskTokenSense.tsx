import { useState, useRef, useEffect, type KeyboardEvent } from "react";

const SUGGESTIONS = [
  "Which team should I fix first for maximum ROI?",
  "Explain the Payments MODEL_MISUSE issue like I'm presenting to my CTO",
  "Write me a Redis caching wrapper for the Engineering cache waste",
  "What's my projected yearly spend if nothing changes?",
  "Compare our LLM costs to cloud costs — where's the bigger risk?",
];

export default function AskTokenSense({ teamMetrics, insights, totals }: any) {
  const SYSTEM_PROMPT = `You are TokenSense AI, an embedded cost-optimization analyst for LLM and cloud infrastructure. 
You have access to the following live dashboard metrics:

Live metrics: ${JSON.stringify({ teamMetrics, insights, totals }, null, 2)}

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
      if (!apiKey) throw new Error("Missing Gemini config");

      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: next.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          })),
        }),
      });

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";

      let i = 0;
      const interval = setInterval(() => {
        i += 3;
        setStreamedText(reply.slice(0, i));
        if (i >= reply.length) {
          clearInterval(interval);
          setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
          setStreamedText("");
          setLoading(false);
        }
      }, 8);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠ Could not reach TokenSense AI. Check your API configuration." },
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=Space+Mono&display=swap');
        .ts-root * { box-sizing: border-box; font-family: 'Space Grotesk', sans-serif; }
        .ts-fab {
          position: fixed; bottom: 28px; right: 28px; z-index: 999;
          display: flex; align-items: center; gap: 8px;
          background: #3b82f6; color: white;
          border: none; border-radius: 100px;
          padding: 12px 20px; cursor: pointer;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px; font-weight: 600;
          box-shadow: 0 8px 24px rgba(59,130,246,0.35);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ts-fab:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(59,130,246,0.45); }
        .ts-fab:active { transform: translateY(0); }
        .ts-drawer {
          position: fixed; bottom: 0; right: 0; z-index: 998;
          width: 420px; height: 88vh;
          background: #ffffff;
          border-left: 1px solid #e2e8f0;
          border-top: 1px solid #e2e8f0;
          border-top-left-radius: 20px;
          display: flex; flex-direction: column;
          box-shadow: -8px 0 40px rgba(59,130,246,0.08);
          animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .ts-header {
          padding: 16px 20px 12px;
          border-bottom: 1px solid #f1f5f9;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .ts-brand { display: flex; align-items: center; gap: 8px; }
        .ts-brand-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #10b981; flex-shrink: 0;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .ts-brand-label { font-size: 11px; font-weight: 600; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; }
        .ts-close {
          background: none; border: none; cursor: pointer;
          color: #94a3b8; font-size: 18px; line-height: 1;
          padding: 4px; border-radius: 6px; transition: background 0.15s;
        }
        .ts-close:hover { background: #f1f5f9; color: #64748b; }
        .ts-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
        .ts-empty { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
        .ts-empty-label { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
        .ts-chip {
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 100px; padding: 8px 14px;
          font-size: 12px; color: #475569; cursor: pointer;
          text-align: left; transition: all 0.15s; font-family: 'Space Grotesk', sans-serif;
        }
        .ts-chip:hover { background: #eff6ff; border-color: #bfdbfe; color: #3b82f6; }
        .ts-msg { display: flex; flex-direction: column; gap: 3px; }
        .ts-msg-user {
          align-self: flex-end; max-width: 82%;
          background: #3b82f6; color: white;
          border-radius: 14px 14px 3px 14px;
          padding: 9px 13px; font-size: 13px; line-height: 1.5;
        }
        .ts-msg-ai {
          align-self: flex-start; max-width: 92%;
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 3px 14px 14px 14px;
          padding: 11px 14px; font-size: 13px; line-height: 1.65;
          color: #0f172a; white-space: pre-wrap; font-family: inherit;
        }
        .ts-msg-ai code {
          font-family: 'Space Mono', monospace; font-size: 11px;
          background: #1e293b; color: #94a3b8;
          padding: 2px 6px; border-radius: 4px;
        }
        .ts-msg-ai pre {
          background: #1e293b; border-radius: 8px;
          padding: 10px 12px; margin: 6px 0;
          overflow-x: auto;
        }
        .ts-msg-ai pre code { background: none; padding: 0; font-size: 11px; }
        .ts-typing { display: flex; align-items: center; gap: 4px; padding: 12px 14px; }
        .ts-dot { width: 5px; height: 5px; border-radius: 50%; background: #94a3b8; animation: bounce 1.1s ease-in-out infinite; }
        .ts-dot:nth-child(2) { animation-delay: 0.18s; }
        .ts-dot:nth-child(3) { animation-delay: 0.36s; }
        @keyframes bounce { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        .ts-context-bar {
          margin: 0 20px 12px;
          background: #eff6ff; border: 1px solid #dbeafe;
          border-radius: 10px; padding: 8px 12px;
          display: flex; gap: 12px; flex-shrink: 0;
        }
        .ts-ctx-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .ts-ctx-val { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; color: #1d4ed8; }
        .ts-ctx-lbl { font-size: 9px; color: #60a5fa; text-transform: uppercase; letter-spacing: 1px; margin-top: 1px; }
        .ts-footer {
          padding: 12px 16px 16px;
          border-top: 1px solid #f1f5f9;
          display: flex; gap: 8px; align-items: flex-end;
          flex-shrink: 0;
        }
        .ts-textarea {
          flex: 1; resize: none; border: 1px solid #e2e8f0;
          border-radius: 12px; padding: 9px 13px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px; color: #0f172a;
          line-height: 1.5; max-height: 100px;
          background: #f8fafc; outline: none;
          transition: border-color 0.15s;
        }
        .ts-textarea:focus { border-color: #93c5fd; background: white; }
        .ts-textarea::placeholder { color: #cbd5e1; }
        .ts-send {
          width: 36px; height: 36px; border-radius: 10px;
          background: #3b82f6; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.15s;
        }
        .ts-send:hover { background: #2563eb; }
        .ts-send:disabled { background: #e2e8f0; cursor: not-allowed; }
        .ts-send svg { width: 14px; height: 14px; fill: white; }
        .ts-clear { font-size: 11px; color: #94a3b8; background: none; border: none; cursor: pointer; padding: 0 4px; }
        .ts-clear:hover { color: #64748b; }
      `}</style>

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
                <span className="ts-ctx-val">${totals?.totalLLMCost?.toFixed(2) || '0.00'}</span>
                <span className="ts-ctx-lbl">LLM spend</span>
              </div>
              <div className="ts-ctx-item">
                <span className="ts-ctx-val">${totals?.totalCloudCost?.toFixed(2) || '0.00'}</span>
                <span className="ts-ctx-lbl">Cloud spend</span>
              </div>
              <div className="ts-ctx-item">
                <span className="ts-ctx-val" style={{ color: "#ef4444" }}>{totals?.totalInsights || 0}</span>
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
                <div key={i} className={`ts-msg ${m.role === "user" ? "ts-msg-user" : "ts-msg-ai"}`}>
                  {m.content}
                </div>
              ))}

              {loading && streamedText && (
                <div className="ts-msg ts-msg-ai">{streamedText}</div>
              )}

              {loading && !streamedText && (
                <div className="ts-msg ts-msg-ai" style={{ padding: "8px 14px" }}>
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
                <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}