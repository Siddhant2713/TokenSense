import type { ModelConfig, Provider, TaskType } from '@tokensense/types';

const MODELS: ModelConfig[] = [
  {
    id: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    costPerInputToken: 0.0000025,
    costPerOutputToken: 0.00001,
    avgLatencyMs: 800,
    maxTokens: 16384,
    strengths: ['code', 'reasoning', 'chat', 'summarization'],
    tier: 'premium',
    contextWindow: 128000,
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    displayName: 'GPT-4o Mini',
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
    avgLatencyMs: 400,
    maxTokens: 16384,
    strengths: ['chat', 'classification', 'extraction', 'translation'],
    tier: 'economy',
    contextWindow: 128000,
  },
  {
    id: 'gpt-3.5-turbo',
    provider: 'openai',
    displayName: 'GPT-3.5 Turbo',
    costPerInputToken: 0.0000005,
    costPerOutputToken: 0.0000015,
    avgLatencyMs: 300,
    maxTokens: 4096,
    strengths: ['chat', 'classification'],
    tier: 'economy',
    contextWindow: 16385,
  },
  {
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    displayName: 'Claude Sonnet 4',
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
    avgLatencyMs: 700,
    maxTokens: 8192,
    strengths: ['code', 'reasoning', 'summarization', 'chat'],
    tier: 'premium',
    contextWindow: 200000,
  },
  {
    id: 'claude-haiku-3-5',
    provider: 'anthropic',
    displayName: 'Claude 3.5 Haiku',
    costPerInputToken: 0.0000008,
    costPerOutputToken: 0.000004,
    avgLatencyMs: 350,
    maxTokens: 8192,
    strengths: ['chat', 'classification', 'extraction', 'translation'],
    tier: 'economy',
    contextWindow: 200000,
  },
  {
    id: 'gemini-2.0-flash',
    provider: 'google',
    displayName: 'Gemini 2.0 Flash',
    costPerInputToken: 0.0000001,
    costPerOutputToken: 0.0000004,
    avgLatencyMs: 250,
    maxTokens: 8192,
    strengths: ['chat', 'classification', 'summarization', 'extraction'],
    tier: 'economy',
    contextWindow: 1000000,
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'google',
    displayName: 'Gemini 2.5 Pro',
    costPerInputToken: 0.00000125,
    costPerOutputToken: 0.00001,
    avgLatencyMs: 900,
    maxTokens: 8192,
    strengths: ['reasoning', 'code', 'summarization'],
    tier: 'premium',
    contextWindow: 1000000,
  },
];

export class ModelRegistry {
  private models: Map<string, ModelConfig> = new Map();

  constructor(customModels?: ModelConfig[]) {
    const all = customModels ?? MODELS;
    for (const model of all) {
      this.models.set(model.id, model);
    }
  }

  get(id: string): ModelConfig | undefined {
    return this.models.get(id);
  }

  getAll(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  getByProvider(provider: Provider): ModelConfig[] {
    return this.getAll().filter(m => m.provider === provider);
  }

  getByTier(tier: ModelConfig['tier']): ModelConfig[] {
    return this.getAll().filter(m => m.tier === tier);
  }

  getByStrength(taskType: TaskType): ModelConfig[] {
    return this.getAll().filter(m => m.strengths.includes(taskType));
  }

  register(model: ModelConfig): void {
    this.models.set(model.id, model);
  }

  remove(id: string): void {
    this.models.delete(id);
  }

  calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.models.get(modelId);
    if (!model) return 0;
    return (inputTokens * model.costPerInputToken) + (outputTokens * model.costPerOutputToken);
  }

  getNextTier(modelId: string): ModelConfig | undefined {
    const current = this.models.get(modelId);
    if (!current) return undefined;

    const tierOrder: ModelConfig['tier'][] = ['economy', 'standard', 'premium'];
    const currentTierIndex = tierOrder.indexOf(current.tier);
    if (currentTierIndex >= tierOrder.length - 1) return undefined;

    const candidates = this.getAll()
      .filter(m => m.provider === current.provider && tierOrder.indexOf(m.tier) > currentTierIndex)
      .sort((a, b) => a.costPerInputToken - b.costPerInputToken);

    return candidates[0];
  }
}
