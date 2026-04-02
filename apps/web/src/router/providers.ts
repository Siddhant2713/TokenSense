import type { Provider, ProviderResponse, TokenUsage } from '@tokensense/types';

export interface ProviderClient {
  provider: Provider;
  complete(params: CompletionParams): Promise<ProviderResponse>;
}

export interface CompletionParams {
  model: string;
  prompt: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  stopSequences?: string[];
}

class OpenAIProvider implements ProviderClient {
  provider: Provider = 'openai';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async complete(params: CompletionParams): Promise<ProviderResponse> {
    const body = {
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.prompt },
      ],
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      ...(params.stopSequences?.length && { stop: params.stopSequences }),
    };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${error}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content ?? '',
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      finishReason: choice?.finish_reason ?? 'unknown',
    };
  }
}

class AnthropicProvider implements ProviderClient {
  provider: Provider = 'anthropic';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.anthropic.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async complete(params: CompletionParams): Promise<ProviderResponse> {
    const body = {
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.prompt }],
      ...(params.stopSequences?.length && { stop_sequences: params.stopSequences }),
      temperature: params.temperature,
    };

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${error}`);
    }

    const data = await res.json();

    return {
      content: data.content?.[0]?.text ?? '',
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      finishReason: data.stop_reason ?? 'unknown',
    };
  }
}

class GoogleProvider implements ProviderClient {
  provider: Provider = 'google';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://generativelanguage.googleapis.com/v1beta') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async complete(params: CompletionParams): Promise<ProviderResponse> {
    const body = {
      system_instruction: { parts: [{ text: params.systemPrompt }] },
      contents: [{ parts: [{ text: params.prompt }] }],
      generationConfig: {
        maxOutputTokens: params.maxTokens,
        temperature: params.temperature,
        ...(params.stopSequences?.length && { stopSequences: params.stopSequences }),
      },
    };

    const res = await fetch(
      `${this.baseUrl}/models/${params.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Google API error ${res.status}: ${error}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const usageMetadata = data.usageMetadata;

    return {
      content: candidate?.content?.parts?.[0]?.text ?? '',
      usage: {
        inputTokens: usageMetadata?.promptTokenCount ?? 0,
        outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: usageMetadata?.totalTokenCount ?? 0,
      },
      finishReason: candidate?.finishReason ?? 'unknown',
    };
  }
}

export class ProviderManager {
  private providers: Map<Provider, ProviderClient> = new Map();

  registerOpenAI(apiKey: string, baseUrl?: string): void {
    this.providers.set('openai', new OpenAIProvider(apiKey, baseUrl));
  }

  registerAnthropic(apiKey: string, baseUrl?: string): void {
    this.providers.set('anthropic', new AnthropicProvider(apiKey, baseUrl));
  }

  registerGoogle(apiKey: string, baseUrl?: string): void {
    this.providers.set('google', new GoogleProvider(apiKey, baseUrl));
  }

  registerCustom(client: ProviderClient): void {
    this.providers.set(client.provider, client);
  }

  get(provider: Provider): ProviderClient | undefined {
    return this.providers.get(provider);
  }

  getAvailable(): Provider[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(provider: Provider): boolean {
    return this.providers.has(provider);
  }
}
