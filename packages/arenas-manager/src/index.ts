import { readdir, readFile, access } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ArenaPlugin, Logger } from '@ai-game-arena/sdk';

interface ArenaManifest {
  id?: string; name?: string; description?: string; version?: string;
  entry?: string; contributions?: { arenas?: string[] };
}

export interface ArenaEntry {
  pluginId: string; arenaId: string;
  name: string; description: string;
  instance: ArenaPlugin;
}

type ArenaLogger = Pick<Logger, 'info' | 'error'>;

export class ArenasManager {
  private arenasDir: string;
  private arenas: ArenaEntry[] | null = null;
  private logger: ArenaLogger;

  constructor(projectRoot: string, logger?: ArenaLogger) {
    this.arenasDir = join(projectRoot, 'arenas');
    this.logger = logger ?? { info: () => {}, error: () => {} };
  }

  async loadAll(): Promise<ArenaEntry[]> {
    if (this.arenas) return this.arenas;
    const results: ArenaEntry[] = [];
    if (!existsSync(this.arenasDir)) return results;

    try {
      const entries = await readdir(this.arenasDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const manifestPath = join(this.arenasDir, entry.name, 'arena.json');
        if (!existsSync(manifestPath)) continue;

        try {
          const raw = JSON.parse(await readFile(manifestPath, 'utf-8')) as ArenaManifest;
          const arenaIds = raw.contributions?.arenas ?? [];
          if (arenaIds.length === 0) continue;

          const mod = await this.loadModule(this.arenasDir, entry.name, raw);
          if (!mod) continue;

          const ctor = mod.default ?? mod;
          if (typeof ctor !== 'function') continue;

          const instance = new (ctor as new () => ArenaPlugin)();
          for (const arenaId of arenaIds) {
            results.push({
              pluginId: raw.id ?? entry.name, arenaId,
              name: raw.name ?? entry.name, description: raw.description ?? '', instance,
            });
          }
          this.logger.info(`Loaded arena: ${entry.name}`, { component: 'arenas-manager' });
        } catch (err) {
          this.logger.error(`Failed to load arena: ${entry.name}`, { component: 'arenas-manager' }, err as Error);
        }
      }
    } catch (err) {
      this.logger.error('Failed to scan arenas', { component: 'arenas-manager' }, err as Error);
    }

    this.arenas = results;
    return results;
  }

  getArenas(): ArenaEntry[] {
    return this.arenas ?? [];
  }

  private async loadModule(baseDir: string, dirName: string, manifest: ArenaManifest): Promise<Record<string, unknown> | undefined> {
    const entry = manifest.entry ?? './dist/index.js';
    const distPath = join(baseDir, dirName, entry);
    const srcPath = join(baseDir, dirName, 'src', 'index.ts');

    let entryPath = distPath;
    try { await access(distPath); } catch {
      try { await access(srcPath); entryPath = srcPath; } catch {
        this.logger.error(`Entry not found for arena ${dirName}`, { component: 'arenas-manager' });
        return undefined;
      }
    }

    try { return await import(entryPath) as Record<string, unknown>; }
    catch (err) { this.logger.error(`Failed to import arena: ${entryPath}`, { component: 'arenas-manager' }, err as Error); return undefined; }
  }
}
