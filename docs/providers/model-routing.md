# Model Routing

> Intelligent routing of LLM requests to optimal providers/models based on capabilities, cost, latency, and availability.

---

## Overview

The Model Router sits between the Agent Runtime and Provider implementations, making routing decisions based on configurable rules.

```
Agent Runtime
     │
     ▼
┌─────────────────────────────────────────┐
│           MODEL ROUTER                  │
│  ┌─────────────────────────────────┐    │
│  │ Routing Rules (priority sorted) │    │
│  │  1. Local preferred             │    │
│  │  2. Reasoning tasks → o1        │    │
│  │  3. Vision tasks → GPT-4o       │    │
│  │  4. Cost optimized → 4o-mini    │    │
│  │  5. High context → Claude       │    │
│  │  6. Default → GPT-4o            │    │
│  └─────────────────────────────────┘    │
│                   │                     │
│                   ▼                     │
│  ┌─────────────────────────────────┐    │
│  │ Availability & Health Checks    │    │
│  │  - Provider reachable           │    │
│  │  - Model loaded                 │    │
│  │  - Latency acceptable           │    │
│  │  - Cost within budget           │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
     │
     ▼
Selected Provider + Model
```

---

## Routing Configuration

### Routing Rules

```typescript
// packages/providers/src/router/types.ts
export interface RoutingRule {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly providerId: string;
  readonly modelId: string | '*'; // '*' = any model from provider
  readonly priority: number; // Higher = tried first
  readonly enabled: boolean;
  readonly pattern?: string; // Regex pattern for model matching
  readonly conditions: RoutingCondition[];
  readonly fallback?: string; // Model ID to try if primary fails
  readonly fallbackChain?: string[]; // Multiple fallbacks
  readonly metadata?: Record<string, unknown>;
}

export interface RoutingCondition {
  readonly field: RoutingField;
  readonly operator: RoutingOperator;
  readonly value: RoutingValue;
}

export type RoutingField = 
  | 'model'                    // Requested model
  | 'requiredCapabilities'     // Capabilities agent needs
  | 'maxCost'                  // Max cost per request (USD)
  | 'maxLatency'               // Max latency (ms)
  | 'minContextWindow'         // Min context window (tokens)
  | 'preferLocal'              // Prefer local models (boolean)
  | 'agentId'                  // Specific agent
  | 'agentStrategy'            // Agent strategy type
  | 'battleType'               // Battle type
  | 'timeOfDay'                // Time-based routing
  | 'providerHealth'           // Provider health score
  | 'custom';                  // Custom field from request metadata

export type RoutingOperator = 
  | '==' | '!=' | '>' | '>=' | '<' | '<='
  | 'in' | 'not_in'           // Array membership
  | 'contains' | 'not_contains' // String/array contains
  | 'matches' | 'not_matches';   // Regex

export type RoutingValue = string | number | boolean | string[] | RegExp;
```

### Request Context

```typescript
export interface RoutingRequest {
  // Explicit preferences
  readonly model?: string;
  readonly providerId?: string;
  
  // Capability requirements
  readonly requiredCapabilities?: ProviderCapability[];
  readonly optionalCapabilities?: ProviderCapability[];
  
  // Constraints
  readonly maxCost?: number;           // USD per request
  readonly maxLatency?: number;        // ms
  readonly minContextWindow?: number;  // tokens
  
  // Preferences
  readonly preferLocal?: boolean;
  readonly preferFastest?: boolean;
  readonly preferCheapest?: boolean;
  readonly preferMostCapable?: boolean;
  
  // Context
  readonly agentId?: AgentId;
  readonly agentStrategy?: string;
  readonly battleId?: BattleId;
  readonly battleType?: string;
  
  // Metadata for custom conditions
  readonly metadata?: Record<string, unknown>;
}

export interface RouteResult {
  readonly providerId: string;
  readonly modelId: string;
  readonly ruleId: string;
  readonly confidence: number; // 0-1
  readonly fallbackUsed: boolean;
  readonly estimatedCost: CostEstimate;
  readonly estimatedLatency: number; // ms
}
```

---

## Routing Algorithm

