// ─── LLM Models ───────────────────────────────────────────────
export type Model = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo' | 'claude-3-opus' | 'claude-3-haiku' | 'gemini-1.5-pro' | 'gemini-1.5-flash';

// ─── Cloud Resource Types ─────────────────────────────────────
export type CloudProvider = 'cloudflare' | 'aws' | 'gcp';

export interface CloudResourceLog {
  id: string;
  timestamp: string;
  team: string;
  provider: CloudProvider;
  service: string;              // e.g., "Workers", "R2 Storage", "EC2", "Lambda"
  resourceName: string;         // e.g., "image-resizer", "api-gateway"
  allocatedRAM_MB: number;
  usedRAM_MB: number;
  executionTimeMs: number;
  requests: number;
  cost: number;
}

// ─── LLM Log ──────────────────────────────────────────────────
export interface Log {
  id: string;
  timestamp: string;
  team: string;
  model: Model;
  inputTokens: number;
  outputTokens: number;
  promptHash: string;
  feature?: string;
  taskComplexity?: 'simple' | 'moderate' | 'complex';  // determines if model is overkill
}

// ─── Aggregated Metrics ───────────────────────────────────────
export interface TeamMetrics {
  team: string;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  averageInputTokens: number;
  averageOutputTokens: number;
  cost: number;
  costVsLastWeek: number;
  modelsUsed: Partial<Record<Model, number>>;
}

export interface CloudResourceMetrics {
  team: string;
  provider: CloudProvider;
  service: string;
  resourceName: string;
  totalRequests: number;
  avgAllocatedRAM_MB: number;
  avgUsedRAM_MB: number;
  ramUtilization: number;       // percentage 0-100
  avgExecutionTimeMs: number;
  totalCost: number;
  wastedCost: number;           // estimated cost of over-provisioning
}

// ─── Rules & Insights ─────────────────────────────────────────
export type RuleName = 'MODEL_MISUSE' | 'LONG_PROMPTS' | 'SPIKE' | 'CACHE_WASTE' | 'RAM_OVER_PROVISION' | 'MODEL_DOWNGRADE';

export interface Insight {
  rule: RuleName;
  team: string;
  severity: 'High' | 'Medium' | 'Low';
  evidence: string;
  suggestedFix?: string;
}

// ─── Recommendations ─────────────────────────────────────────
export interface Recommendation {
  team: string;
  issue: string;
  action: string;
  monthlySaving: number;
  effort: 'Low' | 'Medium' | 'High';
  confidence: 'High' | 'Medium' | 'Low';
  evidence: string;
  category: 'llm' | 'cloud';
}

export interface LLMEnhancerInput {
  recommendations: Recommendation[];
  totalMonthlySaving: number;
}

export interface EnhancedRecommendation {
  recommendation: Recommendation;
  explanation: string;
  whyItHappened: string;
}

export interface EnhancedOutput {
  executiveSummary: string;
  recommendations: EnhancedRecommendation[];
}

// ─── Daily cost for charts ────────────────────────────────────
export interface DailyCost {
  date: string;
  llmCost: number;
  cloudCost: number;
  totalCost: number;
}
