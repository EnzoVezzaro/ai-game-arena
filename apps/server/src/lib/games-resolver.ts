import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Scans games directory for game manifests and returns available game IDs.
 * Used to validate an arena manifest's declared games on upload.
 */
export async function getAvailableGameIds(projectRoot: string): Promise<Set<string>> {
  const gamesDir = join(projectRoot, 'games');
  const ids = new Set<string>();
  if (!existsSync(gamesDir)) return ids;
  try {
    const entries = await readdir(gamesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const manifestPath = join(gamesDir, entry.name, 'game.json');
      if (!existsSync(manifestPath)) continue;
      try {
        const raw = JSON.parse(await readFile(manifestPath, 'utf-8')) as { id?: string };
        ids.add(raw.id ?? entry.name);
      } catch {
        // skip malformed
      }
    }
  } catch {
    // ignore
  }
  return ids;
}

/**
 * Normalizes an arena manifest's display.arena block into a games constraint.
 * Supports:
 *  - games: ['ALL'] returns ['ALL'] (arena can host any game)
 *  - games: ['g1', 'g2'] returns ['g1', 'g2'] (specific)
 *  - game: 'g1' (legacy single) returns ['g1'] (specific)
 *  - none returns ['ALL'] (permissive default)
 */
export function normalizeArenaGames(
  display:
    | { games?: string[]; game?: string }
    | undefined
    | null,
): string[] {
  if (!display) return ['ALL'];
  if (Array.isArray(display.games) && display.games.length > 0) {
    return display.games;
  }
  if (display.game) return [display.game];
  return ['ALL'];
}