```typescript
// packages/providers/src/router/router.ts
export class ModelRouter {
  private rules: RoutingRule[] = [];
  private providerManager: ProviderManager;
  private healthMonitor: ProviderHealthMonitor;
  private costTracker: CostTracker;

  constructor(
    providerManager: ProviderManager,
    healthMonitor: ProviderHealthMonitor,
    costTracker: CostTracker
  ) {
    this.providerManager = providerManager;
    this.healthMonitor = healthMonitor;
    this.costTracker = costTracker;
  }

  addRule(rule: RoutingRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  async route(request: RoutingRequest): Promise<RouteResult> {
    // 1. Filter enabled rules
    const enabledRules = this.rules.filter(r => r.enabled);
    
    // 2. Find matching rules
    const matchingRules = enabledRules.filter(rule => this.matchesRule(rule, request));
    
    if (matchingRules.length === 0) {
      return this.defaultRoute(request);
    }

    // 3. Try rules in priority order
    for (const rule of matchingRules) {
      const result = await this.tryRule(rule, request);
      if (result) return result;
    }

    // 4. Fallback to default
    return this.defaultRoute(request);
  }

  private matchesRule(rule: RoutingRule, request: RoutingRequest): boolean {
    // Check pattern match
    if (rule.pattern && request.model) {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(request.model)) return false;
    }

    // Check all conditions
    for (const condition of rule.conditions) {
      if (!this.checkCondition(condition, request)) return false;
    }

    return true;
  }

  private checkCondition(condition: RoutingCondition, request: RoutingRequest): boolean {
    const fieldValue = this.getFieldValue(request, condition.field);
    if (fieldValue === undefined) return false;

    return this.evaluateOperator(fieldValue, condition.operator, condition.value);
  }

  private getFieldValue(request: RoutingRequest, field: RoutingField): unknown {
    switch (field) {
      case 'model': return request.model;
      case 'requiredCapabilities': return request.requiredCapabilities;
      case 'maxCost': return request.maxCost;
      case 'maxLatency': return request.maxLatency;
      case 'minContextWindow': return request.minContextWindow;
      case 'preferLocal': return request.preferLocal;
      case 'agentId': return request.agentId;
      case 'agentStrategy': return request.agentStrategy;
      case 'battleType': return request.battleType;
      case 'timeOfDay': return new Date().getHours();
      case 'providerHealth': return request.providerId ? 
        this.healthMonitor.getHealth(request.providerId) : undefined;
      case 'custom': return request.metadata?.[field];
      default: return undefined;
    }
  }

  private evaluateOperator(actual: unknown, operator: RoutingOperator, expected: RoutingValue): boolean {
    const actualArray = Array.isArray(actual) ? actual : [actual];
    const expectedArray = Array.isArray(expected) ? expected : [expected];

    switch (operator) {
      case '==': return actual === expected;
      case '!=': return actual !== expected;
      case '>': return Number(actual) > Number(expected);
      case '>=': return Number(actual) >= Number(expected);
      case '<': return Number(actual) < Number(expected);
      case '<=': return Number(actual) <= Number(expected);
      case 'in': return expectedArray.some(e => actualArray.includes(e));
      case 'not_in': return !expectedArray.some(e => actualArray.includes(e));
      case 'contains': return actualArray.some(a => 
        typeof a === 'string' && typeof expected === 'string' && a.includes(expected)
      );
      case 'not_contains': return !actualArray.some(a => 
        typeof a === 'string' && typeof expected === 'string' && a.includes(expected)
      );
      case 'matches': return expected instanceof RegExp ? expected.test(String(actual)) : false;
      case 'not_matches': return expected instanceof RegExp ? !expected.test(String(actual)) : false;
      default: return false;
    }
  }

  private async tryRule(rule: RoutingRule, request: RoutingRequest): Promise<RouteResult | null> {
    const provider = this.providerManager.getProvider(rule.providerId);
    if (!provider) return null;

    // Resolve model ID
    const modelId = rule.modelId === '*' ? 
      this.selectBestModel(provider, request) : 
      rule.modelId;

    if (!modelId || !provider.supportsModel(modelId)) {
      // Try fallback
      if (rule.fallback) {
        return this.tryFallback(rule, request, rule.fallback);
      }
      return null;
    }

    // Check provider health
    const health = await this.healthMonitor.getHealth(rule.providerId);
    if (health.status === 'unhealthy') {
      if (rule.fallback) return this.tryFallback(rule, request, rule.fallback);
      return null;
    }

    // Check cost constraint
    if (request.maxCost) {
      const estimate = provider.estimateCost({ ...request, model: modelId } as CompletionRequest);
      if (estimate.estimated && estimate.totalCost > request.maxCost) {
        if (rule.fallback) return this.tryFallback(rule, request, rule.fallback);
        return null;
      }
    }

    // Check latency constraint
    if (request.maxLatency) {
      const latency = await this.healthMonitor.getLatency(rule.providerId, modelId);
      if (latency > request.maxLatency) {
        if (rule.fallback) return this.tryFallback(rule, request, rule.fallback);
        return null;
      }
    }

    return {
      providerId: rule.providerId,
      modelId,
      ruleId: rule.id,
      confidence: this.calculateConfidence(rule, request),
      fallbackUsed: false,
      estimatedCost: provider.estimateCost({ ...request, model: modelId } as CompletionRequest),
      estimatedLatency: await this.healthMonitor.getLatency(rule.providerId, modelId),
    };
  }

  private async tryFallback(rule: RoutingRule, request: RoutingRequest, fallbackModel: string): Promise<RouteResult | null> {
    const provider = this.providerManager.getProvider(rule.providerId);
    if (!provider?.supportsModel(fallbackModel)) return null;

    return {
      providerId: rule.providerId,
      modelId: fallbackModel,
      ruleId: rule.id,
      confidence: 0.5,
      fallbackUsed: true,
      estimatedCost: provider.estimateCost({ ...request, model: fallbackModel } as CompletionRequest),
      estimatedLatency: await this.healthMonitor.getLatency(rule.providerId, fallbackModel),
    };
  }

  private selectBestModel(provider: Provider, request: RoutingRequest): string | null {
    const models = provider.getModels()
      .filter(m => this.modelMatchesCapabilities(m, request.requiredCapabilities))
      .sort((a, b) => {
        // Prefer based on request preferences
        if (request.preferCheapest) return this.compareCost(a, b);
        if (request.preferFastest) return this.compareLatency(a, b);
        if (request.preferMostCapable) return this.compareCapabilities(a, b);
        return 0;
      });
    
    return models[0]?.id || null;
  }

  private defaultRoute(request: RoutingRequest): RouteResult {
    // Last resort: first available provider with any model
    for (const provider of this.providerManager.getAllProviders()) {
      const models = provider.getModels();
      if (models.length > 0) {
        return {
          providerId: provider.manifest.id,
          modelId: models[0].id,
          ruleId: 'default',
          confidence: 0.1,
          fallbackUsed: true,
          estimatedCost: provider.estimateCost({ ...request, model: models[0].id } as CompletionRequest),
          estimatedLatency: 5000,
        };
      }
    }
    throw new Error('No providers available');
  }
}
```

