import type { Complexity } from '@tokensense/types';

const COMPLEX_KEYWORDS = /\b(architecture|distributed|concurrent|optimize|algorithm|design pattern|system design|migration|security audit|performance)\b/i;
const MODERATE_KEYWORDS = /\b(implement|integrate|configure|setup|deploy|test|refactor|debug|workflow)\b/i;

export function estimateComplexity(prompt: string): Complexity {
  const length = prompt.length;
  const wordCount = prompt.split(/\s+/).length;
  const hasCodeBlocks = /```[\s\S]*```/.test(prompt);
  const questionCount = (prompt.match(/\?/g) || []).length;
  const listItems = (prompt.match(/^[\s]*[-*\d.]+\s/gm) || []).length;

  let score = 0;

  if (length > 2000) score += 3;
  else if (length > 800) score += 2;
  else if (length > 300) score += 1;

  if (wordCount > 300) score += 2;
  else if (wordCount > 100) score += 1;

  if (hasCodeBlocks) score += 2;
  if (questionCount > 3) score += 2;
  else if (questionCount > 1) score += 1;

  if (listItems > 5) score += 2;
  else if (listItems > 2) score += 1;

  if (COMPLEX_KEYWORDS.test(prompt)) score += 3;
  if (MODERATE_KEYWORDS.test(prompt)) score += 1;

  if (score >= 7) return 'complex';
  if (score >= 3) return 'moderate';
  return 'simple';
}
