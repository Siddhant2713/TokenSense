export type Model = 'gpt-4o' | 'gpt-3.5-turbo';

export interface Log {
    id: string;
    timestamp: string;
    team: string;
    model: Model;
    inputTokens: number;
    outputTokens: number;
    promptHash: string;
    feature?: string;
}

export interface TeamMetrics {
    team: string;
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    averageInputTokens: number;
    averageOutputTokens: number;
    cost: number;
    costVsLastWeek: number; // Percentage change e.g., 34 for +34%, -5 for -5%
    modelsUsed: Record<Model, number>;
}

export type RuleName = 'MODEL_MISUSE' | 'LONG_PROMPTS' | 'SPIKE' | 'CACHE_WASTE';

export interface Insight {
    rule: RuleName;
    team: string;
    severity: 'High' | 'Medium' | 'Low';
    evidence: string;
}

export interface Recommendation {
    team: string;
    issue: string;
    action: string;
    monthlySaving: number;
    effort: 'Low' | 'Medium' | 'High';
    confidence: 'High' | 'Medium' | 'Low';
    evidence: string;
}

export interface LLMEnhancerInput {
    recommendations: Recommendation[];
    totalMonthlySaving: number;
}

export interface EnhancedRecommendation {
    recommendation: Recommendation;
    explanation: string;
    whyItHappened: string;
}

export interface EnhancedOutput {
    executiveSummary: string;
    recommendations: EnhancedRecommendation[];
}
