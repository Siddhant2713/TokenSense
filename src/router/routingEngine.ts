import type { TaskType, Complexity, LatencySensitivity, ModelConfig, UserConfig, Provider } from './types';
import { ModelRegistry } from './modelRegistry';

export interface RoutingDecision {
  model: ModelConfig;
  reason: string;
}

interface RoutingContext {
  taskType: TaskType;
  complexity: Complexity;
  latencySensitivity: LatencySensitivity;
  budget: 'low' | 'medium' | 'high';
  estimatedInputTokens: number;
  userConfig?: UserConfig;
}

export class RoutingEngine {
  constructor(private registry: ModelRegistry) {}

  route(ctx: RoutingContext): RoutingDecision {
    if (ctx.userConfig?.modelOverrides?.[ctx.taskType]) {
      const overrideId = ctx.userConfig.modelOverrides[ctx.taskType]!;
      const model = this.registry.get(overrideId);
      if (model) return { model, reason: 'user model override' };
    }

    let candidates = this.registry.getAll();

    if (ctx.userConfig?.disabledProviders?.length) {
      candidates = candidates.filter(m => !ctx.userConfig!.disabledProviders!.includes(m.provider));
    }

    candidates = candidates.filter(m => m.contextWindow >= ctx.estimatedInputTokens);

    const targetTier = this.selectTier(ctx);
    const tierCandidates = candidates.filter(m => m.tier === targetTier);
    if (tierCandidates.length > 0) candidates = tierCandidates;

    const withStrength = candidates.filter(m => m.strengths.includes(ctx.taskType));
    if (withStrength.length > 0) candidates = withStrength;

    if (ctx.latencySensitivity === 'high') {
      candidates.sort((a, b) => a.avgLatencyMs - b.avgLatencyMs);
    } else if (ctx.budget === 'low' || ctx.userConfig?.preferCost) {
      candidates.sort((a, b) => a.costPerInputToken - b.costPerInputToken);
    } else if (ctx.userConfig?.preferQuality) {
      candidates.sort((a, b) => b.costPerInputToken - a.costPerInputToken);
    } else {
      candidates.sort((a, b) => this.score(a, ctx) - this.score(b, ctx));
    }

    if (ctx.userConfig?.maxBudgetPerRequest) {
      const maxCost = ctx.userConfig.maxBudgetPerRequest;
      const affordable = candidates.filter(m =>
        (m.costPerInputToken * ctx.estimatedInputTokens) + (m.costPerOutputToken * 500) <= maxCost
      );
      if (affordable.length > 0) candidates = affordable;
    }

    const selected = candidates[0] ?? this.registry.getAll()[0];
    return {
      model: selected,
      reason: this.buildReason(selected, ctx),
    };
  }

  private selectTier(ctx: RoutingContext): ModelConfig['tier'] {
    if (ctx.budget === 'low') return 'economy';
    if (ctx.budget === 'high' && ctx.complexity === 'complex') return 'premium';

    if (ctx.complexity === 'complex') return 'premium';
    if (ctx.complexity === 'simple') return 'economy';

    if (ctx.taskType === 'code' || ctx.taskType === 'reasoning') return 'premium';
    if (ctx.taskType === 'classification' || ctx.taskType === 'extraction') return 'economy';

    return 'standard';
  }

  private score(model: ModelConfig, ctx: RoutingContext): number {
    let score = 0;

    const costWeight = ctx.budget === 'low' ? 3 : ctx.budget === 'high' ? 0.5 : 1.5;
    score += model.costPerInputToken * 1_000_000 * costWeight;

    const latencyWeight = ctx.latencySensitivity === 'high' ? 3 : ctx.latencySensitivity === 'low' ? 0.5 : 1.5;
    score += (model.avgLatencyMs / 1000) * latencyWeight;

    if (!model.strengths.includes(ctx.taskType)) score += 5;

    return score;
  }

  private buildReason(model: ModelConfig, ctx: RoutingContext): string {
    const parts: string[] = [];
    parts.push(`task=${ctx.taskType}`);
    parts.push(`complexity=${ctx.complexity}`);
    parts.push(`tier=${model.tier}`);
    if (model.strengths.includes(ctx.taskType)) parts.push('strength-match');
    return parts.join(', ');
  }
}
