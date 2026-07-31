import { describe, it, expect } from 'bun:test';
import { AgentRuntime } from './agent-runtime';
import { Controller } from '@ai-game-arena/controller';
import type { LLMProvider, LLMResponse } from './providers/llm-provider';
import type { AgentConfig, Observation } from '@ai-game-arena/sdk';

const noop = () => {};
const logger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => logger,
};

const agent: AgentConfig = { id: 'a1', name: 'A1', strategy: 'balanced' };

const observation: Observation = {
  timestamp: Date.now(),
  agentId: 'a1',
  type: 'board-state',
  data: { content: { text: 'board' }, format: 'json' },
  metadata: { turnNumber: 0, gameState: 'running', availableActions: ['move', 'attack', 'pass'] },
};

/** Provider that returns scripted tool calls, recording each decide() call. */
class ScriptedProvider implements LLMProvider {
  readonly name = 'mock';
  readonly type = 'mock';
  calls: number;
  constructor(private script: Array<LLMResponse>) {
    this.calls = 0;
  }
  async decide(): Promise<LLMResponse> {
    const step = this.script[Math.min(this.calls, this.script.length - 1)]!;
    this.calls += 1;
    return step;
  }
  async shutdown(): Promise<void> {}
}

function makeController(): Controller {
  const controller = new Controller();
  controller.registerTool(
    'scan',
    'Free look',
    { type: 'object', properties: {} },
    async () => ({ content: [{ type: 'text', text: 'BOARD: you are at (0,0)' }] }),
  );
  controller.registerTool(
    'move',
    'Move your tank in a direction',
    {
      type: 'object',
      properties: { direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] } },
      required: ['direction'],
    },
    async () => ({ content: [{ type: 'text', text: 'Moved' }] }),
  );
  return controller;
}

describe('AgentRuntime decide() — scan is a free look, then play', () => {
  it('scan then move in the same turn: scan feeds the board, move is the action', async () => {
    const provider = new ScriptedProvider([
      {
        content: '',
        toolCalls: [{ name: 'scan', parameters: { x: 7, y: 7 } }],
      },
      {
        content: '',
        toolCalls: [{ name: 'move', parameters: { direction: 'right' } }],
      },
    ]);

    const runtime = new AgentRuntime({ logger: logger as never, provider });
    await runtime.initialize(agent);
    await runtime.connectToController(makeController());
    await runtime.observe(observation);

    const action = await runtime.decide();

    // Two LLM rounds: first scanned (look), then took the real action.
    expect(provider.calls).toBe(2);
    expect(action).toMatchObject({ agentId: 'a1', type: 'move', parameters: { direction: 'right' } });
  });

  it('scan + move in a single response: both executed, move returned', async () => {
    const provider = new ScriptedProvider([
      {
        content: '',
        toolCalls: [
          { name: 'scan', parameters: { x: 0, y: 0 } },
          { name: 'attack', parameters: { targetX: 7, targetY: 7 } },
        ],
      },
    ]);

    const runtime = new AgentRuntime({ logger: logger as never, provider });
    await runtime.initialize(agent);
    await runtime.connectToController(makeController());
    await runtime.observe(observation);

    const action = await runtime.decide();

    expect(provider.calls).toBe(1);
    expect(action).toMatchObject({ agentId: 'a1', type: 'attack', parameters: { targetX: 7, targetY: 7 } });
  });

  it('direct move (no scan) works with a single round', async () => {
    const provider = new ScriptedProvider([
      { content: '', toolCalls: [{ name: 'move', parameters: { direction: 'up' } }] },
    ]);

    const runtime = new AgentRuntime({ logger: logger as never, provider });
    await runtime.initialize(agent);
    await runtime.connectToController(makeController());
    await runtime.observe(observation);

    const action = await runtime.decide();
    expect(provider.calls).toBe(1);
    expect(action).toMatchObject({ type: 'move', parameters: { direction: 'up' } });
  });

  it('caps endless scanning and falls back to pass', async () => {
    const provider = new ScriptedProvider([
      { content: '', toolCalls: [{ name: 'scan', parameters: {} }] },
    ]);

    const runtime = new AgentRuntime({ logger: logger as never, provider, maxLookTurns: 3 });
    await runtime.initialize(agent);
    await runtime.connectToController(makeController());
    await runtime.observe(observation);

    const action = await runtime.decide();
    expect(provider.calls).toBe(3);
    expect(action).toMatchObject({ type: 'pass', parameters: {} });
  });

  it('no tool calls → pass', async () => {
    const provider = new ScriptedProvider([{ content: 'thinking out loud' }]);

    const runtime = new AgentRuntime({ logger: logger as never, provider });
    await runtime.initialize(agent);
    await runtime.connectToController(makeController());
    await runtime.observe(observation);

    const action = await runtime.decide();
    expect(provider.calls).toBe(1);
    expect(action).toMatchObject({ type: 'pass', parameters: {} });
  });
});
