import type { TaskType, ProviderResponse } from '@tokensense/types';

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateResponse(response: ProviderResponse, taskType: TaskType): ValidationResult {
  const issues: string[] = [];

  if (!response.content || response.content.trim().length === 0) {
    issues.push('Empty response content');
  }

  if (response.content.length < 5) {
    issues.push('Response too short');
  }

  if (response.finishReason === 'length') {
    issues.push('Response truncated due to token limit');
  }

  const taskIssues = validateByTaskType(response.content, taskType);
  issues.push(...taskIssues);

  return { valid: issues.length === 0, issues };
}

function validateByTaskType(content: string, taskType: TaskType): string[] {
  const issues: string[] = [];

  switch (taskType) {
    case 'code': {
      const hasCode = /```[\s\S]*```/.test(content) || /\b(function|class|const|let|var|def|import|return)\b/.test(content);
      if (!hasCode && content.length > 100) {
        issues.push('Code task response may not contain code');
      }
      break;
    }
    case 'extraction': {
      const hasStructured = /[\[{]/.test(content);
      if (!hasStructured && content.length > 50) {
        issues.push('Extraction response may not be in structured format');
      }
      break;
    }
    case 'classification': {
      if (content.split('\n').filter(l => l.trim()).length > 5) {
        issues.push('Classification response is unexpectedly long');
      }
      break;
    }
  }

  return issues;
}
