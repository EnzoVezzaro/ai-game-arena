import type { Controller, GameBridge as GameBridgeContract } from '@ai-game-arena/sdk';

/**
 * Engine-facing bridge contract.
 *
 * This is the only interface the Engine understands (GAME_ENGINE.md). A bridge
 * is responsible for exactly four things: Lifecycle, Input, Observation and
 * Events. The extra `registerTools` hook lets the engine wire the bridge's
 * action vocabulary (MCP tools) onto an agent's controller so agents can
 * produce abstract actions that `applyActions` consumes.
 */
export interface GameBridge extends GameBridgeContract {
  registerTools(controller: Controller): void;
  /** Optional engine convenience: current scores keyed by player id. */
  getScores?(): Record<string, number>;
  /** Optional engine convenience: winning player id when the game is over. */
  getWinner?(): string | null;
  /**
   * Optional render payload for spectators/UI (e.g. html + units). Separate
   * from `observe()`, which returns the agent-facing observation. When absent
   * the engine falls back to the last bridge observation.
   */
  getRenderState?(): Record<string, unknown> | null;
}
