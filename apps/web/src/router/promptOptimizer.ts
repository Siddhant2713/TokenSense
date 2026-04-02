import type { TaskType } from '@tokensense/types';

export function optimizePrompt(prompt: string, taskType: TaskType): string {
  let optimized = prompt;

  optimized = normalizeWhitespace(optimized);
  optimized = removeRedundantPhrases(optimized);
  optimized = compressInstructions(optimized);

  return optimized;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/^ +| +$/gm, '')
    .trim();
}

function removeRedundantPhrases(text: string): string {
  const redundant = [
    /\b(please note that|it is important to note that|as mentioned earlier|as I said before)\b/gi,
    /\b(I would like you to|I want you to|can you please|could you please)\b/gi,
    /\b(basically|essentially|actually|literally|just)\b/gi,
  ];

  let result = text;
  for (const pattern of redundant) {
    result = result.replace(pattern, '').replace(/\s{2,}/g, ' ');
  }
  return result.trim();
}

function compressInstructions(text: string): string {
  return text
    .replace(/make sure (that )?you /gi, '')
    .replace(/don't forget to /gi, '')
    .replace(/remember to /gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function enforceOutputFormat(prompt: string, taskType: TaskType): string {
  const formatInstructions: Partial<Record<TaskType, string>> = {
    code: '\n\nRespond with code only. Use markdown code blocks with language tags.',
    classification: '\n\nRespond with the classification label only.',
    extraction: '\n\nRespond with extracted data in JSON format.',
    summarization: '\n\nRespond with a concise summary in 2-3 sentences.',
  };

  const instruction = formatInstructions[taskType];
  if (instruction && !prompt.includes('format')) {
    return prompt + instruction;
  }
  return prompt;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}
