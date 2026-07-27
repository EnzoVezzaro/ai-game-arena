# AI Providers

> Provider abstraction for LLM models — authentication, model management, completion, streaming, and cost estimation.

---

## Overview

The Provider system abstracts away differences between LLM providers (OpenAI, Anthropic, local models, etc.) and provides a unified interface for the Agent Runtime.

---

## Provider Interface

```typescript
// packages/sdk/src/contracts/provider.ts
export interface Provider {
  readonly manifest: ProviderManifest;
  
  // Authentication
  authenticate(config: AuthConfig): Promise<AuthResult>;
  validateAuth(config: AuthConfig): Promise<boolean>;
  refreshAuth(config: AuthConfig): Promise<AuthResult>;
  
  // Model management
  getModels(): Model[];
  getModel(modelId: string): Model | undefined;
  supportsModel(modelId: string): boolean;
  
  // Completion
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  streamComplete(request: CompletionRequest): AsyncIterable<CompletionChunk>;
  
  // Capabilities
  getCapabilities(): ProviderCapability[];
  supportsCapability(cap: ProviderCapability): boolean;
  
  // Costs
  estimateCost(request: CompletionRequest): CostEstimate;
  getUsage(): UsageStats;
}

export interface ProviderManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: 'provider';
  readonly category: 'local' | 'cloud' | 'hybrid';
  readonly models: ModelManifest[];
  readonly auth: AuthManifest;
  readonly capabilities: ProviderCapability[];
  readonly pricing?: PricingManifest;
}
```

---

## Provider Categories

| Category | Examples | Characteristics |
|----------|----------|-----------------|
| **cloud** | OpenAI, Anthropic, Google, Azure | API-based, requires auth, pay-per-token |
| **local** | Ollama, llama.cpp, LM Studio | Runs locally, free, limited by hardware |
| **hybrid** | Custom gateway | Mix of cloud and local |

---

## Built-in Providers

### OpenAI

```json
{
  "id": "openai",
  "name": "OpenAI",
  "version": "1.0.0",
  "type": "provider",
  "category": "cloud",
  "models": [
    { "id": "gpt-4o", "name": "GPT-4o", "contextWindow": 128000, "maxOutputTokens": 16384, "capabilities": ["chat", "vision", "function-calling", "streaming", "json-mode", "parallel-tools", "structured-output"] },
    { "id": "gpt-4o-mini", "name": "GPT-4o Mini", "contextWindow": 128000, "maxOutputTokens": 16384, "capabilities": ["chat", "vision", "function-calling", "streaming", "json-mode", "parallel-tools"] },
    { "id": "o1-preview", "name": "o1 Preview", "contextWindow": 128000, "maxOutputTokens": 32768, "capabilities": ["chat", "reasoning", "streaming"] },
    { "id": "text-embedding-3-large", "name": "Embedding 3 Large", "contextWindow": 8192, "maxOutputTokens": 0, "capabilities": ["embedding"] }
  ],
  "auth": { "type": "api-key", "fields": [{ "name": "apiKey", "label": "API Key", "type": "password", "required": true }], "refreshable": false },
  "capabilities": ["chat", "completion", "embedding", "vision", "function-calling", "reasoning", "streaming", "json-mode", "parallel-tools", "structured-output", "batch"],
  "pricing": { "gpt-4o": { "input": 2.50, "output": 10.00, "unit": "per_1m_tokens" } }
}
```

### Anthropic

```json
{
  "id": "anthropic",
  "name": "Anthropic",
  "version": "1.0.0",
  "type": "provider",
  "category": "cloud",
  "models": [
    { "id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "contextWindow": 200000, "maxOutputTokens": 8192, "capabilities": ["chat", "vision", "function-calling", "streaming", "json-mode"] }
  ],
  "auth": { "type": "api-key", "fields": [{ "name": "apiKey", "label": "API Key", "type": "password", "required": true }], "refreshable": false },
  "capabilities": ["chat", "completion", "vision", "function-calling", "streaming", "json-mode"]
}
```

