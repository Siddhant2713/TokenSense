export function getProvider(modelId: string): string {
  if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) return 'openai';
  if (modelId.startsWith('claude')) return 'anthropic';
  if (modelId.startsWith('gemini')) return 'google';
  if (modelId.startsWith('mistral')) return 'mistral';
  return 'unknown';
}