---

## Health Monitoring

```typescript
// packages/providers/src/health/health-monitor.ts
export class ProviderHealthMonitor {
  private health = new Map<string, ProviderHealth>();
  private latencies = new Map<string, Map<string, number>>(); // providerId -> modelId -> latency
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private providerManager: ProviderManager,
    private config: HealthMonitorConfig
  ) {}

  start(): void {
    this.checkInterval = setInterval(() => this.checkAllProviders(), this.config.checkInterval);
  }

  stop(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }

  private async checkAllProviders(): Promise<void> {
    for (const provider of this.providerManager.getAllProviders()) {
      await this.checkProvider(provider);
    }
  }

  private async checkProvider(provider: Provider): Promise<void> {
    const providerId = provider.manifest.id;
    const start = Date.now();
    
    try {
      // Quick health check with minimal request
      await provider.complete({
        model: provider.getModels()[0]?.id || '',
        messages: [{ role: 'user', content: 'health check' }],
        maxTokens: 1,
      });
      
      const latency = Date.now() - start;
      this.updateHealth(providerId, { status: 'healthy', latency, lastCheck: new Date() });
      this.updateLatency(providerId, provider.getModels()[0]?.id || '', latency);
      
    } catch (error) {
      this.updateHealth(providerId, { 
        status: 'unhealthy', 
        latency: -1, 
        lastCheck: new Date(), 
        error: error.message 
      });
    }
  }

  getHealth(providerId: string): ProviderHealth {
    return this.health.get(providerId) || { status: 'unknown', latency: -1, lastCheck: new Date() };
  }

  getLatency(providerId: string, modelId: string): number {
    return this.latencies.get(providerId)?.get(modelId) || 5000; // Default 5s
  }

  getAllHealth(): Map<string, ProviderHealth> {
    return new Map(this.health);
  }
}

export interface ProviderHealth {
  readonly status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  readonly latency: number;
  readonly lastCheck: Date;
  readonly error?: string;
  readonly uptime: number;
  readonly successRate: number;
}

export interface HealthMonitorConfig {
  readonly checkInterval: number; // ms
  readonly timeout: number;       // ms per check
  readonly unhealthyThreshold: number; // consecutive failures
  readonly degradedLatencyMs: number;
}
```

