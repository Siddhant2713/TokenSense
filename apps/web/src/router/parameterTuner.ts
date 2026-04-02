import type { TaskType, Complexity } from './types';

export interface TunedParameters {
  temperature: number;
  maxTokens: number;
  stopSequences: string[];
}

const TASK_DEFAULTS: Record<TaskType, { temperature: number; maxTokensRatio: number }> = {
  code: { temperature: 0.1, maxTokensRatio: 1.0 },
  reasoning: { temperature: 0.3, maxTokensRatio: 1.0 },
  chat: { temperature: 0.7, maxTokensRatio: 0.5 },
  summarization: { temperature: 0.2, maxTokensRatio: 0.3 },
  extraction: { temperature: 0.0, maxTokensRatio: 0.4 },
  translation: { temperature: 0.1, maxTokensRatio: 0.8 },
  classification: { temperature: 0.0, maxTokensRatio: 0.1 },
};

const COMPLEXITY_MULTIPLIERS: Record<Complexity, number> = {
  simple: 0.5,
  moderate: 1.0,
  complex: 1.5,
};

export function tuneParameters(
  taskType: TaskType,
  complexity: Complexity,
  modelMaxTokens: number,
  overrides?: { temperature?: number; maxTokens?: number }
): TunedParameters {
  const defaults = TASK_DEFAULTS[taskType] ?? TASK_DEFAULTS.chat;
  const multiplier = COMPLEXITY_MULTIPLIERS[complexity];

  const temperature = overrides?.temperature ?? defaults.temperature;
  const maxTokens = overrides?.maxTokens ??
    Math.min(
      Math.ceil(modelMaxTokens * defaults.maxTokensRatio * multiplier),
      modelMaxTokens
    );

  const stopSequences = getStopSequences(taskType);

  return { temperature, maxTokens, stopSequences };
}

function getStopSequences(taskType: TaskType): string[] {
  switch (taskType) {
    case 'classification':
      return ['\n\n'];
    case 'extraction':
      return [];
    default:
      return [];
  }
}
