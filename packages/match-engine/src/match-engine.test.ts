import { describe, it, expect } from 'bun:test';
import { MatchEngine } from './match-engine';
import type { ArenaPlugin, AgentConfig, DomainEvent } from '@ai-game-arena/sdk';

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
});
