import type { Log, CloudResourceLog, Model } from './types';
import { calculateCost } from './aggregator';
import { getProvider } from './utils/modelUtils';

function generateTimestamp(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ─── LLM Logs ──────────────────────────────────────────────────

export function generateMockLogs(): Log[] {
  const logs: Log[] = [];
  const orgId = 'org_tok_xyz987';

  for (let day = 29; day >= 0; day--) {
    const timestamp = generateTimestamp(day);

    // 1. Payments: MODEL_MISUSE — using gpt-4o for simple classification (avg output 42 tokens)
    for (let i = 0; i < 413; i++) {
      const inputs = 400 + Math.floor(Math.random() * 50);
      const outputs = 42;
      const model = 'gpt-4o';
      logs.push({
        id: generateId(),
        orgId,
        userId: 'usr_pay_01',
        timestamp,
        team: 'Payments',
        model,
        provider: getProvider(model),
        inputTokens: inputs,
        outputTokens: outputs,
        cost: calculateCost(model as Model, inputs, outputs),
        latency: 1200 + Math.floor(Math.random() * 500),
        promptHash: generateId(),
        feature: 'invoice-classifier',
        taskComplexity: 'simple'
      });
    }

    // 2. Marketing: LONG_PROMPTS — average 3200 input tokens
    for (let i = 0; i < 273; i++) {
      const inputs = 3200 + Math.floor(Math.random() * 500);
      const outputs = 500;
      const model = 'gpt-4o';
      logs.push({
        id: generateId(),
        orgId,
        userId: 'usr_mkt_02',
        timestamp,
        team: 'Marketing',
        model,
        provider: getProvider(model),
        inputTokens: inputs,
        outputTokens: outputs,
        cost: calculateCost(model as Model, inputs, outputs),
        latency: 2800 + Math.floor(Math.random() * 800),
        promptHash: generateId(),
        taskComplexity: 'moderate'
      });
    }

    // 3. Engineering: CACHE_WASTE — 200 repeat prompt hashes per day
    const cacheWasteHash = 'hash_engineer_cache_waste_' + day;
    for (let i = 0; i < 203; i++) {
      const inputs = 1000;
      const outputs = 150;
      const model = 'gpt-4o';
      logs.push({
        id: generateId(),
        orgId,
        userId: 'usr_eng_05',
        timestamp,
        team: 'Engineering',
        model,
        provider: getProvider(model),
        inputTokens: inputs,
        outputTokens: outputs,
        cost: calculateCost(model as Model, inputs, outputs),
        latency: 1500 + Math.floor(Math.random() * 400),
        promptHash: i < 200 ? cacheWasteHash : generateId(),
        feature: 'code-reviewer',
        taskComplexity: 'complex'
      });
    }

    // 4. Data: SPIKE on Day 18 (3.1x normal)
    const dataCalls = day === 11 ? 328 : 80;
    for (let i = 0; i < dataCalls; i++) {
      const inputs = 500;
      const outputs = 50;
      const model = 'gpt-4o';
      logs.push({
        id: generateId(),
        orgId,
        userId: 'usr_dat_03',
        timestamp,
        team: 'Data',
        model,
        provider: getProvider(model),
        inputTokens: inputs,
        outputTokens: outputs,
        cost: calculateCost(model as Model, inputs, outputs),
        latency: 1100 + Math.floor(Math.random() * 300),
        promptHash: generateId(),
        feature: 'batch-job',
        taskComplexity: 'simple'
      });
    }

    // 5. Support: Clean usage with gpt-3.5-turbo
    for (let i = 0; i < 1473; i++) {
      const inputs = 200 + Math.floor(Math.random() * 100);
      const outputs = 100 + Math.floor(Math.random() * 50);
      const model = 'gpt-3.5-turbo';
      logs.push({
        id: generateId(),
        orgId,
        userId: 'usr_sup_09',
        timestamp,
        team: 'Support',
        model,
        provider: getProvider(model),
        inputTokens: inputs,
        outputTokens: outputs,
        cost: calculateCost(model as Model, inputs, outputs),
        latency: 400 + Math.floor(Math.random() * 200),
        promptHash: generateId(),
        feature: 'support-chatbot',
        taskComplexity: 'simple'
      });
    }

    // 6. Analytics: MODEL_DOWNGRADE candidate — using claude-3-opus for simple summaries
    for (let i = 0; i < 150; i++) {
      const inputs = 300 + Math.floor(Math.random() * 100);
      const outputs = 60;
      const model = 'claude-3-opus';
      logs.push({
        id: generateId(),
        orgId,
        userId: 'usr_ana_07',
        timestamp,
        team: 'Analytics',
        model,
        provider: getProvider(model),
        inputTokens: inputs,
        outputTokens: outputs,
        cost: calculateCost(model as Model, inputs, outputs),
        latency: 3500 + Math.floor(Math.random() * 1000),
        promptHash: generateId(),
        feature: 'report-summary',
        taskComplexity: 'simple'
      });
    }
  }

  return logs;
}

// ─── Cloud / Cloudflare / AWS Resource Logs ─────────────────────
export function generateMockCloudLogs(): CloudResourceLog[] {
  const logs: CloudResourceLog[] = [];

  for (let day = 29; day >= 0; day--) {
    const timestamp = generateTimestamp(day);

    // Cloudflare Worker: image-resizer — heavily over-provisioned RAM
    logs.push({
      id: generateId(),
      timestamp,
      team: 'Engineering',
      provider: 'cloudflare',
      service: 'Workers',
      resourceName: 'image-resizer',
      allocatedRAM_MB: 128,
      usedRAM_MB: 12 + Math.floor(Math.random() * 6),
      executionTimeMs: 45 + Math.floor(Math.random() * 20),
      requests: 18000 + Math.floor(Math.random() * 4000),
      cost: 4.50 + Math.random() * 1.5
    });

    // Cloudflare Worker: api-gateway — appropriate sizing
    logs.push({
      id: generateId(),
      timestamp,
      team: 'Engineering',
      provider: 'cloudflare',
      service: 'Workers',
      resourceName: 'api-gateway',
      allocatedRAM_MB: 128,
      usedRAM_MB: 95 + Math.floor(Math.random() * 25),
      executionTimeMs: 120 + Math.floor(Math.random() * 40),
      requests: 50000 + Math.floor(Math.random() * 10000),
      cost: 12.00 + Math.random() * 3.0
    });

    // Cloudflare R2 Storage: marketing-assets — moderate usage
    logs.push({
      id: generateId(),
      timestamp,
      team: 'Marketing',
      provider: 'cloudflare',
      service: 'R2 Storage',
      resourceName: 'marketing-assets',
      allocatedRAM_MB: 0,
      usedRAM_MB: 0,
      executionTimeMs: 0,
      requests: 8000 + Math.floor(Math.random() * 2000),
      cost: 2.40 + Math.random() * 0.6
    });

    // AWS Lambda: data-pipeline — over-provisioned at 512MB, only uses ~80MB
    logs.push({
      id: generateId(),
      timestamp,
      team: 'Data',
      provider: 'aws',
      service: 'Lambda',
      resourceName: 'data-pipeline',
      allocatedRAM_MB: 512,
      usedRAM_MB: 75 + Math.floor(Math.random() * 15),
      executionTimeMs: 2000 + Math.floor(Math.random() * 500),
      requests: 3000 + Math.floor(Math.random() * 500),
      cost: 8.50 + Math.random() * 2.0
    });

    // AWS EC2: staging-server — mostly idle
    logs.push({
      id: generateId(),
      timestamp,
      team: 'Engineering',
      provider: 'aws',
      service: 'EC2',
      resourceName: 'staging-server',
      allocatedRAM_MB: 8192,
      usedRAM_MB: 900 + Math.floor(Math.random() * 300),
      executionTimeMs: 86400000,  // always on
      requests: 200 + Math.floor(Math.random() * 100),
      cost: 35.00 + Math.random() * 5.0
    });

    // AWS Lambda: payment-processor — well-sized
    logs.push({
      id: generateId(),
      timestamp,
      team: 'Payments',
      provider: 'aws',
      service: 'Lambda',
      resourceName: 'payment-processor',
      allocatedRAM_MB: 256,
      usedRAM_MB: 180 + Math.floor(Math.random() * 50),
      executionTimeMs: 300 + Math.floor(Math.random() * 100),
      requests: 12000 + Math.floor(Math.random() * 3000),
      cost: 6.00 + Math.random() * 1.5
    });
  }

  return logs;
}
