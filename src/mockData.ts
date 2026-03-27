import { Log } from './types';

function generateTimestamp(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

export function generateMockLogs(): Log[] {
    const logs: Log[] = [];

    // Generate 30 days of data
    for (let day = 29; day >= 0; day--) {
        const timestamp = generateTimestamp(day);

        // 1. Payments: MODEL_MISUSE (gpt-4o, output avg 42)
        // High volume total 12,400 over 30 days -> ~413/day
        for (let i = 0; i < 413; i++) {
            logs.push({
                id: generateId(),
                timestamp,
                team: 'Payments',
                model: 'gpt-4o',
                inputTokens: 400 + Math.floor(Math.random() * 50),
                outputTokens: 42,
                promptHash: generateId(),
                feature: 'invoice-classifier'
            });
        }

        // 2. Marketing: LONG_PROMPTS (avg 3200 input tokens)
        // Total 8,200 -> ~273/day
        for (let i = 0; i < 273; i++) {
            logs.push({
                id: generateId(),
                timestamp,
                team: 'Marketing',
                model: 'gpt-4o',
                inputTokens: 3200 + Math.floor(Math.random() * 500),
                outputTokens: 500,
                promptHash: generateId()
            });
        }

        // 3. Engineering: CACHE_WASTE (200 repeat prompt hashes)
        // 6,100 -> ~203/day
        const cacheWasteHash = "hash_engineer_cache_waste_" + day;
        for (let i = 0; i < 203; i++) {
            logs.push({
                id: generateId(),
                timestamp,
                team: 'Engineering',
                model: 'gpt-4o',
                inputTokens: 1000,
                outputTokens: 150,
                promptHash: i < 200 ? cacheWasteHash : generateId(),
                feature: 'code-reviewer'
            });
        }

        // 4. Data: SPIKE on Day 18
        // Total 3,200 calls
        // Let's say normal is 80 calls per day. Day 18 (day == 11, if 29 is day 1) spike to 3.1x (248) + 80 = 328
        const dataCalls = day === 11 ? 328 : 80;
        for (let i = 0; i < dataCalls; i++) {
            logs.push({
                id: generateId(),
                timestamp,
                team: 'Data',
                model: 'gpt-4o',
                inputTokens: 500,
                outputTokens: 50,
                promptHash: generateId(),
                feature: 'batch-job'
            });
        }

        // 5. Support: Clean (gpt-3.5-turbo, normal usage)
        // Total 44,200 -> ~1473/day
        for (let i = 0; i < 1473; i++) {
            logs.push({
                id: generateId(),
                timestamp,
                team: 'Support',
                model: 'gpt-3.5-turbo',
                inputTokens: 200 + Math.floor(Math.random() * 100),
                outputTokens: 100 + Math.floor(Math.random() * 50),
                promptHash: generateId(),
                feature: 'support-chatbot'
            });
        }
    }

    return logs;
}
