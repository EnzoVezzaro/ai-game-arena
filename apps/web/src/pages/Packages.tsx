import { useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { PACKAGE_TYPES, packageTypeMeta } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { Chip } from '../components/common/Chip';
import { PackageCard, type Pkg } from '../components/common/PackageCard';
import { PageLoader } from '../components/common/PageLoader';

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

function toPkg(entry: PackageEntry): Pkg {
  const meta = packageTypeMeta(entry.type);
  return {
    id: entry.id,
    name: entry.name.replace(/^@ai-game-arena\//, ''),
    version: entry.version,
    type: entry.type,
    author: entry.author ?? 'ai-game-arena',
    description: entry.description ?? meta.label,
    icon: '📦',
    install_status: 'installed',
    bundle_url: entry.private ? undefined : `packages/${entry.path}`,
  };
}

export function Packages() {
  const { data: entries, loading, error } = useApi<PackageEntry[]>('/api/packages');
  const pkgs = useMemo(() => (entries ?? []).map(toPkg), [entries]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pkgs) counts[p.type ?? 'bundle'] = (counts[p.type ?? 'bundle'] ?? 0) + 1;
    return counts;
  }, [pkgs]);

  const typeKeys = useMemo(() => {
    const seen = new Set<string>();
    for (const p of pkgs) seen.add(p.type ?? 'bundle');
    return Array.from(seen).sort();
  }, [pkgs]);

  if (loading) return <PageLoader label="Inventorying packages" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          / packages · core
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Core Packages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Workspace packages that make up the ai-game-arena platform. Installed under{' '}
          <code className="font-mono text-[10px] bg-muted/40 px-1 rounded">packages/*</code>.
        </p>
      </div>

      {error && (
        <div className="glass rounded-xl border border-destructive/40 p-4 mb-4 text-sm text-destructive">
          Failed to load packages: {error}
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-6">
        {typeKeys.map((key) => {
          const meta = PACKAGE_TYPES[key] ?? packageTypeMeta(key);
          return (
            <Chip
              key={key}
              label={meta.label}
              icon={meta.icon}
              color={meta.color}
              count={typeCounts[key] ?? 0}
              active={false}
              onClick={() => undefined}
            />
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pkgs.map((p) => (
          <PackageCard key={p.id} pkg={p} />
        ))}
      </div>
      {pkgs.length === 0 && !error && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Package" size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No packages discovered.</p>
        </div>
      )}
    </div>
  );
}

export default Packages;
