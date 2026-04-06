interface ApiConfig {
    apiKey: string;
    baseUrl: string;
}

const STORAGE_KEY = 'tokensense_byok_config';

export function getApiConfig(): ApiConfig | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore parsing errors
    }
    return null;
}

export function saveApiConfig(config: ApiConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearApiConfig(): void {
    localStorage.removeItem(STORAGE_KEY);
}
