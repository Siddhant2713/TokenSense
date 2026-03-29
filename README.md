<div align="center">

```
████████╗ ██████╗ ██╗  ██╗███████╗███╗   ██╗███████╗███████╗███╗   ██╗███████╗███████╗
╚══██╔══╝██╔═══██╗██║ ██╔╝██╔════╝████╗  ██║██╔════╝██╔════╝████╗  ██║██╔════╝██╔════╝
   ██║   ██║   ██║█████╔╝ █████╗  ██╔██╗ ██║███████╗█████╗  ██╔██╗ ██║███████╗█████╗  
   ██║   ██║   ██║██╔═██╗ ██╔══╝  ██║╚██╗██║╚════██║██╔══╝  ██║╚██╗██║╚════██║██╔══╝  
   ██║   ╚██████╔╝██║  ██╗███████╗██║ ╚████║███████║███████╗██║ ╚████║███████║███████╗
   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝
```

### **Stop guessing what your AI costs. Start owning it.**

*Intelligent observability, cost enforcement, and autonomous optimization for teams scaling LLMs and Cloud infrastructure.*

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Gemini](https://img.shields.io/badge/AI_Analyst-Gemini_1.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-10B981?style=flat-square)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-8B5CF6?style=flat-square)](./CONTRIBUTING.md)

<br/>

[**Live Demo**](#) · [**Documentation**](#) · [**CLI Reference**](#cli-tool) · [**Report Bug**](#) · [**Request Feature**](#)

<br/>

<img width="900" src="https://placehold.co/900x480/0b0f1a/3b82f6?text=TokenSense+Dashboard+Screenshot" alt="TokenSense Dashboard" />

</div>

---

<br/>

## ⚡ The Problem at Scale

> *"Our LLM bill doubled last month. Nobody knows why."*

This is the reality for engineering teams scaling Generative AI. As model usage grows across teams and services, costs compound invisibly — until the invoice arrives.

TokenSense exists to close that gap.

| Without TokenSense | With TokenSense |
|---|---|
| 🔴 No visibility into which team or service is burning budget | ✅ Per-team, per-model cost attribution with real-time telemetry |
| 🔴 Heavy models doing simple tasks (gpt-4o classifying `true/false`) | ✅ Automated MODEL_MISUSE detection and smart routing recommendations |
| 🔴 The same prompt sent 200 times with zero caching | ✅ CACHE_WASTE alerts with Redis implementation guidance |
| 🔴 Cloud functions allocated 512MB RAM, using 80MB | ✅ RAM over-provisioning detection with exact rightsizing targets |
| 🔴 Manual log-diving to find cost spikes | ✅ Autonomous AI Analyst that explains root causes and quantifies savings |

<br/>

---

## 🏗️ Architecture

TokenSense is built on **two complementary engines** that work in tandem:

```
  Raw Telemetry Logs (LLM + Cloud)
           │
           ▼
  ┌─────────────────────────────┐
  │   Deterministic Rules Engine │  ◄─── Instant, zero-latency anomaly detection
  │  MODEL_MISUSE  │  LONG_PROMPTS │
  │  CACHE_WASTE   │  SPIKE        │
  │  RAM_OVER_PROVISION           │
  └──────────────┬──────────────┘
                 │  Flagged Insights
                 ▼
  ┌─────────────────────────────┐
  │     AI Analyst (Gemini)      │  ◄─── Dynamic root cause analysis + ROI estimation
  │  Root Cause  │  Action Plan  │
  │  ROI Savings │  Confidence   │
  └──────────────┬──────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
  React Dashboard       CLI Report
  (Real-time UI)     (CI/CD-ready)
```

### Core Layers

**1. Telemetry Ingestion**
Captures high-fidelity logs for every LLM call and cloud resource access — model version, token counts, latency, cost, prompt hashes, RAM utilization, and more.

**2. Rules Engine**
A strict, deterministic evaluation layer. No hallucination, no ambiguity. If the rule fires, the insight is real.

| Rule | Trigger | Example |
|---|---|---|
| `MODEL_MISUSE` | Premium model, trivially short output | `gpt-4o` returning 42 tokens |
| `LONG_PROMPTS` | Average input > 2,000 tokens | Marketing team sending 3,200 token contexts |
| `CACHE_WASTE` | Same prompt hash seen 50+ times | Code reviewer running identical checks |
| `SPIKE` | Daily usage > 3× rolling average | Data pipeline spike to 328 calls on one day |
| `RAM_OVER_PROVISION` | RAM utilization < 40% | Lambda allocated 512MB, using 80MB |
| `MODEL_DOWNGRADE` | Opus-class model on sub-100-token tasks | `claude-3-opus` for simple summaries |

**3. AI Analyst**
Powered by `gemini-1.5-flash`. Receives flagged insights + metric context and returns structured JSON containing:
- **Executive Summary** — a human-readable briefing for engineering leads
- **Root Cause Analysis** — *why* this happened, not just *what* happened
- **Action Plans** — specific, implementable instructions
- **Monthly Savings Estimates** — quantified ROI for every recommendation
- **Effort + Confidence Scores** — prioritize what to fix first

**4. Smart Router** *(in-platform)*
An embedded LLM gateway that classifies task type and complexity, then routes to the optimal model — balancing cost, quality, and latency automatically.

<br/>

---

## 🎯 Features

### 📊 React Dashboard
A real-time visual command center with:
- **KPI Strip** — Total LLM spend, cloud spend, issues detected, and potential monthly savings — all at a glance
- **Daily Cost Breakdown** — Stacked area chart showing LLM vs. Cloud spend over 30 days
- **Issue Matrix** — Severity-ranked anomaly feed with team attribution and evidence
- **AI Recommendations Panel** — Expandable cards with root cause, action plan, and ROI per issue
- **Team Metrics Table** — Cost per team, WoW trend, primary model, and call volume
- **Cloud Resource Grid** — RAM utilization bars, wasted cost, and provider breakdown
- **Smart Router Dashboard** — Routing logs, model registry, cost-by-model charts, task distribution pie

### 🖥️ CLI Tool
A headless terminal report — ideal for CI/CD pipelines, Slack digests, or weekly engineering standups.

```bash
npm run cli
```

```
╔══════════════════════════════════════════════════════════════╗
║          TOKENSENSE — AI COST OPTIMIZATION REPORT            ║
║                    Report Date: 2025-10-30                   ║
╚══════════════════════════════════════════════════════════════╝

EXECUTIVE SUMMARY
────────────────────────────────────────────────────────────────
  ● Analyzed 79,290 LLM calls and 180 cloud resource entries
  ● Total LLM Spend:    $487.32
  ● Total Cloud Spend:  $241.15
  ● 6 issues detected
  ● Potential savings:  $18,200.00/month ($218,400.00/year)

✨ AI ANALYST SUMMARY
────────────────────────────────────────────────────────────────
  "Critical model misuse detected across Payments and Analytics 
   teams. Switching from gpt-4o/claude-3-opus to economy-tier 
   models for simple classification tasks could yield over 
   $17K/month in savings with minimal engineering effort..."
```

### 🔀 Smart Router SDK
Drop-in LLM gateway for your codebase. Classifies task complexity, routes to the right model, caches identical prompts, handles fallbacks, and tracks every dollar.

```typescript
import { TokenSenseRouter } from './src/router';

const router = new TokenSenseRouter({
  providers: {
    openai:    { apiKey: process.env.OPENAI_API_KEY! },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! },
    google:    { apiKey: process.env.GOOGLE_API_KEY! },
  },
  defaults: { preferCost: true },
  cache: { ttlMs: 300_000 },
});

const response = await router.route({
  prompt: "Classify this support ticket as: billing, technical, or general",
  // ↑ TokenSense detects this is a 'classification' task with 'simple' complexity
  // and routes to gemini-2.0-flash instead of gpt-4o — saving 96% on this call
});

console.log(router.getMetrics());
// → { totalCost: 0.0000042, cacheHitRate: 0.15, avgLatencyMs: 248 }
```

**Supported Models:**

| Model | Provider | Tier | Use Case |
|---|---|---|---|
| `gpt-4o` | OpenAI | Premium | Complex code, reasoning |
| `gpt-4o-mini` | OpenAI | Economy | Chat, classification |
| `claude-sonnet-4` | Anthropic | Premium | Code, long-context |
| `claude-3.5-haiku` | Anthropic | Economy | Fast chat, extraction |
| `gemini-2.5-pro` | Google | Premium | Deep reasoning |
| `gemini-2.0-flash` | Google | Economy | High-volume, low-latency |

<br/>

---

## 🚀 Getting Started

### Prerequisites
- Node.js `≥ 20.19.0`
- A [Google AI Studio](https://aistudio.google.com/) API key for the AI Analyst *(optional — falls back gracefully)*

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/tokensense.git
cd tokensense

# Install dependencies
npm install
```

### Configuration

Create a `.env` file in the root directory:

```env
# Required for AI Analyst (Gemini-powered recommendations)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Provider keys for the Smart Router
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

> **No API key?** TokenSense runs fully in deterministic mode — all rules fire, costs are calculated, and structured recommendations are generated without any external AI call. The `VITE_GEMINI_API_KEY` only enhances recommendations with natural language explanations.

### Run the Dashboard

```bash
npm run dev
# → http://localhost:5173
```

### Run the CLI Report

```bash
npm run cli
```

### Build for Production

```bash
npm run build
```

<br/>

---

## 🔍 How the AI Analyst Works

When rules fire, TokenSense doesn't just show you a warning — it sends structured context to Gemini and requests a precise, JSON-formatted response:

```
Rules Engine                    Gemini 1.5 Flash
─────────────                   ──────────────────
Insight: MODEL_MISUSE           → Root Cause: "Payments team is using
Team: Payments                     gpt-4o for invoice classification —
Evidence: 12,390 calls,            a binary task where output averages
  avg output 42 tokens             42 tokens. The model was likely chosen
                                   as a default and never revisited."
                                
                                → Action: "Replace model with gpt-4o-mini
                                   in the invoice-classifier feature flag.
                                   Benchmark on 100 samples first."

                                → Monthly Saving: $9,200
                                → Effort: Low
                                → Confidence: High
```

If Gemini is unavailable, TokenSense's **deterministic fallback** generates structured savings estimates from rule metadata — so your pipeline never breaks.

<br/>

---

## 📁 Project Structure

```
tokensense/
├── src/
│   ├── App.tsx                  # Main dashboard UI (React)
│   ├── App.css                  # Design system & component styles
│   ├── mockData.ts              # Realistic telemetry simulation engine
│   ├── aggregator.ts            # LLM + Cloud log aggregation
│   ├── rules.ts                 # Deterministic anomaly detection rules
│   ├── recommendations.ts       # Gemini AI Analyst integration
│   ├── routerMockData.ts        # Smart Router demo data generator
│   ├── types.ts                 # Shared TypeScript interfaces
│   ├── cli.ts                   # Terminal report generator
│   └── router/                  # Smart Router SDK
│       ├── TokenSenseRouter.ts  # Main router class
│       ├── routingEngine.ts     # Model selection logic
│       ├── modelRegistry.ts     # Model catalog & pricing
│       ├── providers.ts         # OpenAI / Anthropic / Google clients
│       ├── cache.ts             # Semantic response cache (LRU + TTL)
│       ├── taskClassifier.ts    # Prompt → task type inference
│       ├── complexityEstimator.ts # Prompt → complexity scoring
│       ├── costTracker.ts       # Per-request cost + metrics ledger
│       ├── latencyTracker.ts    # p95 / p99 latency tracking
│       ├── rateLimiter.ts       # Token bucket rate limiter
│       ├── promptOptimizer.ts   # Token reduction transforms
│       ├── parameterTuner.ts    # Task-aware temperature / max_tokens
│       └── responseValidator.ts # Output quality checks
├── bin/
│   └── tokensense.js            # CLI entrypoint
├── public/
│   └── favicon.svg
├── package.json
└── vite.config.ts
```

<br/>

---

## 🧠 Detection Rules — In Depth

### `MODEL_MISUSE`
Fires when a premium model (`gpt-4o`, `claude-3-opus`) produces an average output below 100 tokens. Short outputs on expensive models signal the task is too simple for the model tier.

**Why it matters:** `gpt-4o` costs ~25× more per output token than `gpt-4o-mini`. A team making 12,000 calls/day with 42-token outputs wastes thousands of dollars monthly.

### `LONG_PROMPTS`
Fires when average input token count exceeds 2,000. Bloated contexts inflate cost linearly on every single call.

**Fix pattern:** Summarize conversation history before appending. Implement RAG to retrieve only the relevant context chunks instead of stuffing the full document.

### `CACHE_WASTE`
Detects identical prompt hashes sent 50+ times. Every repeated identical call to the API is money spent on a result you already have.

**Fix pattern:** Wrap your LLM calls with a Redis or in-memory cache keyed on `hash(model + systemPrompt + userPrompt)`.

### `SPIKE`
Fires when a team's daily call count exceeds 3× their rolling average. Spikes often indicate runaway retry loops, misconfigured batch jobs, or accidental infinite recursion in agent pipelines.

### `RAM_OVER_PROVISION`
Cloud function allocated 512MB, consistently using 80MB? That's 85% waste billed as compute time. TokenSense calculates the exact rightsized allocation and the monthly dollar delta.

<br/>

---

## ⚖️ MVP Limitations

TokenSense V1 is a demonstration-grade platform. It makes deliberate trade-offs to showcase core value rapidly:

| Limitation | Status | Roadmap |
|---|---|---|
| **Simulated Data** — telemetry is generated by `mockData.ts`, not a live database | V1 | Phase 3: OpenTelemetry + ClickHouse ingestion pipeline |
| **Stateless AI** — Gemini evaluates each session independently, no historical memory | V1 | Phase 4: Fine-tuned analyst with longitudinal tracking |
| **Passive Gateway** — observes and recommends, does not reroute live traffic | V1 | Phase 2: Active proxy layer |
| **Local Execution** — runs on client-side env vars, no auth layer | V1 | Phase 3: Multi-tenant backend-as-a-service |

<br/>

---

## 🗺️ Roadmap

### Phase 2 — Active Intelligence
- **Dynamic Model Fallbacks** — intercept production calls and reroute at the gateway in real-time based on prompt complexity
- **Semantic Caching** — cache by embedding similarity, not just exact hash matches
- **Budget Enforcement** — hard-cap spending per team per day; fail-open with cheaper models

### Phase 3 — Enterprise Integrations
- **Live Ingestion Pipeline** — accept OpenTelemetry logs from production services via Kafka
- **Cloud Provider Sync** — native connectors for AWS Cost Explorer, GCP Billing, Datadog
- **Alerting** — Slack/Discord webhooks when a service exceeds its weekly budget threshold
- **RBAC + Multi-tenancy** — org-level isolation with team-scoped dashboards

### Phase 4 — Predictive Intelligence
- **Cost Spike Prediction** — detect unusual patterns before they hit the invoice
- **Agentic Actions** — AI Analyst opens PRs to update model configs in your connected GitHub repositories
- **Fine-Tuned Analyst** — continuously learn from resolved recommendations to improve confidence scoring

<br/>

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite 8 | Dashboard UI |
| **Charting** | Recharts | Cost charts, distribution graphs |
| **Icons** | Lucide React | UI iconography |
| **AI** | Google Gemini 1.5 Flash | AI Analyst engine |
| **CLI Runtime** | tsx, Node.js | Terminal report |
| **Styling** | CSS Modules + Custom Design System | No heavy UI library dependencies |
| **Type Safety** | TypeScript 5.9 (strict mode) | End-to-end type coverage |

<br/>

---

## 🤝 Contributing

Contributions are what make open-source great. To contribute:

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
# Open a Pull Request
```

Areas we'd love help with:
- New detection rules for additional waste patterns
- Real data adapters (OpenTelemetry, Datadog, CloudWatch)
- Additional LLM provider clients (Mistral, Cohere, Together AI)
- Improved complexity estimation heuristics

<br/>

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.

<br/>

---

<div align="center">

**Built for engineering teams who care about what they ship — and what it costs.**

<br/>

*TokenSense — Stop guessing what your AI costs. Start optimizing it.*

</div>