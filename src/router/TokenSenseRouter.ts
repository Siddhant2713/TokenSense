import type {
  RoutingRequest, RoutingResponse, RequestLog, UserConfig,
  Provider, TaskType, Complexity, LatencySensitivity, AggregatedMetrics, ModelConfig,
} from './types';
import { ModelRegistry } from './modelRegistry';
import { RoutingEngine } from './routingEngine';
import { ProviderManager, type CompletionParams } from './providers';
import { ResponseCache } from './cache';
import { RateLimiter } from './rateLimiter';
import { CostTracker } from './costTracker';
import { LatencyTracker } from './latencyTracker';
import { Logger } from './logger';
import { classifyTask } from './taskClassifier';
import { estimateComplexity } from './complexityEstimator';
import { optimizePrompt, enforceOutputFormat, estimateTokens } from './promptOptimizer';
import { getSystemPrompt } from './promptTemplates';
import { tuneParameters } from './parameterTuner';
import { validateResponse } from './responseValidator';

export interface TokenSenseConfig {
  providers?: {
    openai?: { apiKey: string; baseUrl?: string };
    anthropic?: { apiKey: string; baseUrl?: string };
    google?: { apiKey: string; baseUrl?: string };
  };
  defaults?: Partial<UserConfig>;
  cache?: { maxSize?: number; ttlMs?: number };
  rateLimit?: { maxPerMinute?: number };
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  customModels?: ModelConfig[];
}

export class TokenSenseRouter {
  private registry: ModelRegistry;
  private engine: RoutingEngine;
  private providerManager: ProviderManager;
  private cache: ResponseCache;
  private rateLimiter: RateLimiter;
  private costTracker: CostTracker;
  private latencyTracker: LatencyTracker;
  private logger: Logger;
  private userConfig: UserConfig;
  private requestCounter = 0;

  constructor(config: TokenSenseConfig = {}) {
    this.registry = new ModelRegistry(config.customModels);
    this.engine = new RoutingEngine(this.registry);
    this.providerManager = new ProviderManager();
    this.cache = new ResponseCache(config.cache?.maxSize, config.cache?.ttlMs);
    this.rateLimiter = new RateLimiter(config.rateLimit?.maxPerMinute);
    this.costTracker = new CostTracker();
    this.latencyTracker = new LatencyTracker();
    this.logger = new Logger(config.logLevel);

    this.userConfig = {
      preferCost: false,
      preferQuality: false,
      preferSpeed: false,
      ...config.defaults,
    };

    if (config.providers?.openai) {
      this.providerManager.registerOpenAI(config.providers.openai.apiKey, config.providers.openai.baseUrl);
    }
    if (config.providers?.anthropic) {
      this.providerManager.registerAnthropic(config.providers.anthropic.apiKey, config.providers.anthropic.baseUrl);
    }
    if (config.providers?.google) {
      this.providerManager.registerGoogle(config.providers.google.apiKey, config.providers.google.baseUrl);
    }
  }

  async route(request: RoutingRequest): Promise<RoutingResponse> {
    const requestId = this.generateRequestId();
    const startTime = performance.now();

    const rateLimitKey = request.userId ?? 'global';
    if (!this.rateLimiter.allow(rateLimitKey)) {
      throw new TokenSenseError('RATE_LIMITED', `Rate limit exceeded for ${rateLimitKey}`, {
        retryAfterMs: this.rateLimiter.getResetMs(rateLimitKey),
      });
    }

    const taskType: TaskType = request.taskType ?? classifyTask(request.prompt);
    const complexity: Complexity = request.complexity ?? estimateComplexity(request.prompt);
    const latencySensitivity: LatencySensitivity = request.latencySensitivity ?? 'medium';
    const budget = request.budget ?? 'medium';

    const optimizedPrompt = optimizePrompt(request.prompt, taskType);
    const formattedPrompt = enforceOutputFormat(optimizedPrompt, taskType);
    const systemPrompt = getSystemPrompt(taskType, request.systemPrompt);
    const estimatedTokens = estimateTokens(formattedPrompt + systemPrompt);

    this.logger.debug('routing_request', { requestId, taskType, complexity, budget });

    const decision = this.engine.route({
      taskType,
      complexity,
      latencySensitivity,
      budget,
      estimatedInputTokens: estimatedTokens,
      userConfig: this.userConfig,
    });

    const model = decision.model;
    const params = tuneParameters(
      taskType,
      complexity,
      model.maxTokens,
      { temperature: request.temperature, maxTokens: request.maxTokens }
    );

    const cacheKey = this.cache.makeKey(formattedPrompt, model.id, systemPrompt);
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse) {
      const latencyMs = Math.round(performance.now() - startTime);
      this.logAndRecord(requestId, formattedPrompt, systemPrompt, taskType, complexity, model, cachedResponse.usage, 0, latencyMs, true, false, true, request.userId);
      return {
        content: cachedResponse.content,
        model: model.id,
        provider: model.provider,
        usage: cachedResponse.usage,
        cost: 0,
        latencyMs,
        cached: true,
        fallback: false,
        requestId,
      };
    }

    const completionParams: CompletionParams = {
      model: model.id,
      prompt: formattedPrompt,
      systemPrompt,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
      stopSequences: params.stopSequences,
    };

