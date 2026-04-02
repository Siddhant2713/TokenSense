# TokenSense — Project Upgrade Plan
### From Demo Dashboard to Enterprise LLMOps Platform

> Architectural inspiration: [Helicone](https://github.com/Helicone/helicone) and [Langfuse](https://github.com/langfuse/langfuse) — the two most production-proven open-source LLM observability platforms built for engineering teams at scale.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Where We Are — Current Architecture Audit](#2-where-we-are--current-architecture-audit)
3. [What Helicone & Langfuse Do That We Don't](#3-what-helicone--langfuse-do-that-we-dont)
4. [Gap Analysis — Side-by-Side Diff](#4-gap-analysis--side-by-side-diff)
5. [Target Architecture](#5-target-architecture)
6. [Phase 0 — TypeScript Migration & Repo Restructure](#6-phase-0--typescript-migration--repo-restructure)
7. [Phase 1 — Real Data Ingestion Pipeline](#7-phase-1--real-data-ingestion-pipeline)
8. [Phase 2 — Multi-Tenancy & RBAC](#8-phase-2--multi-tenancy--rbac)
9. [Phase 3 — API-First Layer & Public SDK](#9-phase-3--api-first-layer--public-sdk)
10. [Phase 4 — Analytics Data Layer (ClickHouse)](#10-phase-4--analytics-data-layer-clickhouse)
11. [Phase 5 — Webhooks & Alert Engine](#11-phase-5--webhooks--alert-engine)
12. [Phase 6 — Enhanced Rules Engine & Evaluators](#12-phase-6--enhanced-rules-engine--evaluators)
13. [Phase 7 — Enterprise Dashboard & Custom Reports](#13-phase-7--enterprise-dashboard--custom-reports)
14. [Phase 8 — Self-Hosting (Docker + Kubernetes)](#14-phase-8--self-hosting-docker--kubernetes)
15. [Phase 9 — Enterprise Auth (SSO, SCIM, Audit Logs)](#15-phase-9--enterprise-auth)
16. [Database Schema Evolution](#16-database-schema-evolution)
17. [Monorepo Folder Structure After Upgrade](#17-monorepo-folder-structure-after-upgrade)
18. [Tech Stack Decisions](#18-tech-stack-decisions)
19. [Migration Safety Rules](#19-migration-safety-rules)

---

## 1. Executive Summary

TokenSense currently exists as a **demonstration-grade, client-only dashboard** built on mocked telemetry data. Its Rules Engine, AI Analyst, and Smart Router are architecturally sound — but they operate in an isolated bubble. No real LLM request data flows in. No organization can actually use it to monitor their production systems. No CTO can plug it into their engineering stack. No alert fires when a team's spend doubles overnight.

**The problem in one sentence:** TokenSense has the right analytical brain but no nervous system connecting it to the real world.

**The goal:** Transform TokenSense into a production-grade, open-source LLMOps platform — the kind of infrastructure an engineering team would use as their primary observability layer for AI workloads, the way their APM monitors traditional services.

The reference platforms are Helicone and Langfuse, not because we want to clone them, but because they represent the gold standard for how this category of infrastructure should be engineered:

**Helicone's key insight:** Put a proxy between the application and the LLM provider. Every request is logged automatically with zero code changes. Add a header, get full observability. Their AI Gateway handles 2 billion+ LLM requests using Cloudflare Workers + ClickHouse + Kafka. Latency added: under 50ms.

**Langfuse's key insight:** Start with a great developer experience (SDK-first, not proxy-only), then build the enterprise layer on top. Organizations → Projects → Users with five-level RBAC. Their v3 migration from Postgres to ClickHouse for analytics is the exact data architecture evolution TokenSense needs to plan for from day one.

This document defines the complete upgrade path — preserving every piece of existing logic (Rules Engine, Smart Router, AI Analyst, CLI) while building enterprise-grade infrastructure around it.

---

## 2. Where We Are — Current Architecture Audit

### 2.1 Technology Stack

| Layer | Current | Notes |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite 8 | Well-structured, production quality |
| Charting | Recharts | Fine for current needs |
| AI Analyst | Gemini 1.5 Flash via direct fetch | Works, needs server-side migration |
| Smart Router | In-memory TypeScript SDK | Excellent foundation, needs backend extraction |
| CLI | tsx + Node.js | Good, needs real data source |
| Backend | **None** | The critical missing piece |
| Database | **None** | All data is mock/generated |
| Auth | **None** | No user concept exists |
| Ingestion | **None** | No way to receive real telemetry |
| Multi-tenancy | **None** | Single-user by design |
| Webhooks | **None** | Alerts are display-only |
| SDK | **None** | No way for teams to integrate |

### 2.2 Current Data Flow

```
generateMockLogs() + generateMockCloudLogs()
  → aggregateLogs() / aggregateCloudLogs()
    → runAllRules()
      → generateAIRecommendations() [Gemini direct call]
        → React component state
          → Dashboard renders
```

Nothing persists. Nothing is real. Every page refresh regenerates fake data. The AI Analyst call hits Gemini directly from the browser, exposing the API key in client-side environment variables (`VITE_GEMINI_API_KEY`), which is a security vulnerability for any production deployment.

### 2.3 What Works Well (Preserve Everything)

| Component | Location | Quality | Notes |
|---|---|---|---|
| Rules Engine | `src/rules.ts` | Excellent | Deterministic, testable, well-structured |
| Rule Thresholds config | `src/config/ruleThresholds.ts` | Excellent | Externalized constants, easy to tune |
| AI Analyst | `src/recommendations.ts` | Good | Needs server-side migration only |
| Smart Router | `src/router/` | Excellent | Production-quality SDK, 15 modules |
| Cost Aggregator | `src/aggregator.ts` | Good | Clean pricing logic |
| CLI | `src/cli.ts` | Good | Needs real data source |
| Type Definitions | `src/types.ts` + `src/router/types.ts` | Excellent | Well-typed throughout |
| Ask TokenSense | `src/components/AskTokenSense.tsx` | Good | Needs server-side proxy |

### 2.4 What Breaks at Scale

| Problem | Impact |
|---|---|
| Mock data only | No real signal. A CTO cannot make decisions from generated numbers. |
| No ingestion pipeline | Teams have no way to send their LLM request logs to TokenSense. |
| API key in browser | `VITE_GEMINI_API_KEY` is visible in bundled JS. Any user can extract it. |
| No persistence | Closing the browser destroys all data and state. |
| No multi-tenancy | One instance = one team. Cannot serve multiple organizations. |
| No authentication | Anyone with the URL sees everything. |
| No real alerts | Webhook delivery is not implemented. Slack/PagerDuty integrations don't exist. |
| No API | Partner systems, ERPs, and external dashboards cannot pull data programmatically. |
| No SDK | Teams have to manually format and POST telemetry — friction kills adoption. |
| Rules run in browser | At scale (millions of daily requests), browser-side rule evaluation is impossible. |
| Smart Router client-only | The router runs in-process. Cannot be used as a shared gateway service. |

---

## 3. What Helicone & Langfuse Do That We Don't

### 3.1 Helicone Patterns to Adopt

**The Proxy Pattern (AI Gateway)**
Helicone's primary integration is one line: change `baseURL` from `api.openai.com` to `oai.helicone.ai`. Every request passes through their Cloudflare Workers edge network, gets logged, and is forwarded to OpenAI transparently. The developer adds zero instrumentation code. For TokenSense, this means building a **passthrough proxy endpoint** that teams point their OpenAI SDK at.

```typescript
// Before (team's existing code)
const client = new OpenAI({ baseURL: "https://api.openai.com/v1" });

// After TokenSense integration (one line change)
const client = new OpenAI({
  baseURL: "https://api.tokensense.ai/v1/proxy/openai",
  defaultHeaders: { "TS-API-Key": "ts_live_xxxx" }
});
```

**Distributed Write Path (Queue → ClickHouse)**
Helicone handles 2 billion+ requests by separating the write path (fast, async queue) from the read path (ClickHouse analytical queries). Requests are logged asynchronously in under 5ms, then a consumer batch-inserts to ClickHouse every few seconds. This is the architecture TokenSense must adopt when handling enterprise-scale telemetry.

**Property-Based Filtering**
Helicone lets teams tag any request with custom properties: `Helicone-Property-User-Type: enterprise`, `Helicone-Property-Feature: content-generator`. These become filterable dimensions in the dashboard. TokenSense should support the same — any metadata key-value pair on a request should be queryable.

**API Key Scoping**
Helicone issues API keys scoped to organizations. These keys are separate from user session tokens — they are used by server-side code, CI/CD pipelines, and automated scripts. TokenSense needs the same concept: `ts_live_` keys for production and `ts_test_` keys for staging, each scoped to a project.

**Caching Layer**
Helicone's gateway supports semantic caching — identical prompts return cached responses without hitting the LLM provider. TokenSense's `ResponseCache` class in `src/router/cache.ts` already implements this logic correctly. The upgrade is exposing it as a gateway-level feature rather than an in-process SDK feature.

**Edge Deployment for Low Latency**
Helicone adds under 50ms by running at the edge. TokenSense's proxy layer should similarly target sub-50ms overhead using either Cloudflare Workers or a globally distributed Node.js deployment.

### 3.2 Langfuse Patterns to Adopt

**Three-Tier Multi-Tenancy**
Langfuse's hierarchy: `Organization → Project → User`. An organization can have multiple projects (Production, Staging, Experiment-A). Each project has its own API keys, data isolation, and member roles. For TokenSense this maps directly:

```
Organization: "Acme Corp Engineering"
  ├── Project: "GPT-4o Production Pipeline"  [API Key: ts_live_abc]
  ├── Project: "Claude Staging Environment"  [API Key: ts_live_xyz]
  └── Project: "Cost Reduction Experiment"   [API Key: ts_test_123]
```

**Five-Level RBAC**
Langfuse implements `Owner → Admin → Member → Viewer → None` at both organization and project level. TokenSense needs the same:

```
Owner   — full admin, billing, can delete org
Admin   — manage members, configure alerts, create/delete projects
Member  — view all dashboards, create alert rules, configure router
Viewer  — read-only access to dashboards and reports
None    — no access (used for SCIM provisioning before role assignment)
```

**Typed Public API with SDKs**
Langfuse publishes a complete OpenAPI spec and maintains first-party TypeScript and Python SDKs. All platform features are accessible via the API — not just a subset. TokenSense needs the same: if something can be done in the UI, it can be done via the API.

**Session and Trace Grouping**
Langfuse groups individual LLM calls into traces (a single user interaction) and sessions (a multi-turn conversation). This is essential for debugging agent pipelines. TokenSense's `requestId` tracking in the Smart Router is a foundation for this — it needs to be extended to multi-call session grouping.

**Prompt Management**
Langfuse stores prompt versions with labels (`production`, `staging`), links prompts to their traces, and lets you deploy new prompt versions without code changes. TokenSense can build a `PromptRegistry` that stores named prompt templates (the foundation exists in `src/router/promptTemplates.ts`) with versioning and deployment tracking.

**Evaluation and Scoring**
Langfuse lets you attach scores to any trace — from LLM-as-a-judge evaluators, from user feedback, or from custom pipelines. This maps to TokenSense's Rules Engine: instead of just flagging issues, every request should be scorable along the dimensions the Rules Engine already defines (model efficiency score, prompt efficiency score, cache utilization score).

**Self-Hosting via Docker and Kubernetes**
Langfuse's most-used deployment is a single `docker compose up`. Their Helm chart handles production Kubernetes. For TokenSense to be enterprise-ready, the same deployment options must exist with complete documentation and a guided migration experience.

---

## 4. Gap Analysis — Side-by-Side Diff

| Capability | Helicone | Langfuse | TokenSense Today | TokenSense Target |
|---|---|---|---|---|
| **Data Ingestion** | Proxy gateway (one-line) | SDK + OpenTelemetry | Mock data only | Proxy gateway + SDK + OTEL |
| **Data Persistence** | ClickHouse + S3 | PostgreSQL + ClickHouse (v3) | None — memory only | PostgreSQL + ClickHouse |
| **Multi-tenancy** | Organizations | Org → Projects → Users | None | Org → Projects → Users |
| **RBAC** | Team roles | 5-level org + project RBAC | None | 5-level org + project RBAC |
| **Auth** | SSO, SCIM | SSO, SCIM, NextAuth | None | NextAuth → SSO → SCIM |
| **API Keys** | Org-scoped, versioned | Project-scoped, rotatable | None | Project-scoped + org-scoped |
| **Public API** | Full REST + OpenAPI | Full REST + OpenAPI + SDKs | None | Full REST + OpenAPI spec |
| **SDK** | Python + JS/TS | Python + JS/TS | Client-only router | Server-side JS/TS + Python |
| **Webhooks** | Alerts to Slack/email | Event webhooks (roadmap) | None | Full webhook system |
| **Rules/Evaluators** | Cost/latency rules | LLM-as-a-judge evaluators | Client-side Rules Engine | Server-side Rules Engine |
| **AI Analysis** | Not a feature | Not a feature | Gemini in browser | Server-side, cacheable |
| **Custom Dashboards** | Yes | Yes (ClickHouse-powered) | Fixed layout only | Configurable widget system |
| **Prompt Management** | Basic versioning | Full version control + labels | PromptTemplates static | Versioned PromptRegistry |
| **Session Tracing** | Sessions view | Full trace + span model | requestId only | requestId → session → trace |
| **Caching** | Semantic cache in gateway | Not a gateway feature | In-memory router cache | Gateway-level semantic cache |
| **Self-Hosting** | Docker + Helm | Docker + Helm | npm run dev | Docker Compose + Helm chart |
| **Audit Logs** | Enterprise tier | Enterprise tier | None | Full audit log table |
| **Data Export** | CSV, S3 export | CSV/JSON + blob storage | None | CSV/JSON + S3 export |
| **Cost Attribution** | Per-org, per-user | Per-project | Per-team (mock) | Per-org/project/user/feature |

---

## 5. Target Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        TOKENSENSE PLATFORM                                 │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CLIENT SURFACES                                  │   │
│  │  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────┐    │   │
│  │  │  React SPA   │  │  CLI Tool      │  │  TypeScript SDK      │    │   │
│  │  │  (Dashboard) │  │  (ci/cd-ready) │  │  + Python SDK        │    │   │
│  │  └──────┬───────┘  └───────┬────────┘  └──────────┬───────────┘    │   │
│  └─────────┼──────────────────┼──────────────────────┼────────────────┘   │
│            │                  │                       │                    │
│  ┌─────────▼──────────────────▼──────────────────────▼────────────────┐   │
│  │                     API GATEWAY LAYER                              │   │
│  │   REST API (Express/tRPC)  │  LLM Proxy Gateway  │  OpenAPI Spec   │   │
│  │   Auth (JWT + API Keys)    │  Rate Limiting       │  Versioning     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│  ┌───────────────────────────▼────────────────────────────────────────┐    │
│  │                    CORE SERVICES                                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │    │
│  │  │  Ingestion   │  │  Rules       │  │  AI Analyst  │             │    │
│  │  │  Service     │  │  Engine      │  │  Service     │             │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │    │
│  │  │  Smart       │  │  Webhook     │  │  Prompt      │             │    │
│  │  │  Router Svc  │  │  Dispatcher  │  │  Registry    │             │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                             │
│  ┌───────────────────────────▼────────────────────────────────────────┐    │
│  │                    EVENT QUEUE                                     │    │
│  │         Redis Streams / BullMQ (async job processing)              │    │
│  └───────────────────────────┬────────────────────────────────────────┘    │
│                              │                                             │
│  ┌───────────────────────────▼────────────────────────────────────────┐    │
│  │                    DATA LAYER                                      │    │
│  │  ┌──────────────────┐  ┌───────────────────┐  ┌────────────────┐  │    │
│  │  │   PostgreSQL     │  │   ClickHouse       │  │   Redis        │  │    │
│  │  │   (OLTP)         │  │   (OLAP/Analytics) │  │   (Cache/Queue)│  │    │
│  │  │  users, orgs,    │  │  request_logs,     │  │  rate limits,  │  │    │
│  │  │  projects, keys, │  │  cost_events,      │  │  sessions,     │  │    │
│  │  │  rules, prompts  │  │  rule_evaluations  │  │  router_cache  │  │    │
│  │  └──────────────────┘  └───────────────────┘  └────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────┘
```

**Data Flow — Production Request:**
```
Team's application code
  → TokenSense LLM Proxy (POST /v1/proxy/openai)
    → Validate API key + rate limit check
    → Forward to OpenAI (< 50ms overhead)
    → Log raw event to Redis Stream (async, non-blocking)
    → Return response to caller immediately
      ↘ BullMQ Consumer pulls from Redis Stream
        → Deserialize + enrich with project metadata
        → Insert to ClickHouse (batch, every 5s)
        → Run Rules Engine evaluation
        → If rule fires → enqueue webhook dispatch job
        → Update real-time dashboard via Server-Sent Events
```

---

## 6. Phase 0 — TypeScript Migration & Repo Restructure

**Duration:** 1–2 weeks
**Risk:** Low (no logic changes, only restructuring)
**Goal:** Create a monorepo foundation that supports multiple packages — web frontend, API server, SDK, CLI — sharing types and utilities.

### 6.1 Move to a Monorepo Structure

Adopt Turborepo or pnpm workspaces. The entire current codebase becomes the `apps/web` package. New packages are added incrementally.

```
tokensense/
├── apps/
│   ├── web/              ← EXISTING src/ moves here (zero changes to logic)
│   └── server/           ← NEW: Express API server
├── packages/
│   ├── sdk/              ← NEW: TypeScript SDK (extract from router/)
│   ├── types/            ← SHARED: Move types.ts here
│   ├── rules-engine/     ← SHARED: Extract src/rules.ts + src/config/
│   └── cli/              ← MOVE: src/cli.ts becomes its own package
├── docker/
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
├── helm/
│   └── tokensense/
├── turbo.json
└── pnpm-workspace.yaml
```

### 6.2 Create Shared Types Package

The `packages/types` package exports all interfaces currently in `src/types.ts` and `src/router/types.ts`, plus new types for the server layer. Both `apps/web` and `apps/server` import from `@tokensense/types`.

```typescript
// packages/types/src/index.ts
export * from './llm';          // Model, Log, TeamMetrics
export * from './cloud';        // CloudProvider, CloudResourceLog
export * from './rules';        // Insight, RuleName, Recommendation
export * from './router';       // RoutingRequest, RoutingResponse, ModelConfig
export * from './api';          // ApiKey, Organization, Project, User
export * from './events';       // TelemetryEvent, WebhookEvent
export * from './analytics';    // DailyCost, AggregatedMetrics
```

### 6.3 Extract Rules Engine Package

`packages/rules-engine` contains `rules.ts`, `ruleThresholds.ts`, and the aggregator. This package has zero UI dependencies and can run in both browser (current behavior) and Node.js server (target behavior). No logic changes — just package extraction.

```typescript
// packages/rules-engine/src/index.ts
export {
  runAllRules,
  detectModelMisuse,
  detectLongPrompts,
  detectSpike,
  detectCacheWaste,
  detectRAMOverProvision
} from './rules';
export {
  aggregateLogs,
  aggregateCloudLogs,
  computeDailyCosts,
  PRICING,
  calculateCost
} from './aggregator';
export { RULE_THRESHOLDS } from './config/ruleThresholds';
```

### 6.4 Security Fix — Move Gemini Call to Server

The current `VITE_GEMINI_API_KEY` exposure is a P0 security issue for any non-demo deployment. In Phase 0, add a simple Express endpoint:

```typescript
// apps/server/src/routes/ai-analyst.ts
router.post('/api/analyze', authenticate, async (req, res) => {
  const { insights, metrics, cloudMetrics } = req.body;
  // Call Gemini using server-side GEMINI_API_KEY (no VITE_ prefix)
  const result = await generateAIRecommendations({ insights, metrics, cloudMetrics });
  res.json(result);
});
```

The frontend `src/recommendations.ts` calls `/api/analyze` instead of Gemini directly. The `VITE_GEMINI_API_KEY` variable is removed entirely.

---

## 7. Phase 1 — Real Data Ingestion Pipeline

**Duration:** 3–4 weeks
**Risk:** Medium (new infrastructure, existing dashboard still works with mocks)
**Goal:** Teams can actually send real LLM request data to TokenSense.

### 7.1 The Proxy Gateway

This is TokenSense's highest-value feature — the Helicone pattern. Build an HTTP proxy that sits between a team's code and OpenAI/Anthropic/Google.

```typescript
// apps/server/src/proxy/openai.ts
router.all('/v1/proxy/openai/*', authenticateApiKey, async (req, res) => {
  const startTime = Date.now();
  const apiKey = req.project.openaiApiKey; // stored encrypted in Postgres

  // Forward the request to OpenAI
  const upstreamRes = await fetch(
    `https://api.openai.com/${req.path.replace('/v1/proxy/openai/', '')}`,
    {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    }
  );

  const responseBody = await upstreamRes.json();
  const latencyMs = Date.now() - startTime;

  // Non-blocking: enqueue the log event
  await telemetryQueue.add('log_request', {
    projectId: req.project.id,
    requestBody: req.body,
    responseBody,
    latencyMs,
    timestamp: new Date().toISOString(),
    metadata: extractTsHeaders(req.headers), // TS-Property-* custom headers
  });

  // Return response immediately — no waiting for ClickHouse
  res.status(upstreamRes.status).json(responseBody);
});
```

Supported proxy endpoints from day one:
- `/v1/proxy/openai` → OpenAI
- `/v1/proxy/anthropic` → Anthropic
- `/v1/proxy/google` → Google Gemini

### 7.2 The SDK Ingestion Path

Not every team wants to change their baseURL. The SDK wrap pattern is the alternative:

```typescript
// packages/sdk/src/index.ts
import { TokenSense } from '@tokensense/sdk';

const ts = new TokenSense({ apiKey: 'ts_live_xxxx' });

// SDK wraps any OpenAI call
const response = await ts.wrap(
  () => openai.chat.completions.create({ model: 'gpt-4o', messages }),
  { feature: 'invoice-classifier', userId: 'user_123', tags: { env: 'production' } }
);
// The wrapper captures request + response + latency, posts to /api/ingest async
```

The SDK uses `navigator.sendBeacon` (browser) or a background `fetch` with `keepalive: true` (Node.js) to send telemetry without blocking the caller.

### 7.3 OpenTelemetry Receiver

For teams already using OpenTelemetry, implement an OTLP HTTP receiver:

```typescript
// apps/server/src/ingestion/otel-receiver.ts
// Implements the OTLP HTTP receiver protocol
// Maps OTel span attributes to TokenSense's TelemetryEvent schema
router.post('/v1/traces', authenticateApiKey, async (req, res) => {
  const spans = parseOtlpPayload(req.body);
  const events = spans.map(spanToTelemetryEvent);
  await enqueueEvents(events, req.project.id);
  res.json({ partialSuccess: {} });
});
```

### 7.4 Event Queue (Redis Streams + BullMQ)

All three ingestion paths funnel into the same Redis Streams queue. This decouples the HTTP request/response cycle from data processing:

```typescript
// apps/server/src/queues/telemetry.ts
import { Queue, Worker } from 'bullmq';

export const telemetryQueue = new Queue('telemetry', { connection: redis });

// Worker: consumes from queue, writes to ClickHouse in batches
const worker = new Worker('telemetry', async (job) => {
  const events = await drainBatch(100); // collect up to 100 events
  await clickhouse.insert({
    table: 'request_logs',
    values: events.map(transformToClickhouseRow),
  });
  await runRulesOnBatch(events); // evaluate rules on the batch
}, { connection: redis });
```

---

## 8. Phase 2 — Multi-Tenancy & RBAC

**Duration:** 3–4 weeks
**Risk:** High (data model changes, requires schema design before writing code)
**Goal:** Multiple organizations can use TokenSense independently, with complete data isolation.

### 8.1 The Data Model

```sql
-- Organizations: top-level tenant boundary
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  plan        TEXT DEFAULT 'free',  -- free, pro, enterprise
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Projects: data isolation units within an org
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

-- Users: platform users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  password_hash TEXT,        -- null if SSO-only
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Organization memberships
CREATE TABLE org_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  UNIQUE (user_id, organization_id)
);

-- Project memberships: override org-level role for a specific project
CREATE TABLE project_memberships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer', 'none')),
  UNIQUE (user_id, project_id)
);

-- API keys: machine-to-machine auth, scoped to project
CREATE TABLE api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT UNIQUE NOT NULL,  -- store hash only, show plaintext once
  key_prefix   TEXT NOT NULL,         -- e.g., 'ts_live_abc' (for display)
  scopes       TEXT[] DEFAULT '{}',   -- ['ingest', 'read', 'admin']
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.2 RBAC Middleware

```typescript
// apps/server/src/middleware/rbac.ts

export const requireOrgRole = (minRole: OrgRole) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const membership = await db.orgMemberships.findOne({
      userId: req.user.id,
      orgId: req.params.orgId,
    });
    if (!membership || !hasMinimumRole(membership.role, minRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.orgRole = membership.role;
    next();
  };
};

// Usage in routes
router.delete('/orgs/:orgId', requireOrgRole('owner'), deleteOrganization);
router.post('/orgs/:orgId/projects', requireOrgRole('admin'), createProject);
router.get('/orgs/:orgId/analytics', requireOrgRole('viewer'), getAnalytics);
```

### 8.3 Existing Rules Engine Becomes Tenant-Aware

The current rules engine operates on a flat array of `TeamMetrics`. After this phase, every rule evaluation is scoped to a `projectId`:

```typescript
// packages/rules-engine/src/index.ts (updated signature — backward compatible)
export function runAllRules(
  logs: Log[],
  metrics: TeamMetrics[],
  cloudMetrics: CloudResourceMetrics[],
  context?: {
    projectId?: string;
    ruleOverrides?: Partial<typeof RULE_THRESHOLDS>
  }
): Insight[]
```

Projects can override default rule thresholds — a startup may tolerate higher model costs than an enterprise customer. The context parameter is optional so the existing signature continues to work.

---

## 9. Phase 3 — API-First Layer & Public SDK

**Duration:** 3–4 weeks
**Risk:** Medium
**Goal:** Everything in the UI is accessible via a versioned, documented REST API. Ship the TypeScript SDK.

### 9.1 API Design Principles

Every route follows the pattern `/api/v1/projects/{projectId}/resource`. Authentication is via Bearer token (session JWT) or Basic Auth (API key as username, empty password). Response format is always `{ data: T, meta?: { total, cursor } }` or `{ error: string, code: string }`.

```
GET    /api/v1/organizations                      List orgs for current user
POST   /api/v1/organizations                      Create org

GET    /api/v1/projects/{projectId}/analytics     Aggregated metrics
GET    /api/v1/projects/{projectId}/requests      Paginated request log
GET    /api/v1/projects/{projectId}/insights      Rule evaluation results
POST   /api/v1/projects/{projectId}/insights/run  Trigger rules manually

GET    /api/v1/projects/{projectId}/api-keys      List API keys
POST   /api/v1/projects/{projectId}/api-keys      Create API key
DELETE /api/v1/projects/{projectId}/api-keys/{id} Revoke API key

GET    /api/v1/projects/{projectId}/webhooks      List webhooks
POST   /api/v1/projects/{projectId}/webhooks      Create webhook

GET    /api/v1/projects/{projectId}/prompts       List prompt versions
POST   /api/v1/projects/{projectId}/prompts       Create prompt version

GET    /api/v1/projects/{projectId}/router/logs     Router request logs
GET    /api/v1/projects/{projectId}/router/metrics  Router aggregated metrics
```

### 9.2 OpenAPI Spec

Generate the OpenAPI 3.1 spec from route definitions using `@asteasolutions/zod-to-openapi`. Publish it at `/api/v1/openapi.json`. Host interactive docs at `/docs`.

### 9.3 TypeScript SDK

The existing `src/router/` is the foundation. The SDK package adds an ingestion client alongside the router:

```typescript
// packages/sdk/src/TokenSenseClient.ts
export class TokenSenseClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.tokensense.ai';
  }

  // Proxy-aware OpenAI client factory
  openai(userOpenAIKey: string): OpenAI {
    return new OpenAI({
      apiKey: userOpenAIKey,
      baseURL: `${this.baseUrl}/v1/proxy/openai`,
      defaultHeaders: { 'TS-API-Key': this.apiKey },
    });
  }

  // Manual ingestion
  async ingest(event: TelemetryEvent): Promise<void> {
    await this.sendBeacon('/api/v1/ingest', event);
  }

  // Fetch analytics
  async getAnalytics(projectId: string, opts: AnalyticsOptions): Promise<AggregatedMetrics> {
    return this.get(`/api/v1/projects/${projectId}/analytics`, opts);
  }

  // Re-export Smart Router (from src/router/ — unchanged logic)
  router(config: TokenSenseConfig): TokenSenseRouter {
    return new TokenSenseRouter({ ...config, reportingClient: this });
  }
}
```

### 9.4 Python SDK

Ship a minimal Python client for data science teams and Jupyter notebook workflows:

```python
# packages/sdk-python/tokensense/client.py
class TokenSenseClient:
    def __init__(self, api_key: str, base_url: str = "https://api.tokensense.ai"):
        self.api_key = api_key
        self.base_url = base_url

    def get_analytics(self, project_id: str, **kwargs) -> dict:
        return self._get(f"/api/v1/projects/{project_id}/analytics", params=kwargs)

    def get_insights(self, project_id: str) -> list[dict]:
        return self._get(f"/api/v1/projects/{project_id}/insights")

    def run_insights(self, project_id: str) -> list[dict]:
        return self._post(f"/api/v1/projects/{project_id}/insights/run")
```

---

## 10. Phase 4 — Analytics Data Layer (ClickHouse)

**Duration:** 3–4 weeks
**Risk:** High (significant infrastructure change — plan carefully, migrate gradually)
**Goal:** Replace the mock data aggregator with real-time analytics queries against a columnar database that can handle billions of rows.

### 10.1 Why ClickHouse (Following Langfuse's Path)

Both Langfuse and Helicone converged on ClickHouse for time-series LLM analytics. PostgreSQL works fine up to a few million rows, but analytical queries (GROUP BY model, team, day; calculate cost percentiles; detect spikes in rolling windows) are extremely slow on row-oriented storage at tens of millions of rows.

TokenSense's analytics are structurally identical to what drove both platforms to ClickHouse:
- `SELECT team, model, SUM(cost), AVG(latency) GROUP BY day` — columnar scan, ideal for ClickHouse
- `SELECT MAX(daily_calls) / AVG(daily_calls) WHERE team = X` — rolling window computation
- `SELECT promptHash, COUNT(*) GROUP BY team ORDER BY 2 DESC` — the CACHE_WASTE rule at scale

### 10.2 Schema

```sql
-- ClickHouse: append-only, columnar, partitioned by day
CREATE TABLE request_logs (
  project_id    String,
  request_id    String,
  timestamp     DateTime64(3, 'UTC'),
  team          LowCardinality(String),
  user_id       Nullable(String),
  model         LowCardinality(String),
  provider      LowCardinality(String),
  input_tokens  UInt32,
  output_tokens UInt32,
  latency_ms    UInt32,
  cost_usd      Float64,
  cached        Bool,
  fallback      Bool,
  success       Bool,
  prompt_hash   String,
  feature       LowCardinality(Nullable(String)),
  task_type     LowCardinality(Nullable(String)),
  complexity    LowCardinality(Nullable(String)),
  metadata      Map(String, String),  -- custom TS-Property-* headers
  error         Nullable(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, timestamp, team, model)
TTL timestamp + INTERVAL 365 DAY;   -- configurable per plan

-- Pre-aggregated daily summaries (materialized view — auto-updated)
CREATE MATERIALIZED VIEW daily_cost_mv
TO daily_cost_summary AS
SELECT
  project_id,
  toDate(timestamp)   AS date,
  team,
  model,
  provider,
  SUM(cost_usd)       AS total_cost,
  SUM(input_tokens)   AS total_input_tokens,
  SUM(output_tokens)  AS total_output_tokens,
  COUNT()             AS request_count,
  AVG(latency_ms)     AS avg_latency_ms,
  SUMIf(1, cached)    AS cache_hits,
  quantile(0.95)(latency_ms) AS p95_latency_ms
FROM request_logs
GROUP BY project_id, date, team, model, provider;
```

### 10.3 Query Layer

Replace `src/aggregator.ts` with a `ClickHouseQueryService` that produces the **same output shapes the dashboard already consumes**:

```typescript
// apps/server/src/services/analytics.ts
export class AnalyticsService {
  constructor(private ch: ClickHouseClient) {}

  // Replaces computeDailyCosts() — same DailyCost[] return type
  async getDailyCosts(projectId: string, opts: DateRangeOpts): Promise<DailyCost[]> {
    const rows = await this.ch.query({
      query: `
        SELECT date,
               SUM(total_cost) AS total_cost,
               SUMIf(total_cost, provider = 'openai') AS llm_cost,
               SUMIf(total_cost, provider IN ('aws','cloudflare')) AS cloud_cost
        FROM daily_cost_summary
        WHERE project_id = {projectId:String}
          AND date BETWEEN {from:Date} AND {to:Date}
        GROUP BY date ORDER BY date
      `,
      query_params: { projectId, from: opts.from, to: opts.to },
      format: 'JSONEachRow',
    });
    return rows.json<DailyCost[]>();
  }

  // Replaces aggregateLogs() — same TeamMetrics[] return type
  async getTeamMetrics(projectId: string): Promise<TeamMetrics[]> {
    // ... ClickHouse query producing identical shape to current aggregator
  }
}
```

The dashboard components (`CostChart`, `TeamMetricsTable`, `InsightsPanel`, etc.) do not need to change. Only the data source changes.

### 10.4 Gradual Migration Strategy

The application supports both data sources simultaneously:

```typescript
// apps/server/src/services/analytics-factory.ts
export function createAnalyticsService(config: AppConfig): AnalyticsService {
  if (config.clickhouseEnabled && config.clickhouse) {
    return new ClickHouseAnalyticsService(config.clickhouse);
  }
  return new MockAnalyticsService(); // current behavior, always works
}
```

A project with real data uses ClickHouse. A project with no data yet falls back to mock. The dashboard never breaks during migration.

---

## 11. Phase 5 — Webhooks & Alert Engine

**Duration:** 2–3 weeks
**Risk:** Low
**Goal:** Rules Engine findings trigger real alerts. A spike detected at 2am fires a Slack message, not just a red badge in a dashboard nobody is watching.

### 11.1 Webhook Data Model

```sql
-- PostgreSQL
CREATE TABLE webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  secret      TEXT,            -- HMAC secret for signature verification
  events      TEXT[] NOT NULL, -- ['rule.fired', 'budget.exceeded', 'spike.detected']
  enabled     BOOL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    UUID REFERENCES webhooks(id),
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL, -- pending, delivered, failed
  attempts      INT DEFAULT 0,
  response_code INT,
  next_retry    TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 11.2 Webhook Payload Format

```typescript
// Standardized event envelope — same shape for all event types
interface WebhookEvent<T = unknown> {
  id: string;                    // unique event ID (deduplication key)
  type: WebhookEventType;        // 'rule.fired' | 'budget.exceeded' | 'spike.detected'
  timestamp: string;
  project: { id: string; name: string; slug: string };
  data: T;
}

// Example: rule.fired event
interface RuleFiredPayload {
  rule: RuleName;
  team: string;
  severity: 'High' | 'Medium' | 'Low';
  evidence: string;
  suggestedFix: string;
  monthlySavingEstimate: number;
  requestsAffected: number;
}
```

### 11.3 Delivery with Retry

```typescript
// apps/server/src/services/webhook-dispatcher.ts
export class WebhookDispatcher {
  async dispatch(projectId: string, event: WebhookEvent): Promise<void> {
    const webhooks = await db.webhooks.findAll({
      projectId, events: { contains: event.type }, enabled: true,
    });

    for (const webhook of webhooks) {
      await webhookQueue.add('deliver', { webhook, event }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      });
    }
  }

  async deliver(webhook: Webhook, event: WebhookEvent): Promise<void> {
    const signature = this.sign(event, webhook.secret);
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TokenSense-Signature': signature,
        'X-TokenSense-Event': event.type,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(10_000),
    });

    await db.webhookDeliveries.create({
      webhookId: webhook.id,
      status: response.ok ? 'delivered' : 'failed',
      responseCode: response.status,
    });
  }
}
```

### 11.4 Pre-Built Integrations

Ship first-party Slack and email integrations (not just generic webhooks):

**Slack:** Post formatted Block Kit alerts to a channel showing rule name, team, evidence, and estimated monthly saving. One-click "View in Dashboard" button.

**Email:** Daily digest of all fired rules. Weekly cost report. Budget threshold alerts. Use Resend or Postmark for reliable delivery.

**PagerDuty:** High-severity rules (`MODEL_MISUSE` at enterprise scale, `SPIKE` with >10x multiplier) can trigger PagerDuty incidents for on-call engineers.

---

## 12. Phase 6 — Enhanced Rules Engine & Evaluators

**Duration:** 2–3 weeks
**Risk:** Low (additive, doesn't change existing rules)
**Goal:** Make the rules system configurable per-project and capable of LLM-as-a-judge evaluation.

### 12.1 Configurable Rule Thresholds (Per-Project)

Currently, `RULE_THRESHOLDS` in `src/config/ruleThresholds.ts` is a compile-time constant. It needs to become a runtime, per-project configuration:

```sql
CREATE TABLE rule_configs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  rule_name    TEXT NOT NULL,
  thresholds   JSONB NOT NULL,   -- override specific thresholds
  enabled      BOOL DEFAULT true,
  updated_by   UUID REFERENCES users(id),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, rule_name)
);
```

```typescript
// Loading project-specific thresholds at rule-evaluation time
const projectThresholds = await db.ruleConfigs.findAll({ projectId });
const mergedThresholds = mergeThresholds(RULE_THRESHOLDS, projectThresholds);
const insights = runAllRules(logs, metrics, cloudMetrics, { thresholds: mergedThresholds });
```

### 12.2 Custom Rules (User-Defined)

A CTO should be able to define their own rule: "alert me when any single team spends more than $500 in a day."

```typescript
interface CustomRule {
  id: string;
  projectId: string;
  name: string;
  description: string;
  condition: {
    metric: 'daily_cost' | 'model_misuse_rate' | 'cache_hit_rate' | 'p95_latency';
    operator: 'gt' | 'lt' | 'gte' | 'lte';
    value: number;
    groupBy?: 'team' | 'model' | 'feature';
  };
  severity: 'High' | 'Medium' | 'Low';
  enabled: boolean;
}
```

### 12.3 LLM-as-a-Judge Output Quality Evaluator

Following Langfuse's evaluator pattern, add an optional output quality check. A sample of production responses gets evaluated by a cheap judge model:

```typescript
// packages/rules-engine/src/evaluators/output-quality.ts
export async function evaluateOutputQuality(
  request: string,
  response: string,
  taskType: TaskType,
  judgeModel: string = 'gemini-2.0-flash'  // cheap model, not gpt-4o
): Promise<QualityScore> {
  const prompt = buildJudgePrompt(request, response, taskType);
  // This call goes through TokenSense's own Smart Router —
  // so it itself gets tracked and optimized
  const score = await smartRouter.route({ prompt, taskType: 'classification' });
  return parseScore(score.content);
}
```

### 12.4 Budget Enforcement Rules

Real-time hard budget limits that can reject or downgrade requests:

```typescript
// apps/server/src/proxy/budget-guard.ts
export async function checkBudget(
  projectId: string,
  team: string
): Promise<BudgetStatus> {
  const daily = await redis.get(`budget:${projectId}:${team}:${today()}`);
  const config = await db.budgetConfigs.findOne({ projectId, team });

  if (config && Number(daily) >= config.dailyLimitUsd) {
    return {
      allowed: false,
      action: config.onExceed, // 'reject' | 'downgrade_model' | 'alert_only'
      message: `Daily budget of $${config.dailyLimitUsd} exceeded for team ${team}`
    };
  }
  return { allowed: true };
}
```

---

## 13. Phase 7 — Enterprise Dashboard & Custom Reports

**Duration:** 3–4 weeks
**Risk:** Low (additive UI work)
**Goal:** The dashboard becomes a decision-making tool for CTOs and engineering leads, not just a status display.

### 13.1 Executive View (New Tab)

Add a top-level "Business" view with metrics executives actually care about:

```typescript
interface ExecutiveMetrics {
  totalSpendMoM: { current: number; previous: number; change: number };
  forecastedMonthlySpend: number;    // linear projection from month-to-date
  savingsUnlocked: number;           // sum of resolved recommendations
  savingsPotential: number;          // sum of open recommendations
  efficiencyScore: number;           // composite of model efficiency + cache rate
  teamLeaderboard: TeamCostRank[];   // most/least efficient teams
  incidentCount: number;             // budget/spike alerts fired this period
}
```

### 13.2 Configurable Dashboard Widgets (Langfuse-Style)

Replace the hardcoded four-tab layout with a configurable widget system:

```typescript
interface DashboardWidget {
  id: string;
  type: 'line_chart' | 'bar_chart' | 'kpi_card' | 'table' | 'heatmap';
  title: string;
  query: {
    metric: 'cost' | 'latency' | 'token_count' | 'request_count' | 'cache_hit_rate';
    groupBy?: 'team' | 'model' | 'feature' | 'day' | 'hour';
    filters?: Record<string, string>;
    aggregation: 'sum' | 'avg' | 'p95' | 'count';
    timeRange: 'last_24h' | 'last_7d' | 'last_30d' | 'custom';
  };
  layout: { x: number; y: number; w: number; h: number };
}
```

Pre-built dashboard templates: "Engineering Lead Weekly Review", "Cost Reduction Progress", "Model Efficiency Audit", "Incident History".

### 13.3 Data Export

```typescript
// apps/server/src/routes/export.ts

// CSV export for BI tools (Tableau, Looker, Metabase)
router.get('/api/v1/projects/:id/export/requests.csv',
  requireProjectRole('member'),
  async (req, res) => {
    const stream = clickhouse.query({
      query: buildExportQuery(req.query),
      format: 'CSVWithNames',
    });
    res.setHeader('Content-Type', 'text/csv');
    stream.pipe(res);
  }
);

// Scheduled S3/GCS export (enterprise tier)
router.post('/api/v1/projects/:id/export/schedule',
  requireProjectRole('admin'),
  createScheduledExport
);
```

### 13.4 Real-Time Updates (Server-Sent Events)

The current dashboard is static. Add SSE for live updates when new rules fire or new cost data arrives:

```typescript
// apps/server/src/routes/stream.ts
router.get('/api/v1/projects/:id/stream', authenticate, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const unsub = eventBus.subscribe(`project:${req.params.id}`, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on('close', unsub);
});
```

---

## 14. Phase 8 — Self-Hosting (Docker + Kubernetes)

**Duration:** 2–3 weeks
**Risk:** Low (infrastructure packaging)
**Goal:** An engineering team can deploy TokenSense on their own infrastructure in under 10 minutes.

### 14.1 Docker Compose

```yaml
# docker/docker-compose.yml
version: '3.9'
services:
  server:
    build: ./apps/server
    ports: ['3001:3001']
    environment:
      DATABASE_URL: postgres://ts:ts@postgres:5432/tokensense
      REDIS_URL: redis://redis:6379
      CLICKHOUSE_URL: http://clickhouse:8123
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres, redis, clickhouse]

  web:
    build: ./apps/web
    ports: ['3000:3000']
    environment:
      VITE_API_URL: http://localhost:3001

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: tokensense
      POSTGRES_USER: ts
      POSTGRES_PASSWORD: ts
    volumes: ['postgres_data:/var/lib/postgresql/data']

  redis:
    image: redis:7-alpine
    volumes: ['redis_data:/data']

  clickhouse:
    image: clickhouse/clickhouse-server:24-alpine
    volumes:
      - clickhouse_data:/var/lib/clickhouse
      - ./docker/clickhouse/config.xml:/etc/clickhouse-server/config.xml

volumes:
  postgres_data: {}
  redis_data: {}
  clickhouse_data: {}
```

One-command deployment:

```bash
git clone https://github.com/your-org/tokensense
cd tokensense
cp .env.example .env   # fill in GEMINI_API_KEY and JWT_SECRET
docker compose up -d
# → TokenSense running at http://localhost:3000
```

### 14.2 Kubernetes Helm Chart

```yaml
# helm/tokensense/values.yaml
replicaCount:
  server: 2
  worker: 3   # BullMQ workers for ingestion processing

ingress:
  enabled: true
  host: tokensense.yourdomain.com

postgresql:
  enabled: true   # or set externalUrl for managed Postgres

redis:
  enabled: true   # or set externalUrl for ElastiCache

clickhouse:
  enabled: true   # or set externalUrl for ClickHouse Cloud

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### 14.3 Environment Variable Reference

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/tokensense
REDIS_URL=redis://host:6379
CLICKHOUSE_URL=http://host:8123
JWT_SECRET=<64-byte-random-hex>
ENCRYPTION_KEY=<32-byte-random-hex>   # for API key encryption at rest

# Optional: AI Analyst backend
GEMINI_API_KEY=<your-key>             # Google AI Studio
OPENAI_API_KEY=<your-key>             # Alternative AI Analyst model

# Optional: Notifications
SMTP_HOST=smtp.postmarkapp.com
SMTP_FROM=alerts@yourdomain.com

# Optional: Feature flags
ENABLE_PROXY_GATEWAY=true
ENABLE_CLICKHOUSE=true
ENABLE_WEBHOOKS=true
MAX_REQUESTS_PER_SECOND=1000
```

---

## 15. Phase 9 — Enterprise Auth

**Duration:** 2–3 weeks
**Risk:** Medium
**Goal:** Enterprise customers can use their existing identity provider. All admin actions are auditable.

### 15.1 Authentication Stack (Progressive)

**Step 1 — Email + password with JWT.** Minimum viable auth needed for Phase 2 multi-tenancy. bcrypt hashing, short-lived JWTs (15 min), refresh tokens in HttpOnly cookies.

**Step 2 — OAuth 2.0 social login.** GitHub and Google cover 90% of developer teams. Use `better-auth` or NextAuth.js on the server.

**Step 3 — SAML/OIDC SSO.** Okta, Azure AD, Google Workspace. Required for enterprise deals.

**Step 4 — SCIM 2.0.** Automate user provisioning and deprovisioning via Okta/Azure. When someone leaves the company, their Okta deactivation automatically removes TokenSense access.

### 15.2 Audit Log

Every state-changing action must be logged. Non-negotiable for enterprise customers with SOC 2 requirements.

```sql
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  project_id      UUID REFERENCES projects(id),
  user_id         UUID REFERENCES users(id),
  action          TEXT NOT NULL,      -- 'api_key.created' | 'webhook.deleted'
  resource_type   TEXT NOT NULL,      -- 'api_key' | 'webhook' | 'rule_config'
  resource_id     TEXT,
  before_state    JSONB,
  after_state     JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX audit_logs_org_time ON audit_logs (organization_id, created_at DESC);
```

```typescript
// Middleware: automatically logs every mutating API request
export const auditMiddleware = (resourceType: string) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode < 400 && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        auditLog.record({
          orgId: req.org?.id,
          projectId: req.project?.id,
          userId: req.user?.id,
          action: `${resourceType}.${getAction(req.method)}`,
          resourceType,
          resourceId: data?.id,
          afterState: data,
          ipAddress: req.ip,
        });
      }
      return originalJson(data);
    };
    next();
  };
};
```

---

## 16. Database Schema Evolution

### Summary of All New PostgreSQL Tables

```
organizations         → tenant boundary
projects              → data isolation unit  
users                 → platform users
org_memberships       → user role in an org
project_memberships   → user role override per project
api_keys              → machine-to-machine auth
webhooks              → outbound event delivery config
webhook_deliveries    → delivery history + retry state
rule_configs          → per-project rule threshold overrides
custom_rules          → user-defined alert conditions
budget_configs        → per-team/project spending limits
audit_logs            → immutable action history
prompt_versions       → versioned prompt templates
scheduled_exports     → recurring data export jobs
```

### ClickHouse Tables

```
request_logs              → raw request events (append-only)
daily_cost_summary        → materialized view: daily cost aggregates
rule_evaluation_results   → rule firings stored for historical analysis
```

### Redis Keys

```
budget:{projectId}:{team}:{date}   → daily spend counter for budget enforcement
cache:{hash}                        → Smart Router semantic cache entries
ratelimit:{apiKey}:{minute}         → rate limit token bucket
session:{token}                     → user session data
```

---

## 17. Monorepo Folder Structure After Upgrade

```
tokensense/
├── apps/
│   ├── web/                           ← Current React SPA (mostly unchanged)
│   │   ├── src/
│   │   │   ├── components/            ← All existing UI components (unchanged)
│   │   │   ├── App.tsx                ← Unchanged
│   │   │   ├── App.css                ← Unchanged
│   │   │   ├── mockData.ts            ← Only used in dev when server is offline
│   │   │   └── main.tsx               ← Unchanged
│   │   └── package.json
│   │
│   └── server/                        ← NEW: Express API server
│       ├── src/
│       │   ├── routes/
│       │   │   ├── analytics.ts       ← GET /api/v1/projects/:id/analytics
│       │   │   ├── insights.ts        ← GET/POST /api/v1/projects/:id/insights
│       │   │   ├── api-keys.ts        ← CRUD for API keys
│       │   │   ├── webhooks.ts        ← CRUD for webhooks
│       │   │   ├── prompts.ts         ← Versioned prompt management
│       │   │   ├── export.ts          ← CSV/JSON data export
│       │   │   ├── stream.ts          ← SSE real-time updates
│       │   │   └── ai-analyst.ts      ← Server-side Gemini calls
│       │   ├── proxy/
│       │   │   ├── openai.ts          ← LLM proxy gateway
│       │   │   ├── anthropic.ts
│       │   │   ├── google.ts
│       │   │   └── budget-guard.ts    ← Real-time budget enforcement
│       │   ├── ingestion/
│       │   │   ├── otel-receiver.ts   ← OpenTelemetry OTLP endpoint
│       │   │   └── direct-ingest.ts   ← POST /api/v1/ingest
│       │   ├── queues/
│       │   │   ├── telemetry.ts       ← BullMQ queue + worker
│       │   │   └── webhooks.ts        ← Webhook delivery queue
│       │   ├── services/
│       │   │   ├── analytics.ts       ← ClickHouse query service
│       │   │   ├── webhook-dispatcher.ts
│       │   │   └── ai-analyst.ts      ← Server-side Gemini service
│       │   ├── middleware/
│       │   │   ├── auth.ts            ← JWT + API key validation
│       │   │   ├── rbac.ts            ← Role-based access control
│       │   │   └── audit.ts           ← Automatic audit logging
│       │   ├── db/
│       │   │   ├── postgres.ts        ← Drizzle ORM setup
│       │   │   ├── clickhouse.ts      ← ClickHouse client
│       │   │   ├── redis.ts           ← ioredis client
│       │   │   └── migrations/        ← SQL migration files
│       │   └── index.ts               ← Express app entry point
│       └── package.json
│
├── packages/
│   ├── types/                         ← Shared TypeScript types
│   │   └── src/index.ts               ← Re-exports all shared types
│   │
│   ├── rules-engine/                  ← Extracted from src/rules.ts (logic unchanged)
│   │   └── src/
│   │       ├── rules.ts               ← Identical to current src/rules.ts
│   │       ├── aggregator.ts          ← Identical to current src/aggregator.ts
│   │       └── config/ruleThresholds.ts
│   │
│   ├── sdk/                           ← TypeScript client SDK
│   │   └── src/
│   │       ├── TokenSenseClient.ts    ← Main client class
│   │       ├── router/                ← Smart Router (from src/router/ — unchanged)
│   │       └── index.ts
│   │
│   ├── sdk-python/                    ← Python client
│   │   └── tokensense/client.py
│   │
│   └── cli/                           ← Extracted from src/cli.ts
│       └── src/cli.ts                 ← Now calls real API instead of mock data
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── clickhouse/config.xml
│
├── helm/
│   └── tokensense/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│
├── .env.example
├── turbo.json
└── pnpm-workspace.yaml
```

---

## 18. Tech Stack Decisions

| Layer | Choice | Rationale |
|---|---|---|
| **API Server** | Express + TypeScript | Minimal, well-understood, fast to iterate |
| **ORM (Postgres)** | Drizzle ORM | Fully typed, lightweight, SQL-first, no magic |
| **Queue** | BullMQ + Redis | Battle-tested, supports retries, priorities, rate limiting |
| **Analytics DB** | ClickHouse | Columnar, handles billions of rows, used by both Helicone and Langfuse |
| **Cache** | Redis | Already used for queue; natural fit for rate limiting and router cache |
| **Auth** | better-auth | Ships email/password + OAuth + SAML in one package, TypeScript-native |
| **Validation** | Zod | API request validation + OpenAPI spec generation |
| **Testing** | Vitest | Same config as current Vite setup; fast |
| **Deployment** | Docker + Helm | Same deployment model as Langfuse |
| **CI/CD** | GitHub Actions | Build, test, push Docker image on every commit |
| **Monitoring** | OpenTelemetry | Dogfood TokenSense's own observability on itself |

---

## 19. Migration Safety Rules

These rules must be followed throughout the upgrade to ensure the existing demo functionality never breaks:

**Rule 1 — Never Delete Working Code, Only Move It**
`src/rules.ts`, `src/aggregator.ts`, `src/recommendations.ts`, `src/router/` — these files get extracted to packages but their logic is untouched. The tests (when written) prove the move was transparent.

**Rule 2 — Mock Data Is Always Available as a Fallback**
`generateMockLogs()` and `generateMockCloudLogs()` remain in the codebase. When the server is unreachable, the dashboard falls back to mock data. This preserves the current demo experience indefinitely.

**Rule 3 — API Responses Mirror Existing Shapes**
The `AggregatedMetrics`, `TeamMetrics[]`, `DailyCost[]`, and `Insight[]` shapes that the React components consume must not change. New fields can be added; existing fields cannot be removed or renamed without a migration period.

**Rule 4 — One Breaking Change Per Phase**
Each phase introduces exactly one new external dependency (Redis in Phase 1, PostgreSQL in Phase 2, ClickHouse in Phase 4). Never introduce two infrastructure dependencies in the same phase.

**Rule 5 — Feature Flags for Every New Capability**
Every new server-side feature is behind an environment variable flag (`ENABLE_PROXY_GATEWAY`, `ENABLE_CLICKHOUSE`, `ENABLE_WEBHOOKS`). The application starts and runs correctly with all flags disabled.

**Rule 6 — Preserve the CLI**
The `src/cli.ts` terminal report is a key differentiator for CI/CD integration. After Phase 3, it calls the real API instead of generating mock data — but its output format (the colored terminal report with the rules summary) remains identical. Engineers who run `npm run cli` in their deployment pipeline do not need to change their scripts.

**Rule 7 — Document Every Schema Change**
Every migration to PostgreSQL or ClickHouse ships with a `down` migration. No irreversible schema changes until the table has been in production for one full phase cycle.

---

## Phased Timeline Summary

| Phase | Duration | Milestone |
|---|---|---|
| Phase 0 | 1–2 weeks | Monorepo, security fix, shared types package |
| Phase 1 | 3–4 weeks | Real data ingestion (proxy + SDK + OTEL) |
| Phase 2 | 3–4 weeks | Multi-tenancy + RBAC + authentication |
| Phase 3 | 3–4 weeks | Public REST API + TypeScript SDK + Python SDK |
| Phase 4 | 3–4 weeks | ClickHouse analytics layer, retire mock aggregator |
| Phase 5 | 2–3 weeks | Webhooks + Slack/email/PagerDuty alerts |
| Phase 6 | 2–3 weeks | Configurable rules + LLM-as-a-judge evaluators |
| Phase 7 | 3–4 weeks | Executive dashboards + custom widgets + data export |
| Phase 8 | 2–3 weeks | Docker Compose + Kubernetes Helm chart |
| Phase 9 | 2–3 weeks | SSO + SCIM + audit logs |
| **Total** | **~26–34 weeks** | **Production-ready enterprise LLMOps platform** |

After Phase 3, TokenSense is usable by early adopter engineering teams. After Phase 5, it is suitable for teams who need real-time alerting in production. After Phase 8, it can be self-hosted by enterprise customers with data sovereignty requirements. After Phase 9, it can close enterprise deals requiring SSO and audit compliance.

---

*TokenSense has the analytical intelligence that Helicone and Langfuse lack — a deterministic Rules Engine that catches waste without hallucinating, an AI Analyst that explains root causes and quantifies savings, and a Smart Router that actively reduces costs in real time. The upgrade described here is not about reimagining what TokenSense is. It is about giving it the infrastructure legs to deliver that intelligence at production scale, to real organizations, with real data, in real time.*
