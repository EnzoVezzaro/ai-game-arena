import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export interface GameEntry {
  id: string;
  name: string;
  version: string;
  description?: string;
  category?: string;
  format?: string;
  adapterType?: string;
  icon?: string;
  min_players?: number;
  max_players?: number;
  grid_size?: number;
  capabilities: string[];
  mandatoryCapabilities: string[];
  defaultStrategies: string[];
  plugins: string[];
  ui: Array<{ id: string; type: string; component: string; label: string; position: string }>;
  path: string;
}

interface RawManifest {
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  category?: string;
  format?: string;
  adapterType?: string;
  icon?: string;
  min_players?: number;
  max_players?: number;
  grid_size?: number;
  capabilities?: string[];
  mandatoryCapabilities?: string[];
  display?: {
    arena?: {
      game?: string;
      plugins?: string[];
      defaultStrategies?: string[];
      mandatoryCapabilities?: string[];
      ui?: Array<{ id: string; type: string; component: string; label: string; position: string }>;
    };
  };
}

export class GamesManager {
  private gamesDir: string;
  private cache: GameEntry[] | null = null;

  constructor(projectRoot: string) {
    this.gamesDir = join(projectRoot, 'games');
  }

  async list(): Promise<GameEntry[]> {
    if (this.cache) return this.cache;
    if (!existsSync(this.gamesDir)) return [];
    try {
      const entries = await readdir(this.gamesDir, { withFileTypes: true });
      const results: GameEntry[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const manifestPath = join(this.gamesDir, entry.name, 'game.json');
        if (!existsSync(manifestPath)) continue;
        try {
          const m = JSON.parse(await readFile(manifestPath, 'utf-8')) as RawManifest;
          const arena = m.display?.arena ?? {};
          results.push({
            id: m.id ?? entry.name,
            name: m.name ?? entry.name,
            version: m.version ?? '1.0.0',
            description: m.description,
            category: m.category,
            format: m.format,
            adapterType: m.adapterType,
            icon: m.icon,
            min_players: m.min_players,
            max_players: m.max_players,
            grid_size: m.grid_size,
            capabilities: m.capabilities ?? [],
            mandatoryCapabilities: m.mandatoryCapabilities ?? arena.mandatoryCapabilities ?? [],
            defaultStrategies: arena.defaultStrategies ?? [],
            plugins: arena.plugins ?? [],
            ui: arena.ui ?? [],
            path: entry.name,
          });
        } catch { /* skip malformed */ }
      }
      this.cache = results;
      return results;
    } catch { return []; }
  }

  async get(id: string): Promise<GameEntry | undefined> {
    const games = await this.list();
    return games.find((g) => g.id === id);
  }
}
