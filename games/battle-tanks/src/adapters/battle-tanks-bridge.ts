import { HTMLBridge } from '@ai-game-arena/controller';
import type { GameBridge } from '@ai-game-arena/controller';
import type {
  BridgeAction,
  BridgeCapabilities,
  BridgeConfig,
  BridgeEvent,
  BridgeGameState,
  BridgeObservation,
  Controller,
} from '@ai-game-arena/sdk';
import { BattleTanksHost } from './battle-tanks-host';

/**
 * Battle Tanks bridge.
 *
 * The engine never talks to the game implementation directly; it drives the
 * game exclusively through this bridge (GAME_ENGINE.md). The bridge is the
 * communication layer between the engine and the battle-tanks game runtime,
 * hosted on the HTML platform bridge.
 */
export class BattleTanksBridge implements GameBridge {
  readonly platform: string;
  readonly capabilities: BridgeCapabilities;

  private readonly html: HTMLBridge;
  private readonly host: BattleTanksHost;
  private readonly playerByController = new WeakMap<Controller, string>();

  constructor() {
    this.host = new BattleTanksHost();
    this.html = new HTMLBridge();
    this.html.attach(this.host);
    this.platform = this.html.platform;
    this.capabilities = this.html.capabilities;
  }

  getHost(): BattleTanksHost {
    return this.host;
  }

  onEvent(handler: (event: BridgeEvent) => void): void {
    this.html.onEvent(handler);
  }

  registerTools(controller: Controller, playerId?: string): void {
    this.playerByController.set(controller, playerId ?? 'unknown');

    controller.registerTool(
      'move',
      'Move your tank in a direction',
      {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            enum: ['up', 'down', 'left', 'right'],
            description: 'Direction to move',
          },
        },
        required: ['direction'],
      },
      async (args: Record<string, unknown>) => {
        return { content: [{ type: 'text', text: `Moved ${String(args.direction)}` }] };
      },
    );

    controller.registerTool(
      'attack',
      'Attack a target position',
      {
        type: 'object',
        properties: {
          targetX: { type: 'number', description: 'Target X coordinate' },
          targetY: { type: 'number', description: 'Target Y coordinate' },
        },
        required: ['targetX', 'targetY'],
      },
      async (args: Record<string, unknown>) => {
        return { content: [{ type: 'text', text: `Attacked at (${String(args.targetX)}, ${String(args.targetY)})` }] };
      },
    );

    controller.registerTool(
      'scan',
      'Free look: returns the current board state (your position, enemies, available actions). It does NOT use your turn — after scanning you still take your normal action.',
      {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'Optional X coordinate to scan' },
          y: { type: 'number', description: 'Optional Y coordinate to scan' },
        },
      },
      async (_args: Record<string, unknown>) => {
        const playerId = this.playerByController.get(controller) ?? 'unknown';
        const observation = this.host.captureObservation(playerId);
        const text =
          typeof observation === 'object' && observation !== null
            ? String((observation as { text?: string }).text ?? '')
            : String(observation);
        return { content: [{ type: 'text', text }] };
      },
    );

    controller.registerTool(
      'pass',
      'Skip your turn',
      {},
      async () => {
        return { content: [{ type: 'text', text: 'Turn passed' }] };
      },
    );
  }

  async initialize(config: BridgeConfig): Promise<void> {
    this.host.initialize(config.seed, config.agentIds);
    await this.html.initialize(config);
  }

  async reset(): Promise<void> {
    this.host.reset();
    await this.html.reset();
  }

  async pause(): Promise<void> {
    await this.html.pause();
  }

  async resume(): Promise<void> {
    await this.html.resume();
  }

  async dispose(): Promise<void> {
    await this.html.dispose();
  }

  async applyActions(playerId: string, actions: BridgeAction[]): Promise<void> {
    this.host.setActivePlayer(playerId);
    await this.html.applyActions(playerId, actions);
  }

  async observe(playerId: string): Promise<BridgeObservation> {
    return this.html.observe(playerId);
  }

  async getState(): Promise<BridgeGameState> {
    return this.html.getState();
  }

  /** Render payload for spectators/UI — separate from the agent observation. */
  getRenderState(): Record<string, unknown> | null {
    const data = (this.host.capture() ?? {}) as Record<string, unknown>;
    return { type: this.platform, data, ...data };
  }

  /** Engine convenience: current scores (not part of the bridge contract). */
  getScores(): Record<string, number> {
    return this.host.getScores();
  }

  /** Engine convenience: winning player id when the game is over. */
  getWinner(): string | null {
    return this.host.getWinner();
  }
}