    let response: RoutingResponse;
    try {
      response = await this.executeWithFallback(requestId, completionParams, model, taskType, complexity, startTime, request.userId, formattedPrompt, systemPrompt);
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startTime);
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logAndRecord(requestId, formattedPrompt, systemPrompt, taskType, complexity, model, { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, 0, latencyMs, false, false, false, request.userId, errMsg);
      throw error;
    }

    this.cache.set(cacheKey, { content: response.content, usage: response.usage, finishReason: 'stop' });
    return response;
  }

  private async executeWithFallback(
    requestId: string,
    params: CompletionParams,
    model: ModelConfig,
    taskType: TaskType,
    complexity: Complexity,
    startTime: number,
    userId?: string,
    prompt?: string,
    systemPrompt?: string,
  ): Promise<RoutingResponse> {
    const provider = this.providerManager.get(model.provider);
    if (!provider) {
      const fallbackModel = this.findAlternateProvider(model);
      if (fallbackModel) {
        this.logger.warn('provider_unavailable_fallback', { original: model.provider, fallback: fallbackModel.provider });
        return this.executeWithFallback(requestId, { ...params, model: fallbackModel.id }, fallbackModel, taskType, complexity, startTime, userId, prompt, systemPrompt);
      }
      throw new TokenSenseError('NO_PROVIDER', `No provider available for ${model.provider}`);
    }

    try {
      const { result: providerResponse, latencyMs } = await this.latencyTracker.measure(() =>
        provider.complete(params)
      );

      this.latencyTracker.record(model.id, latencyMs);

      const validation = validateResponse(providerResponse, taskType);
      if (!validation.valid) {
        this.logger.warn('validation_issues', { model: model.id, issues: validation.issues });
      }

      const cost = this.registry.calculateCost(model.id, providerResponse.usage.inputTokens, providerResponse.usage.outputTokens);

      this.logAndRecord(requestId, prompt ?? '', systemPrompt, taskType, complexity, model, providerResponse.usage, cost, latencyMs, false, false, true, userId);

      return {
        content: providerResponse.content,
        model: model.id,
        provider: model.provider,
        usage: providerResponse.usage,
        cost,
        latencyMs,
        cached: false,
        fallback: false,
        requestId,
      };
    } catch (error) {
      this.logger.error('provider_error', { model: model.id, error: String(error) });

      const nextTier = this.registry.getNextTier(model.id);
      if (nextTier) {
        this.logger.info('fallback_to_higher_tier', { from: model.id, to: nextTier.id });
        const result = await this.executeWithFallback(requestId, { ...params, model: nextTier.id }, nextTier, taskType, complexity, startTime, userId, prompt, systemPrompt);
        return { ...result, fallback: true };
      }

      const alternate = this.findAlternateProvider(model);
      if (alternate) {
        this.logger.info('fallback_to_alternate_provider', { from: model.id, to: alternate.id });
        const result = await this.executeWithFallback(requestId, { ...params, model: alternate.id }, alternate, taskType, complexity, startTime, userId, prompt, systemPrompt);
        return { ...result, fallback: true };
      }

      throw error;
    }
  }

  private findAlternateProvider(model: ModelConfig): ModelConfig | undefined {
    const available = this.providerManager.getAvailable();
    const candidates = this.registry.getAll()
      .filter(m => m.provider !== model.provider && available.includes(m.provider) && m.tier === model.tier)
      .sort((a, b) => a.costPerInputToken - b.costPerInputToken);
    return candidates[0];
  }

  private logAndRecord(
    requestId: string, prompt: string, systemPrompt: string | undefined,
    taskType: TaskType, complexity: Complexity, model: ModelConfig,
    usage: { inputTokens: number; outputTokens: number; totalTokens: number },
    cost: number, latencyMs: number, cached: boolean, fallback: boolean,
    success: boolean, userId?: string, error?: string,
  ): void {
    const log: RequestLog = {
      requestId,
      timestamp: new Date().toISOString(),
      prompt: prompt.substring(0, 200),
      systemPrompt: systemPrompt?.substring(0, 100),
      taskType,
      complexity,
      model: model.id,
      provider: model.provider,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cost,
      latencyMs,
      cached,
      fallback,
      success,
      error,
      userId,
    };

    this.costTracker.record(log);
    this.logger.logRequest(log);
  }

  // --- Public API ---

  getMetrics(): AggregatedMetrics {
    return this.costTracker.getMetrics();
  }

  getLatencyStats() {
    return this.latencyTracker.getAllStats();
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  getLogs(count?: number) {
    return count ? this.costTracker.getRecentLogs(count) : this.costTracker.getLogs();
  }

  getLogEntries(level?: 'debug' | 'info' | 'warn' | 'error') {
    return this.logger.getEntries(level);
  }

  getModels() {
    return this.registry.getAll();
  }

  updateConfig(config: Partial<UserConfig>): void {
    this.userConfig = { ...this.userConfig, ...config };
  }

  registerModel(model: ModelConfig): void {
    this.registry.register(model);
  }

  getDailySpend(userId?: string): number {
    return this.costTracker.getDailySpend(userId);
  }

  private generateRequestId(): string {
    this.requestCounter++;
    return `ts_${Date.now()}_${this.requestCounter}`;
  }
}

export class TokenSenseError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'TokenSenseError';
    this.code = code;
    this.details = details;
  }
}
