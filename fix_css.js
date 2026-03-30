const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'App.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Remove the entire overrides section
const overrideStart = css.indexOf('/* -- UI Redesign Feedback Overrides -- */');
if (overrideStart !== -1) {
    css = css.substring(0, overrideStart);
}

// 2. Add base brand styles
css = css.replace('.brand-area, .sidebar-topbar {', `.brand-text {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.brand-text span {
  color: var(--accent);
}
.brand-text.sub {
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 1px;
  font-weight: 500;
}
.brand-area, .sidebar-topbar {`);

// 3. Fix .two-col-grid
css = css.replace('.two-col-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 32px;\n}', `.two-col-grid {\n  display: flex;\n  flex-direction: column;\n  gap: 32px;\n}`);

// 4. Update element styles (upscales and chart container)
css += `
/* Globals & Base styles incorporated from overrides */
.kpi-block, .exec-summary-line, .cloud-card, .chart-container {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.kpi-icon {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.kpi-block:hover, .exec-summary-line:hover, .cloud-card:hover, .chart-container:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

.kpi-block:hover .kpi-icon {
  transform: scale(1.15) rotate(-2deg);
}

.chart-container>summary {
  list-style: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 12px;
  transition: background 0.2s ease, transform 0.2s ease;
  margin-left: -8px;
  margin-right: -8px;
}

.chart-container>summary:hover {
  background: var(--bg-hover);
}

.chart-container[open]>summary .chevron {
  transform: rotate(90deg);
}

.chart-container[open] {
  animation: fade-up 0.3s ease;
}

.section-title { font-size: 13px; }
.kpi-block .kpi-label { font-size: 12px; }
.kpi-block .kpi-value { font-size: 38px; }
.exec-text { font-size: 15px; }

.issue-row {
  font-size: 14px;
  padding: 16px 0;
}
.issue-team { font-size: 13px; }
.issue-evidence {
  font-size: 13px;
  color: var(--text-muted);
}

.rec-team { font-size: 15px; }
.rec-saving { font-size: 15px; }
.rec-issue-title { font-size: 13px; }
.rec-effort { font-size: 11px; }

.rec-text-block {
  font-size: 14px;
  line-height: 1.6;
}
.rec-text-block strong {
  font-size: 12px;
  margin-bottom: 6px;
}

.slim-table th { font-size: 12px; }
.slim-table td { font-size: 13px; }
.cc-title { font-size: 15px; }
.cc-team { font-size: 14px; }
.cc-cost { font-size: 14px; }

@media (max-width: 768px) {
  .sidebar { width: 60px; }
  .canvas { margin-left: 60px; }
  .brand-text span { display: none; }
  .brand-text::before { content: 'TS'; }
  .brand-line { width: 20px; }
  .brand-text.sub { display: none; }
  .status-block { display: none; }
  .topbar-right span { display: none; }
}
`;

fs.writeFileSync(cssPath, css, 'utf8');
console.log('App.css fixed');
