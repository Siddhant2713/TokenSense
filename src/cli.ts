#!/usr/bin/env node

import { generateMockLogs, generateMockCloudLogs } from './mockData.js';
import { aggregateLogs, aggregateCloudLogs } from './aggregator.js';
import { runAllRules } from './rules.js';
import { generateRecommendations } from './recommendations.js';

// ─── Colors ─────────────────────────────────────────────────────
const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow:'\x1b[43m',
  bgBlue:  '\x1b[44m',
  bgCyan:  '\x1b[45m',
};

function pad(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : ' '.repeat(len - str.length) + str;
}

// ─── Main ───────────────────────────────────────────────────────
function main() {
  // Generate data
  const llmLogs = generateMockLogs();
  const cloudLogs = generateMockCloudLogs();
  const teamMetrics = aggregateLogs(llmLogs);
  const cloudMetrics = aggregateCloudLogs(cloudLogs);
  const insights = runAllRules(llmLogs, teamMetrics, cloudMetrics);
  const recommendations = generateRecommendations(insights, teamMetrics, cloudMetrics);

  const totalLLMCost = teamMetrics.reduce((s, m) => s + m.cost, 0);
  const totalCloudCost = cloudMetrics.reduce((s, m) => s + m.totalCost, 0);
  const totalSavings = recommendations.reduce((s, r) => s + r.monthlySaving, 0);

  const today = new Date().toISOString().split('T')[0];

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════
  console.log('');
  console.log(`${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║${c.reset}${c.bold}${c.white}          TOKENSENSE — AI COST OPTIMIZATION REPORT           ${c.reset}${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}${c.dim}                    Report Date: ${today}                  ${c.reset}${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log(`${c.bold}${c.white}EXECUTIVE SUMMARY${c.reset}`);
  console.log(`${c.dim}${'─'.repeat(62)}${c.reset}`);

  const llmRecs = recommendations.filter(r => r.category === 'llm');
  const cloudRecs = recommendations.filter(r => r.category === 'cloud');
  const llmSavings = llmRecs.reduce((s, r) => s + r.monthlySaving, 0);
  const cloudSavings = cloudRecs.reduce((s, r) => s + r.monthlySaving, 0);

  console.log(`  ${c.cyan}●${c.reset} Analyzed ${c.bold}${llmLogs.length.toLocaleString()}${c.reset} LLM calls and ${c.bold}${cloudLogs.length.toLocaleString()}${c.reset} cloud resource entries`);
  console.log(`  ${c.cyan}●${c.reset} Total LLM Spend:   ${c.bold}$${totalLLMCost.toFixed(2)}${c.reset}`);
  console.log(`  ${c.cyan}●${c.reset} Total Cloud Spend:  ${c.bold}$${totalCloudCost.toFixed(2)}${c.reset}`);
  console.log(`  ${c.red}●${c.reset} ${c.bold}${insights.length} issues detected${c.reset}`);
  console.log(`  ${c.green}●${c.reset} Potential savings:  ${c.bold}${c.green}$${totalSavings.toFixed(2)}/month${c.reset} ($${(totalSavings * 12).toFixed(2)}/year)`);
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // LLM COST BREAKDOWN BY TEAM
  // ═══════════════════════════════════════════════════════════════
  console.log(`${c.bold}${c.white}LLM COST BREAKDOWN BY TEAM${c.reset}`);
  console.log(`${c.dim}${'─'.repeat(62)}${c.reset}`);

  const sortedMetrics = [...teamMetrics].sort((a, b) => b.cost - a.cost);
  console.log(`  ${c.dim}${pad('Team', 14)}${pad('Model', 18)}${padRight('Calls', 8)}${padRight('Cost', 12)}${padRight('vs Last Wk', 12)}${c.reset}`);
  console.log(`  ${c.dim}${'─'.repeat(60)}${c.reset}`);

  for (const m of sortedMetrics) {
    const topModel = Object.entries(m.modelsUsed).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0];
    const modelName = topModel ? topModel[0] : 'unknown';

    const changeStr = m.costVsLastWeek > 0
      ? `${c.red}+${m.costVsLastWeek}%${c.reset}`
      : m.costVsLastWeek < 0
        ? `${c.green}${m.costVsLastWeek}%${c.reset}`
        : `${c.dim}0%${c.reset}`;

    const spike = m.costVsLastWeek > 50 ? ` ${c.red}⚠${c.reset}` : '';

    console.log(`  ${pad(m.team, 14)}${pad(modelName, 18)}${padRight(m.totalCalls.toLocaleString(), 8)}${padRight('$' + m.cost.toFixed(2), 12)}${padRight('', 4)}${changeStr}${spike}`);
  }
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // CLOUD RESOURCE USAGE
  // ═══════════════════════════════════════════════════════════════
  console.log(`${c.bold}${c.white}CLOUD RESOURCE USAGE${c.reset}`);
  console.log(`${c.dim}${'─'.repeat(62)}${c.reset}`);

  const sortedCloud = [...cloudMetrics].sort((a, b) => b.wastedCost - a.wastedCost);
  console.log(`  ${c.dim}${pad('Resource', 20)}${pad('Provider', 14)}${padRight('RAM', 18)}${padRight('Cost', 10)}${padRight('Wasted', 10)}${c.reset}`);
  console.log(`  ${c.dim}${'─'.repeat(60)}${c.reset}`);

  for (const m of sortedCloud) {
    const ramStr = m.avgAllocatedRAM_MB > 0
      ? `${m.avgUsedRAM_MB}/${m.avgAllocatedRAM_MB}MB (${m.ramUtilization}%)`
      : 'N/A';

    const utilColor = m.ramUtilization < 30 ? c.red : m.ramUtilization < 70 ? c.yellow : c.green;
    const wastedColor = m.wastedCost > 0 ? c.red : c.green;

    console.log(`  ${pad(m.resourceName, 20)}${pad(m.provider.toUpperCase(), 14)}${utilColor}${padRight(ramStr, 18)}${c.reset}${padRight('$' + m.totalCost.toFixed(2), 10)}${wastedColor}${padRight('$' + m.wastedCost.toFixed(2), 10)}${c.reset}`);
  }
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // WASTE DETECTED
  // ═══════════════════════════════════════════════════════════════
  console.log(`${c.bold}${c.white}WASTE DETECTED — ${insights.length} ISSUES FOUND${c.reset}`);
  console.log(`${c.dim}${'─'.repeat(62)}${c.reset}`);

  // Pair insights with recommendations
  for (const rec of [...recommendations].sort((a, b) => b.monthlySaving - a.monthlySaving)) {
    const severityColor = c.red;
    const categoryIcon = rec.category === 'llm' ? '🤖' : '☁️';
    const categoryLabel = rec.category === 'llm' ? 'LLM' : 'CLOUD';

    console.log('');
    console.log(`  ${severityColor}[HIGH]${c.reset}  ${c.bold}${rec.team}${c.reset} — ${rec.issue}  ${c.dim}[${categoryLabel}]${c.reset} ${categoryIcon}`);
    console.log(`  ${c.dim}        ${rec.evidence}${c.reset}`);
    console.log(`  ${c.green}   💡   ${rec.action}${c.reset}`);
    console.log(`  ${c.dim}        Saving: ${c.reset}${c.bold}${c.green}$${rec.monthlySaving.toFixed(2)}/month${c.reset}  ${c.dim}|${c.reset}  Effort: ${c.bold}${rec.effort}${c.reset}  ${c.dim}|${c.reset}  Confidence: ${c.bold}${rec.confidence}${c.reset}`);
  }

  console.log('');
  console.log(`${c.dim}${'─'.repeat(62)}${c.reset}`);

  // ═══════════════════════════════════════════════════════════════
  // TOTAL SAVING
  // ═══════════════════════════════════════════════════════════════
  console.log('');
  console.log(`${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  ${c.bold}${c.green}TOTAL POTENTIAL SAVING: $${totalSavings.toFixed(2)} / MONTH${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  ${c.bold}${c.green}                       $${(totalSavings * 12).toFixed(2)} / YEAR${c.reset}`);
  console.log(`${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  ${c.dim}LLM savings:   $${llmSavings.toFixed(2)}/mo  (${llmRecs.length} issues)${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  ${c.dim}Cloud savings:  $${cloudSavings.toFixed(2)}/mo  (${cloudRecs.length} issues)${c.reset}`);
  console.log(`${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log('');
  console.log(`${c.dim}  Powered by TokenSense — AI-powered cost optimization${c.reset}`);
  console.log('');
}

main();
