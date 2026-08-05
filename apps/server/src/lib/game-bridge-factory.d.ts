import { HTMLBridge } from '@ai-game-arena/controller';
/**
 * Format-driven game-bridge factory.
 *
 * The bridge is selected from the game's `format` only — no per-game or
 * per-arena hardcoding. Web formats (html, Unity WebGL, embed URLs, canvas
 * pages) are served through the HTML bridge whose render state points at the
 * game's entry URL, so the frontend renders them in an iframe. Rules-only
 * games (no `format`) and arena-only battles get no bridge: the battle uses
 * the arena's own render state.
 */
export declare function createGameBridge(gameId?: string): HTMLBridge | null;
//# sourceMappingURL=game-bridge-factory.d.ts.map