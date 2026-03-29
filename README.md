# TokenSense

**TokenSense** is an intelligent observability and cost-optimization platform built for engineering teams scaling Generative AI and Cloud infrastructure. 

As an AI-first monitoring system and LLM Gateway, TokenSense empowers organizations to track granular telemetry, identify resource waste, and dynamically generate actionable, data-backed optimization recommendations using an autonomous AI Analyst.

---

## 🚀 The Problem We Solve

As organizations adopt Large Language Models (LLMs) and scale their cloud footprints, infrastructure costs can spiral out of control. Engineering teams often struggle with:
- **Blind Spots:** Lack of visibility into which teams or applications are driving API costs and latency.
- **Model Misuse:** Using expensive, heavy-weight models (like `gpt-4o` or `claude-3-opus`) for simple tasks that cheaper, faster models (like `gemini-1.5-flash` or `gpt-4o-mini`) could handle perfectly.
- **Resource Fragmentation:** Difficulty correlating cloud resource utilization (RAM, Compute) with application-level demands.
- **Manual Analysis:** Sifting through thousands of log lines to find optimization opportunities is tedious and reactive.

## 💡 How TokenSense Works

TokenSense operates at the intersection of a **Deterministic Rules Engine** and an **Autonomous AI Analyst**.

### 1. Unified Telemetry Ingestion
TokenSense acts as an observability layer, capturing high-fidelity logs for both LLM calls and Cloud resources. 
- **LLM Metrics:** Tracks provider (OpenAI, Anthropic, Google), model version, input/output tokens, latency, and exact cost per request.
- **Cloud Metrics:** Tracks allocated vs. utilized RAM, CPU constraints, and infrastructure pricing.

### 2. Deterministic Rules Engine
Raw logs are fed through a strict, deterministic rules engine that flags anomalies instantly. Examples of built-in detection rules include:
- `MODEL_MISUSE`: Flags high-cost models returning extremely short outputs.
- `LONG_PROMPTS`: Identifies inefficient context windows causing token bloat.
- `CACHE_WASTE`: Highlights repetitive identical requests that should be cached.
- `OVER_PROVISIONED`: Detects cloud instances fundamentally underutilizing their allocated RAM.

### 3. AI Analyst (Powered by Gemini)
TokenSense doesn't just show you dashboards; it actively synthesizes solutions. The flagged insights and raw metrics are orchestrated and sent directly to our integrated **Gemini-powered AI Analyst**. 
Instead of static warnings, the AI dynamically generates:
- **Root Cause Analysis ("Why it happened")**
- **Specific Action Plans**
- **Estimated ROI (Monthly Savings)**
- **Confidence & Effort Scoring**

### 4. Dual Interfaces
- **React Dashboard:** A beautiful, real-time visual interface mapping LLM/Cloud spend, provider distribution, routing complexity, and actionable AI insights.
- **CLI Tool:** A lightweight, headless utility for generating instant CI/CD or end-of-week engineering cost reports natively in your terminal.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React, TypeScript, Vite, CSS Modules (Custom Design System without external heavy UI libraries).
- **Core Logic:** Functional TypeScript for metric aggregation and rules processing.
- **AI Integrations:** Google Generative AI (`gemini-1.5-flash`) via standard REST APIs for dynamic insight generation.
- **Data Layer:** Schema-strict mock generation for local development and demonstration.

---

## 🏃 Getting Started (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/your-org/TokenSense.git
cd TokenSense
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory and add your Google Gemini API key:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run the Dashboard
```bash
npm run dev
```
Navigate to `http://localhost:5173` to explore the dashboard.

### 4. Run the CLI Report
```bash
npm run cli
```
Generate an instant terminal breakdown of team spend and AI recommendations.

---

## 🚧 Version 1 (MVP) Limitations

As the foundational MVP, TokenSense V1 makes specific architectural trade-offs to demonstrate core value rapidly:

1. **Simulated Data Layer:** Currently, telemetry data is generated via an internal mock engine (`src/mockData.ts`). It simulates realistic jitter, cost, and latency patterns for demonstration purposes, rather than connecting to a live PostgreSQL/ClickHouse database.
2. **Stateless AI Processing:** The Gemini AI Analyst evaluates insights in a stateless, zero-memory fashion per request. It does not currently track long-term historical resolution of issues (e.g., "Team A ignored this recommendation last month").
3. **Passive Gateway:** TokenSense currently acts as an *observability* and *recommendation* platform. It reads data and tells engineers what to fix, but it does not yet actively intercept and reroute network traffic in real-time.
4. **Local Execution:** The system relies on local environment variables and client-side or local Node.js execution without a separated, authenticated Backend-as-a-Service layer.

---

## 🔭 Future Scope & Roadmap

TokenSense is built to evolve from an Observability tool into an **Active AI Proxy**.

### Phase 2: The Active Router
- **Dynamic Model Fallbacks:** Automatically reroute requests from expensive models to cheaper models in real-time based on prompt complexity and latency requirements.
- **Built-in Semantic Caching:** Intercept duplicate queries at the gateway level to return cached responses, instantly eliminating redundant token costs.

### Phase 3: Enterprise Integrations
- **Live Data Ingestion Pipeline:** Implement a high-throughput metrics endpoint to accept real OpenTelemetry and structured JSON logs from production applications via Kafka or ClickHouse.
- **Cloud Provider Sync:** Native integrations with AWS Cost Explorer, GCP Billing, and Datadog to pull live infrastructure pricing natively.
- **Alerting:** Webhook integrations for Slack/Discord to proactively alert engineering teams when a specific deployed service spikes in token usage.

### Phase 4: Long-Term Intelligence
- **Fine-Tuned Analyst:** Evolve the AI Analyst using historical optimization data to predict cost-spikes before code is even merged into production.
- **Agentic Actions:** Allow the AI Analyst to generate PRs automatically (e.g., updating a `generationConfig` file to use an optimized model) directly in your connected GitHub repositories.

---

*TokenSense — Stop guessing what your AI costs. Start optimizing it.*
