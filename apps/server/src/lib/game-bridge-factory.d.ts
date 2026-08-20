import type { GameBridge } from '@ai-game-arena/platforms';
/**
 * Format-driven game-bridge factory with game-specific adapter discovery.
 *
 * The bridge is selected in two steps:
 * 1. If the game's `game.json` declares an `adapter` path, the factory
 *    dynamically imports and instantiates that adapter.
 * 2. Otherwise, the bridge is selected from the `format` field:
 *    web formats (html, unity_webgl, embed_url, canvas) are served
 *    through the HTML bridge whose render state points at the game's
 *    entry URL, so the frontend renders them in an iframe. Rules-only
 *    games (no format) and unknown formats get no bridge — the battle
 *    falls back to the arena's own render state.
 */
export declare function createGameBridge(gameId?: string): Promise<GameBridge | null>;
//# sourceMappingURL=game-bridge-factory.d.ts.map