---

## Cost-Aware Routing

```typescript
// packages/providers/src/router/cost-aware.ts
export class CostAwareRouter {
  constructor(
    private router: ModelRouter,
    private costTracker: CostTracker,
    private budgetManager: BudgetManager
  ) {}

  async routeWithBudget(request: RoutingRequest, agentId: AgentId): Promise<RouteResult> {
    // Check agent budget
    const budgetStatus = await this.budgetManager.getStatus(agentId);
    
    if (budgetStatus.exhausted) {
      // Budget exhausted - use free local only
      return this.routeLocalOnly(request);
    }

    if (budgetStatus.alert) {
      // Near budget - prefer cheaper models
      request = { ...request, preferCheapest: true, maxCost: budgetStatus.remaining * 0.1 };
    }

    // Add cost constraint to request
    const maxCost = budgetStatus.remaining / budgetStatus.estimatedRequestsRemaining;
    request = { ...request, maxCost: Math.min(request.maxCost || Infinity, maxCost) };

    return this.router.route(request);
  }

  private async routeLocalOnly(request: RoutingRequest): Promise<RouteResult> {
    const localProvider = this.router['providerManager'].getProvider('local');
    if (!localProvider) throw new Error('No local provider available');
    
    const model = localProvider.getModels()[0]?.id;
    if (!model) throw new Error('No local models available');

    return {
      providerId: 'local',
      modelId: model,
      ruleId: 'budget-exhausted-local-only',
      confidence: 1.0,
      fallbackUsed: true,
      estimatedCost: { estimated: true, inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' },
      estimatedLatency: 2000,
    };
  }
}
```

---

## Load Balancing

```typescript
// packages/providers/src/router/load-balancer.ts
export class LoadBalancer {
  private requestCounts = new Map<string, number>();
  private errorCounts = new Map<string, number>();

  selectProvider(
    candidates: Array<{ providerId: string; modelId: string; weight: number }>
  ): { providerId: string; modelId: string } | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Weighted random with health adjustment
    const adjusted = candidates.map(c => ({
      ...c,
      effectiveWeight: c.weight * this.getHealthFactor(c.providerId) * this.getLoadFactor(c.providerId),
    }));

    const totalWeight = adjusted.reduce((sum, c) => sum + c.effectiveWeight, 0);
    let random = Math.random() * totalWeight;

    for (const candidate of adjusted) {
      random -= candidate.effectiveWeight;
      if (random <= 0) {
        this.incrementRequest(candidate.providerId);
        return { providerId: candidate.providerId, modelId: candidate.modelId };
      }
    }

    return candidates[0];
  }

  private getHealthFactor(providerId: string): number {
    const errors = this.errorCounts.get(providerId) || 0;
    const requests = this.requestCounts.get(providerId) || 1;
    const errorRate = errors / requests;
    return Math.max(0.1, 1 - errorRate * 2); // Reduce weight with errors
  }

  private getLoadFactor(providerId: string): number {
    const requests = this.requestCounts.get(providerId) || 0;
    // Prefer less loaded providers
    return 1 / (1 + requests * 0.01);
  }

  recordSuccess(providerId: string): void {
    this.incrementRequest(providerId);
  }

  recordError(providerId: string): void {
    this.errorCounts.set(providerId, (this.errorCounts.get(providerId) || 0) + 1);
    this.incrementRequest(providerId);
  }

  private incrementRequest(providerId: string): void {
    this.requestCounts.set(providerId, (this.requestCounts.get(providerId) || 0) + 1);
  }
}
```

---

## Configuration File

