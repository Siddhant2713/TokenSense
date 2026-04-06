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

*Production-grade LLMOps observability — proxy ingestion, deterministic rules, AI-powered analysis, and real-time cost intelligence for engineering teams at scale.*

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-Workspaces-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=flat-square&logo=turborepo&logoColor=white)](https://turbo.build/)
[![License](https://img.shields.io/badge/License-MIT-10B981?style=flat-square)](./LICENSE)

<br/>

[**Live Demo**](#) · [**Upgrade Roadmap**](./project_upgrade.md) · [**CLI Reference**](#cli-tool) · [**Smart Router**](#smart-router-sdk) · [**Architecture**](#architecture)

</div>

---

## What is TokenSense?

TokenSense is an **open-source LLMOps intelligence platform** built for engineering teams who need to understand, attribute, and optimize their AI infrastructure costs. It combines three systems that most observability tools keep separate:

| System | What it does |
|---|---|
| 🔍 **Deterministic Rules Engine** | Fires zero-false-positive alerts for model misuse, prompt bloat, cache waste, traffic spikes, and cloud over-provisioning |
| 🤖 **AI Analyst** | Consumes rule findings and returns structured root-cause analysis, action plans, and monthly savings estimates via Gemini |
| 🔀 **Smart Router SDK** | A drop-in LLM gateway that classifies task complexity and routes to the cheapest capable model automatically |

> **Current Status — Phase 1 Complete.** The monorepo is structured, the API security vulnerability is resolved (Gemini calls moved server-side), real proxy ingestion is wired up, and the shared `@tokensense/types` and `@tokensense/rules-engine` packages are extracted. The dashboard degrades gracefully to mock data when the server is offline.

---

## Table of Contents

- [Architecture](#architecture)
- [Monorepo Structure](#monorepo-structure)
- [Quick Start](#quick-start)
- [Running the Stack](#running-the-stack)
- [Environment Variables](#environment-variables)
- [The Rules Engine](#the-rules-engine)
- [Smart Router SDK](#smart-router-sdk)
- [CLI Tool](#cli-tool)
- [Ask TokenSense AI](#ask-tokensense-ai)
- [Upgrade Roadmap](#upgrade-roadmap)
- [Contributing](#contributing)

---

## Architecture

```
  Raw Telemetry (LLM + Cloud)
           │
           ▼
  ┌──────────────────────────────┐      ┌─────────────────────┐
  │   Proxy Gateway              │      │   SDK Wrap / OTEL   │
  │  /v1/proxy/openai            │      │  @tokensense/sdk     │
  │  /v1/proxy/anthropic         │      └──────────┬──────────┘
  │  /v1/proxy/google            │                 │
  └──────────────┬───────────────┘                 │
                 └──────────┬──────────────────────┘
                            ▼
              ┌─────────────────────────┐
              │  Express API Server      │  :3001
              │  apps/server             │
              └──────────┬──────────────┘
                         │  async / non-blocking
                         ▼
              ┌─────────────────────────┐
              │  Rules Engine           │  @tokensense/rules-engine
              │  AI Analyst Service     │  server-side Gemini
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │  React Dashboard        │  :5173 / :3000
              │  apps/web               │
              └─────────────────────────┘
```

**Key architectural principles:**

- **Proxy-first ingestion** — teams change one `baseURL`, get full observability with zero instrumentation code
- **Non-blocking write path** — the proxy returns to the caller immediately; logging happens asynchronously via a queue
- **Server-side AI** — the Gemini API key never touches the browser bundle
- **Graceful degradation** — the dashboard falls back to mock data if the server is unreachable, so demos always work
- **Shared packages** — `@tokensense/types` and `@tokensense/rules-engine` run identically in browser and Node.js

---

## Monorepo Structure

```
tokensense/
├── apps/
│   ├── web/                    ← React 19 + Vite 8 dashboard
│   │   ├── src/
│   │   │   ├── components/     ← All UI components
│   │   │   ├── router/         ← Smart Router SDK (15 modules)
│   │   │   ├── App.tsx
│   │   │   ├── mockData.ts     ← Offline fallback, always available
│   │   │   ├── recommendations.ts  ← Calls server; falls back gracefully
│   │   │   └── cli.ts          ← CLI report generator
│   │   └── package.json        (@tokensense/web)
│   │
│   └── server/                 ← Express API server
│       ├── src/
│       │   ├── proxy/          ← LLM proxy gateway (OpenAI / Anthropic / Google)
│       │   ├── ingestion/      ← OTEL receiver + direct ingest endpoint
│       │   ├── queues/         ← Telemetry + webhook job queues
│       │   ├── routes/         ← REST API routes
│       │   ├── services/       ← AI Analyst, analytics, webhook dispatcher
│       │   └── middleware/     ← Auth, RBAC, audit
│       └── package.json        (@tokensense/server)
│
├── packages/
│   ├── types/                  ← @tokensense/types  (shared interfaces)
│   │   └── src/index.ts
│   └── rules-engine/           ← @tokensense/rules-engine (runs everywhere)
│       └── src/
│           ├── rules.ts
│           ├── aggregator.ts
│           └── config/ruleThresholds.ts
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json                (monorepo root)
```

---

## Quick Start

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20.19.0 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 9.0 | `npm i -g pnpm` |
| Git | any | [git-scm.com](https://git-scm.com) |

> **Optional:** A [Google AI Studio](https://aistudio.google.com/) API key unlocks the AI Analyst. Without it, the platform runs in deterministic-only mode — all rules still fire and structured recommendations are still generated.

### 1. Clone & Install

```bash
git clone https://github.com/your-org/tokensense.git
cd tokensense

# Install all workspace dependencies in one shot
pnpm install
```

### 2. Configure Environment

```bash
# Copy the example env — required for both apps
cp apps/web/.env.example apps/web/.env
cp apps/server/.env.example apps/server/.env
```

Then open `apps/web/.env`:

```env
# Server URL (where the Express API runs)
VITE_API_URL=http://localhost:3001
```

And `apps/server/.env`:

```env
# Required
GEMINI_API_KEY=your_google_ai_studio_key_here
JWT_SECRET=replace_with_64_char_random_hex

# Phase 2+ (leave blank for now — server starts fine without them)
DATABASE_URL=
REDIS_URL=
CLICKHOUSE_URL=
```

### 3. Run

```bash
# Run everything in parallel (dashboard + server)
pnpm dev

# Or run individually:
pnpm --filter @tokensense/web dev          # Dashboard  → http://localhost:5173
pnpm --filter @tokensense/server dev       # API server → http://localhost:3001
```

That's it. Open **http://localhost:5173**.

---

## Running the Stack

### Development Mode

```bash
# Full stack — Turborepo fans out tasks to both apps simultaneously
pnpm dev
```

Turborepo handles dependency ordering automatically. The server starts first; the dashboard connects on boot.

### Dashboard Only (Offline / Demo Mode)

The dashboard works **without the server**. When `http://localhost:3001` is unreachable, `recommendations.ts` falls back to the deterministic offline generator. All rule evaluations, cost charts, and team metrics still render from `mockData.ts`.

```bash
pnpm --filter @tokensense/web dev
# → Full dashboard at http://localhost:5173 — no server needed
```

### API Server Only

```bash
pnpm --filter @tokensense/server dev
# → Express at http://localhost:3001
```

### Build for Production

```bash
pnpm build

# Builds all packages in correct dependency order:
#   packages/types → packages/rules-engine → apps/web + apps/server
```

### Lint All Packages

```bash
pnpm lint
```

---

## Environment Variables

### `apps/web/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | URL of the Express API server. Default: `http://localhost:3001` |

> ⚠️ **Security note:** The old `VITE_GEMINI_API_KEY` has been removed. The Gemini key now lives server-side only. Never use `VITE_` prefixed secrets.

### `apps/server/.env`

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Google AI Studio key. Without it, AI Analyst returns deterministic fallbacks only |
| `JWT_SECRET` | Yes (Phase 2+) | 64-byte hex secret for session tokens |
| `ENCRYPTION_KEY` | Yes (Phase 2+) | 32-byte hex key for API key encryption at rest |
| `DATABASE_URL` | Phase 2+ | PostgreSQL connection string |
| `REDIS_URL` | Phase 1+ | Redis connection string (queue + cache) |
| `CLICKHOUSE_URL` | Phase 4+ | ClickHouse HTTP endpoint |
| `ENABLE_PROXY_GATEWAY` | Optional | `true` to activate the LLM proxy endpoints |
| `ENABLE_WEBHOOKS` | Optional | `true` to activate webhook delivery |
| `ENABLE_CLICKHOUSE` | Optional | `true` to swap mock data for ClickHouse queries |

---

## The Rules Engine

The Rules Engine is the core of TokenSense. It is **deterministic, zero-latency, and zero-false-positive** — if a rule fires, the issue is real. It runs in both the browser (via `@tokensense/rules-engine` package) and on the server.

### Detection Rules

| Rule | Trigger | Signal |
|---|---|---|
| `MODEL_MISUSE` | Premium model (`gpt-4o`, `claude-3-opus`) producing avg < 100 output tokens | Task is too simple for the model tier |
| `LONG_PROMPTS` | Average input token count > 2,000 | Bloated context, RAG opportunity |
| `CACHE_WASTE` | Same prompt hash seen ≥ 50 times | Repeated identical API calls, zero caching |
| `SPIKE` | Daily call count > 3× rolling average | Runaway retry loop or misconfigured batch job |
| `RAM_OVER_PROVISION` | Cloud function RAM utilization < 40% | Over-allocated Lambda / Worker |
| `MODEL_DOWNGRADE` | Opus/Pro model on sub-100-token tasks | Premium model doing economy work |

### How Rules Are Evaluated

```typescript
import { runAllRules } from '@tokensense/rules-engine';

const insights = runAllRules(
  llmLogs,       // Log[]
  teamMetrics,   // TeamMetrics[]
  cloudMetrics,  // CloudResourceMetrics[]
  {
    projectId: 'proj_abc',                 // optional: tenant scope
    ruleOverrides: { SPIKE_MULTIPLIER: 5 } // optional: project-specific thresholds
  }
);

// insights: Insight[] — each has { rule, team, severity, evidence, suggestedFix }
```

The same call works identically in the browser and on the Node.js server.

---

## Smart Router SDK

A production-quality LLM routing SDK embedded in `apps/web/src/router/` (15 modules). It classifies task type and complexity, routes to the optimal model, caches identical prompts, and tracks every dollar.

```typescript
import { TokenSenseRouter } from '@tokensense/web/router';

const router = new TokenSenseRouter({
  providers: {
    openai:    { apiKey: process.env.OPENAI_API_KEY! },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! },
    google:    { apiKey: process.env.GOOGLE_API_KEY! },
  },
  defaults: { preferCost: true },
  cache: { ttlMs: 300_000 },   // 5-minute semantic cache
});

// One call — automatic task classification + optimal routing
const response = await router.route({
  prompt: "Classify this support ticket as: billing, technical, or general",
  // ↑ Router detects: task=classification, complexity=simple
  //   Routes to: gemini-2.0-flash  (96% cheaper than gpt-4o)
});

console.log(router.getMetrics());
// → { totalCost: 0.0000042, cacheHitRate: 0.15, avgLatencyMs: 248 }
```

### Supported Models

| Model | Provider | Tier | Input $/1M | Output $/1M |
|---|---|---|---|---|
| `gpt-4o` | OpenAI | Premium | $2.50 | $10.00 |
| `gpt-4o-mini` | OpenAI | Economy | $0.15 | $0.60 |
| `gpt-3.5-turbo` | OpenAI | Economy | $0.50 | $1.50 |
| `claude-sonnet-4` | Anthropic | Premium | $3.00 | $15.00 |
| `claude-3.5-haiku` | Anthropic | Economy | $0.80 | $4.00 |
| `gemini-2.5-pro` | Google | Premium | $1.25 | $10.00 |
| `gemini-2.0-flash` | Google | Economy | $0.10 | $0.40 |

### Router Modules

| Module | Purpose |
|---|---|
| `TokenSenseRouter.ts` | Main entry point — orchestrates the full request lifecycle |
| `routingEngine.ts` | Model selection logic: tier, strength, latency, budget scoring |
| `modelRegistry.ts` | Model catalog with pricing and capability metadata |
| `taskClassifier.ts` | NLP-based prompt → task type inference (`code`, `reasoning`, `chat`, etc.) |
| `complexityEstimator.ts` | Prompt → complexity scoring (`simple` / `moderate` / `complex`) |
| `cache.ts` | LRU + TTL semantic response cache |
| `costTracker.ts` | Per-request cost ledger + daily budget tracking |
| `latencyTracker.ts` | p95 / p99 latency tracking per model |
| `rateLimiter.ts` | Token bucket rate limiter per user |
| `promptOptimizer.ts` | Removes filler phrases, normalizes whitespace, enforces output format |
| `parameterTuner.ts` | Task-aware temperature / max_tokens tuning |
| `responseValidator.ts` | Output quality checks per task type |
| `providers.ts` | OpenAI / Anthropic / Google provider clients |
| `promptTemplates.ts` | System prompt library per task type |
| `logger.ts` | Structured request logging with level filtering |

---

## CLI Tool

A headless terminal report — perfect for CI/CD pipelines, Slack digests, or engineering standups.

```bash
# From the web app package
pnpm --filter @tokensense/web cli

# Or directly
cd apps/web && npx tsx src/cli.ts
```

**Example output:**

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

ISSUES DETECTED
────────────────────────────────────────────────────────────────
  [HIGH]   MODEL_MISUSE        Payments     12,390 calls @ 42 avg tokens
  [HIGH]   MODEL_DOWNGRADE     Analytics    150 calls/day, claude-3-opus
  [MEDIUM] LONG_PROMPTS        Marketing    3,200 avg input tokens
  [MEDIUM] CACHE_WASTE         Engineering  200 repeat hashes/day
  [LOW]    SPIKE               Data         328 calls (3.1x avg) on Oct 19
  [LOW]    RAM_OVER_PROVISION  Data         512MB alloc → 80MB used
```

---

## Ask TokenSense AI

The floating chat interface in the bottom-right corner gives you a context-aware AI analyst. It has your full 30-day telemetry baked into the system prompt, so you can ask it anything about your cost picture:

- *"Which team should I fix first for maximum ROI?"*
- *"Write me a Redis caching wrapper for the Engineering cache waste"*
- *"What's my projected yearly spend if nothing changes?"*
- *"Explain the Payments MODEL_MISUSE issue for my CTO"*

The chat widget uses the **server-side** Gemini endpoint (`POST /api/analyze`) when the server is running, and falls back to the browser-side Gemini call if not — so it always works in demo mode.

---

## Proxy Ingestion (Phase 1)

Teams can send real LLM telemetry to TokenSense by changing **one line**:

```typescript
// Before
const client = new OpenAI({ baseURL: "https://api.openai.com/v1" });

// After — full observability, zero other changes
const client = new OpenAI({
  baseURL: "http://localhost:3001/v1/proxy/openai",
  defaultHeaders: { "TS-API-Key": "ts_live_xxxx" }
});
```

Supported proxy targets:

| Endpoint | Forwards to |
|---|---|
| `POST /v1/proxy/openai/*` | `api.openai.com` |
| `POST /v1/proxy/anthropic/*` | `api.anthropic.com` |
| `POST /v1/proxy/google/*` | `generativelanguage.googleapis.com` |

Every proxied request is logged non-blocking to a queue, then batch-flushed to the analytics store. The proxy adds < 50ms overhead and returns to the caller before any logging occurs.

### Direct SDK Ingestion

For teams who don't want to change `baseURL`:

```typescript
import { TokenSense } from '@tokensense/sdk';

const ts = new TokenSense({ apiKey: 'ts_live_xxxx' });

const response = await ts.wrap(
  () => openai.chat.completions.create({ model: 'gpt-4o', messages }),
  { feature: 'invoice-classifier', userId: 'user_123' }
);
// Captures request + response + latency, posts to /api/ingest async
```

---

## Upgrade Roadmap

TokenSense is on a phased path from demo dashboard to enterprise LLMOps platform. See [`project_upgrade.md`](./project_upgrade.md) for the full technical spec.

| Phase | Status | Milestone |
|---|---|---|
| **Phase 0** | ✅ Done | Monorepo (Turborepo + pnpm), security fix, shared packages |
| **Phase 1** | ✅ Done | Real data ingestion — proxy gateway, SDK wrap, OTEL receiver |
| **Phase 2** | 🔲 Next | Multi-tenancy + RBAC + authentication (PostgreSQL + JWT) |
| **Phase 3** | 🔲 Planned | Public REST API + TypeScript SDK + Python SDK + OpenAPI spec |
| **Phase 4** | 🔲 Planned | ClickHouse analytics layer — retire mock aggregator |
| **Phase 5** | 🔲 Planned | Webhooks + Slack / email / PagerDuty alert delivery |
| **Phase 6** | 🔲 Planned | Configurable rules + LLM-as-a-judge evaluators |
| **Phase 7** | 🔲 Planned | Executive dashboards + custom widgets + data export |
| **Phase 8** | 🔲 Planned | Docker Compose + Kubernetes Helm chart (self-hosting) |
| **Phase 9** | 🔲 Planned | SSO (SAML/OIDC) + SCIM + audit logs |

Architectural inspiration: [Helicone](https://github.com/Helicone/helicone) (proxy-first, ClickHouse at scale) and [Langfuse](https://github.com/langfuse/langfuse) (SDK-first, five-level RBAC, Postgres → ClickHouse migration path).

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19, TypeScript 5.9, Vite 8 | Production-quality SPA |
| Charting | Recharts | Area charts, bar charts, pie charts |
| Icons | Lucide React | |
| AI | Google Gemini (server-side) | Falls back to deterministic generator |
| API Server | Express + TypeScript | `apps/server` |
| Monorepo | Turborepo + pnpm workspaces | Parallel builds, shared packages |
| Shared Types | `@tokensense/types` | Single source of truth for all interfaces |
| Rules Engine | `@tokensense/rules-engine` | Runs in browser and Node.js |
| CLI Runtime | tsx + Node.js | Zero-config TypeScript execution |
| Styling | CSS Modules + custom design system | Space Grotesk + Space Mono |

---

## Contributing

```bash
# Fork, then clone your fork
git clone https://github.com/your-username/tokensense.git
cd tokensense
pnpm install

# Create a feature branch
git checkout -b feat/your-feature

# Run the full stack
pnpm dev

# Run linting before committing
pnpm lint

# Open a PR
```

Good places to contribute:

- New detection rules in `packages/rules-engine/src/rules.ts`
- Additional LLM provider clients in `apps/web/src/router/providers.ts`
- Improved complexity estimation heuristics in `complexityEstimator.ts`
- Real data adapters (OpenTelemetry, Datadog, CloudWatch) in `apps/server/src/ingestion/`

---

## License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.

---

<div align="center">

**Built for engineering teams who care about what they ship — and what it costs.**

*TokenSense — Stop guessing. Start owning.*

</div>