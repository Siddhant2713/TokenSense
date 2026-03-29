import type { ProviderResponse } from './types';

interface CacheEntry {
  response: ProviderResponse;
  timestamp: number;
  hits: number;
}

export class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 500, ttlMs = 300_000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): ProviderResponse | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    entry.hits++;
    return entry.response;
  }

  set(key: string, response: ProviderResponse): void {
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  makeKey(prompt: string, model: string, systemPrompt: string): string {
    return this.hash(`${model}::${systemPrompt}::${prompt}`);
  }

  getStats(): { size: number; maxSize: number; hitRate: number } {
    let totalHits = 0;
    let totalEntries = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalEntries++;
    }
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalEntries > 0 ? totalHits / (totalHits + totalEntries) : 0,
    };
  }

  clear(): void {
    this.cache.clear();
  }

  private evict(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) this.cache.delete(oldestKey);
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  }
}
