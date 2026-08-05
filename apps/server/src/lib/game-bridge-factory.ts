import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { HTMLBridge } from '@ai-game-arena/controller';

const projectRoot = new URL('../../../..', import.meta.url).pathname;
const gamesDir = join(projectRoot, 'games');

interface GameManifest {
  format?: string;
  entry?: string;
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
 * Format-driven game-bridge factory.
 *
 * The bridge is selected from the game's `format` only — no per-game or
 * per-arena hardcoding. Web formats (html, Unity WebGL, embed URLs, canvas
 * pages) are served through the HTML bridge whose render state points at the
 * game's entry URL, so the frontend renders them in an iframe. Rules-only
 * games (no `format`) and arena-only battles get no bridge: the battle uses
 * the arena's own render state.
 */
export function createGameBridge(gameId?: string): HTMLBridge | null {
  if (!gameId) return null;
  const manifest = readGameManifest(gameId);
  if (!manifest) return null;

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
