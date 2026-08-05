import { describe, it, expect } from 'bun:test';
import { MatchEngine } from './match-engine';
import type { GameBridge } from '@ai-game-arena/controller';
import type {
  ArenaPlugin,
  AgentConfig,
  DomainEvent,
  BridgeAction,
  BridgeCapabilities,
  BridgeConfig,
  BridgeEvent,
  BridgeGameState,
  BridgeObservation,
  Controller,
} from '@ai-game-arena/sdk';

function createTestArena(): ArenaPlugin {
  return {
    config: {
      id: 'test-arena',
      name: 'Test Arena',
      description: 'Test',
      version: '1.0.0',
      minPlayers: 2,
      maxPlayers: 2,
    },
    initialize(_seed?: number, agentIds?: string[]) {
      return {
        turn: 0,
        phase: 'running',
        data: {
          agents: agentIds ?? [],
          scores: {},
          turn: 0,
        },
      };
    },
    validateAction() {
      return { valid: true };
    },
    executeAction(_action, state) {
      return { success: true, events: [], state: state.data };
    },
    getObservation(agentId) {
      return {
        timestamp: Date.now(),
        agentId,
        type: 'board-state',
        data: { content: {}, format: 'json' },
        metadata: { turnNumber: 0, gameState: 'running', availableActions: ['test_action'] },
      };
    },
    checkWinCondition() {
      return null;
    },
    getScores() {
      return {};
    },
    getRenderState() {
      return { type: 'test', data: {} };
    },
  };
}

function createNoopLogger() {
  const noop = () => {};
  return {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => createNoopLogger(),
  };
}

function createAgents(): AgentConfig[] {
  return [
    { id: 'agent-1', name: 'Agent 1', strategy: 'custom' },
    { id: 'agent-2', name: 'Agent 2', strategy: 'custom' },
  ];
}

describe('MatchEngine', () => {
  it('uses provided battleId for all events', async () => {
    const events: DomainEvent[] = [];
    const eventBus = {
      async publish(event: DomainEvent) {
        events.push(event);
      },
      subscribe() { return { id: '1', unsubscribe() {} }; },
      subscribeAll() {},
      unsubscribe() {},
    };

    const engine = new MatchEngine(createTestArena(), createAgents(), {
      maxTurns: 1,
      turnTimeout: 5000,
      seed: 42,
    }, {
      logger: createNoopLogger() as never,
      eventBus,
      battleId: 'my-battle-123',
    });

    await engine.start();

    for (const event of events) {
      expect(event.aggregateId).toBe('my-battle-123');
      expect(event.metadata.correlationId).toBe('my-battle-123');
    }
  });

  it('registers arena tools on controller', async () => {
    const engine = new MatchEngine(createTestArena(), createAgents(), {
      maxTurns: 1,
      turnTimeout: 5000,
      seed: 42,
    }, {
      logger: createNoopLogger() as never,
    });

    await engine.start();

    for (const agent of createAgents()) {
      const sandbox = engine.getSandbox(agent.id);
      expect(sandbox).toBeDefined();
    }
  });

  it('initializes world with agent IDs', async () => {
    let receivedAgentIds: string[] = [];
    const arena = {
      ...createTestArena(),
      initialize(_seed?: number, agentIds?: string[]) {
        receivedAgentIds = agentIds ?? [];
        return {
          turn: 0,
          phase: 'running',
          data: { agents: agentIds ?? [], turn: 0, scores: {} },
        };
      },
    };

    const engine = new MatchEngine(arena, createAgents(), {
      maxTurns: 0,
      turnTimeout: 5000,
      seed: 42,
    }, {
      logger: createNoopLogger() as never,
    });

    await engine.start();

    expect(receivedAgentIds).toEqual(['agent-1', 'agent-2']);
  });

  it('drives the game exclusively through the bridge (GAME_ENGINE.md)', async () => {
    const calls: string[] = [];
    const observed: string[] = [];
    const applied: Array<{ playerId: string; actions: BridgeAction[] }> = [];
    const captured = { config: null as BridgeConfig | null };

    const bridge: GameBridge = {
      platform: 'html',
      capabilities: {
        keyboard: true,
        mouse: true,
        gamepad: false,
        touch: false,
        screenshot: true,
        structuredState: true,
        audio: false,
      } satisfies BridgeCapabilities,
      registerTools(_controller: Controller): void {
        calls.push('registerTools');
      },
      async initialize(config: BridgeConfig): Promise<void> {
        captured.config = config;
        calls.push('initialize');
      },
      async reset(): Promise<void> {
        calls.push('reset');
      },
      async pause(): Promise<void> {
        calls.push('pause');
      },
      async resume(): Promise<void> {
        calls.push('resume');
      },
      async dispose(): Promise<void> {
        calls.push('dispose');
      },
      async applyActions(playerId: string, actions: BridgeAction[]): Promise<void> {
        applied.push({ playerId, actions });
        calls.push('applyActions');
      },
      async observe(playerId: string): Promise<BridgeObservation> {
        observed.push(playerId);
        calls.push('observe');
        return { timestamp: Date.now(), data: { frame: observed.length } };
      },
      async getState(): Promise<BridgeGameState> {
        calls.push('getState');
        return { phase: 'running', running: true };
      },
      onEvent(handler: (event: BridgeEvent) => void): void {
        handler({ type: 'goal', timestamp: Date.now(), data: { player: 'agent-1' } });
      },
    };

    const domainEvents: DomainEvent[] = [];
    const eventBus = {
      async publish(event: DomainEvent) {
        domainEvents.push(event);
      },
      subscribe() { return { id: '1', unsubscribe() {} }; },
      subscribeAll() {},
      unsubscribe() {},
    };

    const engine = new MatchEngine(createTestArena(), createAgents(), {
      maxTurns: 1,
      turnTimeout: 5000,
      seed: 42,
    }, {
      logger: createNoopLogger() as never,
      eventBus,
      battleId: 'bridge-battle',
      adapterFactory: () => bridge,
    });

    await engine.start();

    expect(captured.config).toEqual({
      agentNames: { "agent-1": "Agent 1", "agent-2": "Agent 2" },
      id: 'test-arena',
      seed: 42,
      agentIds: ['agent-1', 'agent-2'],
    });
    expect(calls).toContain('initialize');
    expect(calls).toContain('registerTools');
    expect(observed).toContain('agent-1');
    expect(observed).toContain('agent-2');
    expect(calls).toContain('getState');

    // Agents have no LLM provider in this test, so no actions are applied.
    expect(applied).toEqual([]);

    // Bridge events are forwarded to the engine's event bus.
    expect(domainEvents.some((e) => (e as { type: string }).type === 'BridgeEvent')).toBe(true);

    // The render state comes from the latest bridge observation.
    const renderState = engine.getBridgeRenderState();
    expect(renderState?.type).toBe('html');
    expect(renderState?.data).toEqual({ frame: 2 });
  });
});
