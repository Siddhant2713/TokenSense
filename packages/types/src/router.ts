export type TaskType = 'code' | 'chat' | 'reasoning' | 'summarization' | 'extraction' | 'translation' | 'classification';
export type Complexity = 'simple' | 'moderate' | 'complex';
export type LatencySensitivity = 'low' | 'medium' | 'high';
export type Provider = 'openai' | 'anthropic' | 'google';

export interface RoutingRequest {
  prompt: string;
  systemPrompt?: string;
  taskType?: TaskType;
  complexity?: Complexity;
  latencySensitivity?: LatencySensitivity;
  budget?: 'low' | 'medium' | 'high';
  maxTokens?: number;
  temperature?: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface RoutingResponse {
  content: string;
  model: string;
  provider: Provider;
  usage: TokenUsage;
  cost: number;
  latencyMs: number;
  cached: boolean;
  fallback: boolean;
  requestId: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ModelConfig {
  id: string;
  provider: Provider;
  displayName: string;
  costPerInputToken: number;
  costPerOutputToken: number;
  avgLatencyMs: number;
  maxTokens: number;
  strengths: TaskType[];
  tier: 'economy' | 'standard' | 'premium';
  contextWindow: number;
}

export interface ProviderResponse {
  content: string;
  usage: TokenUsage;
  finishReason: string;
}

export interface RequestLog {
  requestId: string;
  timestamp: string;
  prompt: string;
  systemPrompt?: string;
  taskType: TaskType;
  complexity: Complexity;
  model: string;
  provider: Provider;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  cached: boolean;
  fallback: boolean;
  success: boolean;
  error?: string;
  userId?: string;
}

export interface UserConfig {
  preferCost: boolean;
  preferQuality: boolean;
  preferSpeed: boolean;
  modelOverrides?: Partial<Record<TaskType, string>>;
  maxBudgetPerRequest?: number;
  maxBudgetPerDay?: number;
  disabledProviders?: Provider[];
}

export interface AggregatedMetrics {
  totalRequests: number;
  totalCost: number;
  avgLatencyMs: number;
  cacheHitRate: number;
  fallbackRate: number;
  costByModel: Record<string, number>;
  costByProvider: Record<string, number>;
  requestsByTaskType: Record<string, number>;
  dailyCosts: { date: string; cost: number; requests: number }[];
}
