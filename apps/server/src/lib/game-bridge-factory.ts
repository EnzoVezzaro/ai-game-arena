import type { GameBridge } from '@ai-game-arena/controller';
import { BattleTanksBridge } from 'battle-tanks';

/**
 * Maps an arena id to the bridge for the game that arena hosts.
 *
 * The engine never talks to a game implementation directly: it drives the game
 * exclusively through the returned bridge (GAME_ENGINE.md).
 */
const arenaGameBridges: Record<string, () => GameBridge> = {
  fun: () => new BattleTanksBridge(),
  'battle-tanks': () => new BattleTanksBridge(),
};

export function createGameBridge(arenaId: string): GameBridge | null {
  const factory = arenaGameBridges[arenaId];
  if (!factory) return null;
  return factory();
}
