import type { Log, CloudResourceLog } from './types';

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
  const spikeDay = 5 + Math.floor(Math.random() * 20); // Randomize which day the spike happens (between day 5 and 25)

  for (let day = 29; day >= 0; day--) {
    const timestamp = generateTimestamp(day);

    // 1. Payments: MODEL_MISUSE — using gpt-4o for simple classification (avg output ~42 tokens)
    const paymentCallsCount = 380 + Math.floor(Math.random() * 100);
    const paymentAvgInput = 350 + Math.floor(Math.random() * 100);
    const paymentAvgOutput = 35 + Math.floor(Math.random() * 15);

    for (let i = 0; i < paymentCallsCount; i++) {
      logs.push({
        id: generateId(),
        timestamp,
        team: 'Payments',
        model: 'gpt-4o',
        inputTokens: paymentAvgInput + Math.floor(Math.random() * 50),
        outputTokens: paymentAvgOutput,
        promptHash: generateId(),
        feature: 'invoice-classifier',
        taskComplexity: 'simple'
      });
    }

    // 2. Marketing: LONG_PROMPTS — average ~3200+ input tokens
    const marketingCallsCount = 200 + Math.floor(Math.random() * 150);
    const marketingAvgInput = 2800 + Math.floor(Math.random() * 1000);

    for (let i = 0; i < marketingCallsCount; i++) {
      logs.push({
        id: generateId(),
        timestamp,
        team: 'Marketing',
        model: 'gpt-4o',
        inputTokens: marketingAvgInput + Math.floor(Math.random() * 500),
        outputTokens: 400 + Math.floor(Math.random() * 200),
        promptHash: generateId(),
        taskComplexity: 'moderate'
      });
    }

    // 3. Engineering: CACHE_WASTE — repeat prompt hashes
    const engCallsCount = 180 + Math.floor(Math.random() * 80);
    const cacheWasteHash = 'hash_engineer_cache_waste_' + day;
    const cacheWasteThreshold = 150 + Math.floor(Math.random() * 100);

    for (let i = 0; i < engCallsCount; i++) {
      logs.push({
        id: generateId(),
        timestamp,
        team: 'Engineering',
        model: 'gpt-4o',
        inputTokens: 800 + Math.floor(Math.random() * 400),
        outputTokens: 100 + Math.floor(Math.random() * 100),
        promptHash: i < cacheWasteThreshold ? cacheWasteHash : generateId(),
        feature: 'code-reviewer',
        taskComplexity: 'complex'
      });
    }

    // 4. Data: SPIKE on a random day (3.0x - 5.0x normal)
    const baseDataCalls = 60 + Math.floor(Math.random() * 40);
    const dataCalls = day === spikeDay ? Math.floor(baseDataCalls * (3 + Math.random() * 2)) : baseDataCalls;

    for (let i = 0; i < dataCalls; i++) {
      logs.push({
        id: generateId(),
        timestamp,
        team: 'Data',
        model: 'gpt-4o',
        inputTokens: 400 + Math.floor(Math.random() * 200),
        outputTokens: 40 + Math.floor(Math.random() * 20),
        promptHash: generateId(),
        feature: 'batch-job',
        taskComplexity: 'simple'
      });
    }

    // 5. Support: Clean usage with gpt-3.5-turbo
    const supportCallsCount = 1200 + Math.floor(Math.random() * 600);
    for (let i = 0; i < supportCallsCount; i++) {
      logs.push({
        id: generateId(),
        timestamp,
        team: 'Support',
        model: 'gpt-3.5-turbo',
        inputTokens: 150 + Math.floor(Math.random() * 150),
        outputTokens: 80 + Math.floor(Math.random() * 40),
        promptHash: generateId(),
        feature: 'support-chatbot',
        taskComplexity: 'simple'
      });
    }

    // 6. Analytics: MODEL_DOWNGRADE candidate
    const analyticsCallsCount = 120 + Math.floor(Math.random() * 60);
    for (let i = 0; i < analyticsCallsCount; i++) {
      logs.push({
        id: generateId(),
        timestamp,
        team: 'Analytics',
        model: 'claude-3-opus',
        inputTokens: 250 + Math.floor(Math.random() * 150),
        outputTokens: 50 + Math.floor(Math.random() * 20),
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
      usedRAM_MB: 10 + Math.floor(Math.random() * 8),
      executionTimeMs: 40 + Math.floor(Math.random() * 30),
      requests: 15000 + Math.floor(Math.random() * 10000),
      cost: 3.50 + Math.random() * 2.5
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
      usedRAM_MB: 85 + Math.floor(Math.random() * 40),
      executionTimeMs: 100 + Math.floor(Math.random() * 60),
      requests: 40000 + Math.floor(Math.random() * 20000),
      cost: 10.00 + Math.random() * 5.0
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
      requests: 5000 + Math.floor(Math.random() * 5000),
      cost: 1.50 + Math.random() * 1.5
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
      usedRAM_MB: 65 + Math.floor(Math.random() * 30),
      executionTimeMs: 1500 + Math.floor(Math.random() * 1500),
      requests: 2000 + Math.floor(Math.random() * 2000),
      cost: 6.50 + Math.random() * 5.0
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
      usedRAM_MB: 800 + Math.floor(Math.random() * 500),
      executionTimeMs: 86400000,  // always on
      requests: 100 + Math.floor(Math.random() * 300),
      cost: 30.00 + Math.random() * 15.0
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
      usedRAM_MB: 160 + Math.floor(Math.random() * 80),
      executionTimeMs: 200 + Math.floor(Math.random() * 300),
      requests: 10000 + Math.floor(Math.random() * 5000),
      cost: 5.00 + Math.random() * 3.0
    });
  }

  return logs;
}
