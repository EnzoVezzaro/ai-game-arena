import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const PACKAGE_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  'agent-runtime': { label: 'Agent Runtime', icon: 'Bot', color: '#38bdf8' },
  cli: { label: 'CLI', icon: 'Terminal', color: '#fbbf24' },
  controller: { label: 'Controller', icon: 'Gamepad2', color: '#a78bfa' },
  core: { label: 'Core', icon: 'Cpu', color: '#38bdf8' },
  'match-engine': { label: 'Match Engine', icon: 'Swords', color: '#fb7185' },
  mcp: { label: 'MCP', icon: 'CircuitBoard', color: '#a78bfa' },
  observation: { label: 'Observation', icon: 'Eye', color: '#a78bfa' },
  'plugin-manager': { label: 'Plugin Manager', icon: 'Puzzle', color: '#a78bfa' },
  'games-manager': { label: 'Games Manager', icon: 'Gamepad2', color: '#38bdf8' },
  'packages-manager': { label: 'Packages Manager', icon: 'Box', color: '#34d399' },
  'arenas-manager': { label: 'Arenas Manager', icon: 'Swords', color: '#fbbf24' },
  runtime: { label: 'Runtime', icon: 'Activity', color: '#38bdf8' },
  sdk: { label: 'SDK', icon: 'Code2', color: '#34d399' },
  storage: { label: 'Storage', icon: 'Box', color: '#34d399' },
};

export interface PackageEntry {
  id: string; name: string; version: string;
  description?: string; type: string;
  author?: string; private?: boolean;
}

export class PackagesManager {
  private packagesDir: string;
  private cache: PackageEntry[] | null = null;

  constructor(projectRoot: string) {
    this.packagesDir = join(projectRoot, 'packages');
  }

  async list(): Promise<PackageEntry[]> {
    if (this.cache) return this.cache;
    if (!existsSync(this.packagesDir)) return [];
    try {
      const entries = await readdir(this.packagesDir, { withFileTypes: true });
      const results: PackageEntry[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const pkgPath = join(this.packagesDir, entry.name, 'package.json');
        if (!existsSync(pkgPath)) continue;
        try {
          const raw = JSON.parse(await readFile(pkgPath, 'utf-8'));
          const author = typeof raw.author === 'string' ? raw.author : raw.author?.name;
          results.push({
            id: entry.name, name: raw.name, version: raw.version,
            description: raw.description, type: this.classify(raw.name, entry.name),
            author, private: raw.private,
          });
        } catch { /* skip */ }
      }
      this.cache = results;
      return results;
    } catch { return []; }
  }

  private classify(name: string, dirName: string): string {
    if (dirName in PACKAGE_TYPE_META) return dirName;
    if (name.includes('sdk')) return 'sdk';
    return 'bundle';
  }
}
