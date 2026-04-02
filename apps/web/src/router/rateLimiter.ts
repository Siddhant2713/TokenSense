interface RateBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets: Map<string, RateBucket> = new Map();
  private maxTokens: number;
  private refillRate: number;
  private refillIntervalMs: number;

  constructor(maxRequestsPerMinute = 60) {
    this.maxTokens = maxRequestsPerMinute;
    this.refillRate = maxRequestsPerMinute;
    this.refillIntervalMs = 60_000;
  }

  allow(key: string): boolean {
    const bucket = this.getBucket(key);
    this.refill(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  getRemaining(key: string): number {
    const bucket = this.getBucket(key);
    this.refill(bucket);
    return Math.floor(bucket.tokens);
  }

  getResetMs(key: string): number {
    const bucket = this.getBucket(key);
    const elapsed = Date.now() - bucket.lastRefill;
    return Math.max(0, this.refillIntervalMs - elapsed);
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  private getBucket(key: string): RateBucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: Date.now() };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private refill(bucket: RateBucket): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = (elapsed / this.refillIntervalMs) * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }
}
