export const RULE_THRESHOLDS = {
  MODEL_MISUSE: {
    maxOutputTokensForSimpleTask: 100,
  },
  LONG_PROMPTS: {
    avgInputTokensWarning: 2000,
  },
  CACHE_WASTE: {
    minRepeatCountToFlag: 50,
  },
  SPIKE: {
    multiplierVsRollingAverage: 3,
  },
  RAM_OVER_PROVISION: {
    utilizationDangerPercent: 20,
    utilizationWarnPercent: 40,
    safetyBufferMultiplier: 1.5,
    minSuggestedRAM_MB: 32,
  },
} as const;
