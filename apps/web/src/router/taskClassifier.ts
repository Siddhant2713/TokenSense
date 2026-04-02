import type { TaskType } from '@tokensense/types';

const TASK_PATTERNS: { type: TaskType; patterns: RegExp[] }[] = [
  {
    type: 'code',
    patterns: [
      /\b(write|implement|code|function|class|debug|fix|refactor|compile|syntax|api|endpoint|script|program)\b/i,
      /```[\s\S]*```/,
      /\b(javascript|typescript|python|java|rust|go|c\+\+|html|css|sql)\b/i,
    ],
  },
  {
    type: 'reasoning',
    patterns: [
      /\b(explain|why|how does|analyze|compare|evaluate|think|reason|logic|proof|math|calculate)\b/i,
      /\b(step by step|pros and cons|trade-?offs|implications)\b/i,
    ],
  },
  {
    type: 'summarization',
    patterns: [
      /\b(summarize|summary|tldr|tl;dr|brief|overview|digest|condense|shorten|key points)\b/i,
    ],
  },
  {
    type: 'extraction',
    patterns: [
      /\b(extract|parse|find|identify|list all|pull out|get the|retrieve)\b/i,
      /\b(entities|names|dates|numbers|emails|urls)\b/i,
    ],
  },
  {
    type: 'translation',
    patterns: [
      /\b(translate|convert|transform)\b.*\b(to|into|from)\b/i,
      /\b(english|spanish|french|german|chinese|japanese|korean|arabic|hindi|portuguese)\b/i,
    ],
  },
  {
    type: 'classification',
    patterns: [
      /\b(classify|categorize|label|tag|sentiment|positive|negative|spam|intent)\b/i,
      /\b(is this|which category|what type)\b/i,
    ],
  },
];

export function classifyTask(prompt: string): TaskType {
  const scores: Partial<Record<TaskType, number>> = {};

  for (const { type, patterns } of TASK_PATTERNS) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(prompt)) score++;
    }
    if (score > 0) scores[type] = score;
  }

  const entries = Object.entries(scores) as [TaskType, number][];
  if (entries.length === 0) return 'chat';

  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}
