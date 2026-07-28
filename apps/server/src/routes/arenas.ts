import { Hono } from 'hono';
import { Container } from '@ai-game-arena/core';
import { Runtime } from '@ai-game-arena/runtime';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface ArenaManifestDisplay {
  id?: string;
  name?: string;
  contributions?: { arenas?: string[] };
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

export function createArenasRoutes(container: Container, projectRoot: string) {
  const app = new Hono();
  const runtime = container.resolve<Runtime>('runtime');
  const arenasDir = join(projectRoot, 'arenas');

  async function readArenaManifest(arenaId: string): Promise<ArenaManifestDisplay | null> {
    if (!existsSync(arenasDir)) return null;
    try {
      const entries = await readdir(arenasDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const p = join(arenasDir, entry.name, 'arena.json');
        if (!existsSync(p)) continue;
        try {
          const raw = JSON.parse(await readFile(p, 'utf-8')) as ArenaManifestDisplay;
          if (raw.contributions?.arenas?.includes(arenaId)) return raw;
        } catch { /* skip */ }
      }
    } catch { /* ignore */ }
    return null;
  }

  app.get('/', (c) => {
    const arenas = runtime.getArenas();
    return c.json(
      arenas.map((arena) => ({
        id: arena.config.id,
        name: arena.config.name,
        description: arena.config.description,
        minPlayers: arena.config.minPlayers,
        maxPlayers: arena.config.maxPlayers,
      })),
    );
  });

  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const arena = runtime.getArena(id);
    if (!arena) {
      return c.json({ error: 'Arena not found' }, 404);
    }
    const manifest = await readArenaManifest(id);
    const display = manifest?.display?.arena;
    return c.json({
      id: arena.config.id,
      name: arena.config.name,
      description: arena.config.description,
      minPlayers: arena.config.minPlayers,
      maxPlayers: arena.config.maxPlayers,
      config: arena.config,
      gameId: display?.game,
      defaultStrategies: display?.defaultStrategies ?? [],
      mandatoryCapabilities: display?.mandatoryCapabilities ?? [],
      plugins: display?.plugins ?? [],
      ui: display?.ui ?? [],
    });
  });

  return app;
}
