import { Log, TeamMetrics, Insight } from './types';

export function detectModelMisuse(metrics: TeamMetrics[]): Insight[] {
    const insights: Insight[] = [];
    for (const m of metrics) {
        if (m.modelsUsed['gpt-4o'] > 0 && m.averageOutputTokens < 100) {
            insights.push({
                team: m.team,
                rule: 'MODEL_MISUSE',
                severity: 'High',
                evidence: `${m.modelsUsed['gpt-4o']} calls to gpt-4o with avg output of only ${Math.round(m.averageOutputTokens)} tokens.`
            });
        }
    }
    return insights;
}

export function detectLongPrompts(metrics: TeamMetrics[]): Insight[] {
    const insights: Insight[] = [];
    for (const m of metrics) {
        if (m.averageInputTokens > 2000) {
            insights.push({
                team: m.team,
                rule: 'LONG_PROMPTS',
                severity: 'High',
                evidence: `Average input prompt length is ${Math.round(m.averageInputTokens)} tokens.`
            });
        }
    }
    return insights;
}

export function detectSpike(logs: Log[]): Insight[] {
    const insights: Insight[] = [];
    const teamDailyCounts = new Map<string, Map<string, number>>();

    for (const log of logs) {
        const day = log.timestamp.split('T')[0] || '';
        if (!teamDailyCounts.has(log.team)) teamDailyCounts.set(log.team, new Map());
        const dayMap = teamDailyCounts.get(log.team)!;
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }

    for (const [team, dayMap] of teamDailyCounts.entries()) {
        const counts = Array.from(dayMap.values());
        if (counts.length < 2) continue;

        const maxCount = Math.max(...counts);
        const sum = counts.reduce((a, b) => a + b, 0);
        const avgWithoutMax = (sum - maxCount) / (counts.length - 1);

        if (avgWithoutMax > 0 && maxCount > avgWithoutMax * 3) {
            insights.push({
                team,
                rule: 'SPIKE',
                severity: 'High',
                evidence: `Usage spiked to ${maxCount} calls on peak day, over 3x the normal daily average of ${Math.round(avgWithoutMax)} calls.`
            });
        }
    }
    return insights;
}

export function detectCacheWaste(logs: Log[]): Insight[] {
    const insights: Insight[] = [];
    const teamHashCounts = new Map<string, Map<string, number>>();

    for (const log of logs) {
        if (!teamHashCounts.has(log.team)) teamHashCounts.set(log.team, new Map());
        const hashMap = teamHashCounts.get(log.team)!;
        hashMap.set(log.promptHash, (hashMap.get(log.promptHash) || 0) + 1);
    }

    for (const [team, hashMap] of teamHashCounts.entries()) {
        let maxRepeats = 0;
        for (const count of hashMap.values()) {
            if (count > maxRepeats) maxRepeats = count;
        }

        if (maxRepeats >= 50) {
            insights.push({
                team,
                rule: 'CACHE_WASTE',
                severity: 'High',
                evidence: `Found identical prompt hash sent ${maxRepeats} times.`
            });
        }
    }
    return insights;
}

export function runAllRules(logs: Log[], metrics: TeamMetrics[]): Insight[] {
    return [
        ...detectModelMisuse(metrics),
        ...detectLongPrompts(metrics),
        ...detectSpike(logs),
        ...detectCacheWaste(logs)
    ];
}
