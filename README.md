# TokenSense 🔍

**TokenSense** is a powerful cost-optimization platform that analyzes LLM API usage and Cloud Resource logs to detect waste patterns and generate actionable, high-saving recommendations.

---

## 📋 Progress Status

- [x] **Log Aggregation System**: Grouping disparate LLM and Cloud logs into actionable metrics.
- [x] **Deterministic Rules Engine**: High-fidelity detection of model misuse, long prompts, and over-provisioned resources.
- [x] **Recommendation Engine**: Mapping insights to dollar-saving actions with effort and confidence ratings.
- [x] **CLI Reporting Tool**: Instant terminal-based reporting for quick audits.
- [x] **LLM Enrichment**: Adding intelligent summaries and context to cost insights.
- [x] **React Web Dashboard**: High-fidelity visual analytics for cost and waste trends.
- [ ] **Real-time API Integration**: (Next Step) Moving from mock data to live production log ingestion.
- [ ] **Automated Remediation**: (Future) One-click fixes for identified cloud over-provisioning.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- npm

### Installation
```bash
git clone https://github.com/Siddhant2713/TokenSense.git
cd TokenSense
npm install
```

### Running the Dashboard
```bash
npm run dev
```

### Running the CLI
```bash
npm run cli
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Recharts (for visual analytics)
- **Backend/Logic**: TypeScript
- **CLI**: Standard console output + `tsx` runtime
- **Design**: Premium CSS with a focus on dark-mode aesthetics

---

## 🔍 Detection Rules

| Rule | Description | Saving Potential |
| :--- | :--- | :--- |
| **Model Misuse** | Detects expensive models used for low-complexity tasks. | High |
| **Long Prompts** | Identifies excessive prompt context that could be optimized via RAG. | Medium |
| **RAM Over-Provision** | Flags cloud resources with significantly higher RAM than required. | High |
| **Usage Spikes** | Anomalous burst detection to catch looping scripts or bugs. | High |

---

> Built for the Mela VC Cost Optimization Hackathon. TokenSense helps you stop leaving money on the table.