```json
// config/routing.json
{
  "rules": [
    {
      "id": "local-first",
      "name": "Prefer local models",
      "providerId": "local",
      "modelId": "*",
      "priority": 100,
      "enabled": true,
      "conditions": [
        { "field": "preferLocal", "operator": "==", "value": true }
      ]
    },
    {
      "id": "reasoning-o1",
      "name": "Use o1 for reasoning",
      "providerId": "openai",
      "modelId": "o1-preview",
      "priority": 90,
      "enabled": true,
      "conditions": [
        { "field": "requiredCapabilities", "operator": "contains", "value": "reasoning" }
      ],
      "fallback": "gpt-4o"
    },
    {
      "id": "vision-gpt4o",
      "name": "Use GPT-4o for vision",
      "providerId": "openai",
      "modelId": "gpt-4o",
      "priority": 85,
      "enabled": true,
      "conditions": [
        { "field": "requiredCapabilities", "operator": "contains", "value": "vision" }
      ],
      "fallback": "claude-3-5-sonnet-20241022"
    },
    {
      "id": "cost-optimized",
      "name": "Use cheapest for simple tasks",
      "providerId": "openai",
      "modelId": "gpt-4o-mini",
      "priority": 50,
      "enabled": true,
      "conditions": [
        { "field": "maxCost", "operator": "<", "value": 0.005 }
      ],
      "fallback": "gpt-3.5-turbo"
    },
    {
      "id": "high-context-claude",
      "name": "Use Claude for large context",
      "providerId": "anthropic",
      "modelId": "claude-3-5-sonnet-20241022",
      "priority": 40,
      "enabled": true,
      "conditions": [
        { "field": "minContextWindow", "operator": ">", "value": 100000 }
      ]
    },
    {
      "id": "default-gpt4o",
      "name": "Default to GPT-4o",
      "providerId": "openai",
      "modelId": "gpt-4o",
      "priority": 10,
      "enabled": true
    }
  ],
  "healthMonitor": {
    "checkInterval": 30000,
    "timeout": 5000,
    "unhealthyThreshold": 3,
    "degradedLatencyMs": 10000
  },
  "loadBalancing": {
    "enabled": true,
    "strategy": "weighted-health"
  },
  "costTracking": {
    "enabled": true,
    "dailyBudgetDefault": 10.0,
    "alertThreshold": 0.8
  }
}
```

---

## Testing Routing

```typescript
// packages/providers/tests/router.test.ts
describe('ModelRouter', () => {
  let router: ModelRouter;
  let mockProviders: Map<string, MockProvider>;

  beforeEach(() => {
    mockProviders = new Map();
    router = new ModelRouter(
      createMockProviderManager(mockProviders),
      createMockHealthMonitor(),
      createMockCostTracker()
    );
    
    // Add default rules
    DEFAULT_ROUTING_RULES.forEach(r => router.addRule(r));
  });

  it('routes reasoning tasks to o1', async () => {
    const result = await router.route({
      requiredCapabilities: ['reasoning'],
      preferLocal: false,
    });

    expect(result.providerId).toBe('openai');
    expect(result.modelId).toBe('o1-preview');
    expect(result.ruleId).toBe('reasoning-tasks');
  });

  it('routes vision tasks to GPT-4o', async () => {
    const result = await router.route({
      requiredCapabilities: ['vision'],
    });

    expect(result.providerId).toBe('openai');
    expect(result.modelId).toBe('gpt-4o');
  });

  it('prefers local when requested', async () => {
    mockProviders.set('local', createMockLocalProvider());
    
    const result = await router.route({
      requiredCapabilities: ['chat'],
      preferLocal: true,
    });

    expect(result.providerId).toBe('local');
  });

  it('falls back when primary unavailable', async () => {
    mockProviders.get('openai')!.setHealthy(false);
    
    const result = await router.route({
      requiredCapabilities: ['reasoning'],
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.modelId).toBe('gpt-4o'); // fallback
  });

  it('respects cost constraints', async () => {
    const result = await router.route({
      requiredCapabilities: ['chat'],
      maxCost: 0.001, // Very low budget
    });

    expect(result.estimatedCost.totalCost).toBeLessThanOrEqual(0.001);
  });

  it('respects latency constraints', async () => {
    const result = await router.route({
      requiredCapabilities: ['chat'],
      maxLatency: 1000, // 1 second
    });

    expect(result.estimatedLatency).toBeLessThanOrEqual(1000);
  });
});
```