### Local (Ollama)

```json
{
  "id": "local",
  "name": "Local Models (Ollama)",
  "version": "1.0.0",
  "type": "provider",
  "category": "local",
  "models": [],
  "auth": { "type": "none", "fields": [], "refreshable": false },
  "capabilities": ["chat", "completion", "embedding", "streaming"],
  "settings": {
    "baseUrl": { "type": "string", "default": "http://localhost:11434", "description": "Ollama API base URL" },
    "autoDiscover": { "type": "boolean", "default": true, "description": "Auto-discover models on startup" }
  }
}
```

---

## Authentication Types

| Type | Fields | Refreshable | Examples |
|------|--------|-------------|----------|
| `api-key` | `apiKey` (password) | No | OpenAI, Anthropic |
| `oauth` | `clientId`, `clientSecret`, `redirectUri` | Yes | Google, Azure |
| `bearer` | `token` (password) | Yes | Custom APIs |
| `none` | (none) | No | Local models |
| `file` | `path` (file) | No | Local model files |

---

## Request/Response

```typescript
// packages/sdk/src/types/provider.ts
export interface CompletionRequest {
  readonly model: string;
  readonly messages: Message[];
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly topP?: number;
  readonly tools?: ToolDefinition[];
  readonly toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  readonly jsonMode?: boolean;
  readonly seed?: number;
}

export interface Message {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string | MessageContent[];
  readonly name?: string;
  readonly toolCalls?: ToolCall[];
  readonly toolCallId?: string;
}

export interface CompletionResponse {
  readonly id: string;
  readonly model: string;
  readonly choices: Choice[];
  readonly usage: Usage;
  readonly created: number;
}

export interface CompletionChunk {
  readonly id: string;
  readonly model: string;
  readonly choices: ChunkChoice[];
  readonly usage?: Usage;
}

export interface CostEstimate {
  readonly estimated: boolean;
  readonly inputCost: number;
  readonly outputCost: number;
  readonly totalCost: number;
  readonly currency: string;
  readonly note?: string;
}
```

---

## Provider Manager

```typescript
// packages/sdk/src/managers/provider-manager.ts
export interface ProviderManager {
  readonly registry: ProviderRegistry;
  
  getProvider(providerId: string): Provider | undefined;
  getModel(modelId: string): Model | undefined;
  getAllModels(): Model[];
  
  routeRequest(request: RouteRequest): Promise<RouteResult>;
  streamCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk>;
  
  // Cost management
  estimateCost(request: CompletionRequest): CostEstimate;
  getUsageStats(providerId?: string): UsageStats;
}
```

---

## Testing

```typescript
// packages/providers/tests/provider.test.ts
describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockClient: MockOpenAIClient;

  beforeEach(() => {
    mockClient = createMockOpenAIClient();
    provider = new OpenAIProvider();
    provider.setClient(mockClient);
  });

  it('authenticates with valid key', async () => {
    mockClient.models.list.mockResolvedValue({ data: [] });
    const result = await provider.authenticate({ apiKey: 'sk-test' });
    expect(result.success).toBe(true);
  });

  it('completes chat request', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      id: 'chat-1',
      model: 'gpt-4o',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });

    const response = await provider.complete({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(response.choices[0].message.content).toBe('Hello!');
  });

  it('streams chunks', async () => {
    mockClient.chat.completions.create.mockImplementation(async function* () {
      yield { choices: [{ delta: { content: 'Hel' } }] };
      yield { choices: [{ delta: { content: 'lo' } }] };
    });

    const chunks: CompletionChunk[] = [];
    for await (const chunk of provider.streamComplete({ model: 'gpt-4o', messages: [] })) {
      chunks.push(chunk);
    }
    expect(chunks).toHaveLength(2);
  });

  it('estimates cost', async () => {
    const estimate = provider.estimateCost({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello world' }],
      maxTokens: 100,
    });
    expect(estimate.estimated).toBe(true);
    expect(estimate.totalCost).toBeGreaterThan(0);
  });
});
```