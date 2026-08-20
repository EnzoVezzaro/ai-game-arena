import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { HTMLBridge } from '@ai-game-arena/controller';
import type { GameBridge } from '@ai-game-arena/platforms';

const projectRoot = new URL('../../../..', import.meta.url).pathname;
const gamesDir = join(projectRoot, 'games');

interface GameManifest {
  format?: string;
  entry?: string;
  adapter?: string;
}

function readGameManifest(gameId: string): GameManifest | null {
  const manifestPath = join(gamesDir, gameId, 'game.json');
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8')) as GameManifest;
  } catch {
    return null;
  }
}

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
export async function createGameBridge(gameId?: string): Promise<GameBridge | null> {
  if (!gameId) return null;
  const manifest = readGameManifest(gameId);
  if (!manifest) return null;

  // Game-specific adapter takes priority over format-based bridges.
  if (manifest.adapter) {
    try {
      const adapterPath = join(gamesDir, gameId, manifest.adapter);
      const module = await import(adapterPath);
      const AdapterClass =
        module.default ??
        Object.values(module).find(
          (v) =>
            typeof v === 'function' && v.prototype && typeof v.prototype.initialize === 'function',
        );
      if (AdapterClass) {
        return new AdapterClass();
      }
    } catch {
      // Adapter not found or failed to load — fall through to format-based bridge.
    }
  }

  switch (manifest.format) {
    case 'html':
    case 'unity_webgl':
    case 'embed_url':
    case 'canvas':
      return new HTMLBridge({
        url: `/games/${gameId}/${(manifest.entry ?? 'index.html').replace(/^\.\//, '')}`,
      });
    default:
      // Rules-only games (no format) and unknown formats: no generic bridge —
      // the battle falls back to the arena's own render state.
      return null;
  }
}
