import { useEffect, useState } from 'react';
import { PageLoader } from '../components/common/PageLoader';
import { Icon } from '../lib/Icon';
import type { Artifact, ArtifactType } from '../lib/artifacts';

const TYPE_COLOR: Record<ArtifactType, string> = {
  plugin: '#a78bfa',
  game: '#fb7185',
  arena: '#38bdf8',
};

const TYPE_ICON: Record<ArtifactType, string> = {
  plugin: 'Puzzle',
  game: 'Gamepad2',
  arena: 'Swords',
};

export function Marketplace() {
  const [items, setItems] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ArtifactType>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/artifacts/marketplace')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((list: Artifact[]) => setItems(list ?? []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? items : items.filter((a) => a.type === filter);

  if (loading) return <PageLoader label="Loading marketplace" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          / marketplace
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Published artifacts available for installation. Publish from Arenas/Games/Plugins pages to
          list them here.
        </p>
      </div>

      <div className="flex items-center gap-1.5 mb-6">
        {(['all', 'arena', 'game', 'plugin'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              'rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ' +
              (filter === f
                ? 'bg-primary/20 text-primary'
                : 'bg-muted/30 text-muted-foreground hover:text-foreground')
            }
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass rounded-xl border border-destructive/40 p-4 mb-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((a) => {
          const color = TYPE_COLOR[a.type];
          const icon = TYPE_ICON[a.type];
          return (
            <div
              key={a.id}
              className="group rounded-2xl glass p-4 hover:border-primary/40 transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}1a`, border: `1px solid ${color}40`, color }}
                >
                  <Icon name={icon} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm truncate">{a.name}</h4>
                    <span className="font-mono text-[9px] text-muted-foreground">v{a.version}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {a.description ?? a.type}
                  </p>
                </div>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase"
                  style={{ color: '#34d399', background: '#34d39918' }}
                  title={a.published_at ? new Date(a.published_at).toLocaleString() : ''}
                >
                  <Icon name="Globe" size={9} /> Public
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
                  style={{ color, background: `${color}14` }}
                >
                  <Icon name={icon} size={10} /> {a.type}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground">{a.slug}</span>
                {a.published_by && (
                  <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                    by {a.published_by}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && !error && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Store" size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No published artifacts yet.</p>
        </div>
      )}
    </div>
  );
}

export default Marketplace;
