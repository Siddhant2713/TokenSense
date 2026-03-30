import os

css_path = 'src/App.css'
with open(css_path, 'r') as f:
    css = f.read()

# 1. Add brand styles
brand_text = """
.brand-text {
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

"""
css = css.replace('.brand-line {', brand_text + '.brand-line {')

# 2. Fix Two col grid
two_col_orig = """.two-col-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}"""
two_col_new = """.two-col-grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
}"""
css = css.replace(two_col_orig, two_col_new)

# 3. Replace overrides section
override_marker = '/* -- UI Redesign Feedback Overrides -- */'
idx = css.find(override_marker)
if idx != -1:
    css = css[:idx]

# 4. Remove mobile hack
mobile_hack = """  .brand-text span {
    display: none;
  }

  .brand-text::before {
    content: 'TS';
  }"""
css = css.replace(mobile_hack, "")

# 5. Add back hover and upscale
new_rules = """
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

.section-title { font-size: 13px !important; }
.kpi-block .kpi-label { font-size: 12px !important; }
.kpi-block .kpi-value { font-size: 38px !important; }
.exec-text { font-size: 15px !important; }

.issue-row { font-size: 14px !important; padding: 16px 0 !important; }
.issue-team { font-size: 13px !important; }
.issue-evidence { font-size: 13px !important; color: var(--text-muted); }

.rec-team { font-size: 15px !important; }
.rec-saving { font-size: 15px !important; }
.rec-issue-title { font-size: 13px !important; }
.rec-effort { font-size: 11px !important; }

.rec-text-block { font-size: 14px !important; line-height: 1.6; }
.rec-text-block strong { font-size: 12px !important; margin-bottom: 6px; }

.slim-table th { font-size: 12px !important; }
.slim-table td { font-size: 13px !important; }
.cc-title { font-size: 15px !important; }
.cc-team { font-size: 14px !important; }
.cc-cost { font-size: 14px !important; }
"""
css += new_rules

with open(css_path, 'w') as f:
    f.write(css)
