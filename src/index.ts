import { generateMockLogs, generateMockCloudLogs } from './mockData';
import { aggregateLogs, aggregateCloudLogs } from './aggregator';
import { runAllRules } from './rules';
import { generateRecommendations, enhanceWithLLM } from './recommendations';

async function main() {
    const logs = generateMockLogs();
    const cloudLogs = generateMockCloudLogs();
    const metrics = aggregateLogs(logs);
    const cloudMetrics = aggregateCloudLogs(cloudLogs);
    const insights = runAllRules(logs, metrics, cloudMetrics);
    const recommendations = generateRecommendations(insights, metrics, cloudMetrics);

    const totalMonthlySaving = recommendations.reduce((sum, r) => sum + r.monthlySaving, 0);

    const enhanced = await enhanceWithLLM({
        recommendations,
        totalMonthlySaving
    });

    // CLI output formatter
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║           TOKENSENSE — WEEKLY COST REPORT            ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    console.log('EXECUTIVE SUMMARY');
    console.log('─────────────────');
    console.log(enhanced.executiveSummary);

    console.log('\nCOST BREAKDOWN BY TEAM');
    console.log('──────────────────────');
    console.log('Team          | Model         | Calls  | Cost      | vs Last Week');

    // Sort teams by cost descending
    metrics.sort((a, b) => b.cost - a.cost);

    for (const m of metrics) {
        const mainModel = Object.keys(m.modelsUsed).sort((a, b) => (m.modelsUsed as any)[b] - (m.modelsUsed as any)[a])[0] || 'Unknown';
        const trend = m.costVsLastWeek >= 0 ? `+${m.costVsLastWeek}%` : `${m.costVsLastWeek}%`;
        const warning = parseInt(trend) > 50 ? ' ⚠' : '';
        console.log(`${m.team.padEnd(13)} | ${mainModel.padEnd(13)} | ${m.totalCalls.toString().padEnd(6)} | $${m.cost.toFixed(2).padEnd(8)} | ${trend}${warning}`);
    }

    console.log(`\nWASTE DETECTED — ${recommendations.length} ISSUES FOUND`);
    console.log('────────────────────────────────');

    // To print severity properly, we use insight severity. Right now we didn't pass severity in Recommendation, let's use Confidence as a proxy for the [HIGH] badge for MVP.
    for (const r of recommendations) {
        const sevTag = `[${r.confidence.toUpperCase()}]`;
        console.log(`${sevTag.padEnd(7)} ${r.team} — ${r.issue}`);
        console.log(`        ${r.action}`);
        console.log(`        Saving: $${Math.round(r.monthlySaving)}/month  |  Effort: ${r.effort}  |  Confidence: ${r.confidence}`);
        console.log(`        Evidence: ${r.evidence}\n`);
    }

    console.log(`TOTAL POTENTIAL SAVING: $${Math.round(totalMonthlySaving)} / MONTH`);
    console.log('\n--- Slack Digest Simulation ---');
    console.log(`[Header Block] TokenSense Weekly Report — ${new Date().toISOString().split('T')[0]}`);
    console.log(`[Text Block]   ${enhanced.executiveSummary}`);
    console.log(`[Divider]`);
    for (const r of recommendations) {
        console.log(`[Section]      ${r.team} - ${r.issue}. Saving: $${Math.round(r.monthlySaving)}/mo. Action: <Button: Implement Fix>`);
    }
    console.log(`[Context]      Powered by TokenSense`);
    console.log('\n');
}

main().catch(console.error);
