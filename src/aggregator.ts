import { Log, TeamMetrics, Model } from './types';

export const PRICING = {
    'gpt-4o': { input: 0.000005, output: 0.000015 },
    'gpt-3.5-turbo': { input: 0.0000005, output: 0.0000015 },
};

export function calculateCost(model: Model, inputTokens: number, outputTokens: number): number {
    const rates = PRICING[model];
    return (inputTokens * rates.input) + (outputTokens * rates.output);
}

export function aggregateLogs(logs: Log[]): TeamMetrics[] {
    const map = new Map<string, TeamMetrics>();
    const teamWeeklyCosts = new Map<string, { thisWeek: number, lastWeek: number }>();

    const now = Date.now();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    for (const log of logs) {
        if (!map.has(log.team)) {
            map.set(log.team, {
                team: log.team,
                totalCalls: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                averageInputTokens: 0,
                averageOutputTokens: 0,
                cost: 0,
                costVsLastWeek: 0,
                modelsUsed: { 'gpt-4o': 0, 'gpt-3.5-turbo': 0 }
            });
            teamWeeklyCosts.set(log.team, { thisWeek: 0, lastWeek: 0 });
        }

        const m = map.get(log.team)!;
        const cw = teamWeeklyCosts.get(log.team)!;

        m.totalCalls++;
        m.totalInputTokens += log.inputTokens;
        m.totalOutputTokens += log.outputTokens;

        if (m.modelsUsed[log.model] === undefined) {
            m.modelsUsed[log.model] = 0;
        }
        m.modelsUsed[log.model]++;

        const c = calculateCost(log.model, log.inputTokens, log.outputTokens);
        m.cost += c;

        // Week tracking
        const logTime = new Date(log.timestamp).getTime();
        if (now - logTime <= ONE_WEEK_MS) {
            cw.thisWeek += c;
        } else if (now - logTime <= 2 * ONE_WEEK_MS) {
            cw.lastWeek += c;
        }
    }

    for (const [team, m] of map.entries()) {
        if (m.totalCalls > 0) {
            m.averageInputTokens = m.totalInputTokens / m.totalCalls;
            m.averageOutputTokens = m.totalOutputTokens / m.totalCalls;
        }

        const cw = teamWeeklyCosts.get(team)!;
        if (cw.lastWeek > 0) {
            m.costVsLastWeek = Math.round(((cw.thisWeek - cw.lastWeek) / cw.lastWeek) * 100);
        } else {
            m.costVsLastWeek = 0;
        }
    }

    return Array.from(map.values());
}
