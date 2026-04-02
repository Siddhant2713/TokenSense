import type { TaskType } from '@tokensense/types';

export const SYSTEM_PROMPT_TEMPLATE = `You are a helpful AI assistant. Follow these rules:
- Be concise and direct
- Use structured output when requested
- If unsure, say so rather than guessing
- Follow the user's output format instructions exactly`;

const TASK_SYSTEM_PROMPTS: Record<TaskType, string> = {
  code: `You are an expert software engineer. Write clean, production-ready code.
- Include only the code requested, no explanations unless asked
- Use proper error handling and types
- Follow the language's conventions and best practices`,

  chat: `You are a helpful conversational assistant.
- Be concise and friendly
- Ask for clarification when the request is ambiguous
- Provide actionable answers`,

  reasoning: `You are an analytical reasoning assistant.
- Break down complex problems step by step
- Show your reasoning clearly
- Consider multiple perspectives before concluding`,

  summarization: `You are a summarization expert.
- Extract key points and main ideas
- Maintain factual accuracy
- Keep summaries concise but complete`,

  extraction: `You are a data extraction specialist.
- Extract requested data precisely
- Output in structured JSON format
- Include confidence scores when uncertain`,

  translation: `You are a professional translator.
- Translate accurately while preserving meaning and tone
- Handle idioms and cultural references appropriately
- Maintain formatting of the original text`,

  classification: `You are a text classification system.
- Output only the classification label
- Be consistent in labeling
- When uncertain, output the most likely label with a confidence note`,
};

export function getSystemPrompt(taskType: TaskType, customSystem?: string): string {
  if (customSystem) return customSystem;
  return TASK_SYSTEM_PROMPTS[taskType] ?? SYSTEM_PROMPT_TEMPLATE;
}

export interface PromptTemplate {
  name: string;
  taskType: TaskType;
  template: string;
  variables: string[];
}

export const DEV_TEMPLATES: PromptTemplate[] = [
  {
    name: 'code-review',
    taskType: 'code',
    template: 'Review this code for bugs, security issues, and improvements:\n\n```{{language}}\n{{code}}\n```',
    variables: ['language', 'code'],
  },
  {
    name: 'explain-code',
    taskType: 'reasoning',
    template: 'Explain what this code does step by step:\n\n```{{language}}\n{{code}}\n```',
    variables: ['language', 'code'],
  },
  {
    name: 'write-tests',
    taskType: 'code',
    template: 'Write unit tests for this {{language}} code using {{framework}}:\n\n```{{language}}\n{{code}}\n```',
    variables: ['language', 'framework', 'code'],
  },
  {
    name: 'summarize-doc',
    taskType: 'summarization',
    template: 'Summarize the following document in {{length}} sentences:\n\n{{content}}',
    variables: ['length', 'content'],
  },
  {
    name: 'extract-entities',
    taskType: 'extraction',
    template: 'Extract all {{entityType}} from this text and return as JSON array:\n\n{{text}}',
    variables: ['entityType', 'text'],
  },
  {
    name: 'classify-intent',
    taskType: 'classification',
    template: 'Classify the intent of this message into one of: {{categories}}\n\nMessage: {{text}}',
    variables: ['categories', 'text'],
  },
];

export function renderTemplate(template: PromptTemplate, vars: Record<string, string>): string {
  let result = template.template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}
