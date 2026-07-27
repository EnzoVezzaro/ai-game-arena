import type { ProviderConfig } from '@ai-game-arena/sdk';
import { OpenAIProvider } from './openai-provider';
import { OllamaProvider } from './ollama-provider';
import { MockProvider } from './mock-provider';
import type { LLMProvider } from './llm-provider';

export function createProvider(config: ProviderConfig | undefined): LLMProvider {
  const type = config?.type ?? 'none';
  const baseUrl = config?.baseUrl ?? '';

  switch (type) {
    case 'openai':
      return new OpenAIProvider({
        ...config,
        baseUrl: baseUrl || 'https://api.openai.com/v1',
      } as ProviderConfig);
    case 'ollama':
      return new OllamaProvider({
        ...config,
        baseUrl: baseUrl || 'http://localhost:11434',
      } as ProviderConfig);
    case 'lmstudio':
    case 'vllm':
      return new OpenAIProvider({
        ...config,
        type: 'openai',
        baseUrl: baseUrl || 'http://localhost:1234/v1',
      } as ProviderConfig);
    case 'custom':
      return new OpenAIProvider({
        ...config,
        baseUrl: baseUrl || 'http://localhost:8000/v1',
      } as ProviderConfig);
    case 'none':
    default:
      return new MockProvider();
  }
}