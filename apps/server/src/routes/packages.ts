import { Hono } from 'hono';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface PackageEntry {
  id: string;
  name: string;
  version: string;
  description?: string;
  type: string;
  author?: string;
  private?: boolean;
  path: string;
}

const PACKAGE_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  agent: { label: 'Agent Runtime', icon: 'Bot', color: '#38bdf8' },
  runtime: { label: 'Runtime', icon: 'Activity', color: '#38bdf8' },
  sdk: { label: 'SDK', icon: 'Code2', color: '#34d399' },
  core: { label: 'Core', icon: 'Cpu', color: '#38bdf8' },
  storage: { label: 'Storage', icon: 'Box', color: '#34d399' },
  cli: { label: 'CLI', icon: 'Terminal', color: '#fbbf24' },
  controller: { label: 'Controller', icon: 'Gamepad2', color: '#a78bfa' },
  mcp: { label: 'MCP', icon: 'CircuitBoard', color: '#a78bfa' },
  match: { label: 'Match Engine', icon: 'Swords', color: '#fb7185' },
  observation: { label: 'Observation', icon: 'Eye', color: '#a78bfa' },
  'plugin-manager': { label: 'Plugin Manager', icon: 'Puzzle', color: '#a78bfa' },
};

function classifyPackage(name: string, dirName: string): { type: string; label: string; icon: string; color: string } {
  const meta = PACKAGE_TYPE_META[dirName] ?? PACKAGE_TYPE_META[dirName.replace(/-/, '')];
  if (meta) return { type: dirName, label: meta.label, icon: meta.icon, color: meta.color };
  if (name.includes('sdk')) {
    const m = PACKAGE_TYPE_META.sdk;
    if (m) return { type: 'sdk', label: m.label, icon: m.icon, color: m.color };
  }
  return { type: 'bundle', label: 'Bundle', icon: 'Package', color: '#34d399' };
}

export function createPackagesRoutes(projectRoot: string) {
  const app = new Hono();
  const packagesDir = join(projectRoot, 'packages');

  app.get('/', async (c) => {
    if (!existsSync(packagesDir)) return c.json([]);
    try {
      const entries = await readdir(packagesDir, { withFileTypes: true });
      const results: PackageEntry[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const pkgPath = join(packagesDir, entry.name, 'package.json');
        if (!existsSync(pkgPath)) continue;
        try {
          const raw = await readFile(pkgPath, 'utf-8');
          const pkg = JSON.parse(raw) as {
            name: string;
            version: string;
            description?: string;
            author?: string | { name?: string };
            private?: boolean;
          };
          const cls = classifyPackage(pkg.name, entry.name);
          const author =
            typeof pkg.author === 'string' ? pkg.author : (pkg.author as { name?: string } | undefined)?.name;
          results.push({
            id: entry.name,
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
            type: cls.type,
            author,
            private: pkg.private,
            path: entry.name,
          });
        } catch {
          // skip malformed packages
        }
      }
      return c.json(results);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 500);
    }
  });

  return app;
}