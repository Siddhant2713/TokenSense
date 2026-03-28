# TokenSense 🔍

**TokenSense** is a local CLI tool that analyzes LLM API usage logs, detects cost-waste patterns, and generates actionable recommendations to reduce your team's monthly OpenAI spend — without requiring a dashboard, ML models, or any infrastructure.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [Detection Rules](#detection-rules)
- [Output Format](#output-format)
- [Configuration & Pricing](#configuration--pricing)
- [Tech Stack](#tech-stack)
- [Roadmap (Post-MVP)](#roadmap-post-mvp)

---

## Overview

Most engineering teams using LLM APIs have no visibility into *how* they are spending. TokenSense helps you answer questions like:

- **Why is our Payments team our biggest LLM spender?**
- **Is my batch job accidentally looping and burning through tokens?**
- **Are we sending the same prompt hundreds of times without caching?**
- **Are we using GPT-4o for tasks that GPT-3.5 could handle for 10x less cost?**

TokenSense runs against your logs and produces a structured weekly report — in the console or as a Slack digest — with dollar savings estimates and low-effort action steps.

---

## Features

- **4 deterministic waste-detection rules** — no ML, fully explainable
- **Per-team cost breakdown** with week-over-week trend tracking
- **Actionable recommendations** with effort level, confidence, and monthly saving estimates
- **Slack-ready digest format** mapped to Slack Block Kit sections
- **LLM-enhanced executive summaries** with a structured fallback if the LLM is unreachable
- **Zero infrastructure** — runs entirely from the command line on mock data

---

## Project Structure

```
TokenSense/
├── src/
│   ├── types.ts            # Core TypeScript interfaces (Log, TeamMetrics, Insight, Recommendation)
│   ├── mockData.ts         # 30-day mock log generator for 5 team scenarios
│   ├── aggregator.ts       # Log aggregation and cost calculation engine
│   ├── rules.ts            # 4 waste detection rules engine
│   ├── recommendations.ts  # Recommendation generator + LLM enhancer (with fallback)
│   └── index.ts            # Main entry point and CLI output formatter
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js `>= 18`
- npm

### Installation

```bash
git clone <your-repo-url>
cd TokenSense
npm install
```

### Running the Report

```bash
npm run dev
```

or

```bash
npm start
```

This will process ~60,000 mock log entries across 5 teams, run all detection rules, and print a full formatted cost report to your console.

---

## How It Works

The pipeline runs in 5 sequential steps:

```
Raw Logs → Aggregation → Rules Engine → Recommendations → Output
```

1. **Mock Data Generation** (`mockData.ts`): Simulates 30 days of LLM API logs for 5 teams, each with a specific built-in waste pattern.
2. **Aggregation** (`aggregator.ts`): Groups logs by team, computes total calls, input/output tokens, total cost, and week-over-week cost change.
3. **Rules Engine** (`rules.ts`): Runs 4 deterministic rules against aggregated metrics and raw logs to produce `Insight` objects.
4. **Recommendations** (`recommendations.ts`): Maps each `Insight` to a `Recommendation` with a dollar saving estimate, effort rating, and action step.
5. **Output** (`index.ts`): Formats everything as a CLI report or a Slack digest simulation.

---

## Detection Rules

| Rule            | Trigger                                              | Severity | Effort |
|-----------------|------------------------------------------------------|----------|--------|
| `MODEL_MISUSE`  | `gpt-4o` used with avg output < 100 tokens           | High     | Low    |
| `LONG_PROMPTS`  | Average input prompt exceeds 2,000 tokens            | High     | Medium |
| `SPIKE`         | Daily call volume > 3x the team's rolling average   | High     | High   |
| `CACHE_WASTE`   | Same prompt hash sent ≥ 50 times                     | High     | Low    |

### Example: Model Misuse (Payments Team)

The Payments team uses `gpt-4o` for invoice classification, a task that outputs an average of **42 tokens**. TokenSense detects this and recommends switching to `gpt-3.5-turbo`, which costs **10x less per token** — saving an estimated **$31/month**.

---

## Output Format

### Console (CLI)

```
╔══════════════════════════════════════════════════════╗
║           TOKENSENSE — WEEKLY COST REPORT            ║
╚══════════════════════════════════════════════════════╝

EXECUTIVE SUMMARY
─────────────────
5 waste patterns detected. Total potential monthly saving: $148.71.

COST BREAKDOWN BY TEAM
──────────────────────
Team          | Model         | Calls  | Cost      | vs Last Week
Marketing     | gpt-4o        | 8190   | $202.73   | +0%
Engineering   | gpt-4o        | 6090   | $44.15    | +0%
Payments      | gpt-4o        | 12390  | $34.10    | +0%
Support       | gpt-3.5-turbo | 44190  | $13.77    | +0%
Data          | gpt-4o        | 2648   | $8.61     | -31%

WASTE DETECTED — 5 ISSUES FOUND
────────────────────────────────
[HIGH]   Payments — Model Misuse
         Switch to gpt-3.5-turbo for simple tasks.
         Saving: $31/month  |  Effort: Low  |  Confidence: High
         Evidence: 12390 calls to gpt-4o with avg output of only 42 tokens.
...
TOTAL POTENTIAL SAVING: $149 / MONTH
```

### Slack Digest

The Slack output maps to Block Kit sections, one block per team insight, with a total saving callout at the bottom.

---

## Configuration & Pricing

Pricing is defined in `src/aggregator.ts` under the `PRICING` constant and can be updated as OpenAI changes its rates:

```typescript
export const PRICING = {
  'gpt-4o':        { input: 0.000005, output: 0.000015 },
  'gpt-3.5-turbo': { input: 0.0000005, output: 0.0000015 },
};
```

Detection thresholds (e.g., "max output tokens before flagging model misuse") are inside `src/rules.ts` and can be tuned per team.

---

## Tech Stack

| Layer       | Technology                            |
|-------------|---------------------------------------|
| Language    | TypeScript                            |
| Runtime     | Node.js (`ts-node`)                   |
| Output      | Console + Slack Block Kit (simulated) |
| Data        | Mock (in-memory generated logs)       |
| LLM Layer   | Structured fallback (no active API required for MVP) |

---

## Roadmap (Post-MVP)

The following features are intentionally excluded from the MVP and will be considered after the first paying customer:

| Feature                          | Why Not Yet                                          |
|----------------------------------|------------------------------------------------------|
| Real OpenAI API integration      | Mock data gives full control in demos                |
| UI Dashboard (React)             | CLI + Slack digest is sufficient to validate value   |
| ML-based anomaly detection       | Deterministic rules are more explainable to customers|
| Multi-team auth                  | One customer, one config for now                     |
| AWS/GCP/Azure cost integration   | LLM cost differentiation is our angle                |
| Budget forecasting               | Needs 60+ days of real historical data               |
| Automated remediation            | Trust must be established before automated infra access |

---

> Built with ❤️ — TokenSense helps you stop leaving money on the table.
